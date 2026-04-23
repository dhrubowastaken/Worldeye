import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'World Eye',
  description: 'Live global intelligence — air, maritime, and orbital tracking on an interactive globe.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
