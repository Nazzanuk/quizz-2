import type { Metadata, Viewport } from 'next';
import Provider from '@/State/Provider';
import Toast from '@/Features/Shared/Toast';
import ConfirmDialog from '@/Features/Shared/ConfirmDialog';
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
          <ConfirmDialog />
        </Provider>
      </body>
    </html>
  );
}
