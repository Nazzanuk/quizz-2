import { env } from '@/Lib/Env';
import { getAuth } from './Auth';
import { getSessionUser } from './Session';

// The app owner is an admin by default so moderation/analytics work without
// extra config. ADMIN_EMAILS (comma-separated) overrides/extends this.
const DEFAULT_ADMIN_EMAILS = ['nazzanuk@gmail.com'];

// Admins are configured via the ADMIN_EMAILS env var (comma-separated), falling
// back to the owner. Used to gate the moderation and analytics surfaces.
function adminEmails(): Set<string> {
  const configured = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const emails = configured.length > 0 ? configured : DEFAULT_ADMIN_EMAILS;
  return new Set(emails.map((email) => email.toLowerCase()));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

// Resolves the signed-in user only if they're an admin; otherwise null.
export async function getAdminUser(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser || !isAdminEmail(sessionUser.email)) return null;
  return sessionUser;
}

// Headers-based admin check for server components/layouts (which have no
// Request object) — mirrors getAdminUser via the Better Auth session.
export async function isAdminFromHeaders(headers: Headers): Promise<boolean> {
  const result = await getAuth().api.getSession({ headers });
  return isAdminEmail(result?.user?.email ?? null);
}
