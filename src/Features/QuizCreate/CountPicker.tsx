'use client';

import { QUESTION_COUNT_OPTIONS } from '@/Lib/Constants';
import styles from './CountPicker.module.css';

const OPTIONS = QUESTION_COUNT_OPTIONS;

interface CountPickerProps {
  value: number;
  onChange: (n: number) => void;
}

export default function CountPicker({ value, onChange }: CountPickerProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Questions</label>
      <div className={styles.chips}>
        {OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.chip} ${value === n ? styles.active : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
