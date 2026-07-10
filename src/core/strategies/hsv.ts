import type { ColorData, ColorParsingStrategy } from '@/types';
import { hsvToRgb } from '@/utils/color';
import {
  ALPHA,
  HUE,
  NUM,
  clampAlpha,
  parseAlpha,
  parseColorTokens,
  parseHue,
  parsePercent,
} from '@/utils/strategy';

export const hsvStrategy: ColorParsingStrategy = {
  /**
   * Extracts HSV/HSVA color data from a matched string.
   */
  extract(matchText: string): ColorData | undefined {
    const tokens = parseColorTokens(matchText, ['hsv', 'hsva'], { minTokens: 3 });
    if (!tokens) {
      return undefined;
    }

    const h = parseHue(tokens[0]);
    const [s, v] = tokens.slice(1, 3).map((t) => parsePercent(t));
    const a = clampAlpha(parseAlpha(tokens[3]));

    if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(v) || Number.isNaN(a)) {
      return undefined;
    }

    const [r, g, b] = hsvToRgb(h, s, v);

    const cssStr = `rgba(${r}, ${g}, ${b}, ${a})`;
    const opaqueCss = `rgb(${r}, ${g}, ${b})`;

    return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
  },
  id: 'hsv',
  pattern: String.raw`hsva?\(\s*${HUE}\s*[, \t]\s*${NUM}\s*[, \t]\s*${NUM}(?:\s*[,/]\s*${ALPHA})?\s*\)`,
};
