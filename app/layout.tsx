import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'BaseMood',
  description: 'Record one onchain mood per day and grow your points history.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="6a607536078f6baf9ef3013a" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
