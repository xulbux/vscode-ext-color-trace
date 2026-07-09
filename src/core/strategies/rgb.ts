import type { ColorData, ColorParsingStrategy } from '@/types';
import {
  ALPHA,
  NUM,
  clampAlpha,
  clampChannel,
  parseAlpha,
  parseChannel,
  parseColorTokens,
} from '@/utils/strategy';
import { parseHex } from './hex';

export const rgbStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    const tokens = parseColorTokens(matchText, ['rgb'], { minTokens: 1 });
    if (!tokens) {
      return undefined;
    }

    if (tokens.length === 1) {
      // Hyprland-style `rgb(HEX)` or `rgba(HEXA)`
      const [hexStr] = tokens;
      const hexLen = hexStr.length;
      if (hexLen === 3 || hexLen === 4 || hexLen === 6 || hexLen === 8) {
        if (/^[0-9A-F]+$/i.test(hexStr)) {
          const rgba = parseHex(hexStr);
          if (rgba) {
            // Return a valid CSS hex string so the browser rendering engine doesn't reject it.
            return { css: `#${hexStr}`, rgba };
          }
        }
      }
      return undefined;
    }

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
  pattern: String.raw`rgba?\((?:\s*${NUM}\s*[, \t]\s*${NUM}\s*[, \t]\s*${NUM}(?:\s*[,/]\s*${ALPHA})?\s*|\s*[0-9a-fA-F]{3,8}\s*)\)`,
};
