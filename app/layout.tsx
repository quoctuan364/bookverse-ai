import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FloatingChatbot } from "@/components/FloatingChatbot";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookVerse AI",
  description: "Nền tảng sách điện tử thông minh tích hợp chợ sách cũ, cộng đồng và AI gợi ý.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <Navbar />
        {children}
        <FloatingChatbot />
      </body>
    </html>
  );
}
