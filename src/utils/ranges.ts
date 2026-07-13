/**
 * Interval and range utilities for merging color matches.
 */

import type { ColorMatch } from '@/types';

export function mergeNonOverlapping(
  target: ColorMatch[],
  newMatches: ColorMatch[],
  removeIntraOverlaps = false
): ColorMatch[] {
  const merged: ColorMatch[] = [];
  let i = 0;
  let j = 0;
  let lastEnd = -1;
  let maxTargetEnd = -1;

  while (i < target.length && j < newMatches.length) {
    if (target[i].startOffset <= newMatches[j].startOffset) {
      merged.push(target[i]);
      maxTargetEnd = Math.max(maxTargetEnd, target[i].endOffset);
      if (removeIntraOverlaps) {
        lastEnd = Math.max(lastEnd, target[i].endOffset);
      }
      i += 1;
    } else {
      const pm = newMatches[j];
      const overlapsIntra = removeIntraOverlaps && pm.startOffset < lastEnd;
      const overlapsTarget = pm.startOffset < maxTargetEnd || pm.endOffset > target[i].startOffset;

      if (!overlapsIntra && !overlapsTarget) {
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
    maxTargetEnd = Math.max(maxTargetEnd, target[i].endOffset);
    if (removeIntraOverlaps) {
      lastEnd = Math.max(lastEnd, target[i].endOffset);
    }
    i += 1;
  }

  while (j < newMatches.length) {
    const pm = newMatches[j];
    const overlapsIntra = removeIntraOverlaps && pm.startOffset < lastEnd;
    const overlapsTarget = pm.startOffset < maxTargetEnd;

    if (!overlapsIntra && !overlapsTarget) {
      merged.push(pm);
      if (removeIntraOverlaps) {
        lastEnd = Math.max(lastEnd, pm.endOffset);
      }
    }
    j += 1;
  }

  return merged;
}
