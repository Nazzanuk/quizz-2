'use client';

import { usePathname } from 'next/navigation';
import styles from './BlobField.module.css';

interface BlobConfig {
  color: string;
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

// Fixed anchor positions; colours are chosen per-screen below for variety.
// Per-blob motion (amplitude/period/phase) is defined in the CSS module.
const POSITIONS: Omit<BlobConfig, 'color'>[] = [
  { size: 300, top: '-80px', right: '-60px' },
  { size: 220, bottom: '-40px', left: '-30px' },
  { size: 180, top: '40%', right: '10%' },
];

// Each screen gets a different but stable trio of accent colours, so the
// background feels varied as you move around the app without flickering.
const PALETTES: string[][] = [
  ['var(--neo-accent)', 'var(--neo-muted)', 'var(--neo-lime)'],
  ['var(--neo-cyan)', 'var(--neo-secondary)', 'var(--neo-accent)'],
  ['var(--neo-lime)', 'var(--neo-accent)', 'var(--neo-cyan)'],
  ['var(--neo-muted)', 'var(--neo-lime)', 'var(--neo-secondary)'],
  ['var(--neo-secondary)', 'var(--neo-cyan)', 'var(--neo-muted)'],
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

interface BlobFieldProps {
  blobs?: BlobConfig[];
}

export default function BlobField({ blobs }: BlobFieldProps) {
  const pathname = usePathname();
  const palette = PALETTES[hashString(pathname || '/') % PALETTES.length];
  const resolved = blobs ?? POSITIONS.map((position, i) => ({
    ...position,
    color: palette[i % palette.length],
  }));

  return (
    <div className={styles.field} aria-hidden>
      {resolved.map((blob, i) => (
        // Nested layers each animate one transform axis (X / Y / rotate) on its
        // own period, so the composite motion wanders continuously instead of
        // swinging back and forth in lock-step.
        <div
          key={i}
          className={styles.anchor}
          style={{ top: blob.top, bottom: blob.bottom, left: blob.left, right: blob.right }}
        >
          <div className={styles.driftX}>
            <div className={styles.driftY}>
              <div
                className={styles.blob}
                style={{ width: blob.size, height: blob.size, background: blob.color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
