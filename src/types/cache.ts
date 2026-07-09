import type { Range } from 'vscode';
import type { ColorData } from './color';

/** Represents a cached scan result for a document to avoid re-parsing on every change. */
export interface CacheEntry {
  /** The document version this cache corresponds to. */
  version: number;
  /** The extracted color ranges and their data. */
  results: { range: Range; color: ColorData }[];
}
