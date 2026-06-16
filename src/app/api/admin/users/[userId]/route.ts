import { NextResponse } from 'next/server';
import { deleteUserAndData, getUserById, setUserCredits } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';
import { enforceRateLimit } from '@/Lib/RateLimit';

interface Params {
  params: Promise<{ userId: string }>;
}

// Admin-only: set a user's credit balance.
export async function PATCH(req: Request, { params }: Params) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-user-credits:${admin.id}`, 30, 60_000);
  if (limited) return limited;

  const { userId } = await params;
  const body = await req.json().catch(() => ({})) as { credits?: unknown };
  const credits = Math.floor(Number(body.credits));
  if (!Number.isFinite(credits) || credits < 0 || credits > 9999) {
    return NextResponse.json({ error: 'credits must be 0–9999' }, { status: 400 });
  }

  const updated = await setUserCredits(userId, credits);
  if (updated === null) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, credits: updated });
}

// Admin-only: permanently delete a user and all their data.
export async function DELETE(req: Request, { params }: Params) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-user-delete:${admin.id}`, 10, 60_000);
  if (limited) return limited;

  const { userId } = await params;
  // Don't let an admin delete their own account through this surface.
  if (userId === admin.id) {
    return NextResponse.json({ error: 'cannot delete yourself here' }, { status: 400 });
  }
  const target = await getUserById(userId);
  if (!target) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await deleteUserAndData(userId);
  return NextResponse.json({ ok: true });
}
