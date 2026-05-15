import AppShell from '@/Features/Shared/AppShell';
import Card from '@/Features/Shared/Card';
import styles from './page.module.css';

export default function OfflinePage() {
  return (
    <AppShell>
      <div className={styles.container}>
        <Card color="lavender" className={styles.card}>
          <h1 className={styles.heading}>You are offline</h1>
          <p className={styles.body}>
            Check your connection and try again.
            Quizzes you have already loaded may still be playable.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
