import type { ColorData, ColorParsingStrategy } from '@/types';
import { hslToRgb } from '@/utils/color';
import {
  ALPHA,
  HUE,
  NUM,
  clampAlpha,
  extractTokens,
  parseAlpha,
  parseHue,
  parsePercent,
} from '@/utils/strategy';

export const hslStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = extractTokens(matchText);
    if (tokens.length < 3) {
      return undefined;
    }

    const h = parseHue(tokens[0]);
    const s = parsePercent(tokens[1]);
    const l = parsePercent(tokens[2]);
    const a = clampAlpha(parseAlpha(tokens[3]));

    const [r, g, b] = hslToRgb(h, s, l);

    return { css: matchText, rgba: { a, b, g, r } };
  },
  id: 'hsl',
  pattern: String.raw`hsla?\(\s*${HUE}\s*[, \t]\s*${NUM}\s*[, \t]\s*${NUM}(?:\s*[,/]\s*${ALPHA})?\s*\)`,
};
