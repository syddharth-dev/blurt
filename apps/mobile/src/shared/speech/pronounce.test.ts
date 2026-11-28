import * as Speech from 'expo-speech';
import { canPronounce, pronounce, stopPronouncing } from './pronounce';

describe('pronounce', () => {
  beforeEach(() => jest.clearAllMocks());

  it('speaks the term with the phone voice, slower, after stopping anything playing', () => {
    expect(canPronounce()).toBe(true);
    expect(pronounce('Nucleus')).toBe(true);
    expect(Speech.stop).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith('Nucleus', { language: 'en-US', rate: 0.85 });
  });

  it('ignores empty text', () => {
    expect(pronounce('  ')).toBe(false);
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('stops speech before listening', () => {
    stopPronouncing();
    expect(Speech.stop).toHaveBeenCalled();
  });
});
