/**
 * Lightweight logging to a dedicated `Color Tracr` output channel.
 *
 * Surfaces non-fatal warnings/errors that would otherwise be silently
 * swallowed, plus fatal failures that stop the extension from working, so the
 * user can diagnose unexpected behavior. The channel is created lazily, so it
 * has no cost unless something is actually logged.
 */

import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined = undefined;

function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Color Tracr', 'log');
  }
  return channel;
}

function formatDetail(error: unknown): string {
  if (error instanceof Error) {
    return `\n${error.stack ?? error.message}`;
  }
  if (error) {
    return `\n${String(error)}`;
  }
  return '';
}

/** Non-critical issue that degrades a feature (e.g., a single file failed to load). */
export function logWarn(message: string, error?: unknown): void {
  getChannel().appendLine(`[${new Date().toISOString()}][WARN] ${message}${formatDetail(error)}`);
}

/** A failure that prevents part of the extension from working. */
export function logError(message: string, error?: unknown): void {
  getChannel().appendLine(`[${new Date().toISOString()}][ERROR] ${message}${formatDetail(error)}`);
}

/**
 * A failure that prevents the whole extension from working.
 *
 * In addition to the output channel, this notifies the user
 * so the failure is visible without them having to open the log.
 */
export function logFatal(message: string, error?: unknown): void {
  getChannel().appendLine(`[${new Date().toISOString()}][FATAL] ${message}${formatDetail(error)}`);
  vscode.window.showErrorMessage(`Color Tracr: ${message}`, 'Show Logs').then(
    (choice) => {
      if (choice === 'Show Logs') {
        getChannel().show();
      }
    },
    () => {
      // Notification dismissal errors are irrelevant.
    }
  );
}

export function disposeLogger(): void {
  channel?.dispose();
  channel = undefined;
}
