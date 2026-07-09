import type { TextEditorDecorationType } from 'vscode';

/** Represents a cached text editor decoration type and its active editor ranges. */
export interface DecorationEntry {
  /** The VS Code decoration type applied to the editor. */
  type: TextEditorDecorationType;
  /** Ranges currently applied to each editor (keyed by editor id). */
  activeEditors: Set<string>;
}
