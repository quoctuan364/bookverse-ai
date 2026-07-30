import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { FloatingChatbot } from "@/components/FloatingChatbot";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  display: "swap",
  subsets: ["latin", "vietnamese"],
  variable: "--font-bookverse-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BookVerse AI",
  description: "Nền tảng sách điện tử thông minh tích hợp chợ sách cũ, cộng đồng và AI gợi ý.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.variable} flex min-h-screen flex-col`}>
        <a className="bv-skip-link" href="#main-content">Bỏ qua điều hướng</a>
        <Navbar />
        <div className="flex-1" id="main-content">{children}</div>
        <Footer />
        <FloatingChatbot />
      </body>
    </html>
  );
}
