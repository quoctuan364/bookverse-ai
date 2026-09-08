import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import sharp, { type Metadata } from "sharp";

import {
  COVER_POLICY,
  isAllowedFinalCoverUrl,
  isUsableCoverDimensions,
  isValidCoverImageBytes,
} from "@/lib/cover-policy";
import { loadAndValidateRealCatalog, validateOpenLibraryCoverUrl, type RealCatalogBook } from "@/lib/real-catalog";

type CoverAuditStatus =
  | "HTTP_VERIFIED"
  | "TIMEOUT"
  | "NOT_FOUND"
  | "REDIRECT_EXTERNAL"
  | "INVALID_CONTENT"
  | "INVALID_DIMENSION"
  | "NOT_VERIFIED";

type RedirectClassification = "NONE" | "ALLOWLISTED" | "EXTERNAL" | "CHAIN_LIMIT";

interface CoverAuditRow {
  policyVersion: number;
  provider: "OPEN_LIBRARY";
  catalogChecksum: string;
  bookId: string;
  coverId: number;
  originalUrl: string;
  originalHost: string | null;
  sourceUrl: string;
  rightsStatus: "NOT_VERIFIED";
  status: CoverAuditStatus;
  technicalStatus: CoverAuditStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  finalHost: string | null;
  redirectCount: number;
  redirectChain: string[];
  redirectClassification: RedirectClassification;
  contentType: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  attempts: number;
  timedOut: boolean;
  malformedUrl: boolean;
  duplicateCoverId: boolean;
  contentSha256: string | null;
  duplicateContentCount?: number;
  placeholderSuspected: boolean;
  fallbackReason: string | null;
  errorCode: string | null;
  checkedAt: string;
}

const root = process.cwd();
const sourcePath = path.join(root, "data", "real-catalog", "bookverse_real_catalog.json");
const outputDirectory = path.join(root, "outputs", "real-catalog-cover-audit");
// Policy thay đổi phải dùng state riêng; không được tái sử dụng redirect classification cũ.
const statePath = path.join(outputDirectory, "cover-audit-state-v2.jsonl");
const USER_AGENT = "BookVerse-Academic-Cover-Audit/1.2 (graduation-project; rate-limited)";
const MAX_CONCURRENCY = COVER_POLICY.maxConcurrency;
const MAX_RETRIES = COVER_POLICY.maxRetries;
const POLICY_VERSION = 5 as const;

function readNumberArgument(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`INVALID_ARGUMENT:${name}`);
  return parsed;
}

function csv(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function readResumeState(catalogChecksum: string): Map<string, CoverAuditRow> {
  const rows = new Map<string, CoverAuditRow>();
  if (!fs.existsSync(statePath)) return rows;
  for (const line of fs.readFileSync(statePath, "utf8").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as CoverAuditRow;
    if (row.policyVersion === POLICY_VERSION && row.catalogChecksum === catalogChecksum && row.bookId) rows.set(row.bookId, row);
  }
  return rows;
}

function appendState(row: CoverAuditRow): void {
  fs.appendFileSync(statePath, `${JSON.stringify(row)}\n`, "utf8");
}

async function readResponseBuffer(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > COVER_POLICY.maxImageBytes) throw new Error("IMAGE_TOO_LARGE");
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > COVER_POLICY.maxImageBytes) throw new Error("IMAGE_TOO_LARGE");
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

function shouldRetry(status: number | null, timedOut: boolean, networkError = false): boolean {
  return timedOut || networkError || status === 429 || (status !== null && status >= 500);
}

function isTransientResult(row?: CoverAuditRow): boolean {
  if (!row) return true;
  return row.status === "TIMEOUT" || row.status === "NOT_VERIFIED" || (row.status === "INVALID_CONTENT" && row.httpStatus === null && row.bytes === null);
}

function withStatus(row: CoverAuditRow, status: CoverAuditStatus, fallbackReason: string | null): CoverAuditRow {
  return { ...row, status, technicalStatus: status, fallbackReason };
}

function groupedCount(rows: CoverAuditRow[], selector: (row: CoverAuditRow) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = selector(row) || "[NULL]";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

async function main(): Promise<void> {
  const timeoutMs = readNumberArgument("timeout-ms", 15_000);
  const delayMs = Math.max(readNumberArgument("delay-ms", 350), 250);
  const limit = readNumberArgument("limit", Number.MAX_SAFE_INTEGER);
  const validation = loadAndValidateRealCatalog(sourcePath);
  if (!validation.catalog) throw new Error("FAILED_CATALOG_VALIDATION");
  fs.mkdirSync(outputDirectory, { recursive: true });

  const coverIdCounts = new Map<number, number>();
  for (const book of validation.catalog.books) coverIdCounts.set(book.coverId, (coverIdCounts.get(book.coverId) ?? 0) + 1);
  const completed = readResumeState(validation.summary.catalogChecksum);
  const pending = validation.catalog.books.filter((book) => isTransientResult(completed.get(book.id))).slice(0, limit);
  let nextRequestAt = 0;
  let throttleChain = Promise.resolve();

  async function throttle(): Promise<void> {
    let release!: () => void;
    const previous = throttleChain;
    throttleChain = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + delayMs;
    release();
  }

  async function inspect(book: RealCatalogBook): Promise<CoverAuditRow> {
    const base: CoverAuditRow = {
      policyVersion: POLICY_VERSION,
      provider: "OPEN_LIBRARY",
      catalogChecksum: validation.summary.catalogChecksum,
      bookId: book.id,
      coverId: book.coverId,
      originalUrl: book.coverUrl,
      originalHost: hostOf(book.coverUrl),
      sourceUrl: book.coverUrl,
      rightsStatus: "NOT_VERIFIED",
      status: "NOT_VERIFIED",
      technicalStatus: "NOT_VERIFIED",
      httpStatus: null,
      finalUrl: null,
      finalHost: null,
      redirectCount: 0,
      redirectChain: [book.coverUrl],
      redirectClassification: "NONE",
      contentType: null,
      bytes: null,
      width: null,
      height: null,
      aspectRatio: null,
      attempts: 0,
      timedOut: false,
      malformedUrl: !validateOpenLibraryCoverUrl(book.coverUrl),
      duplicateCoverId: (coverIdCounts.get(book.coverId) ?? 0) > 1,
      contentSha256: null,
      placeholderSuspected: false,
      fallbackReason: null,
      errorCode: null,
      checkedAt: new Date().toISOString(),
    };
    if (base.malformedUrl) return withStatus({ ...base, errorCode: "MALFORMED_OR_NON_ALLOWLIST_URL" }, "NOT_VERIFIED", "MALFORMED_OR_NON_ALLOWLIST_URL");

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
      await throttle();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort("TIMEOUT"), timeoutMs);
      let response: Response | null = null;
      let currentUrl = book.coverUrl;
      const redirectChain = [book.coverUrl];
      let redirectClassification: RedirectClassification = "NONE";
      try {
        for (let redirectIndex = 0; redirectIndex <= COVER_POLICY.maxRedirects; redirectIndex += 1) {
          response = await fetch(currentUrl, {
            headers: { Accept: "image/*", "User-Agent": USER_AGENT },
            redirect: "manual",
            signal: controller.signal,
          });
          const location = response.headers.get("location");
          if (response.status >= 300 && response.status < 400 && location) {
            const nextUrl = new URL(location, currentUrl).toString();
            redirectChain.push(nextUrl);
            await response.body?.cancel();
            // Chỉ tiếp tục tới storage host đã được allowlist; rights vẫn tách riêng
            // và không được suy ra từ việc tải ảnh thành công.
            if (!isAllowedFinalCoverUrl(nextUrl)) {
              return withStatus({ ...base, attempts: attempt, httpStatus: response.status, finalUrl: nextUrl, finalHost: hostOf(nextUrl), redirectCount: redirectChain.length - 1, redirectChain, redirectClassification: "EXTERNAL", errorCode: "REDIRECT_FINAL_HOST_NOT_ALLOWLISTED", checkedAt: new Date().toISOString() }, "REDIRECT_EXTERNAL", "REDIRECT_FINAL_HOST_NOT_ALLOWLISTED");
            }
            if (redirectIndex >= COVER_POLICY.maxRedirects) {
              return withStatus({ ...base, attempts: attempt, httpStatus: response.status, finalUrl: nextUrl, finalHost: hostOf(nextUrl), redirectCount: redirectChain.length - 1, redirectChain, redirectClassification: "CHAIN_LIMIT", errorCode: "REDIRECT_CHAIN_LIMIT", checkedAt: new Date().toISOString() }, "INVALID_CONTENT", "REDIRECT_CHAIN_LIMIT");
            }
            redirectClassification = "ALLOWLISTED";
            currentUrl = nextUrl;
            continue;
          }

          const contentType = response.headers.get("content-type");
          const common = {
            ...base,
            attempts: attempt,
            checkedAt: new Date().toISOString(),
            httpStatus: response.status,
            finalUrl: currentUrl,
            finalHost: hostOf(currentUrl),
            redirectCount: redirectChain.length - 1,
            redirectChain,
            redirectClassification,
            contentType,
          };
          if (response.status === 404 || response.status === 410) return withStatus({ ...common, errorCode: `HTTP_${response.status}` }, "NOT_FOUND", `HTTP_${response.status}`);
          if (!response.ok) {
            if (attempt <= MAX_RETRIES && shouldRetry(response.status, false)) break;
            return withStatus({ ...common, errorCode: `HTTP_${response.status}` }, "NOT_VERIFIED", `HTTP_${response.status}`);
          }
          if (!isAllowedFinalCoverUrl(currentUrl) || !contentType?.toLowerCase().startsWith("image/")) return withStatus({ ...common, errorCode: "FINAL_HOST_OR_CONTENT_TYPE_NOT_ALLOWLISTED" }, "INVALID_CONTENT", "FINAL_HOST_OR_CONTENT_TYPE_NOT_ALLOWLISTED");

          const buffer = await readResponseBuffer(response);
          const contentSha256 = createHash("sha256").update(buffer).digest("hex");
          if (!isValidCoverImageBytes(buffer.length)) return withStatus({ ...common, bytes: buffer.length, contentSha256, placeholderSuspected: true, errorCode: "IMAGE_TOO_SMALL" }, "INVALID_CONTENT", "IMAGE_TOO_SMALL");
          let metadata: Metadata;
          try {
            metadata = await sharp(buffer, { failOn: "error" }).metadata();
          } catch {
            return withStatus({ ...common, bytes: buffer.length, contentSha256, errorCode: "IMAGE_DECODE_FAILED" }, "INVALID_CONTENT", "IMAGE_DECODE_FAILED");
          }
          const width = metadata.width ?? null;
          const height = metadata.height ?? null;
          const aspectRatio = width && height ? Number((width / height).toFixed(6)) : null;
          if (!width || !height || !isUsableCoverDimensions(width, height)) return withStatus({ ...common, bytes: buffer.length, width, height, aspectRatio, contentSha256, errorCode: "DIMENSION_OR_RATIO_OUT_OF_RANGE" }, "INVALID_DIMENSION", "DIMENSION_OR_RATIO_OUT_OF_RANGE");
          return withStatus({ ...common, bytes: buffer.length, width, height, aspectRatio, contentSha256, errorCode: null }, "HTTP_VERIFIED", null);
        }
        continue;
      } catch (error: unknown) {
        const timedOut = controller.signal.aborted || (error instanceof Error && error.name === "TimeoutError");
        if (attempt <= MAX_RETRIES && shouldRetry(response?.status ?? null, timedOut, response === null)) {
          await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
          continue;
        }
        const reason = timedOut ? "REQUEST_TIMEOUT" : error instanceof Error ? error.message : "UNKNOWN_ERROR";
        return withStatus({ ...base, attempts: attempt, timedOut, finalUrl: currentUrl, finalHost: hostOf(currentUrl), redirectCount: redirectChain.length - 1, redirectChain, errorCode: reason, checkedAt: new Date().toISOString() }, timedOut ? "TIMEOUT" : "INVALID_CONTENT", reason);
      } finally {
        clearTimeout(timer);
      }
    }
    return withStatus({ ...base, attempts: MAX_RETRIES + 1, errorCode: "RETRY_EXHAUSTED" }, "NOT_VERIFIED", "RETRY_EXHAUSTED");
  }

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < pending.length) {
      const current = pending[cursor];
      cursor += 1;
      const row = await inspect(current);
      completed.set(row.bookId, row);
      appendState(row);
      if (completed.size % 100 === 0 || completed.size === validation.catalog!.books.length) console.log(`[cover-audit] ${completed.size}/${validation.catalog!.books.length}`);
    }
  }
  await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()));

  const rows = validation.catalog.books.map((book) => completed.get(book.id) ?? {
    policyVersion: POLICY_VERSION,
    provider: "OPEN_LIBRARY" as const,
    catalogChecksum: validation.summary.catalogChecksum,
    bookId: book.id,
    coverId: book.coverId,
    originalUrl: book.coverUrl,
    originalHost: hostOf(book.coverUrl),
    sourceUrl: book.coverUrl,
    rightsStatus: "NOT_VERIFIED" as const,
    status: "NOT_VERIFIED" as const,
    technicalStatus: "NOT_VERIFIED" as const,
    httpStatus: null,
    finalUrl: null,
    finalHost: null,
    redirectCount: 0,
    redirectChain: [book.coverUrl],
    redirectClassification: "NONE" as const,
    contentType: null,
    bytes: null,
    width: null,
    height: null,
    aspectRatio: null,
    attempts: 0,
    timedOut: false,
    malformedUrl: !validateOpenLibraryCoverUrl(book.coverUrl),
    duplicateCoverId: (coverIdCounts.get(book.coverId) ?? 0) > 1,
    contentSha256: null,
    placeholderSuspected: false,
    fallbackReason: "NOT_RUN",
    errorCode: "NOT_RUN",
    checkedAt: new Date().toISOString(),
  });

  const hashCounts = new Map<string, number>();
  for (const row of rows) if (row.contentSha256) hashCounts.set(row.contentSha256, (hashCounts.get(row.contentSha256) ?? 0) + 1);
  for (const row of rows) {
    row.duplicateContentCount = row.contentSha256 ? hashCounts.get(row.contentSha256) ?? 1 : 0;
    if ((row.duplicateContentCount ?? 0) >= 3) {
      row.placeholderSuspected = true;
      row.fallbackReason ??= "DUPLICATE_CONTENT_SUSPECTED";
    }
  }

  const statuses: CoverAuditStatus[] = ["HTTP_VERIFIED", "TIMEOUT", "NOT_FOUND", "REDIRECT_EXTERNAL", "INVALID_CONTENT", "INVALID_DIMENSION", "NOT_VERIFIED"];
  const statusCounts = Object.fromEntries(statuses.map((status) => [status, rows.filter((row) => row.status === status).length]));
  const report = {
    status: rows.every((row) => row.status === "HTTP_VERIFIED") ? "VERIFIED" : rows.some((row) => row.status === "HTTP_VERIFIED") ? "PARTIAL" : "FAILED",
    checkedAt: new Date().toISOString(),
    catalogChecksum: validation.summary.catalogChecksum,
    policy: { ...COVER_POLICY, concurrency: MAX_CONCURRENCY, delayMs, timeoutMs, userAgent: USER_AGENT, binaryFilesPersisted: 0 },
    rightsStatus: "NOT_VERIFIED",
    total: rows.length,
    audited: rows.filter((row) => row.errorCode !== "NOT_RUN").length,
    statusCounts,
    groups: {
      originalHost: groupedCount(rows, (row) => row.originalHost ?? ""),
      finalHost: groupedCount(rows, (row) => row.finalHost ?? ""),
      technicalStatus: groupedCount(rows, (row) => row.technicalStatus),
      httpStatus: groupedCount(rows, (row) => row.httpStatus === null ? "" : String(row.httpStatus)),
      redirectCount: groupedCount(rows, (row) => String(row.redirectCount)),
      redirectClassification: groupedCount(rows, (row) => row.redirectClassification),
      fallbackReason: groupedCount(rows, (row) => row.fallbackReason ?? ""),
    },
    malformedUrl: rows.filter((row) => row.malformedUrl).length,
    duplicateCoverId: rows.filter((row) => row.duplicateCoverId).length,
    placeholderSuspected: rows.filter((row) => row.placeholderSuspected).length,
    rows,
  };
  const id = report.checkedAt.replace(/[:.]/gu, "-");
  const jsonPath = path.join(outputDirectory, `cover-audit-${id}.json`);
  const csvPath = path.join(outputDirectory, `cover-audit-${id}.csv`);
  const markdownPath = path.join(outputDirectory, `cover-audit-${id}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const headers: Array<keyof CoverAuditRow> = ["provider", "bookId", "coverId", "originalUrl", "originalHost", "sourceUrl", "rightsStatus", "status", "technicalStatus", "httpStatus", "finalUrl", "finalHost", "redirectCount", "redirectChain", "redirectClassification", "contentType", "bytes", "width", "height", "aspectRatio", "attempts", "timedOut", "malformedUrl", "duplicateCoverId", "duplicateContentCount", "placeholderSuspected", "fallbackReason", "errorCode", "checkedAt"];
  fs.writeFileSync(csvPath, `${[headers.map(csv).join(","), ...rows.map((row) => headers.map((key) => csv(Array.isArray(row[key]) ? row[key].join(" -> ") : row[key])).join(","))].join("\n")}\n`, { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(markdownPath, `# Audit HTTP cover G2.2\n\n- Trạng thái: **${report.status}**.\n- Tổng: ${report.total}; đã audit: ${report.audited}.\n- Phân loại kỹ thuật: ${JSON.stringify(statusCounts)}.\n- Policy dùng chung: config/cover-policy.json; redirect tối đa: ${COVER_POLICY.maxRedirects}.\n- Concurrency: ${MAX_CONCURRENCY}; delay: ${delayMs} ms; timeout: ${timeoutMs} ms; retry tối đa: ${MAX_RETRIES}.\n- Binary cover lưu xuống đĩa: **0**.\n- Quyền ảnh: **NOT_VERIFIED**; HTTP 200 không phải bằng chứng giấy phép.\n- JSON: ${path.basename(jsonPath)}.\n- CSV: ${path.basename(csvPath)}.\n`, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({ status: report.status, total: report.total, audited: report.audited, statusCounts, groups: report.groups, malformedUrl: report.malformedUrl, duplicateCoverId: report.duplicateCoverId, placeholderSuspected: report.placeholderSuspected, rightsStatus: report.rightsStatus, jsonPath, csvPath, markdownPath }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
