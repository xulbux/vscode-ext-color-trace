/**
 * Scanner – Orchestrates color detection for a single editor.
 *
 * Combines regex-based parsing with the DocumentColorProvider bridge,
 * deduplicates overlapping results, and hands off to the decoration manager.
 */

import * as vscode from 'vscode';
import { getProviderColors } from '@/providers/documentColorBridge';
import type { CacheEntry, ColorData, ColorMatch, ExtensionConfig } from '@/types';
import { extractColors } from './colorParser';
import { applyDecorations } from './decorationManager';
import { clearVariablesForUri } from './variableManager';

// ---------------------------------------- CACHE ----------------------------------------

const cache = new Map<string, CacheEntry>();

// -------------------------------------- INTERNALS --------------------------------------

/**
 * Stable string key for a range (for deduplication).
 */
function rangeKey(range: vscode.Range): string {
  return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

/**
 * Merge regex-based matches with provider matches.
 * Provider results take priority (they come from language servers with semantic understanding).
 * Regex results are only added when they don't overlap with any provider result.
 */
function mergeMatches(
  regexMatches: ColorMatch[],
  providerMatches: ColorMatch[],
  options: { doc: vscode.TextDocument; rangeOffset: number; scanRange: vscode.Range }
): { range: vscode.Range; color: ColorData }[] {
  const results: { range: vscode.Range; color: ColorData }[] = [];
  const covered = new Set<string>();
  const consumedProviders = new Set<number>();

  // [1] Regex matches first. They have highly accurate ranges (e.g. strict hex bounds).
  // If they overlap with a provider match, we use OUR precise range, but inherit
  for (const match of regexMatches) {
    const finalColor = match.color;

    // Check for overlap with any provider match.
    // We trust our own regex parsers and variable cache more than potentially buggy
    // language servers (which sometimes return dummy colors like yellow for unresolved vars).
    const absStart = match.startOffset;
    const absEnd = match.endOffset;
    const pmIndex = providerMatches.findIndex(
      (p) => absStart < p.endOffset && absEnd > p.startOffset
    );

    if (pmIndex !== -1) {
      // Discard the provider match since we already handled this color perfectly.
      consumedProviders.add(pmIndex);
    }

    const range = new vscode.Range(
      options.doc.positionAt(absStart),
      options.doc.positionAt(absEnd)
    );

    if (options.scanRange.contains(range)) {
      const key = rangeKey(range);
      if (!covered.has(key)) {
        covered.add(key);
        results.push({ color: finalColor, range });
      }
    }
  }

  // [2] Add any provider matches that didn't overlap with our regexes.
  for (const [i, pm] of providerMatches.entries()) {
    if (!consumedProviders.has(i)) {
      const range = new vscode.Range(
        options.doc.positionAt(pm.startOffset),
        options.doc.positionAt(pm.endOffset)
      );

      if (options.scanRange.contains(range)) {
        const key = rangeKey(range);
        if (!covered.has(key)) {
          // Check for partial overlap with any existing result.
          const overlaps = results.some(
            (result) =>
              range.start.isBefore(result.range.end) && range.end.isAfter(result.range.start)
          );
          if (!overlaps) {
            covered.add(key);
            results.push({ color: pm.color, range });
          }
        }
      }
    }
  }

  return results;
}

import { resolveDocumentConfig } from '@/config';

// -------------------------------------- PUBLIC API -------------------------------------

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
  if (text.length === 0) {
    return;
  }

  const lastLine = doc.lineCount - 1;
  const scanRange = new vscode.Range(0, 0, lastLine, doc.lineAt(lastLine).text.length);

  // [2] Regex-based extraction.
  clearVariablesForUri(uri);
  const regexMatches = extractColors(text, doc.languageId, { ...docConfig, uri });

  // [3] DocumentColorProvider bridge (async, non-blocking).
  const providerMatches = await getProviderColors(doc, docConfig);

  // [4] Merge & deduplicate.
  const merged = mergeMatches(regexMatches, providerMatches, { doc, rangeOffset: 0, scanRange });

  // [5] Cache full results.
  cache.set(uri, { results: merged, version });

  // [6] Apply decorations.
  applyDecorations(editor, merged, docConfig);
}

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
