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

export function mergeNonOverlapping(
  target: ColorMatch[],
  newMatches: ColorMatch[],
  removeIntraOverlaps = false
): ColorMatch[] {
  const merged: ColorMatch[] = [];
  let i = 0;
  let j = 0;
  let lastEnd = -1;

  while (i < target.length && j < newMatches.length) {
    if (target[i].startOffset <= newMatches[j].startOffset) {
      merged.push(target[i]);
      if (removeIntraOverlaps) {
        lastEnd = Math.max(lastEnd, target[i].endOffset);
      }
      i += 1;
    } else {
      const pm = newMatches[j];
      const overlapsIntra = removeIntraOverlaps && pm.startOffset < lastEnd;
      if (!overlapsIntra && !hasOverlap(target, pm.startOffset, pm.endOffset)) {
        merged.push(pm);
        if (removeIntraOverlaps) {
          lastEnd = Math.max(lastEnd, pm.endOffset);
        }
      }
      j += 1;
    }
  }

  while (i < target.length) {
    merged.push(target[i]);
    if (removeIntraOverlaps) {
      lastEnd = Math.max(lastEnd, target[i].endOffset);
    }
    i += 1;
  }

  while (j < newMatches.length) {
    const pm = newMatches[j];
    const overlapsIntra = removeIntraOverlaps && pm.startOffset < lastEnd;
    if (!overlapsIntra && !hasOverlap(target, pm.startOffset, pm.endOffset)) {
      merged.push(pm);
      if (removeIntraOverlaps) {
        lastEnd = Math.max(lastEnd, pm.endOffset);
      }
    }
    j += 1;
  }

  return merged;
}
