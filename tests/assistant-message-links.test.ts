import assert from "node:assert/strict";
import test from "node:test";

import { extractAssistantInternalLinks } from "@/lib/assistant-message-links";

test("trích route hỗ trợ nội bộ thành liên kết có nhãn", () => {
  assert.deepEqual(
    extractAssistantInternalLinks("Cập nhật tại /profile/settings rồi xem /library."),
    [
      { href: "/profile/settings", label: "Cập nhật hồ sơ" },
      { href: "/library", label: "Mở thư viện của tôi" },
    ],
  );
});

test("bỏ route lạ, route trùng và URL ngoài website", () => {
  assert.deepEqual(
    extractAssistantInternalLinks(
      "Xem /orders, mở lại /orders; không dùng https://example.com/admin hoặc /route-khong-ton-tai.",
    ),
    [{ href: "/orders", label: "Xem đơn hàng" }],
  );
});
