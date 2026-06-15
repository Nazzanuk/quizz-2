import type { ReactNode } from 'react';
import Link from 'next/link';
import { LEGAL_EFFECTIVE_DATE } from '@/Lib/Constants';
import styles from './LegalPage.module.css';

// Minimal standalone layout for legal pages. Deliberately does NOT use the app
// shell / tab bar: these URLs are linked from the Google OAuth consent screen
// and must render cleanly for visitors who aren't using the app.
export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 512 512">
              <circle cx="256" cy="256" r="178" fill="#000000" />
              <circle cx="256" cy="256" r="160" fill="#FFFDF5" />
              <circle cx="256" cy="256" r="128" fill="#000000" />
              <circle cx="256" cy="256" r="110" fill="#FF5A5F" />
              <circle cx="256" cy="256" r="66" fill="#FFFDF5" />
              <circle cx="256" cy="256" r="46" fill="#000000" />
              <circle cx="256" cy="256" r="30" fill="#FF5A5F" />
            </svg>
          </span>
          Quiz Dart
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.effective}>Effective {LEGAL_EFFECTIVE_DATE}</p>
        <div className={styles.body}>{children}</div>
        <Link href="/" className={styles.back}>← Back to Quiz Dart</Link>
      </div>
    </main>
  );
}
