import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Montserrat } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Prepadi - WAEC/JAMB Exam Simulator',
  description: 'Practice for your WAEC/JAMB exams with real questions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={montserrat.className}>
        <Providers>
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}