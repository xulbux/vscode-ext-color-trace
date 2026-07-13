/** RGBA color with `r` `g` `b` in 0-255 and `a` in 0-1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

import type { SPECIAL_TRANSPARENT } from '@/consts/specialColors';

/** Represents a parsed color with both its native CSS string and an RGBA fallback. */
export interface ColorData {
  /** RGBA approximation used to calculate text foreground contrast. */
  rgba: RGBA;
  /** The native CSS string used to style the marker (e.g., `oklch(80% 0.25 250)`). */
  css: string;
  /** The native CSS string, but fully opaque, used when showAlpha is false. */
  opaqueCss: string;
  /** Optional special token used to override default rendering behaviors. */
  special?: typeof SPECIAL_TRANSPARENT;
}

import type { DocumentResolvedConfig } from './config';

/** Defines how to match and extract a specific color format (e.g., HEX, RGB, HSL). */
export interface ColorParsingStrategy {
  /** Unique identifier for the strategy. */
  id: string;
  /** The regex source string without capture groups that might conflict, or a non-capturing pattern. */
  pattern: string;
  /** Returns an array of alternative regex source strings for matching. */
  getPatterns?: (options?: DocumentResolvedConfig) => string[];
  /** Parses the matched string into `ColorData`. */
  extract: (matchText: string, options?: DocumentResolvedConfig) => ColorData | undefined;
}

/** A color found in a text document. */
export interface ColorMatch {
  /** Optional start offset of the entire class/declaration (useful for dot-before styles). */
  fullStartOffset?: number;
  /** Start offset within the scanned text. */
  startOffset: number;
  /** End offset within the scanned text (exclusive). */
  endOffset: number;
  /** The original matched text (e.g., `#F00`, `rgb(255,0,0)`, `red`, …). */
  originalText: string;
  /** The resolved `ColorData` object containing native CSS string and RGBA fallback. */
  color: ColorData;
}
