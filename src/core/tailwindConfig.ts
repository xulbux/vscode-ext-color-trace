import { createJiti } from 'jiti';
import * as vscode from 'vscode';
import type { DocumentResolvedConfig } from '@/types';
import { extractWithStrategies } from './strategies';
import { clearVariablesForUri, setVariable } from './variableManager';

function flattenColors(colors: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (colors && typeof colors === 'object') {
    for (const [key, value] of Object.entries(colors)) {
      const currentKey = prefix ? `${prefix}-${key}` : key;
      if (typeof value === 'string') {
        result[currentKey] = value;
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
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '/';
        const jiti = createJiti(workspaceFolder, { moduleCache: false, requireCache: false });
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

        clearVariablesForUri(uri.toString());

        for (const [name, hex] of Object.entries(flatColors)) {
          if (typeof hex === 'string') {
            const colorData = extractWithStrategies(hex, options);
            if (colorData) {
              setVariable(`--color-${name}`, colorData, uri.toString());
            }
          }
        }
      } catch {
        // Ignore load errors.
      }
    })
  );
}
