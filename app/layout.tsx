import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CaesarDressing auto-hospedada via next/font (emite @font-face + preload;
// não usar @font-face manual nem preload manual para ela).
const caesarDressing = localFont({
  src: "../public/fonts/CaesarDressing-Regular.ttf",
  variable: "--font-caesar",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hestia",
  description: "Controle de finanças e tarefas para a família",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caesarDressing.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
