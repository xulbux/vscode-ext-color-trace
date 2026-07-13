import * as vscode from 'vscode';
import { hexStrategy } from '@/core/strategies/hex';
import type { DocumentResolvedConfig, ExtensionConfig, RGBA } from '@/types';

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
  return '#121314';
}

/**
 * Return a hex color string for the editor background.
 *
 * 1.  Workspace `workbench.colorCustomizations` → `editor.background`
 * 2.  User-level `colorTracr.editorBackground`
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
export function resolveEditorBackground(): RGBA {
  const hex = getEditorBackgroundHex();
  return hexStrategy.extract(hex)?.rgba ?? DEFAULT_DARK;
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Read all `colorTracr.*` settings and resolve the editor background color.
 *
 * Background resolution order:
 * 1.  `workbench.colorCustomizations["editor.background"]` (workspace)
 * 2.  `colorTracr.editorBackground` (user setting)
 * 3.  Auto-detect from the active color theme kind
 */
let cachedConfig: ExtensionConfig | undefined = undefined;

export function invalidateConfigCache(): void {
  cachedConfig = undefined;
}

export function readConfig(): ExtensionConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const cfg = vscode.workspace.getConfiguration('colorTracr');

  cachedConfig = {
    editorBackground: resolveEditorBackground(),
    enable: cfg.get<string[]>('enable', ['*']),
    excludePaths: cfg.get<string[]>('excludePaths', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
    ]),
    markNamedColors: cfg.get<boolean>('markNamedColors', true),
    markTailwind: cfg.get<string[]>('markTailwind', ['*']),
    markVariables: cfg.get<string[]>('markVariables', ['*']),
    markerType: cfg.get<'highlight' | 'dot-before' | 'dot-after'>('markerType', 'highlight'),
    matchHslWithNoFunction: cfg.get<string[]>('matchHslWithNoFunction', []),
    matchLchWithNoFunction: cfg.get<string[]>('matchLchWithNoFunction', []),
    matchOklchWithNoFunction: cfg.get<string[]>('matchOklchWithNoFunction', []),
    matchRgbWithNoFunction: cfg.get<string[]>('matchRgbWithNoFunction', []),
    showAlpha: cfg.get<boolean>('showAlpha', true),
    useARGB: cfg.get<string[]>('useARGB', []),
  };

  return cachedConfig;
}

export function isLanguageEnabled(languageId: string, languages: string[]): boolean {
  if (languages.length === 0) {
    return false;
  }
  if (languages.includes('*')) {
    return !languages.includes(`!${languageId}`);
  }
  return languages.includes(languageId);
}

export function resolveDocumentConfig(
  config: ExtensionConfig,
  languageId: string
): DocumentResolvedConfig {
  return {
    editorBackground: config.editorBackground,
    enable: isLanguageEnabled(languageId, config.enable),
    markNamedColors: config.markNamedColors,
    markTailwind: isLanguageEnabled(languageId, config.markTailwind),
    markVariables: isLanguageEnabled(languageId, config.markVariables),
    markerType: config.markerType,
    matchHslWithNoFunction: isLanguageEnabled(languageId, config.matchHslWithNoFunction),
    matchLchWithNoFunction: isLanguageEnabled(languageId, config.matchLchWithNoFunction),
    matchOklchWithNoFunction: isLanguageEnabled(languageId, config.matchOklchWithNoFunction),
    matchRgbWithNoFunction: isLanguageEnabled(languageId, config.matchRgbWithNoFunction),
    showAlpha: config.showAlpha,
    useARGB: isLanguageEnabled(languageId, config.useARGB),
  };
}
