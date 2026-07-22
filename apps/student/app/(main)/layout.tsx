import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

import { SiteHeader } from '@/components/site-header';
import { Providers } from '@/app/providers';
import '@/app/globals.css';

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

/**
 * Root layout for every screen that carries the site chrome.
 *
 * The print receipt lives under the sibling (print) group, which has its own
 * root layout with no header or footer — see plans/09-print-export.md. Having
 * two root layouts is why there is no shared app/layout.tsx.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
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
