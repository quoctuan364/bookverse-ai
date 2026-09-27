"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Khi pathname hoặc searchParams thay đổi -> hoàn tất thanh tiến trình
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => {
        setVisible(false);
        setIsNavigating(false);
        setProgress(0);
      }, 250);
    }
  }, [pathname, searchParams, isNavigating]);

  // Bắt sự kiện click vào các thẻ liên kết nội bộ
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Bỏ qua nếu không phải click chuột trái hoặc có bấm phím tổ hợp (Ctrl, Cmd, Shift, Alt)
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // Tìm thẻ <a> gần nhất
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const linkTarget = anchor.getAttribute("target");

      // Bỏ qua target="_blank", mailto, tel, anchor link (#) hoặc không có href
      if (
        !href ||
        linkTarget === "_blank" ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Kiểm tra xem có phải điều hướng nội bộ không
      const isInternal =
        href.startsWith("/") ||
        href.startsWith(window.location.origin);

      if (!isInternal) return;

      // Nếu click vào đúng trang hiện tại thì không kích hoạt
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href, window.location.origin);
      if (
        currentUrl.pathname === targetUrl.pathname &&
        currentUrl.search === targetUrl.search &&
        currentUrl.hash === targetUrl.hash
      ) {
        return;
      }

      // Kích hoạt ngay thanh tiến trình phản hồi lập tức (0ms)
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);

      setVisible(true);
      setIsNavigating(true);
      setProgress(25);

      // Tăng dần tiến trình tạo cảm giác phản hồi nhanh
      timerRef.current = setTimeout(() => {
        setProgress(65);
        timerRef.current = setTimeout(() => {
          setProgress(85);
        }, 300);
      }, 150);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] h-[3px] overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-bv-primary via-[#00B074] to-bv-gold shadow-[0_0_12px_rgba(0,176,116,0.8),0_0_6px_rgba(245,166,35,0.6)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
