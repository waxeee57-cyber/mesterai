import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MesterAI — Magyar Mesterek Appja',
  description: 'Munkák, ügyfelek, számlák és NAV egy helyen. Magyar mestereknek.',
  manifest: '/manifest.json',
  keywords: ['mesterember', 'villanyszerelő', 'vízvezeték', 'számla', 'NAV', 'magyar app'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#F97316" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
