import { render, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { Pip } from './Pip';
import { PIP_MOOD_LIST, PIP_MOODS } from './pipMoods';

describe('Pip', () => {
  it.each(PIP_MOOD_LIST)('renders the %s mood with its accessibility label', async (mood) => {
    await render(<Pip mood={mood} size={104} />);
    expect(screen.getByLabelText(PIP_MOODS[mood].label)).toBeOnTheScreen();
  });

  it('switches moods without crashing (idle → listening → oops → listening → celebrate)', async () => {
    const { rerender } = await render(<Pip mood="idle" />);
    for (const mood of ['listening', 'oops', 'listening', 'celebrate'] as const) {
      await rerender(<Pip mood={mood} />);
      expect(screen.getByLabelText(PIP_MOODS[mood].label)).toBeOnTheScreen();
    }
  });

  it('still renders every pose with Reduce Motion on', async () => {
    const spy = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    for (const mood of PIP_MOOD_LIST) {
      await render(<Pip mood={mood} />);
      expect(screen.getByLabelText(PIP_MOODS[mood].label)).toBeOnTheScreen();
    }
    spy.mockRestore();
  });

  it('is sized by the size prop', async () => {
    await render(<Pip mood="idle" size={112} />);
    expect(screen.getByLabelText(PIP_MOODS.idle.label)).toHaveStyle({ width: 112, height: 112 });
  });
});
