import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';
import { oklabToRgb, oklchToRgb } from '@/utils/color';
import {
  ALPHA,
  BOUNDARY_END,
  BOUNDARY_START,
  HUE,
  NUM,
  clampAlpha,
  parseAlpha,
  parseColorTokens,
  parseHue,
  removeCssAlpha,
} from '@/utils/strategy';

function parseL(token: string): number {
  if (token.endsWith('%')) {
    return Number.parseFloat(token) / 100;
  }
  // For LAB/OKLAB, could be 0-1 or 0-100, we normalize roughly to 0-1 for our fake RGB.
  return Number.parseFloat(token);
}

function parseComponent(token: string): number {
  if (token.endsWith('%')) {
    // In CSS Color 4, 100% for a/b/c in OKLCH/OKLAB is 0.4.
    return (Number.parseFloat(token) / 100) * 0.4;
  }
  return Number.parseFloat(token);
}

function getOklchTokens(
  matchText: string,
  lower: string,
  options?: DocumentResolvedConfig
): { isRawMatch: boolean; tokens: string[] } | undefined {
  if (
    !lower.startsWith('oklch') &&
    !lower.startsWith('lch') &&
    !lower.startsWith('oklab') &&
    !lower.startsWith('lab')
  ) {
    if (!options?.matchOklchWithNoFunction && !options?.matchLchWithNoFunction) {
      return undefined;
    }

    const tokens = matchText.split(/[\s,/]+/).filter(Boolean);
    if (tokens.length < 3) {
      return undefined;
    }
    return { isRawMatch: true, tokens };
  }

  const tokens = parseColorTokens(matchText, ['oklch', 'lch', 'oklab', 'lab'], {
    allowCommas: false,
    minTokens: 3,
  });
  if (!tokens) {
    return undefined;
  }
  return { isRawMatch: false, tokens };
}

function buildOklchCss(
  matchText: string,
  parsed: { isRawMatch: boolean; tokens: string[] },
  options?: DocumentResolvedConfig
): { cssStr: string; opaqueCss: string } {
  if (parsed.isRawMatch) {
    const isOklch = options?.matchOklchWithNoFunction;
    const func = isOklch ? 'oklch' : 'lch';
    const tokensJoined = parsed.tokens.slice(0, 3).join(' ');
    const alphaStr = parsed.tokens[3] ? ` / ${parsed.tokens[3]}` : '';
    const cssStr = `${func}(${tokensJoined}${alphaStr})`.replace('°', 'deg');
    const opaqueCss = `${func}(${tokensJoined})`.replace('°', 'deg');
    return { cssStr, opaqueCss };
  }

  const cssStr = matchText.replace('°', 'deg');
  return { cssStr, opaqueCss: removeCssAlpha(cssStr) };
}

export const oklchStrategy: ColorParsingStrategy = {
  /**
   * Extracts OKLCH/LCH/OKLAB/LAB color data from a matched string.
   */
  extract(matchText: string, options?: DocumentResolvedConfig): ColorData | undefined {
    const lower = matchText.trim().toLowerCase();
    const parsed = getOklchTokens(matchText, lower, options);
    if (!parsed) {
      return undefined;
    }

    const { isRawMatch, tokens } = parsed;
    const l = parseL(tokens[0]);
    const isLchSpace = isRawMatch
      ? options?.matchOklchWithNoFunction || options?.matchLchWithNoFunction
      : lower.startsWith('oklch') || lower.startsWith('lch');

    let r = 0,
      g = 0,
      b = 0;
    const normalizedL = l > 1 ? l / 100 : l;

    if (isLchSpace) {
      const c = parseComponent(tokens[1]);
      const h = parseHue(tokens[2]);
      [r, g, b] = oklchToRgb(normalizedL, c, h);
    } else {
      const aVal = parseComponent(tokens[1]);
      const bVal = parseComponent(tokens[2]);
      [r, g, b] = oklabToRgb(normalizedL, aVal, bVal);
    }

    const a = clampAlpha(parseAlpha(tokens[3]));
    const { cssStr, opaqueCss } = buildOklchCss(matchText, parsed, options);

    return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
  },
  getPatterns(options?: DocumentResolvedConfig): string[] {
    const patterns = [this.pattern];
    if (options?.matchOklchWithNoFunction || options?.matchLchWithNoFunction) {
      patterns.push(
        String.raw`${BOUNDARY_START}${NUM}\s+${NUM}\s+${HUE}(?:\s*/\s*${ALPHA})?${BOUNDARY_END}`
      );
    }
    return patterns;
  },
  id: 'oklch',
  pattern: String.raw`(?:(?:oklch|lch)\(\s*${NUM}\s+${NUM}\s+${HUE}(?:\s*/\s*${ALPHA})?\s*\)|(?:oklab|lab)\(\s*${NUM}\s+${NUM}\s+${NUM}(?:\s*/\s*${ALPHA})?\s*\))`,
};
