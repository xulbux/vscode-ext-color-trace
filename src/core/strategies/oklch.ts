import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';
import {
  ALPHA,
  BOUNDARY_END,
  BOUNDARY_START,
  HUE,
  NUM,
  clampAlpha,
  parseAlpha,
  parseColorTokens,
  removeCssAlpha,
} from '@/utils/strategy';

function parseL(token: string): number {
  if (token.endsWith('%')) {
    return Number.parseFloat(token) / 100;
  }
  // For lab/oklab, could be 0-1 or 0-100, we normalize roughly to 0-1 for our fake rgb.
  return Number.parseFloat(token);
}

/**
 * Very rough approximation to sRGB for fallback purposes.
 * We only need this to calculate text foreground contrast (black vs white text).
 * The actual rendering uses the native CSS string which VS Code renders perfectly.
 */
function approximateRgbFromL(l: number): { r: number; g: number; b: number } {
  const normalizedL = l > 1 ? l / 100 : l;
  const v = Math.round(normalizedL * 255);
  return { b: v, g: v, r: v };
}

export const oklchStrategy: ColorParsingStrategy = {
  /**
   * Extracts OKLCH/LCH/OKLAB/LAB color data from a matched string.
   */
  extract(matchText: string, options?: DocumentResolvedConfig): ColorData | undefined {
    const lower = matchText.trim().toLowerCase();

    // Check for raw matching
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

      const l = parseL(tokens[0]);
      const { r, g, b } = approximateRgbFromL(l);
      const a = clampAlpha(parseAlpha(tokens[3]));

      const isOklch = options.matchOklchWithNoFunction;
      const func = isOklch ? 'oklch' : 'lch';

      const tokensJoined = tokens.slice(0, 3).join(' ');
      const alphaStr = tokens[3] ? ` / ${tokens[3]}` : '';
      const cssStr = `${func}(${tokensJoined}${alphaStr})`.replace('°', 'deg');
      const opaqueCss = `${func}(${tokensJoined})`.replace('°', 'deg');

      return { css: cssStr, opaqueCss, rgba: { a, b, g, r } };
    }

    const tokens = parseColorTokens(matchText, ['oklch', 'lch', 'oklab', 'lab'], {
      allowCommas: false,
      minTokens: 3,
    });
    if (!tokens) {
      return undefined;
    }

    const l = parseL(tokens[0]);
    const { r, g, b } = approximateRgbFromL(l);
    const a = clampAlpha(parseAlpha(tokens[3]));

    const cssStr = matchText.replace('°', 'deg');
    const opaqueCss = removeCssAlpha(cssStr);

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
