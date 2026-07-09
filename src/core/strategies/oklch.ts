import type { ColorData, ColorParsingStrategy } from '@/types';
import { ALPHA, NUM, clampAlpha, extractTokens, parseAlpha } from '@/utils/strategy';

function parseL(token: string): number {
  if (token.endsWith('%')) {
    return Number.parseFloat(token) / 100;
  }
  return Number.parseFloat(token); // for lab/oklab, could be 0-1 or 0-100, we normalize roughly to 0-1 for our fake rgb.
}

/**
 * Very rough approximation to sRGB for fallback purposes.
 * We only need this to calculate text foreground contrast (black vs white text).
 * The actual rendering uses the native CSS string which VS Code renders perfectly.
 */
function approximateRgbFromL(l: number): { r: number; g: number; b: number } {
  // Just map lightness to a grey value for contrast checks.
  // This is a naive approximation since chroma/hue can affect perceived luminance,
  // but for a text contrast fallback, lightness is usually sufficient.
  // Lab L is 0-100, OKLab L is 0-1.
  const normalizedL = l > 1 ? l / 100 : l;
  const v = Math.round(normalizedL * 255);
  return { b: v, g: v, r: v };
}

export const oklchStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = extractTokens(matchText);
    if (tokens.length < 3) {
      return undefined;
    }

    // We only extract L to build a rough grayscale RGBA fallback for contrast checking.
    // The native CSS string is used for the actual colored background.
    const l = parseL(tokens[0]);

    const { r, g, b } = approximateRgbFromL(l);
    const a = clampAlpha(parseAlpha(tokens[3]));

    return { css: matchText, rgba: { a, b, g, r } };
  },
  id: 'oklch',
  pattern: String.raw`(?:oklch|lch|oklab|lab)\(\s*${NUM}\s+${NUM}\s+${NUM}(?:\s*/\s*${ALPHA})?\s*\)`,
};
