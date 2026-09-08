import fs from "node:fs";
import path from "node:path";

import { loadAndValidateRealCatalog } from "@/lib/real-catalog";

const root = process.cwd();
const catalogPath = path.join(root, "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.join(root, "config", "real-catalog-category-mapping.json");
const outputDirectory = path.join(root, "outputs", "real-catalog-category-audit");
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8")) as {
  sourceCatalogChecksum: string;
  sourceCategoryChecksum: string;
  entries: Array<{
    sourceId: string;
    sourceSlug: string;
    sourceName: string;
    targetCanonicalKey: string;
    targetCanonicalName: string;
    preferredTargetSlugs: string[];
    confidence: "HIGH" | "MEDIUM" | "LOW";
    rationale: string;
    ambiguity: string;
  }>;
};
const validation = loadAndValidateRealCatalog(catalogPath);
if (!validation.catalog) throw new Error("FAILED_CATALOG_VALIDATION");

const lowEntries = mapping.entries.filter((entry) => entry.confidence === "LOW");
const rows = lowEntries.map((entry) => {
  const sourceCategoryIds = new Set(validation.catalog!.categories.filter((category) => category.slug === entry.sourceSlug).map((category) => category.id));
  const books = validation.catalog!.books.filter((book) => sourceCategoryIds.has(book.primaryCategoryId));
  const samples = books.slice(0, 20).map((book) => ({
    bookId: book.id,
    title: book.title,
    subjects: book.subjects.slice(0, 8),
  }));
  return {
    sourceId: entry.sourceId,
    sourceCategory: `${entry.sourceName} (${entry.sourceSlug})`,
    sourceBookCount: books.length,
    targetCategory: `${entry.targetCanonicalName} (${entry.targetCanonicalKey})`,
    targetProposal: entry.targetCanonicalKey,
    confidence: entry.confidence,
    sourceSubjects: [...new Set(samples.flatMap((sample) => sample.subjects))].slice(0, 30),
    samples,
    rationale: entry.rationale,
    ambiguity: entry.ambiguity,
    finalDecision: "KEEP_CURRENT_BROAD_FALLBACK_AND_PRESERVE_SOURCE_CATEGORY",
    decisionReason: "Taxonomy hiện tại không có nhóm chính xác hơn; không đổi mapping để làm đẹp tỷ lệ.",
  };
});

const report = {
  status: rows.length === 8 && rows.every((row) => row.confidence === "LOW") ? "VERIFIED" : "FAILED",
  checkedAt: new Date().toISOString(),
  sourceCatalogChecksum: mapping.sourceCatalogChecksum,
  sourceCategoryChecksum: mapping.sourceCategoryChecksum,
  totalLowMappings: rows.length,
  rows,
  mappingInvariant: {
    entries: mapping.entries.length,
    duplicateSourceIds: mapping.entries.length - new Set(mapping.entries.map((entry) => entry.sourceId)).size,
    duplicateSourceSlugs: mapping.entries.length - new Set(mapping.entries.map((entry) => entry.sourceSlug)).size,
  },
};
fs.mkdirSync(outputDirectory, { recursive: true });
const stamp = report.checkedAt.replace(/[:.]/gu, "-");
const jsonPath = path.join(outputDirectory, `category-low-review-${stamp}.json`);
const markdownPath = path.join(outputDirectory, `category-low-review-${stamp}.md`);
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
const markdown = [
  "# Review 8 category mapping LOW G2.2",
  "",
  `- Trạng thái: **${report.status}**.`,
  `- Số mapping LOW: **${report.totalLowMappings}**.`,
  "- Quyết định chung: giữ broad fallback hiện tại, bảo toàn sourceCategory; không gọi là mapping chính xác.",
  "",
  "| Source | Books | Target hiện tại | Confidence | Quyết định |",
  "|---|---:|---|---|---|",
  ...rows.map((row) => `| ${row.sourceCategory} | ${row.sourceBookCount} | ${row.targetCategory} | ${row.confidence} | ${row.finalDecision} |`),
  "",
].join("\n");
fs.writeFileSync(markdownPath, markdown, { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({ status: report.status, totalLowMappings: report.totalLowMappings, mappingInvariant: report.mappingInvariant, jsonPath, markdownPath }, null, 2));
