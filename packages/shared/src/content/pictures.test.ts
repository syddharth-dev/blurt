import { describe, expect, it } from 'vitest';
import { DIAGRAMS, GRADE8_TERMS, PICTURES } from './index.js';

describe('bundled pictures', () => {
  const ids = new Set(GRADE8_TERMS.map((t) => t.id));

  it('covers 15 terms, each a real term with a real diagram', () => {
    expect(Object.keys(PICTURES)).toHaveLength(15);
    for (const [termId, p] of Object.entries(PICTURES)) {
      expect(ids.has(termId)).toBe(true);
      expect(DIAGRAMS[p.diagram as keyof typeof DIAGRAMS]).toBeDefined();
    }
    expect(GRADE8_TERMS.filter((t) => t.picture)).toHaveLength(15);
  });

  it('every highlight box fits inside the picture', () => {
    for (const { highlight: h } of Object.values(PICTURES)) {
      expect(h.x).toBeGreaterThanOrEqual(0);
      expect(h.y).toBeGreaterThanOrEqual(0);
      expect(h.w).toBeGreaterThan(0);
      expect(h.h).toBeGreaterThan(0);
      expect(h.x + h.w).toBeLessThanOrEqual(1);
      expect(h.y + h.h).toBeLessThanOrEqual(1);
    }
  });

  it('alt text never gives the answer away', () => {
    for (const t of GRADE8_TERMS) {
      if (!t.picture) continue;
      const alt = t.picture.altText.toLowerCase();
      for (const form of [t.canonical, ...t.accept]) expect(alt).not.toContain(form.toLowerCase());
    }
  });

  it('diagrams are valid standalone SVG with no text labels', () => {
    for (const d of Object.values(DIAGRAMS)) {
      expect(
        d.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"'),
      ).toBe(true);
      expect(d.svg).not.toMatch(/<text/);
    }
  });
});
