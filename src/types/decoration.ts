import type { TextEditorDecorationType } from 'vscode';

/** Represents a cached text editor decoration type and its active editor ranges. */
export interface DecorationEntry {
  /** The VS Code decoration type applied to the editor. */
  type: TextEditorDecorationType;
  /** IDs of the editors this decoration type is currently applied to. */
  activeEditors: Set<string>;
}
