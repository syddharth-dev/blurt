'use client';

import type { Role } from '@blurt/shared/schemas';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; soon?: string; roles?: Role[] };

const ITEMS: Item[] = [
  { href: '/', label: 'Overview' },
  { href: '/topics', label: 'Topics' },
  { href: '/classes', label: 'Classes' },
  { href: '/reports', label: 'Reports' },
  { href: '/teachers', label: 'Teachers', roles: ['ADMIN'] },
];

/** Left sidebar (TEACHER_DASHBOARD.md → Design). */
export function Sidebar({
  role,
  name,
  onSignOut,
}: {
  role: Role;
  name: string;
  onSignOut: () => void;
}) {
  const path = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-s24 bg-white p-s20">
      <p className="font-display text-3xl tracking-tight text-night">
        blurt<span className="text-sunny-ink">!</span>
        <span className="ml-s6 align-middle text-xs font-bold tracking-wider text-ink2 uppercase">
          for teachers
        </span>
      </p>
      <nav aria-label="Main" className="flex flex-col gap-s4">
        {ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((item) => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
          if (item.soon) {
            return (
              <span
                key={item.href}
                className="flex min-h-11 items-center justify-between rounded-chip px-s12 text-ink2"
              >
                {item.label}
                <span className="rounded-full bg-track px-s8 py-s4 text-xs font-bold">
                  {item.soon}
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-chip px-s12 font-bold ${
                active ? 'bg-violet-tint text-violet-ink' : 'text-night hover:bg-lilac'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-s8 border-t-2 border-track pt-s16">
        <p className="text-sm text-night">
          <span className="font-bold">{name}</span>
          <span className="block text-ink2">{role === 'ADMIN' ? 'Admin' : 'Teacher'}</span>
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="min-h-11 self-start rounded-chip px-s12 font-bold text-violet hover:bg-violet-tint"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
