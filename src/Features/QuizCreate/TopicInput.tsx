'use client';

import styles from './TopicInput.module.css';

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TopicInput({ value, onChange }: TopicInputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="topic">
        Topic
      </label>
      <input
        id="topic"
        className={styles.input}
        type="text"
        placeholder="e.g. JavaScript closures, WW2 history..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
