import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { isAdminFromHeaders } from '@/Lib/Auth/Admin';

// Server-side gate for every /admin page (defense in depth on top of the
// API-layer 403s). Non-admins never see the dashboard shell.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = await isAdminFromHeaders(await headers());
  if (!isAdmin) redirect('/');
  return <>{children}</>;
}
