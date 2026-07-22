import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

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
    default: 'لوحة تحكم معمل الأردوينو',
    template: '%s | لوحة التحكم',
  },
  description: 'إدارة حجوزات معمل الأردوينو ومخزون المكوّنات.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={arabic.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
