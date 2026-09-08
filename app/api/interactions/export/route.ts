/**
 * GET /api/interactions/export — Export dữ liệu ẩn danh phục vụ benchmark
 * Yêu cầu quyền ADMIN.
 *
 * Dữ liệu được ẩn danh hóa: thay userId bằng hash một chiều, không kèm email.
 * Format: JSON (mặc định) hoặc CSV (query ?format=csv)
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { CURRENT_CONSENT_VERSION } from "@/lib/research-interactions";

const SALT = process.env.INTERACTION_EXPORT_SALT ?? "bookverse-research-2026";

function anonymizeUserId(userId: string | null): string | null {
  if (!userId) return null;
  // Hash một chiều SHA-256 với salt — không thể khôi phục userId gốc
  return createHash("sha256")
    .update(`${SALT}:${userId}`)
    .digest("hex")
    .slice(0, 16);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h];
          if (value === null || value === undefined) return "";
          const str = String(value).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Chỉ admin mới có thể export dữ liệu." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "10000"), 50000);

    // Chỉ export dữ liệu từ user đã consent
    const records = await prisma.userInteractionLog.findMany({
      where: { consentVersion: CURRENT_CONSENT_VERSION },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        anonymousId: true,
        bookId: true,
        eventType: true,
        eventValue: true,
        sourcePage: true,
        recommendationRequestId: true,
        recommendationModel: true,
        position: true,
        consentVersion: true,
        createdAt: true,
        // Không export metadata vì có thể chứa thông tin nhạy cảm
      },
    });

    // Ẩn danh hóa — thay userId bằng hash
    const anonymized = records.map((row) => ({
      id: row.id,
      // userId được hash không thể reverse
      anonymizedUserId: anonymizeUserId(row.userId),
      // anonymousId giữ nguyên (đã là ẩn danh)
      anonymousId: row.anonymousId ?? null,
      bookId: row.bookId ?? null,
      eventType: row.eventType,
      eventValue: row.eventValue ?? null,
      sourcePage: row.sourcePage ?? null,
      recommendationRequestId: row.recommendationRequestId ?? null,
      recommendationModel: row.recommendationModel ?? null,
      position: row.position ?? null,
      consentVersion: row.consentVersion,
      // Timestamp giữ nguyên phục vụ temporal analysis
      createdAt: row.createdAt.toISOString(),
      // Nhãn nguồn dữ liệu để phân biệt khi benchmark
      dataLabel: "REAL_USER_DATA",
    }));

    const exportMeta = {
      exportedAt: new Date().toISOString(),
      exportedBy: "ADMIN_ANONYMIZED",
      consentVersion: CURRENT_CONSENT_VERSION,
      totalRecords: anonymized.length,
      dataLabel: "REAL_USER_DATA",
      note: "userId đã được hash SHA-256 một chiều, không thể khôi phục.",
    };

    if (format === "csv") {
      const csv = toCSV(anonymized);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="interactions_anonymized_${Date.now()}.csv"`,
          "X-Export-Total": String(anonymized.length),
          "X-Data-Label": "REAL_USER_DATA",
        },
      });
    }

    return NextResponse.json({
      meta: exportMeta,
      data: anonymized,
    });
  } catch {
    console.error("[api/interactions/export] GET failed");
    return NextResponse.json(
      { error: "Không thể export dữ liệu." },
      { status: 500 },
    );
  }
}