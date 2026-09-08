"use client";

/**
 * ConsentBanner — Modal xin phép thu thập tương tác phục vụ nghiên cứu đồ án
 *
 * Chỉ hiển thị khi:
 * 1. User đã đăng nhập
 * 2. Chưa có consent record (status = "pending")
 *
 * Người dùng có thể đồng ý hoặc từ chối.
 * Khi từ chối, không ghi bất kỳ tương tác cá nhân nào.
 */
import { useState } from "react";
import { useConsent } from "./ConsentProvider";

export function ConsentBanner() {
  const { status, setConsent } = useConsent();
  const [isLoading, setIsLoading] = useState(false);

  // Chỉ hiển thị khi pending
  if (status !== "pending") return null;

  async function handleDecision(consented: boolean) {
    setIsLoading(true);
    await setConsent(consented);
    setIsLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <h2
            id="consent-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Hỗ trợ Nghiên cứu BookVerse AI
          </h2>
        </div>

        {/* Mô tả */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Đây là đồ án tốt nghiệp về hệ thống gợi ý sách thông minh. Chúng tôi
          muốn xin phép thu thập{" "}
          <strong>hành vi tương tác ẩn danh</strong> (xem sách, click gợi ý,
          đánh giá) để đánh giá chất lượng mô hình Hybrid Recommendation.
        </p>

        {/* Thông tin thu thập */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
            Dữ liệu sẽ thu thập
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Loại hành vi: xem sách, click gợi ý, yêu thích, đánh giá</li>
            <li>ID sách (không phải nội dung sách)</li>
            <li>Vị trí trong danh sách gợi ý</li>
            <li>Mã người dùng nội bộ (không phải email)</li>
          </ul>
        </div>

        {/* Cam kết */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
            Cam kết của chúng tôi
          </p>
          <ul className="text-xs text-green-600 dark:text-green-200 space-y-1 list-disc list-inside">
            <li>Không thu thập mật khẩu, email, thông tin thanh toán</li>
            <li>Dữ liệu chỉ dùng cho mục đích nghiên cứu đồ án</li>
            <li>Bạn có thể thu hồi đồng ý bất kỳ lúc nào trong Cài đặt</li>
            <li>Dữ liệu sẽ được ẩn danh hóa trước khi phân tích</li>
          </ul>
        </div>

        {/* Nút */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            id="consent-agree-btn"
            onClick={() => handleDecision(true)}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200"
          >
            {isLoading ? "Đang lưu..." : "✓ Đồng ý tham gia"}
          </button>
          <button
            id="consent-decline-btn"
            onClick={() => handleDecision(false)}
            disabled={isLoading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200"
          >
            Từ chối
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Việc từ chối sẽ không ảnh hưởng đến trải nghiệm sử dụng BookVerse.
        </p>
      </div>
    </div>
  );
}