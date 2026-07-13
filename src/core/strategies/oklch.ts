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

function toSrgb(c: number): number {
  const val = c >= 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c;
  return Math.max(0, Math.min(255, Math.round(val * 255)));
}

/**
 * Approximate OKLCH/OKLAB to sRGB.
 * This is used for fallback purposes and for calculating text foreground contrast.
 * A full OKLAB to sRGB conversion gives us accurate luminance.
 */
function toRgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  const lVal = l + 0.3963377774 * a + 0.2158037573 * b;
  const mVal = l - 0.1055613458 * a - 0.0638541728 * b;
  const sVal = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lVal * lVal * lVal;
  const m3 = mVal * mVal * mVal;
  const s3 = sVal * sVal * sVal;

  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return { b: toSrgb(bLin), g: toSrgb(gLin), r: toSrgb(rLin) };
}

function parseAandB(cStr: string, hStr: string, isLch: boolean): { aVal: number; bVal: number } {
  if (isLch) {
    const c = cStr.endsWith('%') ? (Number.parseFloat(cStr) / 100) * 0.4 : Number.parseFloat(cStr);
    const h = parseHue(hStr);
    const hr = (h * Math.PI) / 180;
    return { aVal: c * Math.cos(hr), bVal: c * Math.sin(hr) };
  }
  const aVal = cStr.endsWith('%') ? (Number.parseFloat(cStr) / 100) * 0.4 : Number.parseFloat(cStr);
  const bVal = hStr.endsWith('%') ? (Number.parseFloat(hStr) / 100) * 0.4 : Number.parseFloat(hStr);
  return { aVal, bVal };
}

export const oklchStrategy: ColorParsingStrategy = {
  /**
   * Extracts OKLCH/LCH/OKLAB/LAB color data from a matched string.
   */
  extract(matchText: string, options?: DocumentResolvedConfig): ColorData | undefined {
    let tokens: string[] | undefined = undefined;
    const lower = matchText.trim().toLowerCase();
    let isRawMatch = false;

    if (
      !lower.startsWith('oklch') &&
      !lower.startsWith('lch') &&
      !lower.startsWith('oklab') &&
      !lower.startsWith('lab')
    ) {
      if (!options?.matchOklchWithNoFunction && !options?.matchLchWithNoFunction) {
        return undefined;
      }

      tokens = matchText.split(/[\s,/]+/).filter(Boolean);
      if (tokens.length < 3) {
        return undefined;
      }
      isRawMatch = true;
    } else {
      tokens = parseColorTokens(matchText, ['oklch', 'lch', 'oklab', 'lab'], {
        allowCommas: false,
        minTokens: 3,
      });
      if (!tokens) {
        return undefined;
      }
    }

    const isLch = lower.startsWith('oklch') || lower.startsWith('lch') || isRawMatch;
    const [token0, token1, token2, token3] = tokens;
    const l = parseL(token0);
    const { aVal, bVal } = parseAandB(token1, token2, isLch);

    const { r, g, b } = toRgb(l, aVal, bVal);
    const a = clampAlpha(parseAlpha(token3));

    let cssStr = '';
    let opaqueCss = '';

    if (isRawMatch) {
      const isOklch = options?.matchOklchWithNoFunction;
      const func = isOklch ? 'oklch' : 'lch';
      const tokensJoined = tokens.slice(0, 3).join(' ');
      const alphaStr = token3 ? ` / ${token3}` : '';
      cssStr = `${func}(${tokensJoined}${alphaStr})`.replace('°', 'deg');
      opaqueCss = `${func}(${tokensJoined})`.replace('°', 'deg');
    } else {
      cssStr = matchText.replace('°', 'deg');
      opaqueCss = removeCssAlpha(cssStr);
    }

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
