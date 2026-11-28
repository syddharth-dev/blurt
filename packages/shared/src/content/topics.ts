import type { ContentTerm, SubjectName } from './types.js';

export type LocalTopic = {
  /** URL-safe id, e.g. "atoms-and-ions" */
  id: string;
  title: string;
  subject: SubjectName;
  terms: ContentTerm[];
};

export function topicSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Groups terms into topics, in first-seen order. */
export function topicsOf(terms: readonly ContentTerm[]): LocalTopic[] {
  const byId = new Map<string, LocalTopic>();
  for (const t of terms) {
    const id = topicSlug(t.topic);
    const topic = byId.get(id) ?? { id, title: t.topic, subject: t.subject, terms: [] };
    topic.terms.push(t);
    byId.set(id, topic);
  }
  return [...byId.values()];
}

/** A mixed round: `count` terms picked across all topics. `random` is injectable for tests. */
export function mixedRound(
  terms: readonly ContentTerm[],
  count: number,
  random: () => number = Math.random,
): ContentTerm[] {
  const pool = [...terms];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

/**
 * Starter topics unlock gradually (Phase 5): two at level 1, then more as students level up.
 * The seed uses these for new databases; admins can change them in the dashboard afterwards.
 */
export const STARTER_UNLOCK_LEVELS: Readonly<Record<string, number>> = {
  'atoms-and-ions': 1,
  'cells-and-heredity': 1,
  ecosystems: 2,
  'forces-and-motion': 2,
  'energy-light-and-sound': 3,
  'earthquakes-and-weather': 3,
  'the-solar-system': 4,
};
