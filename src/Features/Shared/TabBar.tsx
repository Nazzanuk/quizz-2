'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useTransitionRouter } from './Navigate';
import styles from './TabBar.module.css';

// Material Symbols (outlined, fill1) icon paths, downloaded to
// public/icons/tab/*.svg and inlined here so they inherit currentColor and
// stay crisp at any size. viewBox matches Material Symbols' 0 -960 960 960.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const TABS = [
  {
    href: '/',
    label: 'Library',
    icon: <Icon><path d="M120-520v-320h320v320H120Zm0 400v-320h320v320H120Zm400-400v-320h320v320H520Zm0 400v-320h320v320H520Z" /></Icon>,
  },
  {
    href: '/discover',
    label: 'Discover',
    icon: <Icon><path d="m300-300 280-80 80-280-280 80-80 280Zm180-120q-25 0-42.5-17.5T420-480q0-25 17.5-42.5T480-540q25 0 42.5 17.5T540-480q0 25-17.5 42.5T480-420Zm0 340q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" /></Icon>,
  },
  {
    href: '/create',
    label: 'Create',
    icon: <Icon><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" /></Icon>,
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: <Icon><path d="M640-160v-280h160v280H640Zm-240 0v-640h160v640H400Zm-240 0v-440h160v440H160Z" /></Icon>,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Icon><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z" /></Icon>,
  },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const { navigate } = useTransitionRouter();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname.startsWith('/quiz/');
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={styles.bar} aria-label="Primary">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <button
            key={tab.href}
            type="button"
            className={`${styles.item} ${active ? styles.itemActive : ''}`}
            onClick={() => {
              if (!active) navigate(tab.href);
            }}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
