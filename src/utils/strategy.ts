/** Numeric value: integer or decimal, optionally a percentage. */
export const NUM = String.raw`(?:\d+(?:\.\d+)?%?|\.\d+%?)`;

/** Numeric value without percentage. */
export const NUM_NO_PERCENT = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;

/** Percentage value: must end with `%`. */
export const PERCENT = String.raw`(?:\d+(?:\.\d+)?%|\.\d+%)`;

/** Alpha value: number or percentage. */
export const ALPHA = String.raw`(?:\d+(?:\.\d+)?%?|\.\d+%?)`;

/** Negative lookbehind to ensure we don't start inside a number/word. */
export const BOUNDARY_START = String.raw`(?<![a-zA-Z0-9_.%-])`;

/** Negative lookahead to ensure we don't end inside a number/word/percent. */
export const BOUNDARY_END = String.raw`(?![a-zA-Z0-9_.%-])`;

/** Hue: number with optional unit (`deg`, `rad`, `grad`, `turn`). */
export const HUE = String.raw`(?:(?:\d+(?:\.\d+)?|\.\d+)(?:°|deg|rad|grad|turn)?)`;

/** Parse a numeric token as a 0-255 value or percentage. */
export function parseChannel(token: string): number {
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * 255;
  }
  return Number.parseFloat(token);
}

/** Parse a percentage token to a 0-1 value. */
export function parsePercent(token: string): number {
  if (token.endsWith('%')) {
    return Number.parseFloat(token) / 100;
  }
  return Number.parseFloat(token);
}

/** Parse an alpha token (number 0-1 or percentage). */
export function parseAlpha(token: string | undefined): number {
  if (token === undefined) {
    return 1;
  }
  return parsePercent(token);
}

/** Parse a hue token with optional unit into degrees. */
export function parseHue(token: string): number {
  const value = Number.parseFloat(token);
  if (token.endsWith('deg') || token.endsWith('°')) {
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

/** Extract tokens from inside parentheses and validate CSS punctuation rules. */
export function extractTokens(str: string, allowCommas = true): string[] | undefined {
  const inner = str.slice(str.indexOf('(') + 1, str.lastIndexOf(')'));

  const commaCount = (inner.match(/,/g) || []).length;
  const slashCount = (inner.match(/\//g) || []).length;

  if (!allowCommas && commaCount > 0) {
    return undefined; // Invalid: commas are not allowed for this color format.
  }

  if (commaCount > 0 && slashCount > 0) {
    return undefined; // Invalid: mixed commas and slash.
  }
  if (slashCount > 1) {
    return undefined; // Invalid: multiple slashes.
  }

  const normalized = inner.replace(/[,/]/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }

  const tokens = normalized.split(/\s+/);

  if (commaCount > 0 && commaCount !== tokens.length - 1) {
    return undefined; // Invalid: missing or extra commas.
  }

  if (commaCount === 0 && slashCount === 0 && tokens.length > 3) {
    return undefined; // Invalid: missing slash for alpha in space-separated syntax.
  }

  return tokens;
}

/**
 * Boilerplate helper for color strategies.
 * Checks if the matchText starts with any of the valid prefixes.
 * Returns the parsed tokens if valid, otherwise undefined.
 */
export function parseColorTokens(
  matchText: string,
  validPrefixes: string[],
  options: { allowCommas?: boolean; minTokens?: number } = {}
): string[] | undefined {
  const { allowCommas = true, minTokens = 3 } = options;
  const lower = matchText.toLowerCase();
  if (!validPrefixes.some((prefix) => lower.startsWith(prefix))) {
    return undefined;
  }
  const tokens = extractTokens(matchText, allowCommas);
  if (!tokens || tokens.length < minTokens) {
    return undefined;
  }
  return tokens;
}

/** Clamp and round a channel value to 0-255. */
export function clampChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

/** Clamp an alpha value to 0-1. */
export function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}
