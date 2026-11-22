/**
 * Pip's moods (docs/MASCOT.md → "Moods"). Coordinates are on Pip's 200×200 artboard.
 * Colours come from `pipColors` (BRAND.md → "Pip colours").
 */
import { pipColors } from '@/theme';

export type PipMood = 'idle' | 'wave' | 'listening' | 'oops' | 'celebrate';

export const PIP_MOOD_LIST: readonly PipMood[] = ['idle', 'wave', 'listening', 'oops', 'celebrate'];

export type MoodConfig = {
  motion: 'bob' | 'wobble' | 'jump';
  /** Artboard units */
  amp: number;
  /** ms for one full loop */
  period: number;
  /** Degrees each ear tilts outwards */
  ear: number;
  earScaleY: number;
  arms: 'down' | 'wave' | 'up' | 'cup';
  eyes: 'open' | 'happy';
  /** Pupil x-offset */
  look: number;
  /** SVG path */
  mouth: string;
  mouthFill: string;
  extras: readonly ('waves' | 'drop' | 'sparkles')[];
  /** Accessibility label: describes the mood only (the bubble carries the words). */
  label: string;
};

const INK = pipColors.ink;

export const PIP_MOODS: Record<PipMood, MoodConfig> = {
  idle: {
    motion: 'bob',
    amp: 5,
    period: 2400,
    ear: 14,
    earScaleY: 1,
    arms: 'down',
    eyes: 'open',
    look: 0,
    mouth: 'M88 134 Q100 146 112 134',
    mouthFill: 'none',
    extras: [],
    label: 'Pip smiling',
  },
  wave: {
    motion: 'bob',
    amp: 6,
    period: 1800,
    ear: 14,
    earScaleY: 1,
    arms: 'wave',
    eyes: 'open',
    look: 0,
    mouth: 'M86 132 Q100 150 114 132 Z',
    mouthFill: INK,
    extras: [],
    label: 'Pip waving hello',
  },
  listening: {
    motion: 'bob',
    amp: 3,
    period: 800,
    ear: 4,
    earScaleY: 1.08,
    arms: 'cup',
    eyes: 'open',
    look: 6,
    mouth: 'M96 138 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z',
    mouthFill: INK,
    extras: ['waves'],
    label: 'Pip listening closely',
  },
  oops: {
    motion: 'wobble',
    amp: 3,
    period: 600,
    ear: 58,
    earScaleY: 1,
    arms: 'down',
    eyes: 'open',
    look: 0,
    mouth: 'M86 142 Q93 134 100 142 Q107 150 114 142',
    mouthFill: 'none',
    extras: ['drop'],
    label: 'Pip looking unsure',
  },
  celebrate: {
    motion: 'jump',
    amp: 16,
    period: 700,
    ear: 20,
    earScaleY: 1,
    arms: 'up',
    eyes: 'happy',
    look: 0,
    mouth: 'M84 130 Q100 158 116 130 Z',
    mouthFill: INK,
    extras: ['sparkles'],
    label: 'Pip celebrating',
  },
};

/** Timings shared by every mood (docs/MASCOT.md). */
export const PIP_TIMING = {
  /** Blink every ~4 s: wait, squash to 10 % height for 100 ms, open for 100 ms. */
  blinkWait: 3600,
  blinkClose: 100,
  blinkScale: 0.1,
  /** Wave arm swing: −10° ↔ 22°, 0.9 s for the full swing. */
  waveHalf: 450,
  waveFrom: -10,
  waveTo: 22,
  /** Extras (sound arcs, sweat drop, sparkles) pulse 1 ↔ 0.2. */
  pulseHalf: 500,
  pulseMin: 0.2,
  /** Settle back to rest when the mood changes. */
  settle: 120,
  /** Ears blend between moods with a spring. */
  earSpring: { damping: 10, stiffness: 140 },
} as const;
