import type { Metadata, Viewport } from 'next';
import Provider from '@/State/Provider';
import Toast from '@/Features/Shared/Toast';
import AudioAlerts from '@/Features/Shared/AudioAlerts';
import ConfirmDialog from '@/Features/Shared/ConfirmDialog';
import SettingsPanel from '@/Features/Shared/SettingsPanel';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quizz',
  description: 'Generate and play quizzes powered by AI',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFB7B2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
