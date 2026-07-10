/**
 * Interval and range utilities for merging color matches.
 */

import type { ColorMatch } from '@/types';

/**
 * Perform a binary search to determine if the given `[start, end)` range
 * overlaps with any interval in the `sortedMatches` array.
 */
export function hasOverlap(sortedMatches: ColorMatch[], start: number, end: number): boolean {
  let left = 0;
  let right = sortedMatches.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const iv = sortedMatches[mid];
    if (end <= iv.startOffset) {
      right = mid - 1;
    } else if (start >= iv.endOffset) {
      left = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Filter out any `newMatches` that overlap with `target` matches,
 * optionally remove overlaps within the filtered `newMatches` themselves,
 * and merge both arrays into a single sorted array.
 * Both `target` and `newMatches` are expected to be sorted by `startOffset`.
 */
export function mergeNonOverlapping(
  target: ColorMatch[],
  newMatches: ColorMatch[],
  removeIntraOverlaps = false
): ColorMatch[] {
  let filtered = newMatches.filter((m) => !hasOverlap(target, m.startOffset, m.endOffset));

  if (removeIntraOverlaps) {
    const deduped: ColorMatch[] = [];
    let lastEnd = -1;
    for (const pm of filtered) {
      if (pm.startOffset >= lastEnd) {
        deduped.push(pm);
        lastEnd = pm.endOffset;
      }
    }
    filtered = deduped;
  }

  const merged: ColorMatch[] = [];
  let i = 0;
  let j = 0;
  while (i < target.length && j < filtered.length) {
    if (target[i].startOffset <= filtered[j].startOffset) {
      merged.push(target[i]);
      i += 1;
    } else {
      merged.push(filtered[j]);
      j += 1;
    }
  }
  while (i < target.length) {
    merged.push(target[i]);
    i += 1;
  }
  while (j < filtered.length) {
    merged.push(filtered[j]);
    j += 1;
  }
  return merged;
}
