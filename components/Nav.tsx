'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGES = [
  { href: '/', label: 'How it works' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/draft', label: 'Draft' },
  { href: '/score', label: 'Score' },
  { href: '/sign-off', label: 'Sign off' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav id="nav" aria-label="Pages">
      <div className="brand">
        <i></i>Signoff
      </div>
      {PAGES.map((p) => {
        const isActive =
          p.href === '/'
            ? pathname === '/'
            : pathname.startsWith(p.href);

        return (
          <Link
            key={p.href}
            href={p.href}
            className={`nav-item ${isActive ? 'on' : ''}`}
          >
            {p.label}
          </Link>
        );
      })}
      <div className="who">Signed in as the Approver</div>
    </nav>
  );
}

