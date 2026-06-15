import { ImageResponse } from 'next/og';

// Open Graph / Twitter preview image dimensions (the size every scraper,
// including WhatsApp, expects for a large link-preview card).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const INK = '#000000';
const CREAM = '#FFFDF5';

interface OgCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  // A big stat (e.g. a score percentage) shown above the title.
  score?: string | null;
  // Accent colour for the eyebrow chip / score.
  accent?: string;
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

// Renders a neo-brutalist preview card as a PNG. We deliberately draw a styled
// card (rather than embedding the stored cover art) because the covers are
// WebP — a format WhatsApp/Facebook previews won't render — and because Satori
// can't rasterise WebP either. A freshly generated PNG previews everywhere.
export function renderOgImage({ eyebrow, title, subtitle, score, accent = '#6DEFFF' }: OgCardProps) {
  const safeTitle = clamp(title, 90);
  const titleSize = safeTitle.length > 48 ? 64 : safeTitle.length > 28 ? 84 : 104;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 44,
          background: CREAM,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 64px',
            background: '#FFFFFF',
            border: `10px solid ${INK}`,
            boxShadow: `24px 24px 0 ${INK}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 26px',
                background: INK,
                color: '#FFFFFF',
                fontSize: 40,
                fontWeight: 800,
                letterSpacing: 4,
              }}
            >
              QUIZZ
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 24px',
                background: accent,
                color: INK,
                border: `6px solid ${INK}`,
                fontSize: 30,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {eyebrow}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {score ? (
              <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, lineHeight: 1, color: INK }}>
                {score}
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                marginTop: score ? 18 : 0,
                fontSize: titleSize,
                fontWeight: 800,
                lineHeight: 1.05,
                color: INK,
              }}
            >
              {safeTitle}
            </div>
          </div>

          {subtitle ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                padding: '14px 24px',
                background: '#FFD93D',
                border: `6px solid ${INK}`,
                fontSize: 32,
                fontWeight: 700,
                color: INK,
              }}
            >
              {clamp(subtitle, 70)}
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
