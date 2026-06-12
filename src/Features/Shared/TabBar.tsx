'use client';

import { usePathname } from 'next/navigation';
import { useTransitionRouter } from './Navigate';
import styles from './TabBar.module.css';

const TABS = [
  { href: '/', label: 'Library', icon: 'L' },
  { href: '/create', label: 'Create', icon: '+' },
  { href: '/progress', label: 'Progress', icon: '%' },
  { href: '/settings', label: 'Settings', icon: '*' },
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
            <span className={styles.icon} aria-hidden="true">{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
