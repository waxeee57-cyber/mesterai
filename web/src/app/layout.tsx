import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MesterAI — Magyar mesteremberek appja',
  description: 'Az első magyar mesterember menedzsment platform. 5 perc alatt munkát felvenni, 30 másodperc alatt számlát küldeni.',
  keywords: ['mesterember', 'villanyszerelő', 'vízvezeték', 'számla', 'NAV', 'magyar app'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
