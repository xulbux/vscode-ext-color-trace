/**
 * Bridge to VS Code's built-in `vscode.executeDocumentColorProvider` command.
 *
 * This aggregates color information from ALL registered `DocumentColorProviders`,
 * including the built-in CSS language service (which resolves `var()` references)
 * and Tailwind CSS IntelliSense (if installed).
 */

import * as vscode from 'vscode';
import { NAMED_COLORS } from '@/consts/namedColors';
import type { ColorMatch, DocumentResolvedConfig } from '@/types';
import { extractTokens } from '@/utils/strategy';

/**
 * Query all registered `DocumentColorProviders` for the given document.
 *
 * @returns `ColorMatch[]` derived from other extensions' color providers.
 *          Returns an empty array if no providers are available.
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
      let startOffset = document.offsetAt(info.range.start);
      let endOffset = document.offsetAt(info.range.end);
      let originalText = document.getText(info.range);

      // Strip surrounding quotes if a language server (like Pylance) incorrectly includes them.
      if (
        originalText.length >= 2 &&
        ((originalText.startsWith('"') && originalText.endsWith('"')) ||
          (originalText.startsWith("'") && originalText.endsWith("'")) ||
          (originalText.startsWith('`') && originalText.endsWith('`')))
      ) {
        originalText = originalText.slice(1, -1);
        startOffset += 1;
        endOffset -= 1;
      }

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

      if (isValid && !options.markNamedColors) {
        if (NAMED_COLORS.has(originalText.toLowerCase())) {
          isValid = false;
        }
      }

      if (isValid && !options.markTailwind) {
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
