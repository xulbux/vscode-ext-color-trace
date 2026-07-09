/**
 * Color Trace – VS Code Extension Entry Point
 *
 * Activates after VS Code has finished loading (`onStartupFinished`),
 * wires up event listeners, and triggers the initial scan of all
 * visible editors.
 */

import * as vscode from 'vscode';
import { readConfig } from '@/config';
import { extractColors } from '@/core/colorParser';
import { clearDecorations, disposeAll } from '@/core/decorationManager';
import { clearCache, invalidateCache, scanEditor } from '@/core/scanner';
import { clearVariablesForUri } from '@/core/variableManager';

// ---------------------------------------- STATE ----------------------------------------

let updateTimer: ReturnType<typeof setTimeout> | undefined = undefined;

/** How long to wait after the last keystroke before re-scanning (ms). */
const EDIT_DEBOUNCE = 150;
/** Delay before re-scanning to let other extensions' `DocumentColorProviders` load (ms). */
const PROVIDER_WARMUP_DELAY = 2000;

// -------------------------------------- ACTIVATION -------------------------------------

function triggerScan(editor: vscode.TextEditor, config: ReturnType<typeof readConfig>): void {
  scanEditor(editor, {
    editorBg: config.editorBackground,
    ignorePatterns: config.ignorePatterns,
    matchNamed: config.highlightNamedColors,
    matchTailwind: config.highlightTailwind,
  }).catch(() => {
    // Ignore scan errors to satisfy no-console.
  });
}

export function activate(context: vscode.ExtensionContext): void {
  let config = readConfig();

  // --- Initial scan ---
  if (config.enable) {
    // [1] Instantly scan visible editors (they might only have local colors).
    for (const editor of vscode.window.visibleTextEditors) {
      triggerScan(editor, config);
    }

    // [2] Scan workspace for CSS variables in the background, then re-scan visible editors.
    vscode.workspace
      .findFiles('**/*.{css,scss,less,sass,styl,vue,html,ts,js,jsx,tsx}', '**/node_modules/**', 100)
      .then(async (uris) => {
        const promises = uris.map(async (uri) => {
          try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder().decode(bytes);
            const uriStr = uri.toString();
            clearVariablesForUri(uriStr);
            extractColors(text, 'css', { matchNamed: false, matchTailwind: false, uri: uriStr });
          } catch {
            // Ignore read errors.
          }
        });

        await Promise.all(promises);

        clearCache();
        for (const editor of vscode.window.visibleTextEditors) {
          triggerScan(editor, config);
        }
      });

    // [3] Re-scan after a short delay so DocumentColorProviders have time to initialize.
    setTimeout(() => {
      clearCache();
      for (const editor of vscode.window.visibleTextEditors) {
        triggerScan(editor, config);
      }
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

      // Debounce: wait for the user to stop typing.
      if (updateTimer !== undefined) {
        clearTimeout(updateTimer);
      }
      updateTimer = setTimeout(() => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === event.document) {
            triggerScan(editor, config);
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

  // --- Configuration changed ---
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('colorTrace') ||
        event.affectsConfiguration('workbench.colorCustomizations')
      ) {
        config = readConfig();
        clearCache();

        if (config.enable) {
          for (const editor of vscode.window.visibleTextEditors) {
            triggerScan(editor, config);
          }
        } else {
          // Extension disabled; Remove all decorations
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
      config = readConfig();
      clearCache();

      if (config.enable) {
        for (const editor of vscode.window.visibleTextEditors) {
          triggerScan(editor, config);
        }
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
      for (const editor of vscode.window.visibleTextEditors) {
        triggerScan(editor, config);
      }
    })
  );
}

// ------------------------------------- DEACTIVATION ------------------------------------

export function deactivate(): void {
  if (updateTimer !== undefined) {
    clearTimeout(updateTimer);
  }
  disposeAll();
  clearCache();
}
