import { DIAGRAMS } from '@blurt/shared/content';
import type { Highlight, TeacherPicture } from '@blurt/shared/schemas';

/**
 * The picture as students will see it, with the part to name marked. Uploading and drawing the
 * highlight arrive in Phase 4 step 3; for now this shows bundled diagrams (copied library terms).
 */
export function PicturePanel({
  picture,
  highlight,
}: {
  picture: TeacherPicture | null;
  highlight: Highlight | null;
}) {
  const diagram = picture?.diagram ? DIAGRAMS[picture.diagram as keyof typeof DIAGRAMS] : undefined;
  const src = diagram
    ? `data:image/svg+xml;utf8,${encodeURIComponent(diagram.svg)}`
    : (picture?.url ?? null);

  return (
    <div className="flex flex-col gap-s12">
      <div className="relative aspect-square w-full overflow-hidden rounded-picture-card bg-lilac">
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL or storage URL; next/image adds nothing */}
            <img
              src={src}
              alt={picture?.altText ?? ''}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {highlight ? (
              <span
                aria-hidden="true"
                className={`absolute border-4 border-dashed border-violet ${
                  highlight.shape === 'ellipse' ? 'rounded-full' : 'rounded-tile'
                }`}
                style={{
                  left: `${highlight.x * 100}%`,
                  top: `${highlight.y * 100}%`,
                  width: `${highlight.w * 100}%`,
                  height: `${highlight.h * 100}%`,
                }}
              />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-s8 p-s24 text-center">
            <span className="font-display text-xl text-night">No picture yet</span>
            <span className="text-sm text-ink2">
              Uploading a picture and marking the part to name come in the next update.
            </span>
          </div>
        )}
      </div>
      {picture ? (
        <p className="text-sm text-ink2">
          {diagram ? 'Starter diagram' : 'Your picture'}
          {highlight ? ' · part to name marked' : ' · part to name not marked yet'}
        </p>
      ) : null}
    </div>
  );
}
