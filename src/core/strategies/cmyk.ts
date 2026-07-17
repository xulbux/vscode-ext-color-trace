import type { ColorData, ColorParsingStrategy } from '@/types';
import { cmykToRgb } from '@/utils/color';
import {
  ALPHA,
  NUM,
  clampAlpha,
  parseAlpha,
  parseColorTokens,
  parsePercent,
} from '@/utils/strategy';

export const cmykStrategy: ColorParsingStrategy = {
  /**
   * Extracts `device-cmyk` color data from a matched string.
   */
  extract(matchText: string): ColorData | undefined {
    // `device-cmyk` does not allow commas natively in CSS Color 4.
    const tokens = parseColorTokens(matchText, ['device-cmyk'], {
      allowCommas: false,
      maxChannelsBeforeSlash: 4,
      minTokens: 4,
    });
    if (!tokens) {
      return undefined;
    }

    const [c, m, y, k] = tokens.slice(0, 4).map((t) => parsePercent(t, true));
    const a = clampAlpha(parseAlpha(tokens[4]));

    if (
      Number.isNaN(c) ||
      Number.isNaN(m) ||
      Number.isNaN(y) ||
      Number.isNaN(k) ||
      Number.isNaN(a)
    ) {
      return undefined;
    }

    const [r, g, b] = cmykToRgb([c, m, y, k]);

    const cssStr = `rgba(${r}, ${g}, ${b}, ${a})`;
    const opaqueCss = `rgb(${r}, ${g}, ${b})`;

    return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
  },
  id: 'cmyk',
  pattern: String.raw`device-cmyk\(\s*${NUM}\s+${NUM}\s+${NUM}\s+${NUM}(?:\s*/\s*${ALPHA})?\s*\)`,
};
