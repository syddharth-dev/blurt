import type { Highlight } from '@blurt/shared/schemas';
import { badgeSide } from './picture';

/**
 * A still preview of the Play card (TEACHER_DASHBOARD.md → "How the app shows a teacher's
 * picture"): the picture contained on lilac, the sunny glow and dashed ring around the part to
 * name, the "?" badge, and Pip's clue bubble. The dashboard has no ambient animation.
 */
export function PhonePreview({
  src,
  aspect,
  highlight,
  clue,
}: {
  src: string | null;
  aspect: number;
  highlight: Highlight | null;
  clue: string;
}) {
  const side = highlight ? badgeSide(highlight) : 'right';
  return (
    <figure className="flex flex-col items-center gap-s8">
      <div
        aria-hidden="true"
        className="flex w-64 flex-col gap-s12 rounded-card border-4 border-night bg-night p-s12 shadow-card"
        style={{ aspectRatio: '9 / 17' }}
      >
        <div className="flex aspect-square items-center justify-center rounded-picture-card bg-lilac p-s10">
          {src ? (
            <div
              className="relative"
              style={
                aspect >= 1
                  ? { width: '100%', aspectRatio: aspect }
                  : { height: '100%', aspectRatio: aspect }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- storage URL or inline SVG */}
              <img src={src} alt="" className="absolute inset-0 h-full w-full" />
              {highlight ? (
                <span
                  className={`absolute border-2 border-dashed border-sunny shadow-[0_0_16px_4px_var(--color-sunny)] ${
                    highlight.shape === 'ellipse' ? 'rounded-full' : 'rounded-tile'
                  }`}
                  style={{
                    left: `${highlight.x * 100}%`,
                    top: `${highlight.y * 100}%`,
                    width: `${highlight.w * 100}%`,
                    height: `${highlight.h * 100}%`,
                  }}
                >
                  <span
                    className={`absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-sunny font-display text-sm text-night ${
                      side === 'right' ? '-right-s24' : '-left-s24'
                    }`}
                  >
                    ?
                  </span>
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-ink2">No picture yet</span>
          )}
        </div>
        <div className="flex flex-col gap-s6 rounded-bubble bg-white p-s12">
          <span className="font-display text-base leading-tight text-night">
            Name the glowing part.
          </span>
          {clue ? (
            <span className="text-xs text-night">
              <span className="mr-s6 rounded-full bg-sunny-tint px-s6 py-s4 font-bold tracking-wider text-sunny-ink uppercase">
                Clue
              </span>
              {clue}
            </span>
          ) : null}
        </div>
      </div>
      <figcaption className="text-sm text-ink2">Phone preview</figcaption>
    </figure>
  );
}
