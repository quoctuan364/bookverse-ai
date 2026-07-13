import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeDataset, validateDataset } from "@/lib/dataset-validation";

const DEFAULT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "data",
  "json",
  "bookverse_ultra_seed_2200.json",
);

function resolveSourcePath(args: string[]): string {
  const sourceArgument = args.find((argument) => !argument.startsWith("--"));
  return path.resolve(process.cwd(), sourceArgument ?? process.env.BOOKVERSE_DATASET_PATH ?? DEFAULT_SOURCE_PATH);
}

function csvEscape(value: unknown): string {
  return '"' + String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
}

function flattenMetrics(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [[prefix, value]];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenMetrics(child, prefix ? prefix + "." + key : key),
  );
}

function buildMarkdown(
  sourceFile: string,
  checksum: string,
  analysis: ReturnType<typeof analyzeDataset>,
): string {
  const missingFields = Object.entries(analysis.missingFields)
    .map(([field, count]) => "| " + field + " | " + count + " |")
    .join("\n");

  return [
    "# BookVerse AI Dataset Report",
    "",
    "Ngày tạo: " + analysis.generatedAt,
    "",
    "Nguồn: **" + path.relative(process.cwd(), sourceFile).replace(/\\/g, "/") + "**",
    "",
    "SHA-256: **" + checksum + "**",
    "",
    "## Tổng quan",
    "",
    "| Chỉ số | Giá trị |",
    "|---|---:|",
    "| Tổng sách | " + analysis.totalBooks + " |",
    "| ID thiếu | " + analysis.missingIds + " |",
    "| ID trùng | " + analysis.duplicateIds + " |",
    "| Title trùng | " + analysis.duplicateTitles + " |",
    "| Description trùng | " + analysis.duplicateDescriptions + " |",
    "| Author duy nhất | " + analysis.uniqueAuthors + " |",
    "| Category duy nhất | " + analysis.uniqueCategories + " |",
    "| Tag duy nhất | " + analysis.uniqueTags + " |",
    "| Category chỉ có một sách | " + analysis.categoriesWithOneBook + " |",
    "| Author chỉ có một sách | " + analysis.authorsWithOneBook + " |",
    "| Rating không hợp lệ | " + analysis.invalidRatings + " |",
    "| Năm xuất bản không hợp lệ | " + analysis.invalidPublishedYears + " |",
    "| Parent category lỗi | " + analysis.invalidParentCategories + " |",
    "| Timestamp tương lai | " + analysis.futureTimestamps + " |",
    "| Timestamp sai thứ tự | " + analysis.outOfOrderTimestamps + " |",
    "",
    "## Runtime validation",
    "",
    "| Trạng thái | Số lượng |",
    "|---|---:|",
    "| VALID | " + analysis.validation.valid + " |",
    "| VALID_WITH_WARNINGS | " + analysis.validation.warnings + " |",
    "| INVALID | " + analysis.validation.invalid + " |",
    "| SKIPPED_DUPLICATE | " + analysis.validation.duplicates + " |",
    "| FAILED_RELATION | " + analysis.validation.failedRelations + " |",
    "",
    "## Field thiếu",
    "",
    "| Field | Số record |",
    "|---|---:|",
    missingFields,
    "",
    "## Kết luận",
    "",
    "- Dataset gốc chỉ được đọc; script không sửa hoặc ghi đè dataset.",
    "- Mô tả trùng cao và timestamp synthetic làm dataset chưa phù hợp để công bố metric temporal AI.",
    "- Category hierarchy chỉ được phân tích trong Lượt 1A, chưa canonicalize và chưa thay đổi Prisma schema.",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const sourcePath = resolveSourcePath(process.argv.slice(2));
  const rawBuffer = await readFile(sourcePath);
  const rawText = rawBuffer.toString("utf-8").replace(/^\uFEFF/, "");
  const rawDataset = JSON.parse(rawText) as unknown;
  const validation = validateDataset(rawDataset);
  const analysis = analyzeDataset(rawDataset);
  const checksum = createHash("sha256").update(rawBuffer).digest("hex");
  const outputDirectory = path.resolve(process.cwd(), "outputs", "dataset");
  const docsPath = path.resolve(process.cwd(), "docs", "DATASET_REPORT.md");

  await mkdir(outputDirectory, { recursive: true });
  await mkdir(path.dirname(docsPath), { recursive: true });

  const jsonOutput = {
    sourceFile: path.relative(process.cwd(), sourcePath).replace(/\\/g, "/"),
    sourceChecksum: checksum,
    ...analysis,
    recordResults: validation.records,
    sampleIssues: validation.issues.slice(0, 100),
  };
  const csvRows = flattenMetrics(analysis).map(([metric, value]) =>
    [csvEscape(metric), csvEscape(value)].join(","),
  );

  await Promise.all([
    writeFile(
      path.join(outputDirectory, "dataset-analysis.json"),
      JSON.stringify(jsonOutput, null, 2) + "\n",
      "utf-8",
    ),
    writeFile(
      path.join(outputDirectory, "dataset-analysis.csv"),
      ["metric,value", ...csvRows].join("\n") + "\n",
      "utf-8",
    ),
    writeFile(docsPath, buildMarkdown(sourcePath, checksum, analysis), "utf-8"),
  ]);

  console.log(
    JSON.stringify(
      {
        sourceFile: jsonOutput.sourceFile,
        checksum,
        totalBooks: analysis.totalBooks,
        valid: analysis.validation.valid,
        warnings: analysis.validation.warnings,
        invalid: analysis.validation.invalid,
        duplicates: analysis.validation.duplicates,
        failedRelations: analysis.validation.failedRelations,
        outputDirectory: path.relative(process.cwd(), outputDirectory),
        document: path.relative(process.cwd(), docsPath),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error("[FAIL] " + message);
  process.exitCode = 1;
});
