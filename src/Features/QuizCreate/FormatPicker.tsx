'use client';

import type { QuizFormat } from '@/Lib/Types';
import { ALL_FORMATS, FORMAT_LABELS } from '@/Lib/Constants';
import styles from './FormatPicker.module.css';

interface FormatPickerProps {
  value: QuizFormat;
  onChange: (format: QuizFormat) => void;
}

export default function FormatPicker({
  value,
  onChange,
}: FormatPickerProps) {
  return (
    <div className={styles.field}>
      <p className={styles.label}>Format</p>
      <div className={styles.grid}>
        {ALL_FORMATS.map((fmt) => (
          <button
            key={fmt}
            type="button"
            className={`${styles.chip} ${fmt === value ? styles.active : ''}`}
            onClick={() => onChange(fmt)}
          >
            {FORMAT_LABELS[fmt]}
          </button>
        ))}
      </div>
    </div>
  );
}
