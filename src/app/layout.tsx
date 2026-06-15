import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Space_Grotesk } from 'next/font/google';
import Provider from '@/State/Provider';
import Toast from '@/Features/Shared/Toast';
import AudioAlerts from '@/Features/Shared/AudioAlerts';
import ConfirmDialog from '@/Features/Shared/ConfirmDialog';
import SettingsPanel from '@/Features/Shared/SettingsPanel';
import { getSiteUrl } from '@/Lib/SiteUrl';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Quiz Dart',
    template: '%s | Quiz Dart',
  },
  description: 'Generate, play, and share AI-powered quiz scores.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Quiz Dart',
    description: 'Generate, play, and share AI-powered quiz scores.',
    siteName: 'Quiz Dart',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quiz Dart',
    description: 'Generate, play, and share AI-powered quiz scores.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // Matches --neo-bg so the status bar blends into the app background
  themeColor: '#FFFDF5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${archivoBlack.variable}`}>
      <body>
        <Provider>
          {children}
          <Toast />
          <AudioAlerts />
          <ConfirmDialog />
          <SettingsPanel />
        </Provider>
      </body>
    </html>
  );
}
