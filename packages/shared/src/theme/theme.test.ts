import { describe, expect, it } from 'vitest';
import { colors, contrastRatio } from './index.js';

// Text pairings the brand actually uses (BRAND.md). AGENTS.md rule 6: contrast ≥ 4.5:1.
const TEXT_PAIRS: Array<[fg: keyof typeof colors, bg: keyof typeof colors]> = [
  ['night', 'sunny'], // yellow buttons always carry night text
  ['night', 'white'],
  ['night', 'lilac'],
  ['ink2', 'white'],
  ['violet', 'white'], // links on light
  ['white', 'violet'],
  ['white', 'night'],
  ['sunny', 'night'],
  ['violet', 'lilac'], // close verdict badge
  ['night', 'coral'], // wrong verdict badge
  ['coralShadow', 'white'], // subject tag on cards
  ['lilac', 'night'],
  ['violetInk', 'violetTint'], // chips like "10 terms"
  ['sunnyInk', 'sunnyTint'], // CLUE tag, "+150 XP"
  ['coralInk', 'coralTint'], // "Daily" tag
  ['lockedInk', 'lockedPanel'], // locked topic text
  ['lockedInk', 'white'],
];

describe('brand colour contrast', () => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('white on sunny fails, which is why yellow buttons use night text', () => {
    expect(contrastRatio(colors.white, colors.sunny)).toBeLessThan(4.5);
  });
});
