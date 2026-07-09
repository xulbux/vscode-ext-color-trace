/**
 * Manages the creation, caching, and disposal of TextEditorDecorationTypes.
 *
 * Each unique visual style (determined by `bg`, `fg`, `border`, and `radius`)
 * gets its own decoration type, cached via an LRU Map.
 * Ranges for the same style are batched into a single `setDecorations` call.
 */

import * as vscode from 'vscode';
import type { ColorData, DecorationEntry, RGBA } from '@/types';
import { alphaBlend, relativeLuminance, rgbaToHexString } from '@/utils/color';

// ---------------------------------------- CACHE ----------------------------------------

const LRU_CAPACITY = 4096;

/** LRU cache: style fingerprint → DecorationEntry. */
const cache = new Map<string, DecorationEntry>();

/** Tracks which style keys are applied per editor to enable cleanup. */
const editorStyleKeys = new Map<string, Set<string>>();

// -------------------------------------- INTERNALS --------------------------------------

/**
 * Build a unique fingerprint for a decoration style.
 * Format: `bg:<css>|fg:<hex>|border:<css>|outline:<css>`
 *
 * @param color       The highlight color data containing native CSS string and RGBA fallback.
 * @param editorBg    The editor background color (for contrast calculations).
 * @param outlineCss  The statically calculated outline CSS.
 */
function styleFingerprint(color: ColorData, editorBg: RGBA, outlineCss: string): string {
  // If the highlight is semi-transparent, blend it over the editor background first
  const { rgba } = color;
  const solid = rgba.a < 1 ? alphaBlend(rgba, editorBg) : rgba;
  const lum = relativeLuminance(solid.r, solid.g, solid.b);
  const fg = lum > 0.179 ? '#000000' : '#FFFFFF';

  // Always use the native CSS string for the actual background decoration, unless we need to force opacity for the border.
  const bgCss = color.css;
  const isTransparent = rgba.a < 1;

  // For transparent colors, use the opaque version for the border (so the border is solid).
  // Special case: for the `transparent` CSS keyword, make the border transparent too so it doesn't render black.
  let borderColor = isTransparent ? rgbaToHexString({ ...rgba, a: 1 }) : bgCss;
  if (color.css.toLowerCase() === 'transparent') {
    borderColor = 'transparent';
  }

  return `bg:${bgCss}|fg:${fg}|borderColor:${borderColor}|outline:${outlineCss}`;
}

function createEntry(fingerprint: string): DecorationEntry {
  let bg = 'transparent',
    fg = '#FFFFFF',
    borderColor: string | undefined = undefined,
    outline: string | undefined = undefined;

  for (const segment of fingerprint.split('|')) {
    const idx = segment.indexOf(':');
    if (idx !== -1) {
      const key = segment.slice(0, idx);
      const val = segment.slice(idx + 1);

      if (key === 'bg') {
        bg = val;
      } else if (key === 'fg') {
        fg = val;
      } else if (key === 'borderColor') {
        borderColor = val;
      } else if (key === 'outline') {
        outline = val;
      }
    }
  }

  const decoOptions: vscode.DecorationRenderOptions = {
    backgroundColor: bg,
    borderColor,
    borderRadius: '0.25em',
    borderStyle: 'solid',
    borderWidth: '0.2em 0.06em',
    color: fg,
    outline,
  };

  return {
    activeEditors: new Set(),
    type: vscode.window.createTextEditorDecorationType(decoOptions),
  };
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
 * @param editor    The editor to decorate.
 * @param matches   Color matches with resolved RGBA and document ranges.
 * @param editorBg  The editor background color (for contrast calculations).
 */
export function applyDecorations(
  editor: vscode.TextEditor,
  matches: { range: vscode.Range; color: ColorData }[],
  options: { editorBg: RGBA }
): void {
  const editorId = editorKey(editor);

  // Group ranges by their visual style fingerprint.
  const groups = new Map<string, vscode.Range[]>();

  // Calculate static outline CSS once for the whole file scan based on editor bg.
  const editorLum = relativeLuminance(options.editorBg.r, options.editorBg.g, options.editorBg.b);
  const outlineCss =
    editorLum > 0.179 ? '1px solid rgb(0 0 0 / 0.10)' : '1px solid rgb(255 255 255 / 0.16)';

  for (const { range, color } of matches) {
    const key = styleFingerprint(color, options.editorBg, outlineCss);

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
