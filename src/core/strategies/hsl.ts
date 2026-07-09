import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';
import { hslToRgb } from '@/utils/color';
import {
  ALPHA,
  HUE,
  NUM,
  PERCENT,
  BOUNDARY_START,
  BOUNDARY_END,
  clampAlpha,
  parseAlpha,
  parseColorTokens,
  parseHue,
  parsePercent,
} from '@/utils/strategy';

export const hslStrategy: ColorParsingStrategy = {
  extract(matchText: string, options?: DocumentResolvedConfig): ColorData | undefined {
    let h = 0,
      s = 0,
      l = 0,
      a = 1;
    const lower = matchText.trim().toLowerCase();

    if (!lower.startsWith('hsl')) {
      if (!options?.matchHslWithNoFunction) {
        return undefined;
      }
      const tokens = matchText.split(/[\s,/]+/).filter(Boolean);
      if (tokens.length < 3) {
        return undefined;
      }
      if (!tokens[1].includes('%') || !tokens[2].includes('%')) {
        return undefined;
      }
      h = parseHue(tokens[0]);
      s = parsePercent(tokens[1]);
      l = parsePercent(tokens[2]);
      a = clampAlpha(parseAlpha(tokens[3]));
    } else {
      const tokens = parseColorTokens(matchText, ['hsl']);
      if (!tokens) {
        return undefined;
      }

      h = parseHue(tokens[0]);
      s = parsePercent(tokens[1]);
      l = parsePercent(tokens[2]);
      a = clampAlpha(parseAlpha(tokens[3]));
    }

    if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l) || Number.isNaN(a)) {
      return undefined;
    }

    const [r, g, b] = hslToRgb(h, s, l);

    const cssStr = lower.startsWith('hsl')
      ? matchText.replace('°', 'deg')
      : `hsla(${h}, ${s * 100}%, ${l * 100}%, ${a})`;
    const opaqueCss = `hsl(${h}, ${s * 100}%, ${l * 100}%)`;

    return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
  },
  getPatterns(options?: DocumentResolvedConfig): string[] {
    const patterns = [this.pattern];
    if (options?.matchHslWithNoFunction) {
      patterns.push(
        String.raw`${BOUNDARY_START}${HUE}\s*[, \t]\s*${PERCENT}\s*[, \t]\s*${PERCENT}(?:\s*[,/]\s*${ALPHA})?${BOUNDARY_END}`
      );
    }
    return patterns;
  },
  id: 'hsl',
  pattern: String.raw`hsla?\(\s*${HUE}\s*[, \t]\s*${NUM}\s*[, \t]\s*${NUM}(?:\s*[,/]\s*${ALPHA})?\s*\)`,
};
