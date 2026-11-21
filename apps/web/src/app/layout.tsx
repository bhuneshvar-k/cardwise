import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { BottomNav } from '@/components/app/bottom-nav';
import { Providers } from '@/components/app/providers';
import './globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  applicationName: 'Cardwise',
  title: { default: 'Cardwise — which card should I use?', template: '%s · Cardwise' },
  description: 'Pick the credit or debit card that earns the most for each purchase in India.',
  appleWebApp: { capable: true, title: 'Cardwise', statusBarStyle: 'default' },
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
