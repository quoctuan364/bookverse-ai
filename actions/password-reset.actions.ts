"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export interface PasswordResetActionResult {
  success: boolean;
  message: string;
  resetUrl?: string;
}

const RESET_TOKEN_EXPIRES_MINUTES = 30;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function shouldExposeResetLink(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.BOOKVERSE_SHOW_RESET_LINK === "true";
}

async function getRequestMeta() {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "";
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "";
    const requestedIp = forwardedFor.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;

    return {
      origin: host ? `${protocol}://${host}` : "",
      requestedIp,
    };
  } catch {
    return {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      requestedIp: null,
    };
  }
}

export async function requestPasswordReset(email: string): Promise<PasswordResetActionResult> {
  const cleanEmail = normalizeEmail(email);
  const genericMessage =
    "Nếu email tồn tại trong hệ thống, BookVerse đã tạo một liên kết đặt lại mật khẩu có hiệu lực trong 30 phút.";

  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      message: "Vui lòng nhập email hợp lệ.",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: cleanEmail,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user?.email) {
      return {
        success: true,
        message: genericMessage,
      };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);
    const requestMeta = await getRequestMeta();
    const resetPath = `/reset-password?token=${encodeURIComponent(token)}`;
    const resetUrl = requestMeta.origin ? `${requestMeta.origin}${resetPath}` : resetPath;

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          requestedIp: requestMeta.requestedIp,
        },
      });
    });

    console.log(`[password-reset] ${cleanEmail}: ${resetUrl}`);

    return {
      success: true,
      message: genericMessage,
      resetUrl: shouldExposeResetLink() ? resetUrl : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[requestPasswordReset] ${message}`);

    return {
      success: false,
      message: "Không thể tạo yêu cầu đặt lại mật khẩu. Vui lòng thử lại.",
    };
  }
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<PasswordResetActionResult> {
  const cleanToken = token.trim();

  if (cleanToken.length < 32) {
    return {
      success: false,
      message: "Liên kết đặt lại mật khẩu không hợp lệ.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "Mật khẩu xác nhận không khớp.",
    };
  }

  try {
    const tokenHash = hashToken(cleanToken);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        userId: true,
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        message: "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: now,
        },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          id: {
            not: resetToken.id,
          },
          userId: resetToken.userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);

    return {
      success: true,
      message: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[resetPassword] ${message}`);

    return {
      success: false,
      message: "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
    };
  }
}
