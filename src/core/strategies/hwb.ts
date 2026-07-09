import type { ColorData, ColorParsingStrategy } from '@/types';
import { hwbToRgb } from '@/utils/color';
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

export const hwbStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = parseColorTokens(matchText, ['hwb'], { allowCommas: false, minTokens: 3 });
    if (!tokens) {
      return undefined;
    }

    const h = parseHue(tokens[0]);
    const w = parsePercent(tokens[1]);
    const bk = parsePercent(tokens[2]);
    const a = clampAlpha(parseAlpha(tokens[3]));

    const [r, g, b] = hwbToRgb(h, w, bk);

    const cssStr = matchText.replace('°', 'deg');
    const opaqueCss = cssStr.replace(/\s*\/\s*[\d.%]+/, '');

    return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
  },
  id: 'hwb',
  pattern: String.raw`hwb\(\s*${HUE}\s+${NUM}\s+${NUM}(?:\s*/\s*${ALPHA})?\s*\)`,
};
