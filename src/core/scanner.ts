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
import { logError, logWarn } from '@/utils/logger';
import { mergeNonOverlapping } from '@/utils/ranges';
import { extractColors } from './colorParser';
import { applyDecorations } from './decorationManager';
import { areVariablesEqual, clearVariablesForUri, getVariablesForUri } from './variableManager';

// ---------------------------------------- CACHE ----------------------------------------

const cache = new Map<string, CacheEntry>();
const scanTokens = new Map<string, number>();

// -------------------------------------- INTERNALS --------------------------------------

/**
 * Build the VS Code range for a match, honoring the `dot-before` marker offset.
 */
function toRange(
  doc: vscode.TextDocument,
  match: ColorMatch,
  markerType: DocumentResolvedConfig['markerType']
): vscode.Range {
  const startOffset =
    markerType === 'dot-before' && match.fullStartOffset !== undefined
      ? match.fullStartOffset
      : match.startOffset;
  const endOffset =
    markerType === 'dot-after' && match.fullEndOffset !== undefined
      ? match.fullEndOffset
      : match.endOffset;
  return new vscode.Range(doc.positionAt(startOffset), doc.positionAt(endOffset));
}

/**
 * Keep only error and warning diagnostics for the given document.
 */
function getActiveDiagnostics(uri: vscode.Uri): vscode.Diagnostic[] {
  return vscode.languages
    .getDiagnostics(uri)
    .filter(
      (diagnostic) =>
        diagnostic.severity === vscode.DiagnosticSeverity.Error ||
        diagnostic.severity === vscode.DiagnosticSeverity.Warning
    );
}

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
    results.push({ color: match.color, range: toRange(doc, match, config.markerType) });
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
  if (activeDiagnostics.length === 0) {
    return false;
  }
  for (const diag of activeDiagnostics) {
    if (diag.range.start.isBeforeOrEqual(range.end) && diag.range.end.isAfterOrEqual(range.start)) {
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
 * Drop all per-document scan state for a closed document.
 *
 * Unlike `invalidateCache`, this also removes the document's scan token, which must never be reset while
 * the document is open (guards against races where a stale async provider result overwrites a newer scan).
 */
export function disposeDocument(uri: string): void {
  cache.delete(uri);
  scanTokens.delete(uri);
}

/**
 * Clear the entire scan cache.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Invalidate cache and trigger a scan for all visible editors except the one that changed.
 */
export function invalidateOtherVisibleEditors(changedUri: string, config: ExtensionConfig): void {
  for (const visibleEditor of vscode.window.visibleTextEditors) {
    if (visibleEditor.document.uri.toString() !== changedUri) {
      invalidateCache(visibleEditor.document.uri.toString());
      // oxlint-disable-next-line no-use-before-define
      scanEditor(visibleEditor, config).catch((error) => {
        logError(`Failed to re-scan editor: ${visibleEditor.document.uri.toString()}`, error);
      });
    }
  }
}

/**
 * Scan an editor's entire document for colors and apply decorations.
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

  const uri = doc.uri.toString();
  const { version } = doc;

  // [1] Check if this document should be skipped for decorations:
  if (!docConfig.enable) {
    // We must still extract variables so cross-file references work!
    const beforeVars = getVariablesForUri(uri);
    clearVariablesForUri(uri);
    extractColors(doc.getText(), doc.languageId, { ...docConfig, extractOnly: true, uri });
    const afterVars = getVariablesForUri(uri);

    if (!areVariablesEqual(beforeVars, afterVars)) {
      invalidateOtherVisibleEditors(uri, config);
    }
    return;
  }

  const currentToken = (scanTokens.get(uri) ?? 0) + 1;
  scanTokens.set(uri, currentToken);

  // Check cache; Skip if document hasn't changed.
  const cached = cache.get(uri);
  if (cached && cached.version === version) {
    applyDecorations(editor, cached.results, docConfig);
    return;
  }

  // [2] Determine the scan range (entire document):
  const text = doc.getText();
  // Safeguard: Do not scan massive minified files to prevent extension host freezing.
  if (text.length === 0 || text.length > 500_000) {
    return;
  }

  // [3] Regex-based extraction:
  const beforeVars = getVariablesForUri(uri);
  clearVariablesForUri(uri);
  const regexMatches = extractColors(text, doc.languageId, { ...docConfig, uri });
  const afterVars = getVariablesForUri(uri);
  const activeDiagnostics = getActiveDiagnostics(doc.uri);

  if (!areVariablesEqual(beforeVars, afterVars)) {
    invalidateOtherVisibleEditors(uri, config);
  }

  // [3.5] Immediately apply fast regex matches for zero-latency feedback:
  const fastResults: { range: vscode.Range; color: ColorData }[] = [];
  for (const match of regexMatches) {
    const range = toRange(doc, match, docConfig.markerType);
    if (!hasDiagnosticOverlap(range, activeDiagnostics)) {
      fastResults.push({ color: match.color, range });
    }
  }

  // Cache the fast results immediately so subsequent quick re-scans (like scrolling) hit the cache.
  cache.set(uri, { results: fastResults, version });
  applyDecorations(editor, fastResults, docConfig);

  // [4] `DocumentColorProvider` bridge (async, non-blocking):
  // We do not await this so the initial regex colors render instantly.
  getProviderColors(doc, docConfig)
    .then((providerMatches) => {
      // If a newer scan has started for this document, or if there are no provider matches, discard.
      if (scanTokens.get(uri) !== currentToken || providerMatches.length === 0) {
        return;
      }

      // Re-fetch diagnostics to ensure we have the latest ones, preventing
      // race conditions where diagnostics arrive while we were awaiting the provider.
      const latestDiagnostics = getActiveDiagnostics(doc.uri);

      // [5] Merge & deduplicate:
      const merged = mergeMatches(regexMatches, providerMatches, { config: docConfig, doc });

      const filteredMerged = merged.filter(
        (m) => !hasDiagnosticOverlap(m.range, latestDiagnostics)
      );

      // [6] Cache full results:
      cache.set(uri, { results: filteredMerged, version });

      // [7] Apply updated decorations to all visible editors for this document:
      for (const visibleEditor of vscode.window.visibleTextEditors) {
        if (visibleEditor.document === doc) {
          applyDecorations(visibleEditor, filteredMerged, docConfig);
        }
      }
    })
    .catch((error) => {
      logWarn(`Color provider bridge failed for: ${uri}`, error);
    });
}
