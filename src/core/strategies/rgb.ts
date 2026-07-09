import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';
import { formatHexCss } from '@/utils/color';
import {
  ALPHA,
  NUM,
  NUM_NO_PERCENT,
  BOUNDARY_START,
  BOUNDARY_END,
  clampAlpha,
  clampChannel,
  parseAlpha,
  parseChannel,
  parseColorTokens,
} from '@/utils/strategy';
import { parseHex } from './hex';

export const rgbStrategy: ColorParsingStrategy = {
  // oxlint-disable-next-line complexity
  extract(matchText: string, options?: DocumentResolvedConfig): ColorData | undefined {
    let r = 0,
      g = 0,
      b = 0,
      a = 1;
    const lower = matchText.trim().toLowerCase();

    // Check if it's a raw match (no function wrapper).
    if (
      !lower.startsWith('rgb') &&
      !lower.startsWith('argb') &&
      !lower.startsWith('#') &&
      !lower.startsWith('0x')
    ) {
      if (!options?.matchRgbWithNoFunction) {
        return undefined;
      }
      const tokens = matchText.split(/[\s,/]+/).filter(Boolean);
      if (tokens.length < 3) {
        return undefined;
      }
      if (tokens.slice(0, 3).some((t) => t.includes('%'))) {
        return undefined;
      }
      r = clampChannel(parseChannel(tokens[0]));
      g = clampChannel(parseChannel(tokens[1]));
      b = clampChannel(parseChannel(tokens[2]));
      a = clampAlpha(parseAlpha(tokens[3]));

      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
        return undefined;
      }

      const opaqueCss = `rgb(${r}, ${g}, ${b})`;
      return { css: `rgba(${r}, ${g}, ${b}, ${a})`, opaqueCss, rgba: { a, b, g, r } };
    }

    const tokens = parseColorTokens(matchText, ['rgb', 'argb'], { minTokens: 1 });
    if (!tokens) {
      return undefined;
    }

    if (tokens.length === 1) {
      // Hyprland-style `rgb(HEX)` or `rgba(HEXA)`.
      const [hexStr] = tokens;
      const hexLen = hexStr.length;
      if (hexLen === 3 || hexLen === 4 || hexLen === 6 || hexLen === 8) {
        if (/^[0-9A-F]+$/i.test(hexStr)) {
          const rgba = parseHex(hexStr, options?.useARGB);
          if (rgba) {
            // Return a valid CSS hex string so the browser rendering engine doesn't reject it.
            const { cssStr, opaqueCss } = formatHexCss(hexStr, options?.useARGB);

            return { css: cssStr, opaqueCss, rgba };
          }
        }
      }
      return undefined;
    }

    if (tokens.length < 3) {
      return undefined;
    }

    if (lower.startsWith('argb')) {
      // argb(A, R, G, B) where A is usually 0-255 or 0-1
      const alphaVal = parseChannel(tokens[0]);
      a = clampAlpha(
        tokens[0].includes('%') || alphaVal <= 1 ? parseAlpha(tokens[0]) : alphaVal / 255
      );
      r = clampChannel(parseChannel(tokens[1]));
      g = clampChannel(parseChannel(tokens[2]));
      b = clampChannel(parseChannel(tokens[3]));

      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
        return undefined;
      }

      const opaqueCss = `rgb(${r}, ${g}, ${b})`;
      return { css: `rgba(${r}, ${g}, ${b}, ${a})`, opaqueCss, rgba: { a, b, g, r } };
    }

    r = clampChannel(parseChannel(tokens[0]));
    g = clampChannel(parseChannel(tokens[1]));
    b = clampChannel(parseChannel(tokens[2]));
    a = clampAlpha(parseAlpha(tokens[3]));

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
      return undefined;
    }

    const opaqueCss = `rgb(${r}, ${g}, ${b})`;
    return { css: matchText, opaqueCss, rgba: { a, b, g, r } };
  },
  getPatterns(options?: DocumentResolvedConfig): string[] {
    const patterns = [this.pattern];
    if (options?.matchRgbWithNoFunction) {
      patterns.push(
        String.raw`${BOUNDARY_START}${NUM_NO_PERCENT}\s*[, \t]\s*${NUM_NO_PERCENT}\s*[, \t]\s*${NUM_NO_PERCENT}(?:\s*[,/]\s*${ALPHA})?${BOUNDARY_END}`
      );
    }
    return patterns;
  },
  id: 'rgb',
  pattern: String.raw`a?rgba?\((?:\s*${NUM}\s*[, \t]\s*${NUM}\s*[, \t]\s*${NUM}(?:\s*[,/]\s*${ALPHA})?\s*|\s*[0-9a-fA-F]{3,8}\s*)\)`,
};
