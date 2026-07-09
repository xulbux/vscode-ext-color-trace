/**
 * Scanner – Orchestrates color detection for a single editor.
 *
 * Combines regex-based parsing with the DocumentColorProvider bridge,
 * deduplicates overlapping results, and hands off to the decoration manager.
 */

import * as vscode from 'vscode';
import { getProviderColors } from '@/providers/documentColorBridge';
import type { CacheEntry, ColorData, ColorMatch, RGBA } from '@/types';
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

// filterToVisible removed.

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
  // the provider's semantically resolved RGBA value (useful for CSS vars).
  for (const match of regexMatches) {
    const absStart = options.rangeOffset + match.startOffset;
    const absEnd = options.rangeOffset + match.endOffset;
    const range = new vscode.Range(
      options.doc.positionAt(absStart),
      options.doc.positionAt(absEnd)
    );

    let finalColor = match.color;

    // Check for overlap with any provider match.
    const pmIndex = providerMatches.findIndex(
      (p) => absStart < p.endOffset && absEnd > p.startOffset
    );

    if (pmIndex !== -1) {
      finalColor = providerMatches[pmIndex].color;
      consumedProviders.add(pmIndex);
    }

    if (options.scanRange.contains(range)) {
      const key = rangeKey(range);
      if (!covered.has(key)) {
        covered.add(key);
        results.push({ color: finalColor, range });
      }
    }
  }

  // [2] Add any provider matches that didn't overlap with our regexes.
  for (let i = 0; i < providerMatches.length; i += 1) {
    if (!consumedProviders.has(i)) {
      const pm = providerMatches[i];
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

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Scan the visible portions of an editor for colors and apply decorations.
 *
 * @param editor        The text editor to scan.
 * @param editorBg      The resolved editor background RGBA.
 * @param borderRadius  CSS border-radius for highlights.
 * @param matchNamed    Whether to match named CSS colors.
 */
export async function scanEditor(
  editor: vscode.TextEditor,
  options: { editorBg: RGBA; matchNamed: boolean; matchTailwind: boolean; ignorePatterns: string[] }
): Promise<void> {
  const doc = editor.document;

  if (options.ignorePatterns.some((pattern) => vscode.languages.match({ pattern }, doc) > 0)) {
    return;
  }
  const uri = doc.uri.toString();
  const { version } = doc;

  // Check cache; Skip if document hasn't changed.
  const cached = cache.get(uri);
  if (cached && cached.version === version) {
    applyDecorations(editor, cached.results, { editorBg: options.editorBg });
    return;
  }

  // [1] Determine the scan range (entire document).
  const text = doc.getText();
  if (text.length === 0) {
    return;
  }

  const lastLine = doc.lineCount - 1;
  const scanRange = new vscode.Range(0, 0, lastLine, doc.lineAt(lastLine).text.length);
  const rangeOffset = 0;

  // [2] Regex-based extraction.
  clearVariablesForUri(uri);
  const regexMatches = extractColors(text, doc.languageId, {
    matchNamed: options.matchNamed,
    matchTailwind: options.matchTailwind,
    uri,
  });

  // [3] DocumentColorProvider bridge (async, non-blocking).
  const providerMatches = await getProviderColors(doc);

  // [4] Merge & deduplicate.
  const merged = mergeMatches(regexMatches, providerMatches, { doc, rangeOffset, scanRange });

  // [5] Cache full results.
  cache.set(uri, { results: merged, version });

  // [6] Apply decorations.
  applyDecorations(editor, merged, { editorBg: options.editorBg });
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
