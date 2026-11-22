/** Small seeded generator so scenes look the same on every render (and in tests). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const between = (rand: () => number, min: number, max: number) => min + rand() * (max - min);
