import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

import { SiteHeader } from '@/components/site-header';
import { Providers } from './providers';
import './globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'معمل الأردوينو — حجز المواعيد',
    template: '%s | معمل الأردوينو',
  },
  description: 'نظام حجز مواعيد معمل الأردوينو وإدارة صرف المكوّنات.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111820' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={arabic.variable}>
      <body>
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="text-muted-foreground border-t py-6 text-center text-sm">
              نظام حجز معمل الأردوينو
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
