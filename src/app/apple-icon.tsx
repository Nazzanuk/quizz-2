import { ImageResponse } from 'next/og';

// iOS home-screen icon. Mirrors the dartboard mark in public/icons/*.svg, but
// rendered as a PNG (Satori draws the concentric rings as nested rounded divs)
// because iOS won't use an SVG for the apple-touch-icon.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const GOLD = '#FFD93D';
const INK = '#000000';
const CREAM = '#FFFDF5';
const CORAL = '#FF5A5F';

// Concentric ring diameters (px) scaled from the 512 artwork to the 180 canvas.
const RINGS: Array<{ d: number; color: string }> = [
  { d: 126, color: INK },
  { d: 113, color: CREAM },
  { d: 90, color: INK },
  { d: 78, color: CORAL },
  { d: 47, color: CREAM },
  { d: 33, color: INK },
  { d: 21, color: CORAL },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: GOLD,
        }}
      >
        {RINGS.reduceRight<React.ReactNode>((inner, ring) => (
          <div
            style={{
              width: ring.d,
              height: ring.d,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: ring.d,
              background: ring.color,
            }}
          >
            {inner}
          </div>
        ), null)}
      </div>
    ),
    { ...size },
  );
}
