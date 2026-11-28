import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { matchAnswer } from '@blurt/shared/matcher';
import { levelFor, ROUND_RULES, xpFor } from '@blurt/shared/progress';
import {
  ERROR_CODES,
  type AttemptRequest,
  type AttemptResponse,
  type RoundStarted,
  type RoundSummaryResponse,
  type SkipRequest,
  type SkipResponse,
  type StartRound,
} from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { apiError } from '../common/errors.js';
import { ProgressService } from '../progress/progress.service.js';
import { UsersService } from '../users/users.service.js';
import {
  RoundsRepository,
  type AttemptRecord,
  type MasteryDelta,
  type RoundRecord,
} from './rounds.repository.js';

const MISS = new Set(['close', 'wrong']);

/**
 * Rounds: the server is authoritative for verdicts, XP and lives (AGENTS.md rule 3).
 * The app gets the answers to check offline and preview; every attempt is re-checked here.
 */
@Injectable()
export class RoundsService {
  constructor(
    private readonly repo: RoundsRepository,
    private readonly users: UsersService,
    private readonly progress: ProgressService,
  ) {}

  async start(auth: AuthUser, body: StartRound): Promise<RoundStarted> {
    const user = await this.users.ensure(auth);

    if ('topicId' in body) {
      const found = await this.repo.topicTerms(body.topicId);
      if (!found || !found.terms.length) throw new NotFoundException("That topic isn't available.");
      if (found.topic.unlockLevel > user.level) {
        throw apiError(
          HttpStatus.FORBIDDEN,
          ERROR_CODES.topicLocked,
          `This topic unlocks at level ${found.topic.unlockLevel}.`,
        );
      }
      const terms = found.terms.slice(0, ROUND_RULES.termsPerRound);
      const round = await this.repo.createRound({
        userId: user.id,
        topicId: found.topic.id,
        terms,
      });
      return this.started(
        round.id,
        { id: found.topic.id, title: found.topic.title, subject: found.topic.subject },
        terms,
      );
    }

    const terms = await this.repo.termsByIds(
      [...new Set(body.termIds)].slice(0, ROUND_RULES.termsPerRound),
    );
    if (!terms.length) throw new NotFoundException("Those terms aren't available.");
    const round = await this.repo.createRound({
      userId: user.id,
      topicId: null,
      terms,
    });
    return this.started(round.id, { id: null, title: 'Practice', subject: 'Mixed' }, terms);
  }

  async attempt(auth: AuthUser, roundId: string, body: AttemptRequest): Promise<AttemptResponse> {
    const replay = await this.repo.findAttempt(body.idempotencyKey);
    if (replay) return (await this.replayed(auth, roundId, replay)) as AttemptResponse;

    const round = await this.activeRound(auth, roundId);
    if (round.lives <= 0) {
      throw apiError(HttpStatus.CONFLICT, ERROR_CODES.outOfLives, 'No lives left in this round.');
    }
    this.assertOpenTerm(round, body.termId);
    const term = await this.servedTerm(round, body.termId);
    if (!term) throw new NotFoundException("That term isn't available.");

    const earlier = round.attempts.filter((a) => a.termId === body.termId);
    const misses = earlier.filter((a) => MISS.has(a.verdict)).length;
    // Hints on this term are cumulative; the round's budget caps the total.
    const prevHints = Math.max(0, ...earlier.map((a) => a.hintsUsed));
    const hintsUsed = Math.min(body.hintsUsed, prevHints + (ROUND_RULES.hints - round.hintsUsed));
    const roundHints = round.hintsUsed + Math.max(0, hintsUsed - prevHints);

    const result = matchAnswer(term, body.alternatives, { inputMode: body.inputMode });
    const correct = result.verdict === 'correct';
    const firstTry = correct && misses === 0 && hintsUsed === 0;
    const xp = correct ? xpFor(hintsUsed, misses) : 0;
    const lives = correct ? round.lives : round.lives - 1;
    const streak = firstTry ? round.streak + 1 : 0;

    const response: AttemptResponse = {
      verdict: result.verdict,
      matched: result.matched,
      feedback: result.feedback,
      pronunciation: { syllables: term.syllables, audioUrl: term.audioUrl },
      livesLeft: lives,
      xpGained: xp,
    };
    await this.repo.saveAttempt(
      round.id,
      {
        termId: term.id,
        termVersion: term.version,
        input: body.alternatives,
        inputMode: body.inputMode,
        verdict: result.verdict,
        hintsUsed,
        ms: body.ms,
        xp,
        response,
        idempotencyKey: body.idempotencyKey,
      },
      {
        lives,
        hintsUsed: roundHints,
        streak,
        bestStreak: Math.max(round.bestStreak, streak),
        score: round.score + xp,
      },
    );
    return response;
  }

  async skip(auth: AuthUser, roundId: string, body: SkipRequest): Promise<SkipResponse> {
    const replay = await this.repo.findAttempt(body.idempotencyKey);
    if (replay) return (await this.replayed(auth, roundId, replay)) as SkipResponse;

    const round = await this.activeRound(auth, roundId);
    this.assertOpenTerm(round, body.termId);
    if (round.skipsUsed >= ROUND_RULES.skips) {
      throw apiError(HttpStatus.CONFLICT, ERROR_CODES.noSkipsLeft, 'No skips left in this round.');
    }
    const response: SkipResponse = { skipsLeft: ROUND_RULES.skips - round.skipsUsed - 1 };
    await this.repo.saveAttempt(
      round.id,
      {
        termId: body.termId,
        termVersion: 0,
        input: [],
        inputMode: 'skip',
        verdict: 'skipped',
        hintsUsed: 0,
        ms: 0,
        xp: 0,
        response,
        idempotencyKey: body.idempotencyKey,
      },
      { skipsUsed: round.skipsUsed + 1, streak: 0 },
    );
    return response;
  }

  async finish(auth: AuthUser, roundId: string, localDate: string): Promise<RoundSummaryResponse> {
    const round = await this.ownRound(auth, roundId);
    if (round.summary) return round.summary;

    const user = await this.users.ensure(auth);
    const terms = round.terms ?? (await this.repo.termsByIds(round.termIds));
    const display = new Map(terms.map((t) => [t.id, t.display]));
    const results: RoundSummaryResponse['results'] = [];
    const mastery: MasteryDelta[] = [];

    for (const termId of round.termIds) {
      const attempts = round.attempts.filter((a) => a.termId === termId);
      if (!attempts.length) continue; // never reached (round ended early)
      const correct = attempts.find((a) => a.verdict === 'correct');
      const skipped = attempts.some((a) => a.verdict === 'skipped');
      const misses = attempts.filter((a) => MISS.has(a.verdict)).length;
      const hintsUsed = Math.max(0, ...attempts.map((a) => a.hintsUsed));
      const outcome = correct
        ? misses === 0 && hintsUsed === 0
          ? 'first-try'
          : 'assisted'
        : skipped
          ? 'skipped'
          : 'missed';
      results.push({
        termId,
        display: display.get(termId) ?? termId,
        outcome,
        xp: correct?.xp ?? 0,
        hintsUsed,
        heard: attempts.filter((a) => a.verdict !== 'skipped').map((a) => a.input[0] ?? ''),
      });
      if (correct || misses)
        mastery.push({ termId, correct: correct ? 1 : 0, missed: correct ? 0 : 1 });
    }

    const resolved = results.filter((r) => r.outcome !== 'missed').length;
    const endedBy =
      round.lives <= 0 ? 'out-of-lives' : resolved === round.termIds.length ? 'complete' : 'quit';
    const played = round.attempts.some((a) => a.verdict !== 'skipped');
    const patch = this.progress.afterRound(user, round.score, localDate, played);
    const summary: RoundSummaryResponse = {
      roundId: round.id,
      score: round.score,
      xpBefore: user.xp,
      xpAfter: patch.xp,
      level: patch.level,
      levelledUp: patch.level > levelFor(user.xp).level,
      streak: patch.streak,
      bestStreak: round.bestStreak,
      livesLeft: round.lives,
      endedBy,
      results,
    };
    const won = await this.repo.finishRound({
      roundId: round.id,
      userId: user.id,
      summary,
      progress: patch,
      mastery,
    });
    if (won) return summary;
    // Another request finished it first: return what that one stored.
    const stored = (await this.repo.findRound(round.id))?.summary;
    return stored ?? summary;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /**
   * The term as it was when the round started: a teacher's edit mid-round bumps the
   * term's version but doesn't change a round in progress (TEACHER_DASHBOARD.md).
   */
  private async servedTerm(round: RoundRecord, termId: string) {
    if (round.terms) return round.terms.find((t) => t.id === termId) ?? null;
    const [term] = await this.repo.termsByIds([termId]);
    return term ?? null;
  }

  private started(
    roundId: string,
    topic: RoundStarted['topic'],
    terms: RoundStarted['terms'],
  ): RoundStarted {
    return {
      roundId,
      topic,
      terms,
      lives: ROUND_RULES.lives,
      hints: ROUND_RULES.hints,
      skips: ROUND_RULES.skips,
    };
  }

  /** A repeated idempotency key returns the stored response, if it's for this user's round. */
  private async replayed(
    auth: AuthUser,
    roundId: string,
    attempt: AttemptRecord & { roundId: string },
  ) {
    if (attempt.roundId !== roundId) throw new NotFoundException("That round isn't here.");
    await this.ownRound(auth, roundId);
    return attempt.response;
  }

  private async ownRound(auth: AuthUser, roundId: string): Promise<RoundRecord> {
    const round = await this.repo.findRound(roundId);
    // Someone else's round looks the same as a missing one.
    if (!round || round.userId !== auth.id) throw new NotFoundException("That round isn't here.");
    return round;
  }

  private async activeRound(auth: AuthUser, roundId: string): Promise<RoundRecord> {
    const round = await this.ownRound(auth, roundId);
    if (round.status !== 'ACTIVE') {
      throw apiError(HttpStatus.CONFLICT, ERROR_CODES.roundFinished, 'This round is over.');
    }
    return round;
  }

  /** The term must be in this round and not already answered correctly or skipped. */
  private assertOpenTerm(round: RoundRecord, termId: string) {
    if (!round.termIds.includes(termId)) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.termNotInRound,
        "That term isn't in this round.",
      );
    }
    const done = round.attempts.some(
      (a) => a.termId === termId && (a.verdict === 'correct' || a.verdict === 'skipped'),
    );
    if (done) {
      throw apiError(HttpStatus.CONFLICT, ERROR_CODES.termDone, 'That term is already done.');
    }
  }
}
