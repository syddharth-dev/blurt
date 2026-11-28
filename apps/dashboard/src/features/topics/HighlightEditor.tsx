'use client';

import type { Highlight } from '@blurt/shared/schemas';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui';
import { clamp01 } from './picture';

const MIN = 0.03;
type Drag =
  | { mode: 'draw'; x0: number; y0: number }
  | { mode: 'move'; dx: number; dy: number }
  | { mode: 'resize' };

/**
 * Mark the part to name (TEACHER_DASHBOARD.md → Highlight). Drag over the picture to draw,
 * drag the box to move it, drag its corner to resize. From the keyboard: arrows move the box,
 * Shift + arrows resize it. Stored as fractions of the picture (0–1), so it fits any screen.
 */
export function HighlightEditor({
  src,
  aspect,
  alt,
  value,
  onChange,
}: {
  src: string;
  aspect: number;
  alt: string;
  value: Highlight | null;
  onChange: (h: Highlight | null) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draft, setDraft] = useState<Highlight | null>(null);
  const box = draft ?? value;
  const shape = box?.shape ?? 'ellipse';

  const point = (e: PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  };

  const start = (e: PointerEvent, mode: 'draw' | 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    area.current!.setPointerCapture(e.pointerId);
    const p = point(e);
    if (mode === 'draw') setDrag({ mode, x0: p.x, y0: p.y });
    else if (mode === 'move' && box) setDrag({ mode, dx: p.x - box.x, dy: p.y - box.y });
    else setDrag({ mode: 'resize' });
  };

  const move = (e: PointerEvent) => {
    if (!drag) return;
    const p = point(e);
    if (drag.mode === 'draw') {
      setDraft({
        ...(value ?? {}),
        shape,
        x: Math.min(drag.x0, p.x),
        y: Math.min(drag.y0, p.y),
        w: Math.abs(p.x - drag.x0),
        h: Math.abs(p.y - drag.y0),
      });
    } else if (box && drag.mode === 'move') {
      setDraft({
        ...box,
        x: Math.min(1 - box.w, clamp01(p.x - drag.dx)),
        y: Math.min(1 - box.h, clamp01(p.y - drag.dy)),
      });
    } else if (box) {
      setDraft({ ...box, w: Math.max(MIN, p.x - box.x), h: Math.max(MIN, p.y - box.y) });
    }
  };

  const end = () => {
    if (draft && draft.w >= MIN && draft.h >= MIN) onChange(round(draft));
    setDrag(null);
    setDraft(null);
  };

  const keys = (e: KeyboardEvent) => {
    if (!value) return;
    const step = 0.01;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    const [dx, dy] = d as [number, number];
    onChange(
      round(
        e.shiftKey
          ? {
              ...value,
              w: Math.min(1 - value.x, Math.max(MIN, value.w + dx)),
              h: Math.min(1 - value.y, Math.max(MIN, value.h + dy)),
            }
          : {
              ...value,
              x: Math.min(1 - value.w, clamp01(value.x + dx)),
              y: Math.min(1 - value.h, clamp01(value.y + dy)),
            },
      ),
    );
  };

  return (
    <div className="flex flex-col gap-s12">
      <div className="flex items-center justify-center rounded-picture-card bg-lilac p-s16">
        <div
          ref={area}
          className="relative w-full cursor-crosshair touch-none select-none"
          style={{ aspectRatio: aspect, maxHeight: 420, maxWidth: 420 * aspect }}
          onPointerDown={(e) => start(e, 'draw')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- storage URL or inline SVG; next/image adds nothing */}
          <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full" />
          {box ? (
            <div
              role="group"
              tabIndex={0}
              aria-label="Part to name. Arrow keys move it; Shift and arrow keys resize it."
              onKeyDown={keys}
              onPointerDown={(e) => start(e, 'move')}
              className={`absolute cursor-move border-4 border-dashed border-violet bg-violet/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-night ${
                shape === 'ellipse' ? 'rounded-full' : 'rounded-tile'
              }`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            >
              <span
                aria-hidden="true"
                onPointerDown={(e) => start(e, 'resize')}
                className="absolute -right-s10 -bottom-s10 size-5 cursor-nwse-resize rounded-full border-2 border-white bg-violet"
              />
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-ink2">
        {value
          ? 'Drag to move. Drag the corner to resize.'
          : 'Drag over the part students should name.'}
      </p>
      <div className="flex flex-wrap items-center gap-s16">
        <Segmented
          label="Shape"
          value={shape}
          options={[
            ['ellipse', 'Oval'],
            ['rect', 'Box'],
          ]}
          onChange={(s) => value && onChange({ ...value, shape: s })}
          disabled={!value}
        />
        <Segmented
          label="“?” badge"
          value={value?.badge ?? 'auto'}
          options={[
            ['auto', 'Auto'],
            ['left', 'Left'],
            ['right', 'Right'],
          ]}
          onChange={(b) => {
            if (!value) return;
            const rest: Highlight = { ...value };
            delete rest.badge;
            onChange(b === 'auto' ? rest : { ...rest, badge: b });
          }}
          disabled={!value}
        />
        {value ? (
          <Button variant="ghost" onClick={() => onChange(null)}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-s6">
      <span className="text-xs font-bold tracking-wider text-ink2 uppercase">{label}</span>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={`min-h-11 rounded-chip border-2 px-s12 text-sm font-bold disabled:opacity-50 ${
            value === v ? 'border-violet bg-violet-tint text-violet-ink' : 'border-track text-night'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const round = (h: Highlight): Highlight => ({
  ...h,
  x: r3(h.x),
  y: r3(h.y),
  w: r3(h.w),
  h: r3(h.h),
});
