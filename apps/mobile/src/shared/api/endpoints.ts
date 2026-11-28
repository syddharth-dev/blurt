import {
  AttemptResponse,
  DailyResponse,
  JoinClassResult,
  PracticeResponse,
  StudentClasses,
  Me,
  RoundStarted,
  RoundSummaryResponse,
  SkipResponse,
  SubjectsResponse,
  type AttemptRequest,
  type StartRound,
  type UpdateMe,
} from '@blurt/shared/schemas';
import { api } from './client';

/** The student endpoints (docs/DATA_AND_API.md). */
export const endpoints = {
  me: () => api('/me', { schema: Me }),
  updateMe: (body: UpdateMe) => api('/me', { method: 'PATCH', body, schema: Me }),
  subjects: () => api('/subjects', { schema: SubjectsResponse }),
  classes: () => api('/classes', { schema: StudentClasses }),
  practice: () => api('/practice', { schema: PracticeResponse }),
  daily: (localDate: string) => api(`/daily?localDate=${localDate}`, { schema: DailyResponse }),
  joinClass: (code: string) =>
    api('/classes/join', { method: 'POST', body: { code }, schema: JoinClassResult }),
  startRound: (body: StartRound) => api('/rounds', { method: 'POST', body, schema: RoundStarted }),
  attempt: (roundId: string, body: AttemptRequest) =>
    api(`/rounds/${roundId}/attempts`, { method: 'POST', body, schema: AttemptResponse }),
  skip: (roundId: string, body: { termId: string; idempotencyKey: string }) =>
    api(`/rounds/${roundId}/skip`, { method: 'POST', body, schema: SkipResponse }),
  finish: (roundId: string, localDate: string) =>
    api(`/rounds/${roundId}/finish`, {
      method: 'POST',
      body: { localDate },
      schema: RoundSummaryResponse,
    }),
};
