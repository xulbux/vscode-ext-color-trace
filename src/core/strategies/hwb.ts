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
  removeCssAlpha,
} from '@/utils/strategy';

export const hwbStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = parseColorTokens(matchText, ['hwb'], { allowCommas: false, minTokens: 3 });
    if (!tokens) {
      return undefined;
    }

    const h = parseHue(tokens[0]);
    const [w, bk] = tokens.slice(1, 3).map((t) => parsePercent(t));
    const a = clampAlpha(parseAlpha(tokens[3]));

    const [r, g, b] = hwbToRgb(h, w, bk);

    const cssStr = matchText.replace('°', 'deg');
    const opaqueCss = removeCssAlpha(cssStr);

    return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
  },
  id: 'hwb',
  pattern: String.raw`hwb\(\s*${HUE}\s+${NUM}\s+${NUM}(?:\s*/\s*${ALPHA})?\s*\)`,
};
