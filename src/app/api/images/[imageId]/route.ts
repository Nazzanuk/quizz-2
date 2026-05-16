import { getImage } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  await runMigrations();
  const { imageId } = await params;
  const image = await getImage(imageId);
  if (!image) return new Response(null, { status: 404 });

  const bytes = Buffer.from(image.data, 'base64');
  return new Response(bytes, {
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
