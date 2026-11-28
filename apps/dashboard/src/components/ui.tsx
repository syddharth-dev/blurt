import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/** Dashboard UI kit (TEACHER_DASHBOARD.md → Design): violet actions on white, lilac page. */

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const look = {
    primary: 'bg-violet text-white hover:bg-violet-ink disabled:opacity-60',
    secondary: 'bg-white text-violet border-2 border-violet hover:bg-violet-tint',
    ghost: 'text-violet hover:bg-violet-tint',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-s8 rounded-button px-s20 font-display text-base transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-violet ${look} ${className}`}
    />
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-s6">
      <span className="text-xs font-bold tracking-wider text-ink2 uppercase">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-sm text-coral-ink">
          {error}
        </span>
      ) : hint ? (
        <span className="text-sm text-ink2">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 rounded-tile border-2 border-lilac-line bg-white px-s12 text-base text-night placeholder:text-ink2 focus:border-violet focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card bg-white p-s24 shadow-card ${className}`}>{children}</section>
  );
}

export function Notice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  const look =
    tone === 'success' ? 'bg-violet-tint text-violet-ink' : 'bg-coral-tint text-coral-ink';
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-chip px-s12 py-s10 text-sm ${look}`}
    >
      {children}
    </p>
  );
}
