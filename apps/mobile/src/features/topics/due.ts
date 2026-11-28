/**
 * "Due" labels for class assignments, from the teacher's day ("YYYY-MM-DD") and the
 * phone's local today. Short, so they fit the topic card's tag.
 */
const DAY = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dayNumber = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};

export function dueLabel(dueOn: string | null, today: string): string | undefined {
  if (!dueOn) return undefined;
  const days = dayNumber(dueOn) - dayNumber(today);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  const date = new Date(dayNumber(dueOn) * DAY);
  if (days < 7) return `Due ${WEEKDAYS[date.getUTCDay()]}`;
  return `Due ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}
