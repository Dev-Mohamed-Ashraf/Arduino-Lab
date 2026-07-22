import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

import { Providers } from '@/app/providers';
import '@/app/globals.css';
import './print.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'إيصال الحجز',
  robots: { index: false, follow: false },
};

/**
 * Root layout for the printable receipt — no header, no footer, no nav.
 *
 * A second root layout (rather than a nested one) is what lets this branch drop
 * the site chrome entirely; what ends up on paper is only the receipt.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={arabic.variable}>
      <body className="print-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
