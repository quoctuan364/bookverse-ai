import { UserRole } from "@prisma/client";

/**
 * Phân lớp vai trò nghiệp vụ (Business Role) của BookVerse AI theo mô hình hợp nhất:
 * - GUEST: Khách chưa đăng nhập
 * - MEMBER: Thành viên chính thức (gộp toàn bộ quyền Độc giả và Người bán)
 * - STAFF: Nhân sự quản trị (ADMIN) và kiểm duyệt (MODERATOR)
 */
export type AppBusinessRole = "GUEST" | "MEMBER" | "STAFF";

export interface NormalizedRoleInfo {
  businessRole: AppBusinessRole;
  isMember: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canBuy: boolean;
  canSell: boolean;
  canRead: boolean;
  canModerate: boolean;
  displayLabel: string;
}

/**
 * Chuẩn hóa các giá trị role từ database (bao gồm giá trị legacy BUYER, SELLER)
 * về role nghiệp vụ thống nhất.
 * - BUYER  -> MEMBER
 * - SELLER -> MEMBER
 * - MODERATOR -> STAFF
 * - ADMIN     -> STAFF
 */
export function normalizeUserRole(role?: string | null): AppBusinessRole {
  if (!role) return "GUEST";
  if (role === UserRole.ADMIN || role === UserRole.MODERATOR) {
    return "STAFF";
  }
  return "MEMBER";
}

export function isMemberRole(role?: string | null): boolean {
  return normalizeUserRole(role) === "MEMBER";
}

export function isStaffRole(role?: string | null): boolean {
  return normalizeUserRole(role) === "STAFF";
}

export function isAdminRole(role?: string | null): boolean {
  return role === UserRole.ADMIN;
}

export function getUserRoleInfo(role?: string | null, isLocked = false): NormalizedRoleInfo {
  if (!role || isLocked) {
    return {
      businessRole: "GUEST",
      isMember: false,
      isStaff: false,
      isAdmin: false,
      isModerator: false,
      canBuy: false,
      canSell: false,
      canRead: true, // Khách vẫn có thể đọc thử các trang mẫu (sample pages)
      canModerate: false,
      displayLabel: isLocked ? "Tài khoản bị khóa" : "Khách",
    };
  }

  const businessRole = normalizeUserRole(role);
  const isStaff = businessRole === "STAFF";
  const isAdmin = role === UserRole.ADMIN;
  const isModerator = role === UserRole.MODERATOR;

  return {
    businessRole,
    isMember: true,
    isStaff,
    isAdmin,
    isModerator,
    canBuy: true,
    canSell: true, // Mọi Member đều có quyền bán sách
    canRead: true,
    canModerate: isStaff,
    displayLabel: isAdmin ? "Quản trị viên" : isModerator ? "Kiểm duyệt viên" : "Thành viên",
  };
}
