const protectedPrefixes = [
  "/cart",
  "/community/new",
  "/library",
  "/marketplace/new",
  "/membership/checkout",
  "/membership/payment",
  "/membership/success",
  "/orders",
  "/reading",
  "/profile",
  "/seller",
  "/admin",
  "/dashboard",
  "/notifications",
] as const;

/**
 * Trình đọc `/read/:bookId` được để công khai để khách có thể đọc thử.
 * Các thao tác lưu tiến độ và ghi chú vẫn được kiểm tra đăng nhập ở Server Action.
 */
export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Các màn hình quản trị cũ được gom về hai nơi dễ trình bày khi demo:
 * trang vận hành và trang thống kê. Giữ hàm tập trung để middleware và test
 * luôn dùng cùng một quy tắc.
 */
const legacyAdminRedirects: Readonly<Record<string, string>> = {
  "/admin/analytics": "/admin/statistics",
  "/admin/integrations": "/admin",
};

export function getCanonicalAdminPath(pathname: string): string | null {
  return legacyAdminRedirects[pathname] ?? null;
}
