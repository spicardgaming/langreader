import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteShell from "./components/SiteShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Balaka — Read or Upload Books and Learn with Instant Translation in different languages',
  description: 'Use Balaka - Your reading companion for learning foreign languages through books. Highlight words and phrases — get instant translation and explanation in context.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[#fafaf9] text-[#2c2c2c]">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
