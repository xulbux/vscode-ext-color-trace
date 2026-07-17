import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';
import { cmykStrategy } from './cmyk';
import { colorFnStrategy } from './colorFn';
import { hexStrategy } from './hex';
import { hslStrategy } from './hsl';
import { hsvStrategy } from './hsv';
import { hwbStrategy } from './hwb';
import { oklchStrategy } from './oklch';
import { rgbStrategy } from './rgb';
import { swiftStrategy } from './swift';

export const strategies: ColorParsingStrategy[] = [
  cmykStrategy,
  colorFnStrategy,
  hexStrategy,
  hslStrategy,
  hsvStrategy,
  hwbStrategy,
  oklchStrategy,
  rgbStrategy,
  swiftStrategy,
];

import { NAMED_COLORS } from '@/consts/namedColors';
import { SPECIAL_TRANSPARENT } from '@/consts/specialColors';

/**
 * Iterates through all available strategies to extract color data from a string.
 * Used as a fallback when the specific strategy is unknown (e.g., Tailwind arbitrary values).
 */
export function extractWithStrategies(
  matchText: string,
  options?: DocumentResolvedConfig
): ColorData | undefined {
  for (const strategy of strategies) {
    const data = strategy.extract(matchText, options);
    if (data) {
      return data;
    }
  }

  const word = matchText.trim().toLowerCase();
  const rgb = NAMED_COLORS.get(word);
  if (rgb) {
    if (rgb === SPECIAL_TRANSPARENT) {
      return {
        css: 'transparent',
        opaqueCss: 'transparent',
        rgba: { a: 0, b: 0, g: 0, r: 0 },
        special: SPECIAL_TRANSPARENT,
      };
    }
    return { css: word, opaqueCss: word, rgba: { a: 1, b: rgb[2], g: rgb[1], r: rgb[0] } };
  }

  return undefined;
}
