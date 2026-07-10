import type { ColorData, ColorParsingStrategy } from '@/types';
import { ALPHA, NUM, clampAlpha, clampChannel, parseAlpha, parsePercent } from '@/utils/strategy';

export const colorFnStrategy: ColorParsingStrategy = {
  extract(matchText: string): ColorData | undefined {
    if (!matchText.trim().toLowerCase().startsWith('color(')) {
      return undefined;
    }
    const inner = matchText.slice(matchText.indexOf('(') + 1, matchText.lastIndexOf(')')).trim();
    const parts = inner.split(/[\s/]+/).filter(Boolean);
    if (parts.length < 4) {
      return undefined;
    }

    // parts[0] is the color space (e.g. display-p3)
    const [c1, c2, c3] = parts.slice(1, 4).map((t) => parsePercent(t));
    const a = parts[4] ? clampAlpha(parseAlpha(parts[4])) : 1;

    // Approximate mapping back to 0-255 sRGB for the foreground contrasting logic.
    // The actual CSS string used for rendering is the original `color(…)` string,
    // so VS Code's Chromium engine handles the wide-gamut rendering natively.
    const r = clampChannel(c1 * 255);
    const g = clampChannel(c2 * 255);
    const b = clampChannel(c3 * 255);

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
      return undefined;
    }

    return {
      css: matchText,
      opaqueCss: matchText.replace(/\s*\/\s*[\d.%]+/, ''),
      rgba: { a, b, g, r },
    };
  },
  id: 'color-fn',
  pattern: String.raw`color\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz(?:-d50|-d65)?)\s+${NUM}\s+${NUM}\s+${NUM}(?:\s*[/]\s*${ALPHA})?\s*\)`,
};
