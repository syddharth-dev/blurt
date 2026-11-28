'use client';

import type { Highlight, TeacherPicture } from '@blurt/shared/schemas';
import { useRef, useState, type DragEvent } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { useUpdatePicture, useUploadPicture } from './api';
import { HighlightEditor } from './HighlightEditor';
import { aspectOf, pictureSrc } from './picture';

/**
 * The picture for a term: drop or choose a file (PNG, JPG, WebP or SVG, max 5 MB), wait for
 * processing, mark the part to name, and describe it for screen readers.
 */
export function PictureField({
  picture,
  highlight,
  onPicture,
  onHighlight,
}: {
  picture: TeacherPicture | null | undefined;
  highlight: Highlight | null;
  onPicture: (id: string | null) => void;
  onHighlight: (h: Highlight | null) => void;
}) {
  const upload = useUploadPicture();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const src = pictureSrc(picture);

  const take = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: (p) => {
        onPicture(p.id);
        onHighlight(null); // a new picture needs its part marked again
      },
    });
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  };

  const busy =
    upload.isPending || picture?.state === 'UPLOADING' || picture?.state === 'PROCESSING';
  const chooser = (
    <input
      ref={input}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        take(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  return (
    <div className="flex flex-col gap-s12">
      <div className="flex items-center justify-between gap-s12">
        <h2 className="font-display text-xl text-night">Picture</h2>
        {picture && !busy ? (
          <span className="flex gap-s4">
            <Button variant="ghost" onClick={() => input.current?.click()}>
              Replace
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onPicture(null);
                onHighlight(null);
              }}
            >
              Remove
            </Button>
          </span>
        ) : null}
      </div>
      {chooser}

      {busy ? (
        <div
          role="status"
          className="flex aspect-square items-center justify-center rounded-picture-card bg-lilac p-s24 text-center"
        >
          <span>
            <span className="block font-display text-xl text-night">
              {upload.isPending ? 'Uploading…' : 'Getting it ready…'}
            </span>
            <span className="text-sm text-ink2">
              Resizing, removing location data, converting to WebP.
            </span>
          </span>
        </div>
      ) : src && picture ? (
        <>
          <HighlightEditor
            src={src}
            aspect={aspectOf(picture)}
            alt={picture.altText ?? ''}
            value={highlight}
            onChange={onHighlight}
          />
          <AltText picture={picture} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={`flex aspect-square flex-col items-center justify-center gap-s8 rounded-picture-card border-4 border-dashed p-s24 text-center ${
            over ? 'border-violet bg-violet-tint' : 'border-lilac-line bg-lilac'
          }`}
        >
          <span className="font-display text-xl text-night">Drop a picture here</span>
          <span className="text-sm text-ink2">
            or click to choose · PNG, JPG, WebP or SVG · up to 5 MB
          </span>
        </button>
      )}

      {picture?.state === 'FAILED' ? (
        <Notice tone="error">
          We couldn’t use that file. Try a PNG, JPG, WebP or SVG picture under 5 MB.
        </Notice>
      ) : null}
      {upload.isError ? <Notice tone="error">{upload.error.message}</Notice> : null}
    </div>
  );
}

function AltText({ picture }: { picture: TeacherPicture }) {
  const save = useUpdatePicture();
  const [text, setText] = useState(picture.altText ?? '');
  if (picture.diagram)
    return <p className="text-sm text-ink2">Starter diagram: {picture.altText}</p>;
  return (
    <Field
      label="Describe the picture"
      hint={
        save.isSuccess && text === (save.data.altText ?? '')
          ? 'Saved.'
          : 'For screen readers. Describe what’s shown without giving the answer.'
      }
      error={save.isError ? save.error.message : undefined}
    >
      <Input
        value={text}
        maxLength={200}
        placeholder="A plant cell with its parts, unlabelled"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() !== (picture.altText ?? ''))
            save.mutate({ id: picture.id, altText: text.trim() });
        }}
      />
    </Field>
  );
}
