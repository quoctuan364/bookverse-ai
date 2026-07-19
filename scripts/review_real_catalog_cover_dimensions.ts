import fs from "node:fs";
import path from "node:path";

import { classifyCoverDimension } from "@/lib/cover-policy";
import { loadAndValidateRealCatalog } from "@/lib/real-catalog";

const root = process.cwd();
const catalogPath = path.join(root, "data", "real-catalog", "bookverse_real_catalog.json");
const auditDirectory = path.join(root, "outputs", "real-catalog-cover-audit");
const latestAuditPath = fs.readdirSync(auditDirectory)
  .filter((file) => /^cover-audit-.*\.json$/u.test(file))
  .sort()
  .map((file) => path.join(auditDirectory, file))
  .at(-1);

if (!latestAuditPath) throw new Error("COVER_AUDIT_REPORT_NOT_FOUND");

const audit = JSON.parse(fs.readFileSync(latestAuditPath, "utf8")) as {
  policy: { schemaVersion: number };
  rows: Array<{
    bookId: string;
    coverId: number;
    status: string;
    httpStatus: number | null;
    bytes: number | null;
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
    placeholderSuspected: boolean;
    errorCode: string | null;
    fallbackReason: string | null;
  }>;
};
if (audit.policy.schemaVersion !== 1) throw new Error("COVER_POLICY_VERSION_UNSUPPORTED");

const validation = loadAndValidateRealCatalog(catalogPath);
if (!validation.catalog) throw new Error("FAILED_CATALOG_VALIDATION");
const bookById = new Map(validation.catalog.books.map((book) => [book.id, book]));
const rows = audit.rows
  .filter((row) => row.status === "INVALID_DIMENSION")
  .map((row) => {
    const book = bookById.get(row.bookId);
    const classification = classifyCoverDimension(row);
    return {
      bookId: row.bookId,
      title: book?.title ?? "NOT_AVAILABLE",
      author: validation.catalog!.bookAuthors
        .filter((relation) => relation.bookId === row.bookId)
        .map((relation) => validation.catalog!.authors.find((author) => author.id === relation.authorId)?.name ?? "NOT_AVAILABLE")
        .join(", "),
      sourceCategory: book?.primaryCategoryName ?? "NOT_AVAILABLE",
      subjects: book?.subjects ?? [],
      coverId: row.coverId,
      technicalStatus: row.status,
      classification,
      httpStatus: row.httpStatus,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
      aspectRatio: row.aspectRatio,
      placeholderSuspected: row.placeholderSuspected,
      errorCode: row.errorCode,
      fallbackReason: row.fallbackReason ?? classification,
      decision: classification === "VALID_NON_STANDARD_BOOK_RATIO"
        ? "REMOTE_ACCEPTED_WITH_CONTAIN"
        : "BOOKCOVER_FALLBACK",
    };
  });

const counts = Object.fromEntries([...new Set(rows.map((row) => row.classification))].sort().map((key) => [key, rows.filter((row) => row.classification === key).length]));
const report = {
  status: rows.length === 24 && rows.every((row) => row.classification !== "NOT_VERIFIED") ? "VERIFIED" : "PARTIAL",
  checkedAt: new Date().toISOString(),
  sourceAudit: path.basename(latestAuditPath),
  totalAnomaliesReviewed: rows.length,
  counts,
  rows,
};
const stamp = report.checkedAt.replace(/[:.]/gu, "-");
const jsonPath = path.join(auditDirectory, `dimension-review-${stamp}.json`);
const markdownPath = path.join(auditDirectory, `dimension-review-${stamp}.md`);
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
const markdown = [
  "# Review 24 cover bất thường G2.2",
  "",
  `- Trạng thái: **${report.status}**.`,
  `- Số record đã review: **${report.totalAnomaliesReviewed}**.`,
  `- Phân loại: ${JSON.stringify(counts)}.`,
  "- `rightsStatus`: `NOT_VERIFIED`; review kỹ thuật không chứng minh bản quyền.",
  "",
  "| Book | Title | Classification | Size | Ratio | Decision |",
  "|---|---|---|---:|---:|---|",
  ...rows.map((row) => `| ${row.bookId} | ${row.title.replaceAll("|", "\\|")} | ${row.classification} | ${row.width ?? "-"}×${row.height ?? "-"} | ${row.aspectRatio ?? "-"} | ${row.decision} |`),
  "",
].join("\n");
fs.writeFileSync(markdownPath, markdown, { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({ status: report.status, totalAnomaliesReviewed: report.totalAnomaliesReviewed, counts, jsonPath, markdownPath }, null, 2));
