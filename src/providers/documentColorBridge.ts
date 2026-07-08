/**
 * Bridge to VS Code's built-in `vscode.executeDocumentColorProvider` command.
 *
 * This aggregates color information from ALL registered DocumentColorProviders,
 * including the built-in CSS language service (which resolves `var()` references)
 * and Tailwind CSS IntelliSense (if installed).
 */

import * as vscode from 'vscode';
import type { ColorMatch } from '@/core/colorParser';
import type { RGBA } from '@/core/colorUtils';

/**
 * Query all registered DocumentColorProviders for the given document.
 *
 * @returns  ColorMatch[] derived from other extensions' color providers.
 *           Returns an empty array if no providers are available.
 */
export async function getProviderColors(document: vscode.TextDocument): Promise<ColorMatch[]> {
  try {
    const colors = await vscode.commands.executeCommand<vscode.ColorInformation[]>(
      'vscode.executeDocumentColorProvider',
      document.uri
    );

    if (!colors || colors.length === 0) {
      return [];
    }

    return colors.map((info) => {
      const startOffset = document.offsetAt(info.range.start);
      const endOffset = document.offsetAt(info.range.end);
      const originalText = document.getText(info.range);

      // VS Code's Color uses 0-1 for all channels.
      const rgba: RGBA = {
        a: info.color.alpha,
        b: Math.round(info.color.blue * 255),
        g: Math.round(info.color.green * 255),
        r: Math.round(info.color.red * 255),
      };

      return { endOffset, originalText, rgba, startOffset };
    });
  } catch {
    // Provider may not be available; Silently return empty.
    return [];
  }
}
