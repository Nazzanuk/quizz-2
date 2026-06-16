'use client';

import Link from '@/Features/Shared/TransitionLink';
import { useAccount } from '@/Lib/Hooks/UseAccount';
import Card from '@/Features/Shared/Card';
import Button from '@/Features/Shared/Button';
import styles from './AdminCard.module.css';

// Entry point to the admin dashboard. Self-hides for non-admins.
export default function AdminCard({ className }: { className?: string }) {
  const { account } = useAccount();
  if (!account?.isAdmin) return null;

  return (
    <Card color="lavender" className={className}>
      <p className={styles.label}>Admin</p>
      <p className={styles.hint}>Moderation, analytics, and tools to manage users and quizzes.</p>
      <Link href="/admin">
        <Button variant="primary" fullWidth>Open admin dashboard</Button>
      </Link>
    </Card>
  );
}
