import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertSafeDatabase } from "@/lib/database-safety";
import {
  MODELING_READINESS_THRESHOLDS,
  assessRecommendationDataReadiness,
  type RecommendationDataCounts,
} from "@/lib/recommendation-data-readiness";
import prisma from "@/lib/prisma";

type CountRow = { count: bigint };
type ColumnRow = { column_name: string };

const EVENT_CAPABILITIES = [
  ["recommendation impression", "IMPLEMENTED", "Viewport 50% liên tục 1 giây; cần pilot consented để dùng modeling"],
  ["recommendation click", "IMPLEMENTED", "Ownership và request item được xác minh phía server"],
  ["xem chi tiết sách", "IMPLEMENTED", "BOOK_VIEW cho user đăng nhập"],
  ["tìm kiếm", "PARTIAL", "Có taxonomy/schema nhưng chưa có production caller chuyên biệt"],
  ["wishlist/favorite", "IMPLEMENTED", "FAVORITE_ADD/FAVORITE_REMOVE"],
  ["thêm giỏ hàng", "IMPLEMENTED", "CART_ADD"],
  ["mua", "IMPLEMENTED", "OrderItem hợp lệ; trạng thái hủy/hoàn tiền bị loại"],
  ["bắt đầu đọc", "IMPLEMENTED", "READING_START"],
  ["tiến độ đọc", "IMPLEMENTED", "ReadingProgress và ReadingSession"],
  ["hoàn thành chương/sách", "PARTIAL", "Suy từ ReadingSession; chưa có chapter-complete canonical event riêng"],
  ["rating", "IMPLEMENTED", "REVIEW_CREATE có rating phía server"],
] as const;

function gitOutput(...args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function sourceManifestHash(): Promise<{ sha256: string; files: number }> {
  const listed = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: process.cwd() },
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  const digest = crypto.createHash("sha256");
  let files = 0;
  for (const relative of listed) {
    try {
      const content = await readFile(path.resolve(relative));
      digest.update(relative.replaceAll("\\", "/"));
      digest.update("\0");
      digest.update(content);
      digest.update("\0");
      files += 1;
    } catch {
      // File vừa bị xóa khỏi worktree không được tính vào manifest hiện hành.
    }
  }
  return { sha256: digest.digest("hex"), files };
}

function asNumber(row: CountRow | undefined): number {
  return Number(row?.count ?? BigInt(0));
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  const measured = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const columns = await tx.$queryRawUnsafe<ColumnRow[]>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'recommendation_requests',
          'recommendation_request_items',
          'recommendation_telemetry_events'
        )
    `);
    const columnNames = new Set(columns.map((row) => row.column_name));
    const schemaReady = [
      "collectionContext",
      "pilotId",
      "consentVersion",
      "experimentGroup",
      "sourceComponent",
      "deviceClass",
    ].every((column) => columnNames.has(column));

    const [users, books, legacyEvents, telemetry] = await Promise.all([
      tx.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*)::bigint AS count FROM "User"`),
      tx.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::bigint AS count
        FROM "Book"
        WHERE status = 'ACTIVE' AND "deletedAt" IS NULL
      `),
      tx.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*)::bigint AS count FROM interaction_events`),
      tx.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*)::bigint AS count FROM recommendation_telemetry_events`),
    ]);

    if (!schemaReady) {
      return {
        schemaReady,
        totalUsers: asNumber(users[0]),
        activeBooks: asNumber(books[0]),
        legacyEvents: asNumber(legacyEvents[0]),
        telemetryEvents: asNumber(telemetry[0]),
        counts: {
          consentedUsers: 0,
          exposedBooks: 0,
          verifiedEvents: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          usersWithThreeEvents: 0,
          usersWithFiveEvents: 0,
          usersWithTenEvents: 0,
          collectionDays: 0,
        } satisfies RecommendationDataCounts,
        eligibleEventIds: [] as string[],
      };
    }

    const [summary] = await tx.$queryRawUnsafe<
      Array<{
        users: bigint;
        books: bigint;
        events: bigint;
        impressions: bigint;
        clicks: bigint;
        conversions: bigint;
        minimum: Date | null;
        maximum: Date | null;
      }>
    >(`
      SELECT
        COUNT(DISTINCT request."userId")::bigint AS users,
        COUNT(DISTINCT item."bookId")::bigint AS books,
        COUNT(DISTINCT event.id)::bigint AS events,
        COUNT(DISTINCT event.id) FILTER (WHERE event.type = 'IMPRESSION')::bigint AS impressions,
        COUNT(DISTINCT event.id) FILTER (WHERE event.type = 'CLICK')::bigint AS clicks,
        COUNT(DISTINCT event.id) FILTER (WHERE event.type = 'CONVERSION')::bigint AS conversions,
        MIN(event."occurredAt") AS minimum,
        MAX(event."occurredAt") AS maximum
      FROM recommendation_requests request
      LEFT JOIN recommendation_request_items item ON item."requestId" = request.id
      LEFT JOIN recommendation_telemetry_events event ON event."requestId" = request.id
      WHERE request."collectionContext" = 'PILOT_CONSENTED'
        AND request."pilotId" IS NOT NULL
        AND request."consentVersion" IS NOT NULL
    `);
    const thresholds = await tx.$queryRawUnsafe<
      Array<{ ge3: bigint; ge5: bigint; ge10: bigint }>
    >(`
      WITH per_user AS (
        SELECT request."userId", COUNT(DISTINCT event.id) AS n
        FROM recommendation_requests request
        JOIN recommendation_telemetry_events event ON event."requestId" = request.id
        WHERE request."collectionContext" = 'PILOT_CONSENTED'
          AND request."pilotId" IS NOT NULL
          AND request."consentVersion" IS NOT NULL
        GROUP BY request."userId"
      )
      SELECT
        COUNT(*) FILTER (WHERE n >= 3)::bigint AS ge3,
        COUNT(*) FILTER (WHERE n >= 5)::bigint AS ge5,
        COUNT(*) FILTER (WHERE n >= 10)::bigint AS ge10
      FROM per_user
    `);
    const ids = await tx.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT event.id
      FROM recommendation_telemetry_events event
      JOIN recommendation_requests request ON request.id = event."requestId"
      WHERE request."collectionContext" = 'PILOT_CONSENTED'
        AND request."pilotId" IS NOT NULL
        AND request."consentVersion" IS NOT NULL
      ORDER BY event.id
    `);
    const minimum = summary?.minimum;
    const maximum = summary?.maximum;
    const collectionDays =
      minimum && maximum
        ? Math.max(
            1,
            Math.ceil(
              (maximum.getTime() - minimum.getTime()) / (24 * 60 * 60 * 1_000),
            ),
          )
        : 0;
    return {
      schemaReady,
      totalUsers: asNumber(users[0]),
      activeBooks: asNumber(books[0]),
      legacyEvents: asNumber(legacyEvents[0]),
      telemetryEvents: asNumber(telemetry[0]),
      counts: {
        consentedUsers: Number(summary?.users ?? BigInt(0)),
        exposedBooks: Number(summary?.books ?? BigInt(0)),
        verifiedEvents: Number(summary?.events ?? BigInt(0)),
        impressions: Number(summary?.impressions ?? BigInt(0)),
        clicks: Number(summary?.clicks ?? BigInt(0)),
        conversions: Number(summary?.conversions ?? BigInt(0)),
        usersWithThreeEvents: Number(thresholds[0]?.ge3 ?? BigInt(0)),
        usersWithFiveEvents: Number(thresholds[0]?.ge5 ?? BigInt(0)),
        usersWithTenEvents: Number(thresholds[0]?.ge10 ?? BigInt(0)),
        collectionDays,
      } satisfies RecommendationDataCounts,
      eligibleEventIds: ids.map((row) => row.id),
    };
  });

  const decision = assessRecommendationDataReadiness(measured.counts);
  const source = await sourceManifestHash();
  const datasetHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(measured.eligibleEventIds))
    .digest("hex");
  const configHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ thresholds: MODELING_READINESS_THRESHOLDS, eventCapabilities: EVENT_CAPABILITIES }))
    .digest("hex");
  const report = {
    status: "PASS",
    mode: "READ_ONLY",
    database: target.databaseName,
    decision: decision.decision,
    operationalMinimumMet: decision.operationalMinimumMet,
    finalV2Eligible: decision.finalV2Eligible,
    statisticalPowerGuaranteed: decision.statisticalPowerGuaranteed,
    failedChecks: decision.failedChecks,
    migrationApplied: measured.schemaReady,
    inventory: {
      totalUsers: measured.totalUsers,
      activeBooks: measured.activeBooks,
      legacyInteractionEvents: measured.legacyEvents,
      telemetryEventsAllContexts: measured.telemetryEvents,
      verifiedRealData: measured.counts,
      matrixDensity:
        measured.counts.consentedUsers > 0 && measured.activeBooks > 0
          ? measured.counts.verifiedEvents /
            (measured.counts.consentedUsers * measured.activeBooks)
          : 0,
    },
    eventCapabilities: EVENT_CAPABILITIES.map(([event, status, evidence]) => ({
      event,
      status,
      evidence,
    })),
    thresholdClass: "OPERATIONAL_MINIMUM_DATA_READINESS_THRESHOLDS",
    thresholds: MODELING_READINESS_THRESHOLDS,
    provenance: {
      commit: gitOutput("rev-parse", "HEAD"),
      workingTreeDirty: Boolean(gitOutput("status", "--porcelain")),
      sourceManifestSha256: source.sha256,
      sourceFileCount: source.files,
      datasetSha256: datasetHash,
      configSha256: configHash,
    },
    limitations: [
      "Legacy Interaction/InteractionEvent không có consented pilot provenance nên không được tính là dữ liệu thật.",
      "Không tính request là impression và không suy click từ BOOK_VIEW.",
      "Readiness không đánh giá metric mô hình hoặc mở final_v2.",
      "Vượt ngưỡng vận hành không bảo đảm statistical power; phải đánh giá positive, exposure, cohort và CI trên temporal split.",
    ],
  };
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.resolve("outputs", "data-readiness", runId);
  await mkdir(directory, { recursive: true });
  const jsonPath = path.join(directory, "data-readiness.json");
  const markdownPath = path.join(directory, "data-readiness.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });
  const lines = [
    "# BookVerse Recommendation Data Readiness",
    "",
    `- Decision: **${report.decision}**`,
    `- Database: \`${report.database}\` (read-only)`,
    `- Migration instrumentation mới đã apply: \`${report.migrationApplied}\``,
    `- Verified user/event/impression/click/conversion: \`${measured.counts.consentedUsers}/${measured.counts.verifiedEvents}/${measured.counts.impressions}/${measured.counts.clicks}/${measured.counts.conversions}\``,
    `- Dataset SHA-256: \`${datasetHash}\``,
    `- Source SHA-256: \`${source.sha256}\``,
    `- Config SHA-256: \`${configHash}\``,
    "",
    "## Cổng dữ liệu chưa đạt",
    "",
    ...decision.failedChecks.map((check) => `- \`${check}\``),
    "",
    "Đây là operational minimum, không phải bảo đảm statistical power. Chỉ final_v2 locker mới kiểm tra chất lượng từng split.",
    "",
    "Không huấn luyện, không tune và không tạo final_v2 khi decision là BLOCKED_BY_DATA.",
  ];
  await writeFile(markdownPath, lines.join("\n") + "\n", {
    encoding: "utf8",
    flag: "wx",
  });
  console.log(
    JSON.stringify(
      {
        decision: report.decision,
        json: path.relative(process.cwd(), jsonPath),
        markdown: path.relative(process.cwd(), markdownPath),
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Data-readiness audit thất bại.";
  console.error(
    message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"),
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
