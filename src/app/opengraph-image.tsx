import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/Features/Shared/OgImage';

export const alt = 'Quiz Dart';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Play',
    title: 'Generate, play & share quizzes',
    subtitle: 'AI-powered quiz scores',
    accent: '#FF5A5F',
  });
}
