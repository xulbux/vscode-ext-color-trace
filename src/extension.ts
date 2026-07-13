/**
 * Color Tracr – VS Code Extension Entry Point
 *
 * Activates after VS Code has finished loading (`onStartupFinished`),
 * wires up event listeners, and triggers the initial scan of all
 * visible editors.
 */

import * as vscode from 'vscode';
import { invalidateConfigCache, readConfig, resolveDocumentConfig } from '@/config';
import { extractColors } from '@/core/colorParser';
import { clearDecorations, disposeAll } from '@/core/decorationManager';
import { resolveSassImports } from '@/core/sassResolver';
import { clearCache, invalidateCache, scanEditor } from '@/core/scanner';
import { loadTailwindConfigs } from '@/core/tailwindConfig';
import {
  areVariablesEqual,
  clearVariablesForUri,
  getVariablesForUri,
} from '@/core/variableManager';
import type { ExtensionConfig } from '@/types';

// ---------------------------------------- STATE ----------------------------------------

let updateTimer: ReturnType<typeof setTimeout> | undefined = undefined;
const changedDocuments = new Set<vscode.TextDocument>();

/** How long to wait after the last keystroke before re-scanning (ms). */
const EDIT_DEBOUNCE = 150;
/** Delay before re-scanning to let other extensions' `DocumentColorProviders` load (ms). */
const PROVIDER_WARMUP_DELAY = 2000;

let diagTimer: ReturnType<typeof setTimeout> | undefined = undefined;

// -------------------------------------- ACTIVATION -------------------------------------

function triggerScan(editor: vscode.TextEditor, config: ExtensionConfig): void {
  scanEditor(editor, config).catch(() => {
    // Ignore scan errors to satisfy no-console.
  });
}

function scanAllVisible(config: ReturnType<typeof readConfig>): void {
  for (const editor of vscode.window.visibleTextEditors) {
    triggerScan(editor, config);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  let config = readConfig();

  // --- Initial scan ---
  if (config.enable) {
    // [1] Instantly scan visible editors (they might only have local colors).
    scanAllVisible(config);

    const excludePattern =
      config.excludePaths.length > 0 ? `{${config.excludePaths.join(',')}}` : undefined;

    // [2] Scan workspace for CSS variables in the background, then re-scan visible editors.
    vscode.workspace
      .findFiles('**/*.{css,scss,less,sass,styl,vue,html,ts,js,jsx,tsx}', excludePattern, 500)
      .then(async (uris) => {
        for (let i = 0; i < uris.length; i += 5) {
          const chunk = uris.slice(i, i + 5);
          // oxlint-disable-next-line no-await-in-loop
          await Promise.all(
            chunk.map(async (uri) => {
              try {
                const bytes = await vscode.workspace.fs.readFile(uri);
                if (bytes.length > 500_000) {
                  // Skip massive minified files to prevent high memory usage and extension host freezing.
                  return;
                }

                const text = new TextDecoder().decode(bytes);
                const uriStr = uri.toString();

                clearVariablesForUri(uriStr);
                extractColors(text, 'css', {
                  ...resolveDocumentConfig(config, 'css'),
                  extractOnly: true,
                  uri: uriStr,
                });
              } catch {
                // Ignore read errors.
              }
            })
          );

          // Yield to the event loop between chunks to prevent freezing the extension host.
          // oxlint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        await resolveSassImports(
          uris.filter(
            (uri) =>
              uri.fsPath.endsWith('.scss') ||
              uri.fsPath.endsWith('.sass') ||
              uri.fsPath.endsWith('.less')
          ),
          resolveDocumentConfig(config, 'scss')
        );
        await loadTailwindConfigs(resolveDocumentConfig(config, 'css'));

        clearCache();
        scanAllVisible(config);
      });

    // [3] Re-scan after a short delay so `DocumentColorProviders` have time to initialize.
    setTimeout(() => {
      clearCache();
      scanAllVisible(config);
    }, PROVIDER_WARMUP_DELAY);
  }

  // --- Text document changed (typing) ---
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (!config.enable) {
        return;
      }

      // Invalidate cache for the changed document.
      invalidateCache(event.document.uri.toString());
      changedDocuments.add(event.document);

      // Debounce: wait for the user to stop typing.
      if (updateTimer !== undefined) {
        clearTimeout(updateTimer);
      }
      updateTimer = setTimeout(() => {
        const docs = [...changedDocuments];
        changedDocuments.clear();

        for (const doc of docs) {
          let isVisible = false;
          for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document === doc) {
              isVisible = true;
              triggerScan(editor, config);
            }
          }

          if (!isVisible) {
            const uriStr = doc.uri.toString();
            const beforeVars = getVariablesForUri(uriStr);
            clearVariablesForUri(uriStr);
            extractColors(doc.getText(), doc.languageId, {
              ...resolveDocumentConfig(config, doc.languageId),
              extractOnly: true,
              uri: uriStr,
            });
            const afterVars = getVariablesForUri(uriStr);

            if (!areVariablesEqual(beforeVars, afterVars)) {
              for (const visibleEditor of vscode.window.visibleTextEditors) {
                invalidateCache(visibleEditor.document.uri.toString());
                triggerScan(visibleEditor, config);
              }
            }
          }
        }
      }, EDIT_DEBOUNCE);
    })
  );

  // --- Active editor changed ---
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!config.enable || !editor) {
        return;
      }
      triggerScan(editor, config);
    })
  );

  // --- Visible editors changed (tabs opened/closed/split) ---
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      if (!config.enable) {
        return;
      }
      for (const editor of editors) {
        triggerScan(editor, config);
      }
    })
  );

  // --- Document closed; Clean up cache ---
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      invalidateCache(doc.uri.toString());
    })
  );

  // --- Files deleted/renamed; Clean up variables ---
  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles((event) => {
      for (const file of event.files) {
        clearVariablesForUri(file.toString());
      }
    }),
    vscode.workspace.onDidRenameFiles((event) => {
      for (const file of event.files) {
        clearVariablesForUri(file.oldUri.toString());
      }
    })
  );

  // --- Diagnostics changed (errors/warnings) ---
  context.subscriptions.push(
    vscode.languages.onDidChangeDiagnostics((event) => {
      if (!config.enable) {
        return;
      }

      let needsScan = false;
      for (const uri of event.uris) {
        const uriStr = uri.toString();
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.uri.toString() === uriStr) {
            invalidateCache(uriStr);
            needsScan = true;
          }
        }
      }

      if (needsScan) {
        if (diagTimer !== undefined) {
          clearTimeout(diagTimer);
        }
        diagTimer = setTimeout(() => {
          scanAllVisible(config);
        }, EDIT_DEBOUNCE);
      }
    })
  );

  // --- Configuration changed ---
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('colorTracr') ||
        event.affectsConfiguration('workbench.colorCustomizations')
      ) {
        invalidateConfigCache();
        config = readConfig();
        clearCache();

        if (config.enable) {
          scanAllVisible(config);
        } else {
          // Extension disabled; Remove all decorations.
          for (const editor of vscode.window.visibleTextEditors) {
            clearDecorations(editor);
          }
        }
      }
    })
  );

  // --- Color theme changed; BG color may differ ---
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      invalidateConfigCache();
      config = readConfig();
      clearCache();

      if (config.enable) {
        scanAllVisible(config);
      }
    })
  );

  // --- Extensions activated/deactivated; Re-scan to pick up new providers ---
  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      if (!config.enable) {
        return;
      }

      clearCache();
      scanAllVisible(config);
    })
  );

  // --- Tailwind Configs changed ---
  const twWatcher = vscode.workspace.createFileSystemWatcher('**/tailwind.config.{js,ts,cjs,mjs}');
  context.subscriptions.push(
    twWatcher.onDidChange(async () => {
      await loadTailwindConfigs(resolveDocumentConfig(config, 'css'));
      clearCache();
      scanAllVisible(config);
    }),
    twWatcher.onDidCreate(async () => {
      await loadTailwindConfigs(resolveDocumentConfig(config, 'css'));
      clearCache();
      scanAllVisible(config);
    }),
    twWatcher.onDidDelete((uri) => {
      clearVariablesForUri(uri.toString());
      clearCache();
      scanAllVisible(config);
    }),
    twWatcher
  );
}

// ------------------------------------- DEACTIVATION ------------------------------------

export function deactivate(): void {
  if (updateTimer !== undefined) {
    clearTimeout(updateTimer);
  }
  if (diagTimer !== undefined) {
    clearTimeout(diagTimer);
  }
  disposeAll();
  clearCache();
}
