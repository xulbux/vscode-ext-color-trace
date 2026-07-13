import path from 'node:path';
import * as vscode from 'vscode';
import type { DocumentResolvedConfig } from '@/types';
import { extractColors } from './colorParser';

const IMPORT_RE = /@(?:import|use)\s+['"](?<path>[^'"]+)['"]/g;

export async function resolveSassImports(uris: vscode.Uri[], config: DocumentResolvedConfig) {
  await Promise.all(
    uris.map(async (uri) => {
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder().decode(bytes);

        const promises = [...text.matchAll(IMPORT_RE)].map(async (match) => {
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

            try {
              const importUri = vscode.Uri.file(resolvedPath);
              const importBytes = await vscode.workspace.fs.readFile(importUri);
              const importText = new TextDecoder().decode(importBytes);

              extractColors(importText, 'scss', {
                ...config,
                extractOnly: true,
                uri: importUri.toString(),
              });
            } catch {
              // File not found or not readable, ignore silently.
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
