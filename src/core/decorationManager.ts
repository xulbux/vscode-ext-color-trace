/**
 * Manages the creation, caching, and disposal of TextEditorDecorationTypes.
 *
 * Each unique visual style (determined by `bg`, `fg`, `border`, and `radius`)
 * gets its own decoration type, cached via an LRU Map.
 * Ranges for the same style are batched into a single `setDecorations` call.
 */

import * as vscode from 'vscode';
import { type RGBA, chooseFgColor, rgbaToCssString, rgbaToHexString } from './colorUtils';

// ---------------------------------------- TYPES ----------------------------------------

interface DecorationEntry {
  type: vscode.TextEditorDecorationType;
  /** Ranges currently applied to each editor (keyed by editor id). */
  activeEditors: Set<string>;
}

// ---------------------------------------- CACHE ----------------------------------------

const LRU_CAPACITY = 256;

/** LRU cache: style fingerprint → DecorationEntry. */
const cache = new Map<string, DecorationEntry>();

/** Tracks which style keys are applied per editor to enable cleanup. */
const editorStyleKeys = new Map<string, Set<string>>();

// -------------------------------------- INTERNALS --------------------------------------

/**
 * Build a unique fingerprint for a decoration style.
 * Format: `bg:<css>|fg:<hex>|border:<css>|radius:<css>`
 */
function styleFingerprint(rgba: RGBA, fg: string, borderRadius: string): string {
  const bgCss = rgbaToCssString(rgba);
  const isTransparent = rgba.a < 1;

  // For transparent colors, use the opaque version for the border.
  const borderCss = isTransparent
    ? `0.2em solid ${rgbaToHexString({ ...rgba, a: 1 })}`
    : `0.2em solid ${bgCss}`;

  return `bg:${bgCss}|fg:${fg}|border:${borderCss}|radius:${borderRadius}`;
}

/**
 * Parse a fingerprint and create a new decoration type + entry.
 */
function createEntry(fingerprint: string): DecorationEntry {
  const parts = new Map<string, string>();
  for (const segment of fingerprint.split('|')) {
    const idx = segment.indexOf(':');
    parts.set(segment.slice(0, idx), segment.slice(idx + 1));
  }

  const bg = parts.get('bg') ?? 'transparent';
  const fg = parts.get('fg') ?? '#FFFFFF';
  const border = parts.get('border') ?? 'none';
  const radius = parts.get('radius') ?? '0.25em';

  const options: vscode.DecorationRenderOptions = {
    backgroundColor: bg,
    borderRadius: radius,
    color: fg,
  };

  if (border !== 'none') {
    options.border = border;
  }

  return { activeEditors: new Set(), type: vscode.window.createTextEditorDecorationType(options) };
}

/**
 * Add an entry to the LRU cache, evicting the oldest if at capacity.
 */
function addToCache(key: string, entry: DecorationEntry): void {
  if (cache.size >= LRU_CAPACITY) {
    // Evict oldest (first key in insertion-order Map).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      const evicted = cache.get(oldest);
      evicted?.type.dispose();
      cache.delete(oldest);
    }
  }
  cache.set(key, entry);
}

/**
 * Stable identifier for an editor instance.
 */
function editorKey(editor: vscode.TextEditor): string {
  return `${editor.document.uri.toString()}:${editor.viewColumn ?? 0}`;
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Apply color decorations to a single editor.
 *
 * Groups the supplied color matches by computed visual style, creates or reuses
 * cached TextEditorDecorationTypes, and applies them in one batch per unique style.
 *
 * @param editor        The editor to decorate.
 * @param matches       Color matches with resolved RGBA and document ranges.
 * @param editorBg      The editor background color (for contrast calculations).
 * @param borderRadius  CSS border-radius string.
 */
export function applyDecorations(
  editor: vscode.TextEditor,
  matches: { range: vscode.Range; rgba: RGBA }[],
  options: { editorBg: RGBA; borderRadius: string }
): void {
  const editorId = editorKey(editor);

  // Group ranges by their visual style fingerprint.
  const groups = new Map<string, vscode.Range[]>();

  for (const { range, rgba } of matches) {
    const fg = chooseFgColor(rgba, options.editorBg);
    const key = styleFingerprint(rgba, fg, options.borderRadius);

    let ranges = groups.get(key);
    if (!ranges) {
      ranges = [];
      groups.set(key, ranges);
    }
    ranges.push(range);
  }

  // Apply each group.
  const usedKeys = new Set<string>();

  for (const [key, ranges] of groups) {
    usedKeys.add(key);

    let entry = cache.get(key);
    if (!entry) {
      // Parse the key back to create decoration options.
      entry = createEntry(key);
      addToCache(key, entry);
    } else {
      // Refresh LRU position.
      cache.delete(key);
      cache.set(key, entry);
    }

    entry.activeEditors.add(editorId);
    editor.setDecorations(entry.type, ranges);
  }

  // Clear any previously-applied types that are no longer used by this editor.
  const previousKeys = editorStyleKeys.get(editorId);
  if (previousKeys) {
    for (const oldKey of previousKeys) {
      if (!usedKeys.has(oldKey)) {
        const entry = cache.get(oldKey);
        if (entry) {
          editor.setDecorations(entry.type, []);
          entry.activeEditors.delete(editorId);
        }
      }
    }
  }

  editorStyleKeys.set(editorId, usedKeys);
}

/**
 * Clear all decorations for a given editor.
 */
export function clearDecorations(editor: vscode.TextEditor): void {
  const editorId = editorKey(editor);
  const keys = editorStyleKeys.get(editorId);
  if (!keys) {
    return;
  }

  for (const key of keys) {
    const entry = cache.get(key);
    if (entry) {
      editor.setDecorations(entry.type, []);
      entry.activeEditors.delete(editorId);
    }
  }

  editorStyleKeys.delete(editorId);
}

/**
 * Dispose every cached decoration type; Call on extension deactivation.
 */
export function disposeAll(): void {
  for (const entry of cache.values()) {
    entry.type.dispose();
  }
  cache.clear();
  editorStyleKeys.clear();
}
