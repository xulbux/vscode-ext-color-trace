import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';
import { colorFnStrategy } from './colorFn';
import { hexStrategy } from './hex';
import { hslStrategy } from './hsl';
import { hwbStrategy } from './hwb';
import { oklchStrategy } from './oklch';
import { rgbStrategy } from './rgb';

export const strategies: ColorParsingStrategy[] = [
  colorFnStrategy,
  hexStrategy,
  hslStrategy,
  hwbStrategy,
  oklchStrategy,
  rgbStrategy,
];

/**
 * Iterates through all available strategies to extract color data from a string.
 * Used as a fallback when the specific strategy is unknown (e.g. Tailwind arbitrary values).
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
  return undefined;
}
