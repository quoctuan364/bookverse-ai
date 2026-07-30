export const MEMBERSHIP_SANDBOX_METHODS = [
  {
    value: "WALLET_DEMO",
    label: "Ví BookVerse Sandbox",
    description: "Mô phỏng ví điện tử, xác nhận ngay trên cổng thanh toán thử.",
  },
  {
    value: "BANK_TRANSFER_DEMO",
    label: "Chuyển khoản Sandbox",
    description: "Mô phỏng quét mã và đối soát chuyển khoản ngân hàng.",
  },
] as const;

export type MembershipSandboxMethod =
  (typeof MEMBERSHIP_SANDBOX_METHODS)[number]["value"];

export type MembershipSandboxOutcome = "success" | "failure";

export function parseMembershipSandboxMethod(
  value: unknown,
): MembershipSandboxMethod | null {
  if (typeof value !== "string") return null;
  return MEMBERSHIP_SANDBOX_METHODS.some((method) => method.value === value)
    ? (value as MembershipSandboxMethod)
    : null;
}

export function parseMembershipSandboxOutcome(
  value: unknown,
): MembershipSandboxOutcome | null {
  return value === "success" || value === "failure" ? value : null;
}

export function membershipSandboxMethodLabel(value: string): string {
  return (
    MEMBERSHIP_SANDBOX_METHODS.find((method) => method.value === value)?.label ??
    "Phương thức không xác định"
  );
}

export function isMembershipSandboxRequestId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function normalizeMembershipRefundReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim().replace(/\s+/g, " ");
  return reason.length >= 5 && reason.length <= 300 ? reason : null;
}
