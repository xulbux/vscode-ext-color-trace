import type { Range } from 'vscode';
import type { ColorData } from './color';

export interface CacheEntry {
  version: number;
  results: { range: Range; color: ColorData }[];
}
