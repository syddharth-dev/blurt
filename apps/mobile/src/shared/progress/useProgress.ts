import { useMe, useSubjects } from '@/shared/api';

/**
 * The student's saved progress for Home and Topics: totals from /me, per-topic mastery and
 * locks from /subjects. Zeros until loaded (offline, or builds without online settings).
 */
export function useProgress() {
  const me = useMe().data;
  const subjects = useSubjects().data;
  const topics = new Map(
    subjects?.subjects.flatMap((s) => s.topics.map((t) => [t.id, t] as const)) ?? [],
  );
  return {
    name: me?.name,
    initial: me?.name?.trim().charAt(0).toUpperCase() || undefined,
    xp: me?.xp ?? 0,
    level: me?.level ?? 1,
    streak: me?.streak ?? 0,
    mastered: (topicId: string) => topics.get(topicId)?.mastered ?? 0,
    lockedAt: (topicId: string) => {
      const t = topics.get(topicId);
      return t?.locked ? t.unlockLevel : undefined;
    },
  };
}
