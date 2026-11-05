import type { Metadata } from 'next';
import { Sora, Inter } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import { SignoffProvider } from '@/context/SignoffContext';

const sora = Sora({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Signoff',
  description: 'Three AI helpers do the paperwork. You make the call.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#b6ff4d" />
              <stop offset="1" stopColor="#00d4b4" />
            </linearGradient>
          </defs>
        </svg>
        <SignoffProvider>
          <div className="app">
            <Nav />
            <main id="main">{children}</main>
          </div>
        </SignoffProvider>
      </body>
    </html>
  );
}

