import {
  GRADE8_TERMS,
  mixedRound,
  topicsOf,
  type ContentTerm,
  type SubjectName,
} from '@blurt/shared/content';
import { ROUND_RULES } from '@blurt/shared/progress';
import type { RoundStarted, RoundTerm } from '@blurt/shared/schemas';
import { useEffect, useState } from 'react';
import { ApiRequestError, endpoints, isOffline } from '@/shared/api';
import { useAuth } from '@/shared/auth/session';
import { isOnlineConfigured } from '@/shared/config';

export const MIX_TOPIC_ID = 'mix';
export const PRACTICE_TOPIC_ID = 'practice';

export type RoundSetup = {
  topicId: string;
  title: string;
  subject: string;
  terms: readonly ContentTerm[];
  /** Practice rounds replay specific terms */
  termIds?: string[];
  /** The server's round, or null when playing offline (answers checked on the phone only). */
  roundId: string | null;
};

export type RoundLoad =
  | { status: 'loading' }
  | { status: 'ready'; round: RoundSetup }
  | { status: 'error'; message: string };

/** A round from the bundled starter set (offline, or builds without online settings). */
export function localRound(topicId: string, termIds?: string[]): RoundSetup | null {
  if (topicId === PRACTICE_TOPIC_ID) {
    const terms = GRADE8_TERMS.filter((t) => termIds?.includes(t.id));
    if (!terms.length) return null;
    return { topicId, title: 'Practice', subject: 'Mixed', terms, termIds, roundId: null };
  }
  if (topicId === MIX_TOPIC_ID) {
    return {
      topicId,
      title: 'Daily mix',
      subject: 'Mixed',
      terms: mixedRound(GRADE8_TERMS, ROUND_RULES.termsPerRound),
      roundId: null,
    };
  }
  const topic = topicsOf(GRADE8_TERMS).find((t) => t.id === topicId);
  if (!topic) return null;
  return {
    topicId,
    title: topic.title,
    subject: topic.subject,
    terms: topic.terms.slice(0, ROUND_RULES.termsPerRound),
    roundId: null,
  };
}

/** A term from the API in the shape the round machine and screen use. */
export function toContentTerm(t: RoundTerm): ContentTerm {
  return {
    id: t.id,
    subject: t.subject as SubjectName,
    topic: t.topic,
    canonical: t.canonical,
    display: t.display,
    syllables: t.syllables,
    clue: t.clue,
    fact: t.fact,
    difficulty: Math.min(3, Math.max(1, t.difficulty)) as 1 | 2 | 3,
    accept: t.accept,
    close: t.close,
    confusables: t.confusables,
    // Uploaded pictures (url) are drawn from Phase 4; bundled diagrams work now.
    ...(t.picture?.diagram
      ? {
          picture: {
            diagram: t.picture.diagram,
            highlight: t.picture.highlight,
            altText: t.picture.altText,
          },
        }
      : {}),
  };
}

export function fromServer(started: RoundStarted, topicId: string, termIds?: string[]): RoundSetup {
  return {
    topicId,
    title: topicId === MIX_TOPIC_ID ? 'Daily mix' : started.topic.title,
    subject: started.topic.subject,
    terms: started.terms.map(toContentTerm),
    termIds,
    roundId: started.roundId,
  };
}

/** What to ask the server for: a topic, or specific terms (practice, and the local daily mix). */
function startRequest(topicId: string, termIds?: string[]) {
  if (topicId === PRACTICE_TOPIC_ID) return termIds?.length ? { termIds } : null;
  if (topicId === MIX_TOPIC_ID) {
    return { termIds: mixedRound(GRADE8_TERMS, ROUND_RULES.termsPerRound).map((t) => t.id) };
  }
  return { topicId };
}

/**
 * Starts a round: from the API when signed in (the server checks every answer), else from
 * the bundled set. If the server can't be reached, plays offline with the bundled set.
 */
export async function loadRound(
  topicId: string,
  termIds?: string[],
  online = true,
): Promise<RoundLoad> {
  const offline = (): RoundLoad => {
    const r = localRound(topicId, termIds);
    return r
      ? { status: 'ready', round: r }
      : { status: 'error', message: "That topic isn't here. Pick another one from Home." };
  };
  const request = startRequest(topicId, termIds);
  if (!online || !request) return offline();
  try {
    return {
      status: 'ready',
      round: fromServer(await endpoints.startRound(request), topicId, termIds),
    };
  } catch (e) {
    if (isOffline(e)) return offline();
    if (e instanceof ApiRequestError && e.code === 'TOPIC_LOCKED') {
      return { status: 'error', message: `${e.message} Keep playing to level up.` };
    }
    if (e instanceof ApiRequestError && e.status === 404) {
      return { status: 'error', message: "That topic isn't here. Pick another one from Home." };
    }
    // Anything else (server error, bad response): still let them play offline.
    return offline();
  }
}

export function useRoundLoad(topicId: string, termIds?: string[]): RoundLoad {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const [load, setLoad] = useState<RoundLoad>({ status: 'loading' });
  const key = termIds?.join(',');
  useEffect(() => {
    let alive = true;
    void loadRound(
      topicId,
      key ? key.split(',') : undefined,
      signedIn && isOnlineConfigured(),
    ).then((r) => alive && setLoad(r));
    return () => {
      alive = false;
    };
  }, [topicId, key, signedIn]);
  return load;
}
