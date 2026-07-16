import { createJiti } from 'jiti';
import * as vscode from 'vscode';
import type { DocumentResolvedConfig } from '@/types';
import { logError } from '@/utils/logger';
import { extractWithStrategies } from './strategies';
import { clearVariablesForUri, setVariable } from './variableManager';

/**
 * Namespaced variable-store key for a Tailwind config file.
 *
 * The general workspace variable scan also visits
 * `tailwind.config.js` (it matches the `**\/*.{...,js,...}` glob)
 * and calls `clearVariablesForUri` on the raw file URI.
 *
 * Storing the config colors under a distinct key ensures
 * that scan can never wipe the colors we register here.
 */
function tailwindConfigKey(uri: vscode.Uri): string {
  return `tailwind-config::${uri.toString()}`;
}

/** Remove all colors registered from a given Tailwind config file. */
export function clearTailwindConfig(uri: vscode.Uri): void {
  clearVariablesForUri(tailwindConfigKey(uri));
}

function flattenColors(colors: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (colors && typeof colors === 'object') {
    for (const [key, value] of Object.entries(colors)) {
      // Tailwind's `DEFAULT` key maps to the bare prefix (e.g., `red.DEFAULT` → `red`),
      // so `bg-gray` resolves to the custom default shade.
      let currentKey = prefix ? `${prefix}-${key}` : key;
      if (key === 'DEFAULT') {
        currentKey = prefix || key;
      }
      if (typeof value === 'string') {
        if (currentKey) {
          result[currentKey] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(result, flattenColors(value, currentKey));
      }
    }
  }
  return result;
}

export async function loadTailwindConfigs(options: DocumentResolvedConfig) {
  const uris = await vscode.workspace.findFiles(
    '**/tailwind.config.{js,ts,cjs,mjs}',
    '**/node_modules/**'
  );

  await Promise.all(
    uris.map(async (uri) => {
      try {
        // Use the config file itself as the jiti base so its imports
        // (e.g., `tailwindcss/defaultTheme`) resolve against the project's `node_modules`.
        const jiti = createJiti(uri.fsPath, { moduleCache: false, requireCache: false });
        const config = (await jiti.import(uri.fsPath, { default: true })) as Record<
          string,
          unknown
        >;

        const theme = (config?.theme as Record<string, unknown>) || {};
        const colors = {
          ...(theme.colors as Record<string, unknown>),
          ...(theme.extend as Record<string, Record<string, unknown>>)?.colors,
        };

        const flatColors = flattenColors(colors);
        const key = tailwindConfigKey(uri);

        clearVariablesForUri(key);

        for (const [name, hex] of Object.entries(flatColors)) {
          if (typeof hex === 'string') {
            const colorData = extractWithStrategies(hex, options);
            if (colorData) {
              setVariable(`--color-${name}`, colorData, key);
            }
          }
        }
      } catch (error) {
        logError(`Failed to load Tailwind config: ${uri.fsPath}`, error);
      }
    })
  );
}
