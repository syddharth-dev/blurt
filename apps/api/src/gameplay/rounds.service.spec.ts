import { HttpException } from '@nestjs/common';
import { ERROR_CODES } from '@blurt/shared/schemas';
import { authUser, FakeRoundsRepository, FakeUsersRepository } from '../../test/fakes.js';
import { ProgressService } from '../progress/progress.service.js';
import { UsersService } from '../users/users.service.js';
import { RoundsService } from './rounds.service.js';

function setup() {
  const usersRepo = new FakeUsersRepository();
  const repo = new FakeRoundsRepository(usersRepo);
  const service = new RoundsService(repo, new UsersService(usersRepo), new ProgressService());
  return { service, repo, usersRepo };
}

let keyN = 0;
const key = () => `key-${++keyN}-abcdef`;
const me = authUser();
const say = (termId: string, text: string | string[], hintsUsed = 0) => ({
  termId,
  alternatives: Array.isArray(text) ? text : [text],
  inputMode: 'voice' as const,
  hintsUsed,
  ms: 900,
  idempotencyKey: key(),
});

/** Asserts an API error with this status and code. */
async function rejects(p: Promise<unknown>, status: number, code?: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect(http.getStatus()).toBe(status);
  if (code) expect((http.getResponse() as { code: string }).code).toBe(code);
}

describe('RoundsService', () => {
  it('a topic assigned to the student’s class is never locked by level', async () => {
    const { service, repo } = setup();
    repo.unlockLevels.set('atoms-and-ions', 9);
    await rejects(service.start(me, { topicId: 'atoms-and-ions' }), 403, ERROR_CODES.topicLocked);
    repo.assigned.set('atoms-and-ions', new Set([me.id]));
    expect((await service.start(me, { topicId: 'atoms-and-ions' })).terms.length).toBeGreaterThan(
      0,
    );
  });

  it("a teacher's edit mid-round doesn't change the round in progress (term versions)", async () => {
    const { service, repo } = setup();
    const r = await service.start(me, { topicId: 'atoms-and-ions' });
    // The term changes after the round started: "proton" is no longer accepted.
    const edited = (await repo.termsByIds(['chem-proton']))[0]!;
    repo.termsByIds = async () => [{ ...edited, version: 2, canonical: 'positron', accept: [] }];
    const res = await service.attempt(me, r.roundId, say('chem-proton', 'proton'));
    expect(res.verdict).toBe('correct');
    expect(repo.attempts.get([...repo.attempts.keys()].at(-1)!)?.termVersion).toBe(1);
  });

  describe('start', () => {
    it('serves a topic with answers, picture data and the round budgets', async () => {
      const { service } = setup();
      const r = await service.start(me, { topicId: 'atoms-and-ions' });
      expect(r.topic).toEqual({
        id: 'atoms-and-ions',
        title: 'Atoms and ions',
        subject: 'Chemistry',
      });
      expect(r.terms.map((t) => t.id)).toContain('chem-proton');
      const proton = r.terms.find((t) => t.id === 'chem-proton')!;
      expect(proton.confusables.map((c) => c.text)).toContain('neutron');
      expect(proton.picture?.diagram).toBe('atom');
      expect(r).toMatchObject({ lives: 3, hints: 3, skips: 2 });
    });

    it('starts a practice round with exactly the given terms, ignoring unknown ids', async () => {
      const { service } = setup();
      const r = await service.start(me, { termIds: ['bio-gene', 'nope', 'chem-isotope'] });
      expect(r.terms.map((t) => t.id)).toEqual(['bio-gene', 'chem-isotope']);
      expect(r.topic.title).toBe('Practice');
    });

    it('404s an unknown topic and 403s a locked one', async () => {
      const { service, repo } = setup();
      await rejects(service.start(me, { topicId: 'nope' }), 404);
      repo.unlockLevels.set('ecosystems', 5);
      await rejects(service.start(me, { topicId: 'ecosystems' }), 403, ERROR_CODES.topicLocked);
    });
  });

  describe('attempt', () => {
    it('checks answers on the server: correct first try earns 100 XP', async () => {
      const { service, repo } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      const res = await service.attempt(me, roundId, say('bio-nucleus', ['new clears', 'nucleus']));
      expect(res).toMatchObject({ verdict: 'correct', xpGained: 100, livesLeft: 3 });
      expect(repo.rounds.get(roundId)).toMatchObject({ score: 100, streak: 1, bestStreak: 1 });
    });

    it('a close answer costs a life and lowers the XP for a later correct answer', async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      const close = await service.attempt(me, roundId, say('bio-nucleus', 'nuclear'));
      expect(close).toMatchObject({
        verdict: 'close',
        feedback: "Close — that's the adjective.",
        livesLeft: 2,
        pronunciation: { syllables: 'nu·cle·us', audioUrl: null },
      });
      const right = await service.attempt(me, roundId, say('bio-nucleus', 'nucleus'));
      expect(right).toMatchObject({ verdict: 'correct', xpGained: 75 });
    });

    it('never accepts a confusable (AGENTS.md rule 4)', async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'atoms-and-ions' });
      const res = await service.attempt(me, roundId, say('chem-proton', 'neutron'));
      expect(res.verdict).toBe('wrong');
      expect(res.feedback).toMatch(/neutron/);
    });

    it('caps hints at the round budget and charges them against XP', async () => {
      const { service, repo } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      const res = await service.attempt(me, roundId, say('bio-nucleus', 'nucleus', 9));
      expect(res.xpGained).toBe(25); // 100 − 3 × 25 (capped at 3 hints)
      expect(repo.rounds.get(roundId)?.hintsUsed).toBe(3);
    });

    it('a repeated idempotency key returns the same response without counting twice', async () => {
      const { service, repo } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      const body = say('bio-nucleus', 'nuclear');
      const first = await service.attempt(me, roundId, body);
      const again = await service.attempt(me, roundId, body);
      expect(again).toEqual(first);
      expect(repo.rounds.get(roundId)?.lives).toBe(2);
      expect(repo.rounds.get(roundId)?.attempts).toHaveLength(1);
    });

    it('rejects terms outside the round and terms already done', async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      await rejects(
        service.attempt(me, roundId, say('chem-proton', 'proton')),
        400,
        ERROR_CODES.termNotInRound,
      );
      await service.attempt(me, roundId, say('bio-nucleus', 'nucleus'));
      await rejects(
        service.attempt(me, roundId, say('bio-nucleus', 'nucleus')),
        409,
        ERROR_CODES.termDone,
      );
    });

    it('stops at zero lives', async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      for (let i = 0; i < 3; i++) await service.attempt(me, roundId, say('bio-nucleus', 'banana'));
      await rejects(
        service.attempt(me, roundId, say('bio-nucleus', 'nucleus')),
        409,
        ERROR_CODES.outOfLives,
      );
    });

    it("another student's round looks missing (404), even with a reused key", async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      const body = say('bio-nucleus', 'nucleus');
      await service.attempt(me, roundId, body);
      const other = authUser('student-2', 'ben@school.test');
      await rejects(service.attempt(other, roundId, say('bio-nucleus', 'nucleus')), 404);
      await rejects(service.attempt(other, roundId, body), 404);
    });
  });

  describe('skip', () => {
    it('allows 2 skips per round', async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      expect(
        await service.skip(me, roundId, { termId: 'bio-nucleus', idempotencyKey: key() }),
      ).toEqual({ skipsLeft: 1 });
      expect(
        await service.skip(me, roundId, { termId: 'bio-mitosis', idempotencyKey: key() }),
      ).toEqual({ skipsLeft: 0 });
      await rejects(
        service.skip(me, roundId, { termId: 'bio-meiosis', idempotencyKey: key() }),
        409,
        ERROR_CODES.noSkipsLeft,
      );
    });
  });

  describe('finish', () => {
    it('summarises the round and updates XP, level, streak and mastery', async () => {
      const { service, repo, usersRepo } = setup();
      await usersRepo.create({ id: me.id, name: 'Ana' });
      await usersRepo.update(me.id, { xp: 450, streak: 4, lastPlayedOn: '2026-11-21' });
      const { roundId } = await service.start(me, { topicId: 'ecosystems' });
      await service.attempt(me, roundId, say('bio-producer', 'producer'));
      await service.attempt(me, roundId, say('bio-consumer', 'producer')); // confusable
      await service.attempt(me, roundId, say('bio-consumer', 'consumer'));
      await service.skip(me, roundId, { termId: 'bio-decomposer', idempotencyKey: key() });

      const s = await service.finish(me, roundId, '2026-11-22');
      expect(s).toMatchObject({
        score: 175,
        xpBefore: 450,
        xpAfter: 625,
        level: 2,
        levelledUp: true,
        streak: 5,
        endedBy: 'complete',
        livesLeft: 2,
      });
      expect(s.results.map((r) => [r.termId, r.outcome])).toEqual([
        ['bio-producer', 'first-try'],
        ['bio-consumer', 'assisted'],
        ['bio-decomposer', 'skipped'],
      ]);
      expect(s.results[1]?.heard).toEqual(['producer', 'consumer']);
      expect(usersRepo.users.get(me.id)).toMatchObject({
        xp: 625,
        level: 2,
        streak: 5,
        lastPlayedOn: '2026-11-22',
      });
      expect(repo.finishes[0]?.mastery).toEqual([
        { termId: 'bio-producer', correct: 1, missed: 0 },
        { termId: 'bio-consumer', correct: 1, missed: 0 },
      ]);
    });

    it('finishing twice returns the same summary and adds XP once', async () => {
      const { service, usersRepo } = setup();
      const { roundId } = await service.start(me, { topicId: 'ecosystems' });
      await service.attempt(me, roundId, say('bio-producer', 'producer'));
      const a = await service.finish(me, roundId, '2026-11-22');
      const b = await service.finish(me, roundId, '2026-11-22');
      expect(b).toEqual(a);
      expect(usersRepo.users.get(me.id)?.xp).toBe(100);
    });

    it('marks a round lost to lives as out-of-lives, and blocks further answers', async () => {
      const { service } = setup();
      const { roundId } = await service.start(me, { topicId: 'cells-and-heredity' });
      for (let i = 0; i < 3; i++) await service.attempt(me, roundId, say('bio-nucleus', 'banana'));
      const s = await service.finish(me, roundId, '2026-11-22');
      expect(s).toMatchObject({ endedBy: 'out-of-lives', livesLeft: 0 });
      expect(s.results).toEqual([
        expect.objectContaining({ termId: 'bio-nucleus', outcome: 'missed' }),
      ]);
      await rejects(
        service.attempt(me, roundId, say('bio-mitosis', 'mitosis')),
        409,
        ERROR_CODES.roundFinished,
      );
    });

    it('a round quit without answers keeps the streak and XP', async () => {
      const { service, usersRepo } = setup();
      await usersRepo.create({ id: me.id, name: 'Ana' });
      await usersRepo.update(me.id, { streak: 3, lastPlayedOn: '2026-11-20' });
      const { roundId } = await service.start(me, { topicId: 'ecosystems' });
      const s = await service.finish(me, roundId, '2026-11-22');
      expect(s).toMatchObject({ endedBy: 'quit', streak: 3, score: 0 });
    });
  });
});
