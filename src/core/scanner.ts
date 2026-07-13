/**
 * Scanner – Orchestrates color detection for a single editor.
 *
 * Combines regex-based parsing with the `DocumentColorProvider` bridge,
 * deduplicates overlapping results, and hands off to the decoration manager.
 */

import * as vscode from 'vscode';
import { resolveDocumentConfig } from '@/config';
import { getProviderColors } from '@/providers/documentColorBridge';
import type {
  CacheEntry,
  ColorData,
  ColorMatch,
  ExtensionConfig,
  DocumentResolvedConfig,
} from '@/types';
import { mergeNonOverlapping } from '@/utils/ranges';
import { extractColors } from './colorParser';
import { applyDecorations } from './decorationManager';
import { areVariablesEqual, clearVariablesForUri, getVariablesForUri } from './variableManager';

// ---------------------------------------- CACHE ----------------------------------------

const cache = new Map<string, CacheEntry>();

// -------------------------------------- INTERNALS --------------------------------------

/**
 * Merge regex-based matches with provider matches.
 * Provider results take priority (they come from language servers with semantic understanding).
 * Regex results are only added when they don't overlap with any provider result.
 */
function mergeMatches(
  regexMatches: ColorMatch[],
  providerMatches: ColorMatch[],
  context: { doc: vscode.TextDocument; config: DocumentResolvedConfig }
): { range: vscode.Range; color: ColorData }[] {
  const { doc, config } = context;
  // Provider matches from VS Code might not be strictly sorted. Sort them.
  providerMatches.sort((a, b) => a.startOffset - b.startOffset);

  const merged = mergeNonOverlapping(providerMatches, regexMatches, true);

  // Convert to VS Code ranges.
  const results: { range: vscode.Range; color: ColorData }[] = [];
  for (const match of merged) {
    const startOffset =
      config.markerType === 'dot-before' && match.fullStartOffset !== undefined
        ? match.fullStartOffset
        : match.startOffset;
    const range = new vscode.Range(doc.positionAt(startOffset), doc.positionAt(match.endOffset));
    results.push({ color: match.color, range });
  }

  return results;
}

/**
 * Check if the given range overlaps with any error or warning diagnostics.
 */
function hasDiagnosticOverlap(
  range: vscode.Range,
  activeDiagnostics: vscode.Diagnostic[]
): boolean {
  for (const diag of activeDiagnostics) {
    if (diag.range.intersection(range)) {
      return true;
    }
  }
  return false;
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Invalidate the cache for a specific document.
 */
export function invalidateCache(uri: string): void {
  cache.delete(uri);
}

/**
 * Clear the entire scan cache.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Scan the visible portions of an editor for colors and apply decorations.
 *
 * @param editor   The text editor to scan.
 * @param config   The resolved extension configuration.
 */
export async function scanEditor(
  editor: vscode.TextEditor,
  config: ExtensionConfig
): Promise<void> {
  const doc = editor.document;

  const docConfig = resolveDocumentConfig(config, doc.languageId);

  // [1] Check if this document should be skipped.
  if (!docConfig.enable) {
    return;
  }

  const uri = doc.uri.toString();
  const { version } = doc;

  // Check cache; Skip if document hasn't changed.
  const cached = cache.get(uri);
  if (cached && cached.version === version) {
    applyDecorations(editor, cached.results, docConfig);
    return;
  }

  // [1] Determine the scan range (entire document).
  const text = doc.getText();
  // Safeguard: Do not scan massive minified files to prevent extension host freezing.
  if (text.length === 0 || text.length > 500_000) {
    return;
  }

  // [2] Regex-based extraction.
  const beforeVars = getVariablesForUri(uri);
  clearVariablesForUri(uri);
  const regexMatches = extractColors(text, doc.languageId, { ...docConfig, uri });
  const afterVars = getVariablesForUri(uri);
  const allDiagnostics = vscode.languages.getDiagnostics(doc.uri);
  const activeDiagnostics = allDiagnostics.filter(
    (diagnostic) =>
      diagnostic.severity === vscode.DiagnosticSeverity.Error ||
      diagnostic.severity === vscode.DiagnosticSeverity.Warning
  );

  if (!areVariablesEqual(beforeVars, afterVars)) {
    for (const visibleEditor of vscode.window.visibleTextEditors) {
      if (visibleEditor.document.uri.toString() !== uri) {
        invalidateCache(visibleEditor.document.uri.toString());
        scanEditor(visibleEditor, config).catch(() => {
          // Ignore.
        });
      }
    }
  }

  // [2.5] Immediately apply fast regex matches for zero-latency feedback.
  const fastResults: { range: vscode.Range; color: ColorData }[] = [];
  for (const match of regexMatches) {
    const startOffset =
      docConfig.markerType === 'dot-before' && match.fullStartOffset !== undefined
        ? match.fullStartOffset
        : match.startOffset;
    const range = new vscode.Range(doc.positionAt(startOffset), doc.positionAt(match.endOffset));
    if (!hasDiagnosticOverlap(range, activeDiagnostics)) {
      fastResults.push({ color: match.color, range });
    }
  }

  // Cache the fast results immediately so subsequent quick re-scans (like scrolling) hit the cache.
  cache.set(uri, { results: fastResults, version });
  applyDecorations(editor, fastResults, docConfig);

  // [3] `DocumentColorProvider` bridge (async, non-blocking).
  // We do not await this so the initial regex colors render instantly.
  getProviderColors(doc, docConfig)
    .then((providerMatches) => {
      // If the document changed while we were waiting, or there are no provider matches, discard.
      if (doc.version !== version || providerMatches.length === 0) {
        return;
      }

      // [4] Merge & deduplicate.
      const merged = mergeMatches(regexMatches, providerMatches, { config: docConfig, doc });

      const filteredMerged = merged.filter(
        (m) => !hasDiagnosticOverlap(m.range, activeDiagnostics)
      );

      // [5] Cache full results.
      cache.set(uri, { results: filteredMerged, version });

      // [6] Apply updated decorations to all visible editors for this document.
      for (const visibleEditor of vscode.window.visibleTextEditors) {
        if (visibleEditor.document === doc) {
          applyDecorations(visibleEditor, filteredMerged, docConfig);
        }
      }
    })
    .catch(() => {
      // Ignore provider errors.
    });
}
