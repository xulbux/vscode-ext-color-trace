/** Numeric value: integer or decimal, optionally a percentage */
export const NUM = String.raw`(?:\d+(?:\.\d+)?%?)`;

/** Alpha value: number or percentage */
export const ALPHA = String.raw`(?:\d+(?:\.\d+)?%?)`;

/** Hue: number with optional unit (`deg`, `rad`, `grad`, `turn`) */
export const HUE = String.raw`(?:\d+(?:\.\d+)?(?:deg|rad|grad|turn)?)`;

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

/** Parse a hue token with optional unit into degrees. */
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
