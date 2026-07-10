import type { RGBA } from './color';

/** Resolved extension configuration. */
export interface ExtensionConfig {
  // Core
  /** Array of language IDs where the extension is active. */
  enable: string[];
  /** Array of glob patterns to exclude from workspace scanning. */
  excludePaths: string[];

  // Visual
  /** The editor's background color. */
  editorBackground: RGBA;
  /** The decoration style to apply to matching colors. */
  markerType: 'highlight' | 'dot-before' | 'dot-after';
  /** Whether to respect the alpha channel in color previews. */
  showAlpha: boolean;

  // Matching
  /** Whether to enable named color marking. */
  markNamedColors: boolean;
  /** Array of language IDs to enable Tailwind CSS class marking. */
  markTailwind: string[];
  /** Array of language IDs to match raw RGB numbers (e.g. `255, 0, 0`). */
  matchRgbWithNoFunction: string[];
  /** Array of language IDs to match raw HSL numbers. */
  matchHslWithNoFunction: string[];
  /** Array of language IDs to interpret 8-digit hexes as ARGB instead of RGBA. */
  useARGB: string[];
}

/**
 * The configuration resolved for a specific document language ID.
 * Features that take language arrays in settings are evaluated to booleans.
 */
export interface DocumentResolvedConfig {
  // Core
  /** True if the extension is enabled for this document's language. */
  enable: boolean;

  // Visual
  /** The editor's background color. */
  editorBackground: RGBA;
  /** The decoration style to apply to matching colors. */
  markerType: 'highlight' | 'dot-before' | 'dot-after';
  /** Whether to respect the alpha channel in color previews. */
  showAlpha: boolean;

  // Matching
  /** True if named colors should be marked. */
  markNamedColors: boolean;
  /** True if Tailwind CSS classes should be marked. */
  markTailwind: boolean;
  /** True if raw RGB numbers should be matched. */
  matchRgbWithNoFunction: boolean;
  /** True if raw HSL numbers should be matched. */
  matchHslWithNoFunction: boolean;
  /** True if 8-digit hexes should be parsed as ARGB instead of RGBA. */
  useARGB: boolean;
}
