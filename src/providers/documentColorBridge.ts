/**
 * Bridge to VS Code's built-in `vscode.executeDocumentColorProvider` command.
 *
 * This aggregates color information from ALL registered DocumentColorProviders,
 * including the built-in CSS language service (which resolves `var()` references)
 * and Tailwind CSS IntelliSense (if installed).
 */

import * as vscode from 'vscode';
import { NAMED_COLORS } from '@/providers/namedColors';
import type { ColorMatch, DocumentResolvedConfig } from '@/types';
import { extractTokens } from '@/utils/strategy';

/**
 * Query all registered DocumentColorProviders for the given document.
 *
 * @returns  `ColorMatch[]` derived from other extensions' color providers.
 *           Returns an empty array if no providers are available.
 */
// oxlint-disable-next-line complexity
export async function getProviderColors(
  document: vscode.TextDocument,
  options: DocumentResolvedConfig
): Promise<ColorMatch[]> {
  try {
    const colors = await vscode.commands.executeCommand<vscode.ColorInformation[]>(
      'vscode.executeDocumentColorProvider',
      document.uri
    );

    if (!colors || colors.length === 0) {
      return [];
    }

    const matches: ColorMatch[] = [];

    for (const info of colors) {
      const startOffset = document.offsetAt(info.range.start);
      const endOffset = document.offsetAt(info.range.end);
      const originalText = document.getText(info.range);

      let isValid = true;
      if (originalText.includes('(')) {
        const lower = originalText.toLowerCase();
        if (
          lower.startsWith('rgb') ||
          lower.startsWith('hsl') ||
          lower.startsWith('hwb') ||
          lower.startsWith('oklch') ||
          lower.startsWith('lch') ||
          lower.startsWith('oklab') ||
          lower.startsWith('lab')
        ) {
          const allowCommas = lower.startsWith('rgb') || lower.startsWith('hsl');
          const valid = extractTokens(originalText, allowCommas);
          if (!valid) {
            isValid = false;
          }
        }
      }

      if (isValid && !options.highlightNamedColors) {
        if (NAMED_COLORS.has(originalText.toLowerCase())) {
          isValid = false;
        }
      }

      if (isValid && !options.highlightTailwind) {
        if (
          originalText.includes('-') &&
          !originalText.includes('(') &&
          !originalText.startsWith('--')
        ) {
          isValid = false;
        }
      }

      if (isValid) {
        // VS Code's Color uses 0-1 for all channels.
        const rgba = {
          a: info.color.alpha,
          b: Math.round(info.color.blue * 255),
          g: Math.round(info.color.green * 255),
          r: Math.round(info.color.red * 255),
        };

        const opaqueCss = `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
        matches.push({
          color: { css: originalText, opaqueCss, rgba },
          endOffset,
          originalText,
          startOffset,
        });
      }
    }

    return matches;
  } catch {
    // Provider may not be available; Silently return empty.
    return [];
  }
}
