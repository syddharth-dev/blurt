import { buildClassReport, sinceFor, type AttemptRow } from './build-report.js';

const at = (min: number) => new Date(Date.UTC(2026, 10, 25, 9, min));
const row = (
  studentId: string,
  termId: string,
  verdict: string,
  heard: string | null,
  min: number,
  roundId = `r-${studentId}`,
): AttemptRow => ({ studentId, termId, verdict, heard, roundId, createdAt: at(min) });

const terms = new Map([
  ['t-proton', { termId: 't-proton', display: 'Proton', topic: 'Atoms' }],
  ['t-neutron', { termId: 't-neutron', display: 'Neutron', topic: 'Atoms' }],
]);
const students = [
  { id: 'ana', name: 'Ana' },
  { id: 'ben', name: 'Ben' },
  { id: 'cy', name: 'Cy' },
];

describe('buildClassReport', () => {
  const rows = [
    row('ana', 't-proton', 'wrong', 'Um the neutron', 1),
    row('ana', 't-proton', 'correct', 'proton', 2),
    row('ana', 't-neutron', 'close', 'neutrons', 3),
    row('ben', 't-proton', 'wrong', 'neutron', 4),
    row('ben', 't-proton', 'skipped', null, 5),
    row('ben', 't-neutron', 'correct', 'neutron', 6),
  ];
  const r = buildClassReport({ range: '7d', since: null, students, terms, rows });

  it('sums the class: answers exclude skips; accuracy is right ÷ answers', () => {
    expect(r.summary).toEqual({
      students: 3,
      activeStudents: 2,
      rounds: 2,
      answers: 5,
      accuracy: 2 / 5,
    });
  });

  it('ranks the most-missed terms, with what students said instead (normalized, counted)', () => {
    expect(r.missedTerms.map((t) => [t.display, t.misses, t.answers, t.correct])).toEqual([
      ['Proton', 3, 3, 1],
      ['Neutron', 1, 2, 1],
    ]);
    expect(r.missedTerms[0]?.heard).toEqual([{ text: 'neutron', count: 2 }]);
  });

  it('lists every student, weakest first; those who never played last', () => {
    expect(r.students.map((s) => [s.name, s.answers, s.accuracy, s.toPractise])).toEqual([
      ['Ana', 3, 1 / 3, 1], // neutron: last try was close
      ['Ben', 2, 1 / 2, 1], // proton: last try was a skip
      ['Cy', 0, null, 0],
    ]);
    expect(r.students[2]?.lastPlayedAt).toBeNull();
    expect(r.students[0]?.lastPlayedAt).toBe(at(3).toISOString());
  });

  it('an empty class is all zeros, not errors', () => {
    const empty = buildClassReport({ range: 'all', since: null, students: [], terms, rows: [] });
    expect(empty.summary).toEqual({
      students: 0,
      activeStudents: 0,
      rounds: 0,
      answers: 0,
      accuracy: null,
    });
    expect(empty.missedTerms).toEqual([]);
  });

  it('ranges: 7 and 30 days back, or all time', () => {
    const now = new Date('2026-11-28T12:00:00Z');
    expect(sinceFor('7d', now)?.toISOString()).toBe('2026-11-21T12:00:00.000Z');
    expect(sinceFor('30d', now)?.toISOString()).toBe('2026-10-29T12:00:00.000Z');
    expect(sinceFor('all', now)).toBeNull();
  });
});
