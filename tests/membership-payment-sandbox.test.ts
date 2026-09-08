import assert from "node:assert/strict";
import test from "node:test";

import {
  isMembershipSandboxRequestId,
  membershipSandboxMethodLabel,
  normalizeMembershipRefundReason,
  parseMembershipSandboxMethod,
  parseMembershipSandboxOutcome,
} from "@/lib/membership-payment-sandbox";

test("sandbox chỉ nhận hai phương thức thanh toán demo", () => {
  assert.equal(parseMembershipSandboxMethod("WALLET_DEMO"), "WALLET_DEMO");
  assert.equal(
    parseMembershipSandboxMethod("BANK_TRANSFER_DEMO"),
    "BANK_TRANSFER_DEMO",
  );
  assert.equal(parseMembershipSandboxMethod("COD"), null);
  assert.equal(parseMembershipSandboxMethod("VNPAY"), null);
});

test("sandbox chỉ nhận kết quả thành công hoặc thất bại rõ ràng", () => {
  assert.equal(parseMembershipSandboxOutcome("success"), "success");
  assert.equal(parseMembershipSandboxOutcome("failure"), "failure");
  assert.equal(parseMembershipSandboxOutcome("paid"), null);
});

test("request id phải là UUID hợp lệ để chống gửi giao dịch trùng", () => {
  assert.equal(
    isMembershipSandboxRequestId("8d476f6e-f3c0-4d19-a90d-5cd5bfa0b791"),
    true,
  );
  assert.equal(isMembershipSandboxRequestId("payment-123"), false);
});

test("nhãn phương thức không làm lộ mã kỹ thuật ra giao diện", () => {
  assert.equal(
    membershipSandboxMethodLabel("WALLET_DEMO"),
    "Ví BookVerse Sandbox",
  );
  assert.equal(
    membershipSandboxMethodLabel("UNKNOWN"),
    "Phương thức không xác định",
  );
});

test("lý do hoàn tiền được chuẩn hóa và giới hạn độ dài", () => {
  assert.equal(
    normalizeMembershipRefundReason("  Khách hàng yêu cầu   hoàn tiền  "),
    "Khách hàng yêu cầu hoàn tiền",
  );
  assert.equal(normalizeMembershipRefundReason("hủy"), null);
  assert.equal(normalizeMembershipRefundReason("x".repeat(301)), null);
});
