import type { ColorData, ColorParsingStrategy, DocumentResolvedConfig } from '@/types';

export function parseHex(
  digits: string,
  useARGB = false
): { r: number; g: number; b: number; a: number } | undefined {
  let a = 1,
    r = 0,
    g = 0,
    b = 0;

  switch (digits.length) {
    case 3:
    case 4: {
      r = Number.parseInt(digits[0] + digits[0], 16);
      g = Number.parseInt(digits[1] + digits[1], 16);
      b = Number.parseInt(digits[2] + digits[2], 16);
      if (digits.length === 4) {
        a = Number.parseInt(digits[3] + digits[3], 16) / 255;
      }
      break;
    }
    case 6:
    case 8: {
      if (useARGB && digits.length === 8) {
        a = Number.parseInt(digits.slice(0, 2), 16) / 255;
        r = Number.parseInt(digits.slice(2, 4), 16);
        g = Number.parseInt(digits.slice(4, 6), 16);
        b = Number.parseInt(digits.slice(6, 8), 16);
      } else {
        r = Number.parseInt(digits.slice(0, 2), 16);
        g = Number.parseInt(digits.slice(2, 4), 16);
        b = Number.parseInt(digits.slice(4, 6), 16);
        if (digits.length === 8) {
          a = Number.parseInt(digits.slice(6, 8), 16) / 255;
        }
      }
      break;
    }
    default: {
      return undefined;
    }
  }

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
    return undefined;
  }

  return { a, b, g, r };
}

export const hexStrategy: ColorParsingStrategy = {
  extract(matchText: string, options?: DocumentResolvedConfig): ColorData | undefined {
    const match = /^(?:#|0x)(?<hexDigits>[0-9a-f]{3,8})$/i.exec(matchText.trim());
    if (!match) {
      return undefined;
    }
    const { hexDigits: digits } = match.groups as { hexDigits: string };

    const rgba = parseHex(digits, options?.useARGB);
    if (!rgba) {
      return undefined;
    }

    // For hex colors, the native CSS representation is usually best kept as the hex string.
    // Except if it's 0x… we convert to #… so CSS understands it.
    let cssStr = matchText.trim();
    if (cssStr.toLowerCase().startsWith('0x')) {
      cssStr = `#${digits}`;
    }

    if (options?.useARGB && digits.length === 8) {
      const aa = digits.slice(0, 2);
      const rrggbb = digits.slice(2, 8);
      cssStr = `#${rrggbb}${aa}`;
    }

    let opaqueCss = '';
    if (options?.useARGB && digits.length === 8) {
      opaqueCss = `#${digits.slice(2, 8)}`;
    } else {
      let len = digits.length;
      if (len === 4) {
        len = 3;
      } else if (len === 8) {
        len = 6;
      }
      opaqueCss = `#${digits.slice(0, len)}`;
    }

    return { css: cssStr, opaqueCss, rgba };
  },
  id: 'hex',
  /** Hexa pattern: `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` and `0x...` equivalents */
  pattern: String.raw`(?:#|0x)(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b`,
};
