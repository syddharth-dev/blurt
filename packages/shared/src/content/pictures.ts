import type { DiagramId } from './diagrams.js';
import { DIAGRAMS } from './diagrams.js';
import type { LocalPicture } from './types.js';

type Box = LocalPicture['highlight'];
const pic = (diagram: DiagramId, highlight: Box): LocalPicture => ({
  diagram,
  highlight,
  altText: DIAGRAMS[diagram].altText,
});
const ellipse = (x: number, y: number, w: number, h: number, badge?: Box['badge']): Box => ({
  shape: 'ellipse',
  x,
  y,
  w,
  h,
  ...(badge ? { badge } : {}),
});
const rect = (x: number, y: number, w: number, h: number): Box => ({ shape: 'rect', x, y, w, h });

/**
 * Which bundled diagram each term uses, and the part to name (fractions of the picture).
 * Terms not listed here show their clue instead (they get pictures from teachers later).
 */
export const PICTURES: Record<string, LocalPicture> = {
  'chem-proton': pic('atom', ellipse(0.37, 0.37, 0.15, 0.15, 'left')),
  'chem-neutron': pic('atom', ellipse(0.48, 0.37, 0.15, 0.15, 'right')),
  'chem-electron': pic('atom', ellipse(0.44, 0.05, 0.12, 0.12)),
  'bio-nucleus': pic('animal-cell', ellipse(0.29, 0.29, 0.38, 0.38)),
  'bio-chromosome': pic('animal-cell', ellipse(0.485, 0.455, 0.13, 0.13, 'right')),
  'bio-mitosis': pic('cell-division', rect(0.04, 0.135, 0.94, 0.28)),
  'bio-meiosis': pic('cell-division', rect(0.04, 0.53, 0.94, 0.44)),
  'bio-chloroplast': pic('plant-cell', ellipse(0.65, 0.17, 0.2, 0.14)),
  'earth-epicenter': pic('earthquake', ellipse(0.5, 0.285, 0.13, 0.13)),
  'earth-fault': pic('earthquake', ellipse(0.29, 0.39, 0.22, 0.22, 'left')),
  'bio-producer': pic('food-chain', ellipse(0.03, 0.36, 0.24, 0.27)),
  'bio-consumer': pic('food-chain', ellipse(0.34, 0.41, 0.36, 0.2)),
  'bio-decomposer': pic('food-chain', ellipse(0.57, 0.64, 0.34, 0.29, 'right')),
  'space-asteroid': pic('solar-system', ellipse(0.465, 0.465, 0.11, 0.11)),
  'space-comet': pic('solar-system', ellipse(0.73, 0.05, 0.26, 0.25)),
};
