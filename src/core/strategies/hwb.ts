import type { ColorData, ColorParsingStrategy } from '@/types';
import { hwbToRgb } from '@/utils/color';
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

export const hwbStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = extractTokens(matchText);
    if (tokens.length < 3) {
      return undefined;
    }

    const h = parseHue(tokens[0]);
    const w = parsePercent(tokens[1]);
    const bk = parsePercent(tokens[2]);
    const a = clampAlpha(parseAlpha(tokens[3]));

    const [r, g, b] = hwbToRgb(h, w, bk);

    return { css: matchText, rgba: { a, b, g, r } };
  },
  id: 'hwb',
  pattern: String.raw`hwb\(\s*${HUE}\s+${NUM}\s+${NUM}(?:\s*/\s*${ALPHA})?\s*\)`,
};
