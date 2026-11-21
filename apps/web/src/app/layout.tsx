import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { BottomNav } from '@/components/app/bottom-nav';
import { Providers } from '@/components/app/providers';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: 'Cardwise — which card should I use?', template: '%s · Cardwise' },
  description: SITE_DESCRIPTION,
  keywords: [
    'best credit card India',
    'credit card rewards calculator',
    'which credit card to use',
    'cashback credit card',
    'credit card for Swiggy',
    'credit card for Amazon',
    'fuel credit card',
    'RuPay credit card UPI',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: '/',
    title: 'Cardwise — which card should I use?',
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-background min-h-dvh">
        <Providers>
          <main className="mx-auto max-w-lg px-4 pt-6 pb-28">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
