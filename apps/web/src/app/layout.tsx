import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'PlayDate',
    template: '%s | PlayDate',
  },
  description: '1-on-1 video calling with shared 2-player games',
  keywords: ['video call', 'games', 'multiplayer', '2-player', 'online games'],
  authors: [{ name: 'PlayDate' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'PlayDate',
    title: 'PlayDate - Video Call & Games',
    description: '1-on-1 video calling with shared 2-player games',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
