import type { RGBA } from './color';

/** Resolved extension configuration. */
export interface ExtensionConfig {
  enable: string[];
  editorBackground: RGBA;
  markerType: 'highlight' | 'dot-before' | 'dot-after';
  showAlpha: boolean;
  highlightNamedColors: string[];
  highlightTailwind: string[];
  matchRgbWithNoFunction: string[];
  matchHslWithNoFunction: string[];
  useARGB: string[];
}

/**
 * The configuration resolved for a specific document language ID.
 * Features that take language arrays in settings are evaluated to booleans.
 */
export interface DocumentResolvedConfig {
  editorBackground: RGBA;
  enable: boolean;
  markerType: 'highlight' | 'dot-before' | 'dot-after';
  showAlpha: boolean;

  highlightNamedColors: boolean;
  highlightTailwind: boolean;
  matchRgbWithNoFunction: boolean;
  matchHslWithNoFunction: boolean;
  useARGB: boolean;
}
