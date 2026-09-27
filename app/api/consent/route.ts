/**
 * API Consent — Quản lý trạng thái đồng ý tham gia nghiên cứu
 * GET  /api/consent — Lấy trạng thái consent hiện tại
 * POST /api/consent — Đặt hoặc cập nhật consent
 *
 * Chỉ ghi userId nội bộ, không lưu email hay thông tin nhạy cảm.
 */
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { CURRENT_CONSENT_VERSION } from "@/lib/research-interactions";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { consented: null, reason: "NOT_AUTHENTICATED" },
        { status: 200 },
      );
    }

    const record = await prisma.userResearchConsent.findUnique({
      where: {
        userId_consentVersion: {
          userId: currentUser.id,
          consentVersion: CURRENT_CONSENT_VERSION,
        },
      },
      select: {
        consented: true,
        consentedAt: true,
        revokedAt: true,
        consentVersion: true,
      },
    });

    return NextResponse.json({
      consented: record?.consented ?? null,
      consentVersion: record?.consentVersion ?? CURRENT_CONSENT_VERSION,
      consentedAt: record?.consentedAt?.toISOString() ?? null,
      revokedAt: record?.revokedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy trạng thái consent." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để đặt consent." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("consented" in body)) {
      return NextResponse.json(
        { error: "Thiếu trường consented (boolean)." },
        { status: 400 },
      );
    }

    const { consented } = body as { consented: unknown };
    if (typeof consented !== "boolean") {
      return NextResponse.json(
        { error: "Trường consented phải là boolean." },
        { status: 400 },
      );
    }

    const now = new Date();

    // Upsert để an toàn, không ghi trùng
    await prisma.userResearchConsent.upsert({
      where: {
        userId_consentVersion: {
          userId: currentUser.id,
          consentVersion: CURRENT_CONSENT_VERSION,
        },
      },
      update: {
        consented,
        consentedAt: consented ? now : undefined,
        revokedAt: consented ? null : now,
        updatedAt: now,
        // Không lưu metadata có PII; dùng Prisma.JsonNull để clear field
        metadata: Prisma.JsonNull,
      },
      create: {
        userId: currentUser.id,
        consentVersion: CURRENT_CONSENT_VERSION,
        consented,
        consentedAt: now,
        revokedAt: consented ? null : now,
        // Không lưu IP, email hay thông tin nhạy cảm
        metadata: Prisma.JsonNull,
      },
    });

    return NextResponse.json({
      success: true,
      consented,
      consentVersion: CURRENT_CONSENT_VERSION,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lưu consent." },
      { status: 500 },
    );
  }
}