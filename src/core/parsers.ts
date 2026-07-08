import { type RGBA, hslToRgb, hwbToRgb } from './colorUtils';

// ----------------------------------- INTERNAL PARSERS ----------------------------------

/** Parse a numeric token as a 0-255 value or percentage. */
export function parseChannel(token: string): number {
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * 255;
  }
  return Number.parseFloat(token);
}

/** Parse an alpha token (number 0-1 or percentage). */
export function parseAlpha(token: string | undefined): number {
  if (token === undefined) {
    return 1;
  }
  if (token.endsWith('%')) {
    return Number.parseFloat(token) / 100;
  }
  return Number.parseFloat(token);
}

/** Parse a hue token with optional unit. */
export function parseHue(token: string): number {
  const value = Number.parseFloat(token);
  if (token.endsWith('deg')) {
    return value;
  }
  if (token.endsWith('rad')) {
    return (value * 180) / Math.PI;
  }
  if (token.endsWith('grad')) {
    return (value * 360) / 400;
  }
  if (token.endsWith('turn')) {
    return value * 360;
  }
  return value; // bare number = degrees
}

/** Parse a percentage token to a 0-1 value. */
export function parsePercent(token: string): number {
  if (token.endsWith('%')) {
    return Number.parseFloat(token) / 100;
  }
  return Number.parseFloat(token);
}

/** Extract tokens from inside parentheses. */
export function extractTokens(str: string): string[] {
  const inner = str.slice(str.indexOf('(') + 1, str.lastIndexOf(')'));
  // Normalize separators: replace commas and slashes with spaces, then split.
  return inner.replace(/[,/]/g, ' ').trim().split(/\s+/);
}

/** Clamp and round a channel value to 0-255. */
export function clampChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

/** Clamp an alpha value to 0-1. */
export function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function parseRgb(str: string): RGBA | undefined {
  const tokens = extractTokens(str);
  if (tokens.length < 3) {
    return undefined;
  }

  const r = clampChannel(parseChannel(tokens[0]));
  const g = clampChannel(parseChannel(tokens[1]));
  const b = clampChannel(parseChannel(tokens[2]));
  const a = clampAlpha(parseAlpha(tokens[3]));

  return { a, b, g, r };
}

export function parseHsl(str: string): RGBA | undefined {
  const tokens = extractTokens(str);
  if (tokens.length < 3) {
    return undefined;
  }

  const h = parseHue(tokens[0]);
  const s = parsePercent(tokens[1]);
  const l = parsePercent(tokens[2]);
  const a = clampAlpha(parseAlpha(tokens[3]));

  const [r, g, b] = hslToRgb(h, s, l);
  return { a, b, g, r };
}

export function parseHwb(str: string): RGBA | undefined {
  const tokens = extractTokens(str);
  if (tokens.length < 3) {
    return undefined;
  }

  const h = parseHue(tokens[0]);
  const w = parsePercent(tokens[1]);
  const bk = parsePercent(tokens[2]);
  const a = clampAlpha(parseAlpha(tokens[3]));

  const [r, g, b] = hwbToRgb(h, w, bk);
  return { a, b, g, r };
}

/** Parse `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` */
export function parseHexColor(hex: string): RGBA | undefined {
  const match = /^#(?<hexDigits>[0-9a-fA-F]{3,8})$/.exec(hex);
  if (!match) {
    return undefined;
  }
  const { hexDigits: digits } = match.groups as { hexDigits: string };

  switch (digits.length) {
    case 3: {
      return {
        a: 1,
        b: Number.parseInt(digits[2] + digits[2], 16),
        g: Number.parseInt(digits[1] + digits[1], 16),
        r: Number.parseInt(digits[0] + digits[0], 16),
      };
    }
    case 4: {
      return {
        a: Number.parseInt(digits[3] + digits[3], 16) / 255,
        b: Number.parseInt(digits[2] + digits[2], 16),
        g: Number.parseInt(digits[1] + digits[1], 16),
        r: Number.parseInt(digits[0] + digits[0], 16),
      };
    }
    case 6: {
      return {
        a: 1,
        b: Number.parseInt(digits.slice(4, 6), 16),
        g: Number.parseInt(digits.slice(2, 4), 16),
        r: Number.parseInt(digits.slice(0, 2), 16),
      };
    }
    case 8: {
      return {
        a: Number.parseInt(digits.slice(6, 8), 16) / 255,
        b: Number.parseInt(digits.slice(4, 6), 16),
        g: Number.parseInt(digits.slice(2, 4), 16),
        r: Number.parseInt(digits.slice(0, 2), 16),
      };
    }
    default: {
      return undefined;
    }
  }
}

/** Parse a matched color string into RGBA. */
export function parseColorString(raw: string): RGBA | undefined {
  const str = raw.trim();

  if (str.startsWith('#')) {
    return parseHexColor(str);
  }

  const lower = str.toLowerCase();

  if (lower.startsWith('rgb')) {
    return parseRgb(str);
  }
  if (lower.startsWith('hsl')) {
    return parseHsl(str);
  }
  if (lower.startsWith('hwb')) {
    return parseHwb(str);
  }

  return undefined;
}
