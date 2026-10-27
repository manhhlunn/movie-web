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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mphim.site'),
  title: {
    template: "%s | MPHIM",
    default: "MPHIM - Xem Phim Online Chuẩn HD Miễn Phí",
  },
  description: "Trang web xem phim online chất lượng cao miễn phí, cập nhật nhanh các bộ phim mới, phim chiếu rạp, phim bộ, phim lẻ với phụ đề Vietsub và Thuyết minh sắc nét.",
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
