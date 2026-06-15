import { auth } from './Auth';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  credits: number;
  creditsRefreshedAt: string | null;
}

// Reads the Better Auth session from request cookies. Returns null when the
// caller is anonymous. This is the server-side security boundary used by the
// gated route handlers — never trust client claims of identity.
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const result = await auth.api.getSession({ headers: req.headers });
  if (!result?.user) return null;

  const u = result.user as {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    credits?: number | null;
    creditsRefreshedAt?: string | null;
  };

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image ?? null,
    credits: u.credits ?? 0,
    creditsRefreshedAt: u.creditsRefreshedAt ?? null,
  };
}
