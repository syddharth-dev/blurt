import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { dailyTopic, localDayNumber, timeLeftLabel } from './daily';

const topics = topicsOf(GRADE8_TERMS);

describe('daily challenge', () => {
  it('rotates through the topics, one per local day', () => {
    const day1 = new Date(2026, 10, 22, 9);
    const day2 = new Date(2026, 10, 23, 9);
    expect(localDayNumber(day2) - localDayNumber(day1)).toBe(1);
    expect(dailyTopic(topics, day1)).not.toBe(dailyTopic(topics, day2));
    // Same topic all day long
    expect(dailyTopic(topics, new Date(2026, 10, 22, 0, 5))).toBe(dailyTopic(topics, day1));
    expect(dailyTopic(topics, new Date(2026, 10, 22, 23, 55))).toBe(dailyTopic(topics, day1));
  });

  it('counts hours left until local midnight', () => {
    expect(timeLeftLabel(new Date(2026, 10, 22, 18, 0))).toBe('6h left');
    expect(timeLeftLabel(new Date(2026, 10, 22, 23, 30))).toBe('<1h left');
  });
});
