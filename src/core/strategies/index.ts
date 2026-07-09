import type { ColorParsingStrategy } from '@/types';
import { hexStrategy } from './hex';
import { hslStrategy } from './hsl';
import { hwbStrategy } from './hwb';
import { oklchStrategy } from './oklch';
import { rgbStrategy } from './rgb';

export const strategies: ColorParsingStrategy[] = [
  hexStrategy,
  hslStrategy,
  hwbStrategy,
  oklchStrategy,
  rgbStrategy,
];
