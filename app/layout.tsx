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
        <meta
          name="talentapp:project_verification"
          content="4938177c5fa5d8c2829e5d7dc78e63869198e038488558fa99cd5e82ecdce17fd1cc0babec5eda010b6d4e0863b54a00003be47a79f288d304bee1a3e341491b"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
