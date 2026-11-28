import { GRADE8_TERMS } from '@blurt/shared/content';
import { render, screen } from '@testing-library/react-native';
import { sizes, space } from '@/theme';
import { badgeLayout, fitFrame, PictureCard } from './PictureCard';

const AREA = sizes.pictureCard - space.s10 * 2;
const term = (c: string) => GRADE8_TERMS.find((t) => t.canonical === c)!;

describe('badgeLayout', () => {
  const box = { left: 20, top: 80, width: 40, height: 40 };

  it('goes on the roomier side by default', () => {
    expect(badgeLayout(box, 40, 100).anchor).toBe('left'); // box on the left → badge to its right
    const right = { ...box, left: AREA - 60 };
    expect(badgeLayout(right, AREA - 40, 100).anchor).toBe('right');
  });

  it('honours the side a picture asks for', () => {
    expect(badgeLayout(box, 40, 100, 'left').badge.x).toBeLessThan(box.left + box.width);
  });

  it('stays inside the picture', () => {
    const top = { left: AREA / 2 - 10, top: 0, width: 20, height: 20 };
    const { badge } = badgeLayout(top, AREA / 2, 10);
    expect(badge.y).toBeGreaterThanOrEqual(15);
    expect(badge.x).toBeLessThanOrEqual(AREA - 15);
  });

  it('drops the leader line when the badge lands inside a big box', () => {
    const big = { left: 0, top: 0, width: AREA, height: AREA };
    expect(badgeLayout(big, AREA / 2, AREA / 2).lineFrom).toBeNull();
  });
});

describe('PictureCard', () => {
  it('shows the picture with "?" and an alt text that never names the part', async () => {
    await render(<PictureCard term={term('proton')} solved={false} />);
    expect(screen.getByText('?')).toBeOnTheScreen();
    const label = screen.getByRole('image').props.accessibilityLabel as string;
    expect(label).toMatch(/The part to name is glowing/);
    expect(label.toLowerCase()).not.toContain('proton');
  });

  it('the "?" becomes the term once solved', async () => {
    await render(<PictureCard term={term('proton')} solved />);
    expect(screen.getByText('Proton')).toBeOnTheScreen();
  });

  it('terms without a picture show their clue', async () => {
    const isotope = term('isotope');
    await render(<PictureCard term={isotope} solved={false} />);
    expect(screen.getByText(isotope.clue)).toBeOnTheScreen();
  });
});

describe('uploaded pictures', () => {
  it('fit inside the panel (contain), so the highlight lands on the picture', () => {
    expect(fitFrame(1)).toEqual({ left: 0, top: 0, width: AREA, height: AREA });
    expect(fitFrame(2)).toEqual({ left: 0, top: AREA / 4, width: AREA, height: AREA / 2 });
    expect(fitFrame(0.5)).toEqual({ left: AREA / 4, top: 0, width: AREA / 2, height: AREA });
  });

  it('render the teacher’s picture with its description', async () => {
    const base = term('nucleus');
    await render(
      <PictureCard
        solved={false}
        term={{
          ...base,
          picture: {
            url: 'https://cdn.test/cell.webp',
            width: 1600,
            height: 800,
            highlight: { shape: 'ellipse', x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
            altText: 'A plant cell',
          },
        }}
      />,
    );
    expect(screen.getByRole('image').props.accessibilityLabel).toMatch(/^A plant cell\. The part/);
  });
});
