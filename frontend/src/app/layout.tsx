import type { Metadata } from 'next';
import './globals.css';
import { AlertBadgeProvider } from '@/components/layout/AlertBadgeProvider';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Poseidon Smart Water Hub',
  description: 'Real-time water infrastructure monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-50">
        <AlertBadgeProvider />
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
