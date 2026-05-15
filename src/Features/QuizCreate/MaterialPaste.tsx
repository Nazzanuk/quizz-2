'use client';

import styles from './MaterialPaste.module.css';

interface MaterialPasteProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MaterialPaste({
  value,
  onChange,
}: MaterialPasteProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="material">
        Or paste study material
      </label>
      <textarea
        id="material"
        className={styles.textarea}
        placeholder="Paste your notes, article, or study material here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
      />
    </div>
  );
}
