import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  classifyBookCoverSource,
  isLegacySyntheticCover,
  normalizeBookCoverUrl,
  type BookCoverAuditStatus,
} from "@/lib/book-cover";

interface Dataset {
  meta: { note: string };
  books: Array<{ id: number; cover_url: string | null }>;
}

interface ApprovedSourceManifest {
  covers: Array<{ bookId: string; url: string; licenseReference: string }>;
}

interface AuditRow {
  bookId: string;
  source: string | null;
  sourceType: "EMPTY" | "LOCAL" | "REMOTE" | "INVALID" | "LEGACY_SYNTHETIC";
  status: BookCoverAuditStatus;
  gitTracked: boolean | null;
}

const root = process.cwd();
const publicRoot = path.resolve(root, "public");
const datasetPath = path.join(root, "data", "json", "bookverse_ultra_seed_2200.json");
const manifestPath = path.join(root, "config", "real-cover-sources.json");
const outputPath = path.join(root, "docs", "COVER_AUDIT_DATASET.json");
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as Dataset;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ApprovedSourceManifest;
const approvedUrls = new Set(
  manifest.covers
    .filter((item) => item.licenseReference.trim().length > 0)
    .map((item) => item.url.trim()),
);
const trackedFiles = new Set(
  execFileSync("git", ["ls-files", "-z", "--", "public/covers"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map((item) => item.replaceAll("\\", "/")),
);

async function auditRemote(url: string): Promise<BookCoverAuditStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "BookVerse-Cover-Audit/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.status === 404) return "HTTP_404";
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
      return "LOAD_FAILED";
    }
    return approvedUrls.has(url) ? "REAL_VALID" : "NOT_VERIFIED";
  } catch {
    return "LOAD_FAILED";
  } finally {
    clearTimeout(timeout);
  }
}

async function auditRow(book: Dataset["books"][number]): Promise<AuditRow> {
  const bookId = `B${String(book.id).padStart(4, "0")}`;
  const sourceKind = classifyBookCoverSource(book.cover_url);
  const normalized = normalizeBookCoverUrl(book.cover_url);
  if (sourceKind === "EMPTY") {
    return { bookId, source: book.cover_url, sourceType: "EMPTY", status: "MISSING", gitTracked: null };
  }
  if (sourceKind === "INVALID" || !normalized) {
    return { bookId, source: book.cover_url, sourceType: "INVALID", status: "MALFORMED", gitTracked: null };
  }
  if (sourceKind === "REMOTE") {
    return {
      bookId,
      source: normalized,
      sourceType: isLegacySyntheticCover(normalized) ? "LEGACY_SYNTHETIC" : "REMOTE",
      status: await auditRemote(normalized),
      gitTracked: null,
    };
  }

  const relative = normalized.replace(/^\//, "");
  const absolute = path.resolve(publicRoot, relative);
  const withinPublic = absolute === publicRoot || absolute.startsWith(`${publicRoot}${path.sep}`);
  const exists = withinPublic && fs.existsSync(absolute) && fs.statSync(absolute).isFile();
  const gitTracked = trackedFiles.has(`public/${relative}`);
  return {
    bookId,
    source: normalized,
    sourceType: isLegacySyntheticCover(normalized) ? "LEGACY_SYNTHETIC" : "LOCAL",
    status: exists ? (isLegacySyntheticCover(normalized) ? "NOT_VERIFIED" : "LOCAL_VALID") : "LOAD_FAILED",
    gitTracked,
  };
}

const countBy = <T extends string>(values: T[]) =>
  Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));

async function main() {
  const rows: AuditRow[] = [];
  for (const book of dataset.books) {
    rows.push(await auditRow(book));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dataLabel: "SYNTHETIC_DATA",
    source: path.relative(root, datasetPath).replaceAll("\\", "/"),
    sourceNote: dataset.meta.note,
    scope: "Dataset JSON read-only; không phải trạng thái database demo",
    recordCount: rows.length,
    statusCounts: countBy(rows.map((row) => row.status)),
    sourceTypeCounts: countBy(rows.map((row) => row.sourceType)),
    localFileCounts: {
      gitTracked: rows.filter((row) => row.gitTracked === true).length,
      presentButUntracked: rows.filter((row) => row.gitTracked === false && row.status !== "LOAD_FAILED").length,
      missing: rows.filter((row) => row.sourceType !== "REMOTE" && row.status === "LOAD_FAILED").length,
    },
    remoteHttpCounts: {
      checked: rows.filter((row) => row.sourceType === "REMOTE").length,
      http404: rows.filter((row) => row.status === "HTTP_404").length,
      loadFailed: rows.filter((row) => row.sourceType === "REMOTE" && row.status === "LOAD_FAILED").length,
    },
    approvedRealCoverCount: manifest.covers.length,
    samples: Object.fromEntries(
      [...new Set(rows.map((row) => row.status))].map((status) => [
        status,
        rows.filter((row) => row.status === status).slice(0, 5),
      ]),
    ),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
