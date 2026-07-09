import * as vscode from 'vscode';
import { hexStrategy } from '@/core/strategies/hex';
import type { ExtensionConfig, RGBA } from '@/types';

// ----------------------------------- INTERNAL HELPERS ----------------------------------

/** Default backgrounds for the fallback. */
const DEFAULT_DARK: RGBA = { a: 1, b: 30, g: 30, r: 30 };

/**
 * Pick a default background hex based on the active color theme kind.
 */
function defaultBackgroundForThemeKind(): string {
  const { kind } = vscode.window.activeColorTheme;

  if (kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight) {
    return '#FFFFFF';
  }
  return '#1E1E1E';
}

/**
 * Return a hex color string for the editor background.
 *
 * 1.  Workspace `workbench.colorCustomizations` → `editor.background`
 * 2.  User-level `colorTrace.editorBackground`
 * 3.  Inferred from the active color theme kind
 */
function getEditorBackgroundHex(): string {
  // Try workspace color customizations.
  const customizations = vscode.workspace
    .getConfiguration('workbench')
    .get<Record<string, string>>('colorCustomizations');

  if (customizations?.['editor.background']) {
    return customizations['editor.background'];
  }

  // Fall back to a sensible default based on theme kind.
  return defaultBackgroundForThemeKind();
}

/**
 * Resolve the editor background through the three-step fallback chain.
 */
function resolveEditorBackground(): RGBA {
  const hex = getEditorBackgroundHex();
  return hexStrategy.extract(hex)?.rgba ?? DEFAULT_DARK;
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Read all `colorTrace.*` settings and resolve the editor background color.
 *
 * Background resolution order:
 * 1.  `workbench.colorCustomizations["editor.background"]` (workspace)
 * 2.  `colorTrace.editorBackground` (user setting)
 * 3.  Auto-detect from the active color theme kind
 */
export function readConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration('colorTrace');

  return {
    editorBackground: resolveEditorBackground(),
    enable: cfg.get<boolean>('enable', true),
    highlightNamedColors: cfg.get<boolean>('highlightNamedColors', true),
    highlightTailwind: cfg.get<boolean>('highlightTailwind', true),
    ignorePatterns: cfg.get<string[]>('ignorePatterns', []),
  };
}

/**
 * Convenience helper; Returns only the resolved editor background color.
 */
export function getEditorBackground(): RGBA {
  return readConfig().editorBackground;
}
