import type { TextEditorDecorationType } from 'vscode';

export interface DecorationEntry {
  type: TextEditorDecorationType;
  /** Ranges currently applied to each editor (keyed by editor id). */
  activeEditors: Set<string>;
}
