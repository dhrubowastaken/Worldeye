import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'World Eye',
  description: 'A modular, live intelligence globe for air, maritime, and orbital tracking.',
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
