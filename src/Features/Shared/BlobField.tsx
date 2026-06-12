'use client';

import styles from './BlobField.module.css';

interface BlobConfig {
  color: string;
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  delay?: number;
}

const DEFAULT_BLOBS: BlobConfig[] = [
  { color: 'var(--neo-accent)', size: 300, top: '-80px', right: '-60px' },
  { color: 'var(--neo-muted)', size: 220, bottom: '-40px', left: '-30px', delay: -3 },
  { color: 'var(--neo-lime)', size: 180, top: '40%', right: '10%', delay: -5 },
];

interface BlobFieldProps {
  blobs?: BlobConfig[];
}

export default function BlobField({ blobs = DEFAULT_BLOBS }: BlobFieldProps) {
  return (
    <div className={styles.field} aria-hidden>
      {blobs.map((blob, i) => (
        <div
          key={i}
          className={styles.blob}
          style={{
            width: blob.size,
            height: blob.size,
            background: blob.color,
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
            animationDelay: blob.delay ? `${blob.delay}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
