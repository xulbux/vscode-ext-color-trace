import path from 'node:path';
import * as vscode from 'vscode';
import type { DocumentResolvedConfig } from '@/types';
import { extractColors } from './colorParser';

const IMPORT_RX = /@(?:import|use)\s+['"](?<path>[^'"]+)['"]/g;

export async function resolveSassImports(uris: vscode.Uri[], config: DocumentResolvedConfig) {
  await Promise.all(
    uris.map(async (uri) => {
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder().decode(bytes);

        const promises = [...text.matchAll(IMPORT_RX)].map(async (match) => {
          const importPath = match.groups?.path;
          if (importPath) {
            let resolvedPath = '';
            if (importPath.startsWith('~') || importPath.includes('node_modules')) {
              const modulePath = importPath.startsWith('~') ? importPath.slice(1) : importPath;
              resolvedPath = path.join(
                vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                'node_modules',
                modulePath
              );
            } else {
              resolvedPath = path.resolve(path.dirname(uri.fsPath), importPath);
            }

            if (!resolvedPath.endsWith('.scss') && !resolvedPath.endsWith('.sass')) {
              resolvedPath += '.scss';
            }

            let importUri = vscode.Uri.file(resolvedPath);
            let importBytes: Uint8Array | undefined = undefined;

            try {
              importBytes = await vscode.workspace.fs.readFile(importUri);
            } catch {
              // Try the SCSS partial convention (_filename).
              const dir = path.dirname(resolvedPath);
              const base = path.basename(resolvedPath);
              if (!base.startsWith('_')) {
                importUri = vscode.Uri.file(path.join(dir, `_${base}`));
                try {
                  importBytes = await vscode.workspace.fs.readFile(importUri);
                } catch {
                  // Ignore.
                }
              }
            }

            if (importBytes) {
              const importText = new TextDecoder().decode(importBytes);
              extractColors(importText, 'scss', {
                ...config,
                extractOnly: true,
                uri: importUri.toString(),
              });
            }
          }
        });
        await Promise.all(promises);
      } catch {
        // Ignore read errors.
      }
    })
  );
}
