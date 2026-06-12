'use client';

import { useAtom } from 'jotai';
import {
  libraryHasQuestionsAtom,
  librarySearchAtom,
  librarySortAtom,
  type LibrarySort,
} from '@/State/QuizAtoms';
import styles from './LibraryControls.module.css';

const SORT_OPTIONS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'recent', label: 'Recent' },
  { value: 'az', label: 'A-Z' },
  { value: 'questions', label: 'Most questions' },
];

export default function LibraryControls() {
  const [search, setSearch] = useAtom(librarySearchAtom);
  const [sort, setSort] = useAtom(librarySortAtom);
  const [hasQuestions, setHasQuestions] = useAtom(libraryHasQuestionsAtom);

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

      <div className={styles.row}>
        <label className={styles.sortLabel}>
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as LibrarySort)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`${styles.filterChip} ${hasQuestions ? styles.filterChipActive : ''}`}
          onClick={() => setHasQuestions(!hasQuestions)}
          aria-pressed={hasQuestions}
        >
          Has questions
        </button>
      </div>
    </div>
  );
}
