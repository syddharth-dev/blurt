import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { motion } from '@/theme';
import { Confetti, GlassPanel, Rise, SceneBackground } from './index';
import { seeded } from './random';
import { SCENE_DAY, SCENE_NIGHT } from './scenes.generated';

describe('scenes', () => {
  it('generated scenes are clean SVG without the metadata block', () => {
    for (const xml of [SCENE_DAY, SCENE_NIGHT]) {
      expect(xml.startsWith('<svg')).toBe(true);
      expect(xml).not.toMatch(/metadata|c2pa/);
    }
  });

  it('renders content on top of the scene, with glass panels inside', async () => {
    await render(
      <SceneBackground variant="night">
        <GlassPanel>
          <Text>On glass</Text>
        </GlassPanel>
      </SceneBackground>,
    );
    expect(screen.getByText('On glass')).toBeOnTheScreen();
  });
});

describe('Confetti', () => {
  const pieces = () => screen.toJSON() as { children?: unknown[] } | null;

  it(`drops ${motion.confetti.pieces} pieces per burst`, async () => {
    await render(<Confetti burst={3} />);
    expect(pieces()?.children).toHaveLength(motion.confetti.pieces);
  });

  it('renders nothing with no burst, or with Reduce Motion on', async () => {
    await render(<Confetti burst={null} />);
    expect(pieces()).toBeNull();
    const spy = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    await render(<Confetti burst={1} />);
    expect(pieces()).toBeNull();
    spy.mockRestore();
  });
});

it('Rise shows the points gained, hidden from screen readers (the bubble announces them)', async () => {
  await render(<Rise text="+100" />);
  expect(screen.queryByText('+100')).toBeNull();
  expect(screen.getByText('+100', { includeHiddenElements: true })).toBeTruthy();
});

it('seeded random is repeatable', () => {
  const a = seeded(42);
  const b = seeded(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
