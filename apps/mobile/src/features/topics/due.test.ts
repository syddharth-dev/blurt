import { dueLabel } from './due';

describe('dueLabel', () => {
  const today = '2026-11-28'; // a Saturday
  it.each([
    [null, undefined],
    ['2026-11-27', 'Overdue'],
    ['2026-11-28', 'Due today'],
    ['2026-11-29', 'Due tomorrow'],
    ['2026-12-04', 'Due Fri'],
    ['2026-12-05', 'Due 5 Dec'],
    ['2027-01-15', 'Due 15 Jan'],
  ])('%s → %s', (dueOn, label) => {
    expect(dueLabel(dueOn, today)).toBe(label);
  });
});
