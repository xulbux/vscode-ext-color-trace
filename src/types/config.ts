import type { RGBA } from './color';

/** Resolved extension configuration. */
export interface ExtensionConfig {
  enable: boolean;
  editorBackground: RGBA;
  highlightNamedColors: boolean;
  highlightTailwind: boolean;
  ignorePatterns: string[];
}
