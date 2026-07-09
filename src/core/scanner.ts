/**
 * Scanner – Orchestrates color detection for a single editor.
 *
 * Combines regex-based parsing with the DocumentColorProvider bridge,
 * deduplicates overlapping results, and hands off to the decoration manager.
 */

import * as vscode from 'vscode';
import { getProviderColors } from '@/providers/documentColorBridge';
import type { CacheEntry, ColorData, ColorMatch, ExtensionConfig } from '@/types';
import { extractColors, hasOverlap } from './colorParser';
import { applyDecorations } from './decorationManager';
import { clearVariablesForUri } from './variableManager';

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
  options: { doc: vscode.TextDocument; rangeOffset: number; scanRange: vscode.Range }
): { range: vscode.Range; color: ColorData }[] {
  // Provider matches from VS Code might not be strictly sorted. Sort them.
  providerMatches.sort((a, b) => a.startOffset - b.startOffset);

  // Filter out any provider matches that overlap with our regex matches
  // (since regex matches have absolute priority).
  const filteredProviders = providerMatches.filter(
    (pm) => !hasOverlap(regexMatches, pm.startOffset, pm.endOffset)
  );

  // Filter overlaps within the provider matches themselves, just in case
  // the language server returned overlapping/duplicate ranges.
  const finalProviders: ColorMatch[] = [];
  let lastEnd = -1;
  for (const pm of filteredProviders) {
    if (pm.startOffset >= lastEnd) {
      finalProviders.push(pm);
      lastEnd = pm.endOffset;
    }
  }

  // Linear merge `regexMatches` (which are already sorted and non-overlapping) and `finalProviders`.
  const merged: ColorMatch[] = [];
  let i = 0;
  let j = 0;
  while (i < regexMatches.length && j < finalProviders.length) {
    if (regexMatches[i].startOffset <= finalProviders[j].startOffset) {
      merged.push(regexMatches[i]);
      i += 1;
    } else {
      merged.push(finalProviders[j]);
      j += 1;
    }
  }
  while (i < regexMatches.length) {
    merged.push(regexMatches[i]);
    i += 1;
  }
  while (j < finalProviders.length) {
    merged.push(finalProviders[j]);
    j += 1;
  }

  // Convert to VS Code ranges and filter by `options.scanRange`.
  const results: { range: vscode.Range; color: ColorData }[] = [];
  for (const match of merged) {
    const range = new vscode.Range(
      options.doc.positionAt(match.startOffset),
      options.doc.positionAt(match.endOffset)
    );
    if (options.scanRange.contains(range)) {
      results.push({ color: match.color, range });
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
  // Safeguard: Do not scan massive minified files to prevent extension host freezing.
  if (text.length === 0 || text.length > 500_000) {
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
