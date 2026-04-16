import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WORLD EYE",
  description: "Real-time global traffic monitoring — Air, Sea, Space",
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
