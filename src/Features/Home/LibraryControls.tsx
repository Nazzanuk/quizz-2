'use client';

import { useAtom } from 'jotai';
import { librarySearchAtom } from '@/State/QuizAtoms';
import styles from './LibraryControls.module.css';

export default function LibraryControls() {
  const [search, setSearch] = useAtom(librarySearchAtom);

  return (
    <div className={styles.controls}>
      <label className={styles.searchLabel}>
        <span>Search library</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Topic, title, notes..."
        />
      </label>
    </div>
  );
}
