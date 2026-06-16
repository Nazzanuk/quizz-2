import { redirect } from 'next/navigation';

// The analytics view is now a tab inside the /admin dashboard. Keep this route
// as a redirect so old links/bookmarks still resolve.
export default function AnalyticsPage() {
  redirect('/admin?tab=analytics');
}
