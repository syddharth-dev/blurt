import { pickDaily, type DailyCandidate } from './daily.js';

const t = (id: string, extra: Partial<DailyCandidate> = {}): DailyCandidate => ({
  id,
  title: id,
  subject: 'Biology',
  grade: 8,
  termCount: 5,
  locked: false,
  dueOn: null,
  ...extra,
});

describe('pickDaily', () => {
  const library = [t('a'), t('b'), t('c')];

  it('rotates one topic per day, the same for everyone with the same topics', () => {
    const days = ['2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01'].map(
      (d) => pickDaily(library, d)?.id,
    );
    expect(new Set(days.slice(0, 3)).size).toBe(3);
    expect(days[3]).toBe(days[0]);
    expect(pickDaily([...library].reverse(), '2026-11-28')?.id).toBe(days[0]);
  });

  it('a class topic due within a week comes first, soonest first', () => {
    const topics = [
      ...library,
      t('due-later', { dueOn: '2026-12-04' }),
      t('due-soon', { dueOn: '2026-11-30' }),
    ];
    expect(pickDaily(topics, '2026-11-28')?.id).toBe('due-soon');
  });

  it('ignores due dates in the past or more than a week away', () => {
    const topics = [t('old', { dueOn: '2026-11-20' }), t('far', { dueOn: '2026-12-20' })];
    expect(['old', 'far']).toContain(pickDaily(topics, '2026-11-28')?.id);
    expect(pickDaily([t('only', { dueOn: '2026-11-20' })], '2026-11-28')?.id).toBe('only');
  });

  it('never picks a locked or empty topic', () => {
    expect(
      pickDaily([t('locked', { locked: true }), t('empty', { termCount: 0 })], '2026-11-28'),
    ).toBeNull();
    expect(pickDaily([t('locked', { locked: true }), t('ok')], '2026-11-28')?.id).toBe('ok');
  });
});
