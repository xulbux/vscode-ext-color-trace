import type { ColorData, ColorParsingStrategy } from '@/types';
import {
  ALPHA,
  NUM,
  clampAlpha,
  clampChannel,
  extractTokens,
  parseAlpha,
  parseChannel,
} from '@/utils/strategy';

export const rgbStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = extractTokens(matchText);
    if (tokens.length < 3) {
      return undefined;
    }

    const r = clampChannel(parseChannel(tokens[0]));
    const g = clampChannel(parseChannel(tokens[1]));
    const b = clampChannel(parseChannel(tokens[2]));
    const a = clampAlpha(parseAlpha(tokens[3]));

    return { css: matchText, rgba: { a, b, g, r } };
  },
  id: 'rgb',
  pattern: String.raw`rgba?\(\s*${NUM}\s*[, \t]\s*${NUM}\s*[, \t]\s*${NUM}(?:\s*[,/]\s*${ALPHA})?\s*\)`,
};
