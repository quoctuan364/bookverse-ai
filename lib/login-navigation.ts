/** Chỉ quay về trang nội bộ, không quay lại biểu mẫu xác thực. */
export function getSafeCallbackUrl(value: unknown): string {
  if (typeof value !== "string") return "/";
  const path = value.trim();
  try {
    const decoded = decodeURIComponent(path);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/u.test(decoded)) return "/";
    const url = new URL(decoded, "https://bookverse.invalid");
    if (url.origin !== "https://bookverse.invalid" || /^\/(login|register|forgot-password|reset-password|api\/auth)(\/|$)/i.test(url.pathname)) return "/";
    // Giữ nguyên mã hóa của tham số tìm kiếm trong URL hợp lệ.
    return path;
  } catch {
    return "/";
  }
}
