import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Space_Grotesk } from 'next/font/google';
import Provider from '@/State/Provider';
import Toast from '@/Features/Shared/Toast';
import AudioAlerts from '@/Features/Shared/AudioAlerts';
import ConfirmDialog from '@/Features/Shared/ConfirmDialog';
import SettingsPanel from '@/Features/Shared/SettingsPanel';
import InstallPromptListener from '@/Features/Shared/InstallPromptListener';
import AnonClaim from '@/Features/Shared/AnonClaim';
import ZoomLock from '@/Features/Shared/ZoomLock';
import PreferencesSync from '@/Features/Shared/PreferencesSync';
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
      <head>
        {/* Apply persisted accessibility prefs before first paint so enabling
            larger text or reduced motion never flashes the default UI first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=JSON.parse(localStorage.getItem('quizz.playerProfile')||'{}');var e=document.documentElement;if(p.largeText)e.dataset.largeText='true';if(p.reduceMotion)e.dataset.reduceMotion='true';}catch(_){}`,
          }}
        />
      </head>
      <body>
        <Provider>
          <PreferencesSync />
          {children}
          <Toast />
          <AudioAlerts />
          <ConfirmDialog />
          <SettingsPanel />
          <InstallPromptListener />
          <AnonClaim />
          <ZoomLock />
        </Provider>
      </body>
    </html>
  );
}
