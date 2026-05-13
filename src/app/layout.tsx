import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/presentation/components/QueryProvider";
import Navbar from "@/presentation/components/Navbar";
import Footer from "@/presentation/components/Footer";
import * as React from "react";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | MPHIM",
    default: "MPHIM - Watch Free Movies & TV Shows",
  },
  description: "High-quality movie streaming platform with no ads. Watch the latest movies and TV series online for free.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-black text-zinc-200 font-sans">
        <QueryProvider>
          <Suspense fallback={<div className="h-20 bg-black/50" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 pt-16 md:pt-20">
            <Suspense fallback={<div className="min-h-screen" />}>
              {children}
            </Suspense>
          </main>
          <Suspense fallback={<div className="h-40 bg-zinc-950" />}>
            <Footer />
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
