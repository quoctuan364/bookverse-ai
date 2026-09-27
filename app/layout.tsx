import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { FloatingChatbot } from "@/components/FloatingChatbot";
import { Navbar } from "@/components/Navbar";
import { NavigationProgressBar } from "@/components/navigation/NavigationProgressBar";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  display: "swap",
  subsets: ["latin", "vietnamese"],
  variable: "--font-bookverse-sans",
  // Ba weight đủ cho nội dung, CTA và tiêu đề; trình duyệt không phải tải
  // mười tệp font Latin/Vietnamese ngay lần mở trang đầu tiên.
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "BookVerse",
  description: "Đọc sách điện tử, mua bán sách cũ và trao đổi cùng cộng đồng BookVerse.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} flex min-h-screen flex-col`} suppressHydrationWarning>
        <ConsentProvider>
          <Suspense fallback={null}>
            <NavigationProgressBar />
          </Suspense>
          <a className="bv-skip-link" href="#main-content">Bỏ qua điều hướng</a>
          <Navbar />
          <div className="flex-1" id="main-content">{children}</div>
          <Footer />
          <Suspense fallback={null}>
            <FloatingChatbot />
          </Suspense>
          {/* ConsentBanner tạm ẩn */}
          {/* <ConsentBanner /> */}
        </ConsentProvider>
      </body>
    </html>
  );
}
