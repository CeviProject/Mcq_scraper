import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Aptitude Ace',
  description: 'The smartest way to prepare for your aptitude tests.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        {children}
      </body>
    </html>
  );
}
