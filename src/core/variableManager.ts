import type { ColorData } from '@/types';

/**
 * Global store of CSS variables extracted from the workspace.
 * This allows resolving `var(--name)` and Tailwind classes (e.g. `text-red`)
 * even across different files, as long as the definition file was opened.
 */
export const globalVariables = new Map<string, { color: ColorData; uri: string }>();

export function setVariable(name: string, color: ColorData, uri: string): void {
  globalVariables.set(name, { color, uri });
}

export function getVariable(name: string): ColorData | undefined {
  return globalVariables.get(name)?.color;
}

export function clearVariablesForUri(uri: string): void {
  for (const [key, value] of globalVariables.entries()) {
    if (value.uri === uri) {
      globalVariables.delete(key);
    }
  }
}
