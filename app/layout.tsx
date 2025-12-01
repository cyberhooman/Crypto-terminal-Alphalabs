import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alphalabs Crypto Terminal",
  description: "Advanced crypto trading terminal with real-time market data and analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
