interface PasswordResetDeliveryInput {
  email: string;
  resetUrl: string;
  expiresMinutes: number;
}

/** Gửi link qua webhook email nội bộ; token chỉ xuất hiện trong HTTPS request đã xác thực. */
export async function deliverPasswordResetLink(input: PasswordResetDeliveryInput): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const webhookUrl = process.env.BOOKVERSE_PASSWORD_RESET_WEBHOOK_URL?.trim();
  const webhookToken = process.env.BOOKVERSE_PASSWORD_RESET_WEBHOOK_TOKEN?.trim();
  if (!webhookUrl || !webhookToken) {
    throw new Error("Password reset delivery chưa được cấu hình.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${webhookToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Password reset delivery trả HTTP ${response.status}.`);
  }
}

