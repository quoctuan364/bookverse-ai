import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DatasetIssue } from "@/lib/dataset-validation";

export type ImportMode = "dry-run" | "import";

export interface ImportReport {
  mode: ImportMode;
  sourceFile: string;
  sourceChecksum: string;
  categoryMappingChecksum: string | null;
  databaseName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  total: number;
  valid: number;
  warnings: number;
  invalid: number;
  inserted: number;
  updated: number;
  skipped: number;
  duplicates: number;
  failedRelations: number;
  planned: {
    create: number;
    update: number;
    skip: number;
    authors: number;
    categories: number;
    tags: number;
    ebooks: number;
    bookFiles: number;
    categoryParents: number;
    canonicalMappings: number;
    unmappedCategories: number;
  };
  tableCountsBefore: Record<string, number>;
  tableCountsAfter: Record<string, number>;
  replaceExisting: boolean;
  recordResults: Array<{
    recordIndex: number;
    bookId?: string;
    status: string;
    publishedYear: number | null;
    ratingAverage: number | null;
    issueCodes: string[];
  }>;
  errors: DatasetIssue[];
}

function escapeCsv(value: unknown): string {
  const text = value === null || typeof value === "undefined" ? "" : String(value);
  return '"' + text.replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
}

function errorsToCsv(errors: DatasetIssue[]): string {
  const header = ["recordIndex", "bookId", "field", "code", "severity", "message", "receivedValue"];
  const rows = errors.map((error) =>
    [
      error.recordIndex,
      error.bookId ?? "",
      error.field,
      error.code,
      error.severity,
      error.message,
      JSON.stringify(error.receivedValue),
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n") + "\n";
}

function uniqueReportStem(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
}

export async function writeImportReport(
  report: ImportReport,
  outputDirectory = path.resolve(process.cwd(), "outputs", "import"),
): Promise<{ reportPath: string; errorsPath: string }> {
  await mkdir(outputDirectory, { recursive: true });
  const stem = uniqueReportStem(new Date(report.finishedAt));
  const reportPath = path.join(outputDirectory, stem + "-" + report.mode + ".json");
  const errorsPath = path.join(outputDirectory, stem + "-errors.csv");

  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  await writeFile(errorsPath, errorsToCsv(report.errors), {
    encoding: "utf-8",
    flag: "wx",
  });

  return { reportPath, errorsPath };
}
