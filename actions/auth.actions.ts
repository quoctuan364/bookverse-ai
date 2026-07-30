"use server";

import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-reset-policy";
import prisma from "@/lib/prisma";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthActionResult {
  success: boolean;
  message: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildUserId(): string {
  return `USER-${crypto.randomUUID()}`;
}

export async function registerUser(data: RegisterUserInput): Promise<AuthActionResult> {
  try {
    const name = data.name.trim();
    const email = normalizeEmail(data.email);
    const password = data.password;

    if (!name) {
      return { success: false, message: "Vui lòng nhập họ và tên." };
    }

    if (!isValidEmail(email)) {
      return { success: false, message: "Email không hợp lệ." };
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return { success: false, message: `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.` };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, message: "Email này đã được đăng ký." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        id: buildUserId(),
        name,
        email,
        password: hashedPassword,
        role: UserRole.BUYER,
      },
    });

    return { success: true, message: "Đăng ký thành công." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[registerUser] ${message}`);
    return { success: false, message: "Không thể đăng ký tài khoản. Vui lòng thử lại." };
  }
}
