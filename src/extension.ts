/**
 * Color Trace – VS Code Extension Entry Point
 *
 * Activates after VS Code has finished loading (`onStartupFinished`),
 * wires up event listeners, and triggers the initial scan of all
 * visible editors.
 */

import * as vscode from 'vscode';
import { readConfig } from '@/config';
import { clearDecorations, disposeAll } from '@/core/decorationManager';
import { clearCache, invalidateCache, scanEditor } from '@/core/scanner';

// ---------------------------------------- STATE ----------------------------------------

let updateTimer: ReturnType<typeof setTimeout> | undefined = undefined;
let scrollTimer: ReturnType<typeof setTimeout> | undefined = undefined;

/** How long to wait after the last keystroke before re-scanning (ms). */
const EDIT_DEBOUNCE = 150;
/** How long to wait after scrolling before re-applying decorations (ms). */
const SCROLL_DEBOUNCE = 60;

// -------------------------------------- ACTIVATION -------------------------------------

function triggerScan(editor: vscode.TextEditor, config: ReturnType<typeof readConfig>): void {
  scanEditor(editor, {
    borderRadius: config.borderRadius,
    editorBg: config.editorBackground,
    matchNamed: config.highlightNamedColors,
  }).catch(() => {
    // Ignore scan errors to satisfy no-console.
  });
}

export function activate(context: vscode.ExtensionContext): void {
  let config = readConfig();

  // --- Initial scan ---
  if (config.enable) {
    for (const editor of vscode.window.visibleTextEditors) {
      triggerScan(editor, config);
    }
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

  // --- Scrolling / visible range changes ---
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      if (!config.enable) {
        return;
      }

      if (scrollTimer !== undefined) {
        clearTimeout(scrollTimer);
      }
      scrollTimer = setTimeout(() => {
        triggerScan(event.textEditor, config);
      }, SCROLL_DEBOUNCE);
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
}

// ------------------------------------- DEACTIVATION ------------------------------------

export function deactivate(): void {
  if (updateTimer !== undefined) {
    clearTimeout(updateTimer);
  }
  if (scrollTimer !== undefined) {
    clearTimeout(scrollTimer);
  }
  disposeAll();
  clearCache();
}
