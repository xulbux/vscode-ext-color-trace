/**
 * CSS Variable Management.
 *
 * Extracts and stores CSS variables and Tailwind classes for workspace-wide resolution.
 */

import type { ColorData } from '@/types';

/**
 * Global store of CSS variables extracted from the workspace.
 * This allows resolving `var(--name)` and Tailwind classes (e.g. `text-red`)
 * even across different files, as long as the definition file was opened.
 */
const globalVariables = new Map<string, { color: ColorData; uri: string }>();
const variablesByUri = new Map<string, Set<string>>();

export function setVariable(name: string, color: ColorData, uri: string): void {
  globalVariables.set(name, { color, uri });

  let uriVars = variablesByUri.get(uri);
  if (!uriVars) {
    uriVars = new Set();
    variablesByUri.set(uri, uriVars);
  }
  uriVars.add(name);
}

export function getVariable(name: string): ColorData | undefined {
  return globalVariables.get(name)?.color;
}

export function clearVariablesForUri(uri: string): void {
  const uriVars = variablesByUri.get(uri);
  if (uriVars) {
    for (const name of uriVars) {
      globalVariables.delete(name);
    }
    variablesByUri.delete(uri);
  }
}

export function getVariablesForUri(uri: string): Map<string, ColorData> {
  const result = new Map<string, ColorData>();
  const uriVars = variablesByUri.get(uri);
  if (uriVars) {
    for (const name of uriVars) {
      const v = globalVariables.get(name);
      if (v) {
        result.set(name, v.color);
      }
    }
  }
  return result;
}

export function areVariablesEqual(a: Map<string, ColorData>, b: Map<string, ColorData>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, valA] of a.entries()) {
    const valB = b.get(key);
    if (!valB) {
      return false;
    }
    // A simple CSS string comparison is usually sufficient for identity.
    if (valA.css !== valB.css) {
      return false;
    }
  }
  return true;
}
