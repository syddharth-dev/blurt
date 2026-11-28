/** Pip, still (the dashboard has no ambient animation). Decorative: the text beside him says it all. */
export function Pip({ size = 120 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG; next/image adds nothing here
    <img src="/pip-wave.svg" alt="" width={size} height={size} aria-hidden="true" />
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-s12 py-s24 text-center">
      <Pip />
      <h2 className="font-display text-2xl text-night">{title}</h2>
      <p className="max-w-md text-base text-ink2">{body}</p>
      {children}
    </div>
  );
}
