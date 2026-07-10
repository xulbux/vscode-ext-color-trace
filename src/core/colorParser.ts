/**
 * Regex-based color extraction from text.
 *
 * Matches diverse color formats.
 * Each match is converted to a `ColorData` object for downstream use.
 */

import { MIXED_CSS_LANGUAGES, NAMED_COLORS, PURE_CSS_LANGUAGES } from '@/providers/namedColors';
import type { ColorData, ColorMatch, DocumentResolvedConfig } from '@/types';
import { strategies } from './strategies';
import { getVariable, setVariable } from './variableManager';

// ------------------------------------ REGEX PATTERNS -----------------------------------

/** Word regex for named color lookup (only valid CSS named colors). */
const NAMED_COLORS_KEYS = [...NAMED_COLORS.keys()].join('|');
const WORD_RE = new RegExp(`\\b(?:${NAMED_COLORS_KEYS})\\b`, 'gi');

/** Matches `var(--name)` and also SCSS `$name` and LESS `@name`. Excludes definitions (followed by `:`). */
const VAR_USE_RE = /(?:var\(\s*(?<name1>--[a-zA-Z0-9-_]+)|(?<name2>[$@][a-zA-Z0-9-_]+)(?!\s*:))/g;

/** Matches Tailwind CSS color utility classes. */
const TAILWIND_PREFIXES =
  'bg|text|border|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide|placeholder|from|via|to';
const CLASS_RE = new RegExp(
  `(?<prefix>(?:[a-zA-Z0-9_\\[\\]-]+:)*(?:${TAILWIND_PREFIXES})-)(?<colorName>[a-zA-Z0-9_-]+|\\[[^\\]]+\\])(?<alpha>\\/[0-9.]+|\\/\\[[^\\]]+\\])?`,
  'g'
);

// --------------------------------------- HELPERS ---------------------------------------

import { mergeNonOverlapping } from '@/utils/ranges';

const regexCache = new Map<string, RegExp>();
function getRegex(options: DocumentResolvedConfig): RegExp {
  const key = `${options.matchRgbWithNoFunction}-${options.matchHslWithNoFunction}-${options.useARGB}`;
  let colorRe = regexCache.get(key);
  if (!colorRe) {
    const patterns: string[] = [];
    for (const strategy of strategies) {
      if (strategy.getPatterns) {
        patterns.push(...strategy.getPatterns(options));
      } else {
        patterns.push(strategy.pattern);
      }
    }
    colorRe = new RegExp(`(${patterns.join('|')})`, 'gi');
    regexCache.set(key, colorRe);
  }
  colorRe.lastIndex = 0;
  return colorRe;
}

/** Check if a word is adjacent to a hyphen (part of a utility class like `text-red`). */
function isAdjacentToHyphen(text: string, start: number, end: number): boolean {
  return (start > 0 && text[start - 1] === '-') || (end < text.length && text[end] === '-');
}

// -------------------------------------- EXTRACTORS -------------------------------------

function extractVariableUsages(text: string): ColorMatch[] {
  if (!text.includes('var(') && !text.includes('$') && !text.includes('@')) {
    return [];
  }
  const results: ColorMatch[] = [];
  for (const varMatch of text.matchAll(VAR_USE_RE)) {
    const varName = varMatch.groups?.name1 || varMatch.groups?.name2;
    if (varName) {
      const colorData = getVariable(varName);
      if (colorData) {
        const offset = varMatch.index + varMatch[0].indexOf(varName);
        const end = offset + varName.length;

        results.push({
          color: colorData,
          endOffset: end,
          originalText: varName,
          startOffset: offset,
        });
      }
    }
  }
  return results;
}

/** Check if a Tailwind class is properly bounded (not part of a CSS selector or longer word). */
function isValidTailwindBoundary(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const prevChar = text[index - 1];

  // Invalid boundaries: letter, number, underscore, hyphen, dot (CSS class), hash (CSS ID).
  return !/[a-zA-Z0-9_\-.#]/.test(prevChar);
}

function extractTailwindClasses(text: string): ColorMatch[] {
  if (!text.includes('-')) {
    return [];
  }

  const results: ColorMatch[] = [];
  for (const classMatch of text.matchAll(CLASS_RE)) {
    if (isValidTailwindBoundary(text, classMatch.index)) {
      const prefix = classMatch.groups?.prefix;
      const colorName = classMatch.groups?.colorName;
      const alpha = classMatch.groups?.alpha;

      if (prefix && colorName) {
        let colorData: ColorData | undefined = undefined;

        if (colorName.startsWith('[') && colorName.endsWith(']')) {
          const innerColor = colorName.slice(1, -1);
          for (const strategy of strategies) {
            colorData = strategy.extract(innerColor);
            if (colorData) {
              break;
            }
          }
        } else {
          colorData = getVariable(`--color-${colorName}`);
        }

        if (colorData) {
          if (alpha) {
            let alphaValue = 1;
            if (alpha.startsWith('/[')) {
              const inner = alpha.slice(2, -1);
              alphaValue = inner.endsWith('%')
                ? Number.parseFloat(inner) / 100
                : Number.parseFloat(inner);
            } else {
              alphaValue = Number.parseFloat(alpha.slice(1)) / 100;
            }

            if (!Number.isNaN(alphaValue)) {
              const newRgba = { ...colorData.rgba, a: colorData.rgba.a * alphaValue };
              colorData = {
                css: `rgb(${newRgba.r} ${newRgba.g} ${newRgba.b} / ${newRgba.a})`,
                opaqueCss: `rgb(${newRgba.r} ${newRgba.g} ${newRgba.b})`,
                rgba: newRgba,
              };
            }
          }

          const offset = classMatch.index + prefix.length;
          const end = classMatch.index + classMatch[0].length;

          results.push({
            color: colorData,
            endOffset: end,
            originalText: colorName + (alpha || ''),
            startOffset: offset,
          });
        }
      }
    }
  }
  return results;
}

function extractNamedColors(text: string, languageId: string): ColorMatch[] {
  const isPureCss = PURE_CSS_LANGUAGES.has(languageId);
  const isMixedCss = MIXED_CSS_LANGUAGES.has(languageId);

  if (!isPureCss && !isMixedCss) {
    return [];
  }

  const results: ColorMatch[] = [];
  for (const wordMatch of text.matchAll(WORD_RE)) {
    const word = wordMatch[0].toLowerCase();
    const rgb = NAMED_COLORS.get(word);
    if (rgb) {
      const offset = wordMatch.index;
      const end = offset + wordMatch[0].length;

      // Skip words adjacent to hyphens (e.g., utility classes or variables).
      const isClassFragment = isAdjacentToHyphen(text, offset, end);

      if (!isClassFragment) {
        results.push({
          color: {
            css: wordMatch[0],
            opaqueCss: word === 'transparent' ? '#000000' : wordMatch[0],
            rgba: { a: word === 'transparent' ? 0 : 1, b: rgb[2], g: rgb[1], r: rgb[0] },
          },
          endOffset: end,
          originalText: wordMatch[0],
          startOffset: offset,
        });
      }
    }
  }
  return results;
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Extract all color literals from `text`.
 *
 * @param text         The source text to scan.
 * @param languageId   VS Code language ID of the document (for named-color filtering).
 */
export function extractColors(
  text: string,
  languageId: string,
  options: DocumentResolvedConfig & { uri?: string; extractOnly?: boolean }
): ColorMatch[] {
  let results: ColorMatch[] = [];

  // Pre-calculate comment ranges to avoid registering commented-out variable definitions.
  const commentRanges: { start: number; end: number }[] = [];
  for (const match of text.matchAll(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<!:)\/\/.*$/gm)) {
    commentRanges.push({ end: match.index + match[0].length, start: match.index });
  }
  commentRanges.sort((a, b) => a.start - b.start);

  function isInsideComment(index: number): boolean {
    let left = 0;
    let right = commentRanges.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = commentRanges[mid];
      if (index < range.start) {
        right = mid - 1;
      } else if (index >= range.end) {
        left = mid + 1;
      } else {
        return true;
      }
    }
    return false;
  }

  const colorRe = getRegex(options);

  // [1] Functional and hexa colors (all languages).
  const pass1: ColorMatch[] = [];
  for (const match of text.matchAll(colorRe)) {
    let colorData: ColorData | undefined = undefined;
    for (const strategy of strategies) {
      colorData = strategy.extract(match[0], options);
      if (colorData) {
        break;
      }
    }

    if (colorData) {
      // Check if this color is a variable definition:
      // `--var-name: <color>` or `$var-name: <color>` or `@var-name: <color>`
      const prefix = text.slice(Math.max(0, match.index - 100), match.index);
      const defMatch = prefix.match(/(?<name>(?:--|\$|@)[a-zA-Z0-9-_]+)\s*:\s*$/);
      if (defMatch?.groups && !isInsideComment(match.index)) {
        setVariable(defMatch.groups.name, colorData, options.uri ?? '');
      }

      pass1.push({
        color: colorData,
        endOffset: match.index + match[0].length,
        originalText: match[0],
        startOffset: match.index,
      });
    }
  }
  results = pass1;

  if (options.extractOnly) {
    return results;
  }

  // [2] CSS Variable Usages.
  if (options.markVariables) {
    results = mergeNonOverlapping(results, extractVariableUsages(text));
  }

  // [3] Tailwind Classes.
  if (options.markTailwind) {
    results = mergeNonOverlapping(results, extractTailwindClasses(text));
  }

  // [4] Named CSS colors.
  if (options.markNamedColors) {
    results = mergeNonOverlapping(results, extractNamedColors(text, languageId));
  }

  return results;
}
