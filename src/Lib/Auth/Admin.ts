import { env } from '@/Lib/Env';
import { getSessionUser } from './Session';

// Admins are configured via the ADMIN_EMAILS env var (comma-separated). Used to
// gate the lightweight moderation endpoints/page.
function adminEmails(): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
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
