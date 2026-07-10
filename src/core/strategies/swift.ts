import type { ColorData, ColorParsingStrategy } from '@/types';
import { clampAlpha, clampChannel } from '@/utils/strategy';

export const swiftStrategy: ColorParsingStrategy = {
  /**
   * Extracts Apple Swift/Obj-C color data from a matched string.
   */
  extract(matchText: string): ColorData | undefined {
    const inner = matchText.slice(matchText.indexOf('(') + 1, matchText.lastIndexOf(')'));

    const pairs = inner.split(',').map((p) => p.trim());
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 1;
    let foundR = false;
    let foundG = false;
    let foundB = false;

    for (const pair of pairs) {
      const parts = pair.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const val = Number.parseFloat(parts[1].trim());
        if (Number.isNaN(val)) {
          return undefined;
        }

        if (key === 'red') {
          r = val;
          foundR = true;
        } else if (key === 'green') {
          g = val;
          foundG = true;
        } else if (key === 'blue') {
          b = val;
          foundB = true;
        } else if (key === 'alpha' || key === 'opacity') {
          a = val;
        }
      }
    }

    if (!foundR || !foundG || !foundB) {
      return undefined;
    }

    r = clampChannel(r * 255);
    g = clampChannel(g * 255);
    b = clampChannel(b * 255);
    a = clampAlpha(a);

    return {
      css: `rgba(${r}, ${g}, ${b}, ${a})`,
      opaqueCss: `rgb(${r}, ${g}, ${b})`,
      rgba: { a, b, g, r },
    };
  },
  id: 'swift',
  pattern: String.raw`(?:UIColor|Color)\(\s*red:\s*(?:\d+(?:\.\d+)?|\.\d+)\s*,\s*green:\s*(?:\d+(?:\.\d+)?|\.\d+)\s*,\s*blue:\s*(?:\d+(?:\.\d+)?|\.\d+)(?:\s*,\s*(?:alpha|opacity):\s*(?:\d+(?:\.\d+)?|\.\d+))?\s*\)`,
};
