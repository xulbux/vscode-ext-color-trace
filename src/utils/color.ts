/**
 * Color math utilities.
 */

import type { RGBA } from '@/types';

function hueToRgb(hue: number, c: number, x: number): [number, number, number] {
  if (hue < 60) {
    return [c, x, 0];
  }
  if (hue < 120) {
    return [x, c, 0];
  }
  if (hue < 180) {
    return [0, c, x];
  }
  if (hue < 240) {
    return [0, x, c];
  }
  if (hue < 300) {
    return [x, 0, c];
  }
  return [c, 0, x];
}

/**
 * Convert HSL to RGB.
 * @param h   Hue         (0-360)
 * @param s   Saturation  (0-1)
 * @param l   Lightness   (0-1)
 * @returns `[r, g, b]` each 0-255
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  const [r, g, b] = hueToRgb(hue, c, x);

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Convert HWB to RGB.
 * @param h   Hue        (0-360)
 * @param w   Whiteness  (0-1)
 * @param b   Blackness  (0-1)
 * @returns `[r, g, b]` each 0-255
 */
export function hwbToRgb(h: number, w: number, b: number): [number, number, number] {
  // When `w + b >= 1` the color is a neutral grey.
  if (w + b >= 1) {
    const grey = Math.round((w / (w + b)) * 255);
    return [grey, grey, grey];
  }

  // Start from a fully-saturated hue, then mix in white and black.
  const [rBase, gBase, bBase] = hslToRgb(h, 1, 0.5);
  const scale = 1 - w - b;

  return [
    Math.round((rBase / 255) * scale * 255 + w * 255),
    Math.round((gBase / 255) * scale * 255 + w * 255),
    Math.round((bBase / 255) * scale * 255 + w * 255),
  ];
}

/**
 * Convert HSV to RGB.
 * @param h   Hue        (0-360)
 * @param s   Saturation (0-1)
 * @param v   Value      (0-1)
 * @returns `[r, g, b]` each 0-255
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;

  const [r, g, b] = hueToRgb(hue, c, x);

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Convert CMYK to RGB.
 * @param cmyk  Tuple of [c, m, y, k] each 0-1
 * @returns `[r, g, b]` each 0-255
 */
export function cmykToRgb([c, m, y, k]: [number, number, number, number]): [
  number,
  number,
  number,
] {
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);
  return [Math.round(r), Math.round(g), Math.round(b)];
}

/**
 * Linearize a single sRGB channel value (0-255) for luminance calculation.
 */
function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linearSrgbToSrgb(c: number): number {
  if (c <= 0.0031308) {
    return 12.92 * c;
  }
  return 1.055 * c ** (1 / 2.4) - 0.055;
}

/**
 * Convert OKLAB to RGB.
 * @param l   Lightness (0-1)
 * @param a   A axis
 * @param b   B axis
 * @returns `[r, g, b]` each 0-255
 */
export function oklabToRgb(l: number, a: number, b: number): [number, number, number] {
  const lVal = l + 0.3963377774 * a + 0.2158037573 * b;
  const mVal = l - 0.1055613458 * a - 0.0638541728 * b;
  const sVal = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lVal * lVal * lVal;
  const m3 = mVal * mVal * mVal;
  const s3 = sVal * sVal * sVal;

  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const rSrgb = Math.max(0, Math.min(1, linearSrgbToSrgb(rLin))) * 255;
  const gSrgb = Math.max(0, Math.min(1, linearSrgbToSrgb(gLin))) * 255;
  const bSrgb = Math.max(0, Math.min(1, linearSrgbToSrgb(bLin))) * 255;

  return [Math.round(rSrgb), Math.round(gSrgb), Math.round(bSrgb)];
}

/**
 * Convert OKLCH to RGB.
 * @param l   Lightness (0-1)
 * @param c   Chroma
 * @param h   Hue (0-360)
 * @returns `[r, g, b]` each 0-255
 */
export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return oklabToRgb(l, a, b);
}

/**
 * Compute WCAG 2.1 relative luminance.
 * @param r   Red    (0-255)
 * @param g   Green  (0-255)
 * @param b   Blue   (0-255)
 * @returns Luminance in 0-1
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Porter-Duff source-over alpha compositing.
 * Blends `fg` over `bg` and returns the resulting RGBA.
 * When `bg.a` is 1 the result is always fully opaque.
 */
export function alphaBlend(fg: RGBA, bg: RGBA): RGBA {
  const outA = fg.a + bg.a * (1 - fg.a);

  if (outA === 0) {
    return { a: 0, b: 0, g: 0, r: 0 };
  }

  return {
    a: outA,
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / outA),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / outA),
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / outA),
  };
}

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
}

/**
 * Convert RGBA to a hexa string.
 * @returns `#RRGGBB` when fully opaque, `#RRGGBBAA` otherwise.
 */
export function rgbaToHexString(rgba: RGBA): string {
  const base = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
  return rgba.a >= 1 ? base : `${base}${toHex(Math.round(rgba.a * 255))}`;
}

/**
 * Format a raw hex digits string into standard CSS hex strings.
 * @param digits    The raw hex digits (e.g., `RRGGBBAA` or `RGB`).
 * @param useARGB   If true, 4- and 8-digit hexes are interpreted as ARGB.
 * @returns An object with the native CSS string and its fully opaque version.
 */
export function formatHexCss(
  digits: string,
  useARGB = false
): { cssStr: string; opaqueCss: string } {
  let cssStr = `#${digits}`;
  let opaqueCss = '';

  if (useARGB && digits.length === 8) {
    const aa = digits.slice(0, 2);
    const rrggbb = digits.slice(2, 8);
    cssStr = `#${rrggbb}${aa}`;
    opaqueCss = `#${rrggbb}`;
  } else if (useARGB && digits.length === 4) {
    const a = digits.slice(0, 1);
    const rgb = digits.slice(1, 4);
    cssStr = `#${rgb}${a}`;
    opaqueCss = `#${rgb}`;
  } else {
    let len = digits.length;
    if (len === 4) {
      len = 3;
    } else if (len === 8) {
      len = 6;
    }
    opaqueCss = `#${digits.slice(0, len)}`;
  }

  return { cssStr, opaqueCss };
}
