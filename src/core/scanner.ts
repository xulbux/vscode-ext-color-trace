/**
 * Scanner – Orchestrates color detection for a single editor.
 *
 * Combines regex-based parsing with the DocumentColorProvider bridge,
 * deduplicates overlapping results, and hands off to the decoration manager.
 */

import * as vscode from 'vscode';
import { getProviderColors } from '@/providers/documentColorBridge';
import { type ColorMatch, extractColors } from './colorParser';
import type { RGBA } from './colorUtils';
import { applyDecorations } from './decorationManager';

// ---------------------------------------- CACHE ----------------------------------------

interface CacheEntry {
  version: number;
  results: { range: vscode.Range; rgba: RGBA }[];
}

const cache = new Map<string, CacheEntry>();

// -------------------------------------- INTERNALS --------------------------------------

/**
 * Stable string key for a range (for deduplication).
 */
function rangeKey(range: vscode.Range): string {
  return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

/**
 * Filter results to only those intersecting the editor's visible ranges.
 */
function filterToVisible(
  results: { range: vscode.Range; rgba: RGBA }[],
  editor: vscode.TextEditor
): { range: vscode.Range; rgba: RGBA }[] {
  const visible = editor.visibleRanges;
  return results.filter((result) =>
    visible.some((vr) => vr.intersection(result.range) !== undefined)
  );
}

/**
 * Merge regex-based matches with provider matches.
 * Regex results take priority when ranges overlap (they have the original text).
 */
function mergeMatches(
  regexMatches: ColorMatch[],
  providerMatches: ColorMatch[],
  options: { doc: vscode.TextDocument; rangeOffset: number; scanRange: vscode.Range }
): { range: vscode.Range; rgba: RGBA }[] {
  // Convert regex matches to document ranges.
  const results: { range: vscode.Range; rgba: RGBA }[] = regexMatches.map((match) => {
    const absStart = options.rangeOffset + match.startOffset;
    const absEnd = options.rangeOffset + match.endOffset;
    return {
      range: new vscode.Range(options.doc.positionAt(absStart), options.doc.positionAt(absEnd)),
      rgba: match.rgba,
    };
  });

  // Build a set of covered ranges for deduplication.
  const covered = new Set<string>();
  for (const result of results) {
    covered.add(rangeKey(result.range));
  }

  // Add provider matches that don't overlap with regex results.
  for (const pm of providerMatches) {
    const pmStart = options.doc.positionAt(pm.startOffset);
    const pmEnd = options.doc.positionAt(pm.endOffset);
    const range = new vscode.Range(pmStart, pmEnd);

    // Only include if within our scan range and not already covered.
    if (options.scanRange.contains(range) && !covered.has(rangeKey(range))) {
      // Check for partial overlap with any existing result.
      const overlaps = results.some(
        (result) => range.start.isBefore(result.range.end) && range.end.isAfter(result.range.start)
      );
      if (!overlaps) {
        results.push({ range, rgba: pm.rgba });
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
  options: { editorBg: RGBA; borderRadius: string; matchNamed: boolean }
): Promise<void> {
  const doc = editor.document;
  const uri = doc.uri.toString();
  const { version } = doc;

  // Check cache; Skip if document hasn't changed.
  const cached = cache.get(uri);
  if (cached && cached.version === version) {
    applyDecorations(editor, filterToVisible(cached.results, editor), {
      borderRadius: options.borderRadius,
      editorBg: options.editorBg,
    });
    return;
  }

  // [1] Determine the scan range (visible + buffer).
  const { visibleRanges } = editor;
  if (visibleRanges.length === 0) {
    return;
  }

  const buffer = 50;
  const firstLine = Math.max(0, visibleRanges[0].start.line - buffer);
  const lastLine = Math.min(
    doc.lineCount - 1,
    visibleRanges[visibleRanges.length - 1].end.line + buffer
  );

  const scanRange = new vscode.Range(firstLine, 0, lastLine, doc.lineAt(lastLine).text.length);
  const text = doc.getText(scanRange);
  const rangeOffset = doc.offsetAt(scanRange.start);

  // [2] Regex-based extraction.
  const regexMatches = extractColors(text, doc.languageId, options.matchNamed);

  // [3] DocumentColorProvider bridge (async, non-blocking).
  const providerMatches = await getProviderColors(doc);

  // [4] Merge & deduplicate.
  const merged = mergeMatches(regexMatches, providerMatches, { doc, rangeOffset, scanRange });

  // [5] Cache full results.
  cache.set(uri, { results: merged, version });

  // [6] Apply decorations (only visible subset).
  applyDecorations(editor, filterToVisible(merged, editor), {
    borderRadius: options.borderRadius,
    editorBg: options.editorBg,
  });
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
