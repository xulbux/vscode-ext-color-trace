/**
 * Regex-based color extraction from text.
 *
 * Matches hex, rgb/rgba, hsl/hsla, hwb, and (optionally) named CSS colors.
 * Each match is converted to an RGBA value for downstream use.
 */

import { CSS_LANGUAGES, NAMED_COLORS } from '@/providers/namedColors';
import type { RGBA } from './colorUtils';
import { parseColorString } from './parsers';

// ------------------------------------- PUBLIC TYPES ------------------------------------

/** A color found in a text document. */
export interface ColorMatch {
  /** Start offset within the scanned text. */
  startOffset: number;
  /** End offset within the scanned text (exclusive). */
  endOffset: number;
  /** The resolved RGBA color. */
  rgba: RGBA;
  /** The original matched text (e.g. '#ff0000', 'rgb(255,0,0)', 'red', …). */
  originalText: string;
}

// ------------------------------------ REGEX PATTERNS -----------------------------------

/** Hexa pattern: `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` */
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

/** Numeric value: integer or decimal, optionally a percentage */
const NUM = String.raw`(?:\d+(?:\.\d+)?%?)`;
/** Alpha value: number or percentage */
const ALPHA = String.raw`(?:\d+(?:\.\d+)?%?)`;
/** Hue: number with optional unit (`deg`, `rad`, `grad`, `turn`) */
const HUE = String.raw`(?:\d+(?:\.\d+)?(?:deg|rad|grad|turn)?)`;

/** RGBA pattern: `rgb(…)` / `rgba(…)` */
const RGB_RE = new RegExp(
  `rgba?\\(\\s*${NUM}\\s*[,\\s]\\s*${NUM}\\s*[,\\s]\\s*${NUM}(?:\\s*[,/]\\s*${ALPHA})?\\s*\\)`
);

/** HSLA pattern: `hsl(…)` / `hsla(…)` */
const HSL_RE = new RegExp(
  `hsla?\\(\\s*${HUE}\\s*[,\\s]\\s*${NUM}\\s*[,\\s]\\s*${NUM}(?:\\s*[,/]\\s*${ALPHA})?\\s*\\)`
);

/** HWB pattern: `hwb(…)` */
const HWB_RE = new RegExp(`hwb\\(\\s*${HUE}\\s+${NUM}\\s+${NUM}(?:\\s*/\\s*${ALPHA})?\\s*\\)`);

/**
 * Combined regex that matches any supported color literal in a single pass.
 * Named colors are matched separately (word-boundary lookup against the Map).
 */
const COLOR_RE = new RegExp(
  `(${HEX_RE.source}|${RGB_RE.source}|${HSL_RE.source}|${HWB_RE.source})`,
  'gi'
);

/** Word regex for named color lookup (letters only, 3-30 chars to skip noise). */
const WORD_RE = /\b[a-zA-Z]{3,30}\b/g;

// --------------------------------------- HELPERS ---------------------------------------

/** Check if a range overlaps with any existing match. */
function rangeOverlaps(matches: ColorMatch[], start: number, end: number): boolean {
  return matches.some((m) => start < m.endOffset && end > m.startOffset);
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Extract all color literals from `text`.
 *
 * @param text        The source text to scan.
 * @param languageId  VS Code language ID of the document (for named-color filtering).
 * @param matchNamed  Whether named colors are enabled (from config).
 * @returns  Array of matched colors with offsets and resolved RGBA values.
 */
export function extractColors(text: string, languageId: string, matchNamed: boolean): ColorMatch[] {
  const results: ColorMatch[] = [];

  // [1] Functional and hexa colors (all languages)
  COLOR_RE.lastIndex = 0;
  let match = COLOR_RE.exec(text);
  while (match !== null) {
    const rgba = parseColorString(match[0]);
    if (rgba) {
      results.push({
        endOffset: match.index + match[0].length,
        originalText: match[0],
        rgba,
        startOffset: match.index,
      });
    }
    match = COLOR_RE.exec(text);
  }

  // [2] Named CSS colors (CSS-like languages only)
  if (matchNamed && CSS_LANGUAGES.has(languageId)) {
    WORD_RE.lastIndex = 0;
    let wordMatch = WORD_RE.exec(text);
    while (wordMatch !== null) {
      const word = wordMatch[0].toLowerCase();
      const rgb = NAMED_COLORS.get(word);
      if (rgb) {
        const offset = wordMatch.index;
        // Skip if this range is already covered by a functional/hexa match.
        if (!rangeOverlaps(results, offset, offset + wordMatch[0].length)) {
          results.push({
            endOffset: offset + wordMatch[0].length,
            originalText: wordMatch[0],
            rgba: { a: word === 'transparent' ? 0 : 1, b: rgb[2], g: rgb[1], r: rgb[0] },
            startOffset: offset,
          });
        }
      }
      wordMatch = WORD_RE.exec(text);
    }
  }

  return results;
}
