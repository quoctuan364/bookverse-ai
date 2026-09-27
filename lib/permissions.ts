import { UserRole } from "@prisma/client";
import { cache } from "react";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export interface CurrentUserSession {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
  isLocked: boolean;
}

export class PermissionError extends Error {
  constructor(message = "Bạn không có quyền thực hiện thao tác này.") {
    super(message);
    this.name = "PermissionError";
  }
}

export const getCurrentUser = cache(async (): Promise<CurrentUserSession | null> => {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    return null;
  }

  try {
    return await prisma.user.findUnique({
      where: {
        id: sessionUser.id,
      },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        isLocked: true,
      },
    });
  } catch {
    // Khi database local tạm dừng, xem session như khách để các trang công khai vẫn hiển thị được.
    console.warn("[permissions] Database không khả dụng; chuyển sang chế độ khách.");
    return null;
  }
});

export async function requireAuthenticatedUser(): Promise<CurrentUserSession> {
  const user = await getCurrentUser();

  if (!user) {
    throw new PermissionError("Bạn cần đăng nhập để thực hiện thao tác này.");
  }

  if (user.isLocked) {
    throw new PermissionError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
  }

  return user;
}

export async function requireModeratorUser(): Promise<CurrentUserSession> {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    throw new PermissionError("Chỉ quản trị viên hoặc kiểm duyệt viên được truy cập khu vực này.");
  }

  return user;
}

export async function requireAdminUser(): Promise<CurrentUserSession> {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.ADMIN) {
    throw new PermissionError("Chỉ quản trị viên được thực hiện thao tác này.");
  }

  return user;
}

/**
 * @deprecated Under Unified User Model, all members have seller permissions.
 * Use requireAuthenticatedUser() instead. Kept for legacy backward compatibility.
 */
export async function requireSellerUser(): Promise<CurrentUserSession> {
  return requireAuthenticatedUser();
}
