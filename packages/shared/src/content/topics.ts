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
