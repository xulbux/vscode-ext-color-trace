/** RGBA color with `r` `g` `b` in 0-255 and `a` in 0-1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorData {
  /** The native CSS string used to style the highlight (e.g. `oklch(60% 0.1 250)`) */
  css: string;
  /** RGBA approximation used to calculate text foreground contrast */
  rgba: RGBA;
}

export interface ColorParsingStrategy {
  id: string;
  /** The regex source string without capture groups that might conflict, or a non-capturing pattern. */
  pattern: string;
  /** Parses the matched string into ColorData. */
  extract: (matchText: string) => ColorData | undefined;
}

/** A color found in a text document. */
export interface ColorMatch {
  /** Start offset within the scanned text. */
  startOffset: number;
  /** End offset within the scanned text (exclusive). */
  endOffset: number;
  /** The resolved ColorData object containing native CSS string and RGBA fallback. */
  color: ColorData;
  /** The original matched text (e.g. `#ff0000`, `rgb(255,0,0)`, `red`, …). */
  originalText: string;
}
