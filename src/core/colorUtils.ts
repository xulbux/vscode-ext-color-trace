/**
 * Pure color math utilities; No vscode dependency.
 */

/** RGBA color with `r`/`g`/`b` in 0-255 and `a` in 0-1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Convert HSL to RGB.
 * @param h  Hue         (0-360)
 * @param s  Saturation  (0-1)
 * @param l  Lightness   (0-1)
 * @returns  `[r, g, b]` each 0-255
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Convert HWB to RGB.
 * @param h  Hue        (0-360)
 * @param w  Whiteness  (0-1)
 * @param b  Blackness  (0-1)
 * @returns  `[r, g, b]` each 0-255
 */
export function hwbToRgb(h: number, w: number, b: number): [number, number, number] {
  // When w + b >= 1 the color is a neutral grey.
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
 * Linearize a single sRGB channel value (0-255) for luminance calculation.
 */
function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute WCAG 2.1 relative luminance.
 * @param r  Red    (0-255)
 * @param g  Green  (0-255)
 * @param b  Blue   (0-255)
 * @returns  Luminance in 0-1
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

/**
 * Choose black or white foreground text for the given background.
 * If the background is semi-transparent it is first blended over `editorBg`.
 * Uses the WCAG 2.1 luminance threshold of 0.179.
 */
export function chooseFgColor(bgRgba: RGBA, editorBg: RGBA): '#000000' | '#FFFFFF' {
  const solid = bgRgba.a < 1 ? alphaBlend(bgRgba, editorBg) : bgRgba;

  const lum = relativeLuminance(solid.r, solid.g, solid.b);
  return lum > 0.179 ? '#000000' : '#FFFFFF';
}

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
}

/**
 * Convert RGBA to a hexa string.
 * @returns  `#RRGGBB` when fully opaque, `#RRGGBBAA` otherwise.
 */
export function rgbaToHexString(rgba: RGBA): string {
  const base = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
  return rgba.a >= 1 ? base : `${base}${toHex(Math.round(rgba.a * 255))}`;
}

/**
 * Convert RGBA to a CSS color string.
 * @returns  `rgb(r, g, b)` when fully opaque, `rgba(r, g, b, a)` otherwise.
 */
export function rgbaToCssString(rgba: RGBA): string {
  const r = Math.round(rgba.r);
  const g = Math.round(rgba.g);
  const b = Math.round(rgba.b);

  return rgba.a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${rgba.a})`;
}


