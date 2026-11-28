import { DIAGRAMS } from '@blurt/shared/content';
import type { Highlight, TeacherPicture } from '@blurt/shared/schemas';

/** Where to load a picture from: a bundled diagram (inline SVG) or the processed WebP. */
export function pictureSrc(p: TeacherPicture | null | undefined): string | null {
  if (!p) return null;
  const diagram = p.diagram ? DIAGRAMS[p.diagram as keyof typeof DIAGRAMS] : undefined;
  if (diagram) return `data:image/svg+xml;utf8,${encodeURIComponent(diagram.svg)}`;
  return p.state === 'READY' ? p.url : null;
}

/** width / height, defaulting to square (diagrams are 200 × 200). */
export const aspectOf = (p: TeacherPicture | null | undefined) =>
  p?.width && p.height ? p.width / p.height : 1;

/** The "?" badge goes on the chosen side, or the roomier one (same rule as the app). */
export const badgeSide = (h: Highlight): 'left' | 'right' =>
  h.badge ?? (h.x + h.w / 2 < 0.5 ? 'right' : 'left');

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
