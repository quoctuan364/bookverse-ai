import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CategoryCanonicalEntry } from "@/lib/category-hierarchy";

export interface CategoryMappingFile {
  schemaVersion: 1;
  sourceFile: string;
  sourceChecksum: string;
  entries: CategoryCanonicalEntry[];
}

export interface LoadedCategoryMapping {
  file: CategoryMappingFile;
  mappingPath: string;
  mappingChecksum: string;
  entriesById: Map<string, CategoryCanonicalEntry>;
}

const VALID_CONFIDENCE = new Set(["HIGH", "MEDIUM", "LOW", "UNMAPPED"]);
const VALID_RULES = new Set([
  "root-category",
  "parent-category",
  "exact-name",
  "manual-rule",
  "fallback-other",
  "unmapped",
]);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function loadCategoryMapping(
  mappingPath = path.resolve(
    process.cwd(),
    "data",
    "derived",
    "category-canonical-map.json",
  ),
): Promise<LoadedCategoryMapping> {
  const mappingBuffer = await readFile(mappingPath);
  const parsed = JSON.parse(mappingBuffer.toString("utf-8")) as CategoryMappingFile;

  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error("Category mapping file has an unsupported schema.");
  }
  if (!parsed.sourceFile || !parsed.sourceChecksum) {
    throw new Error("Category mapping file is missing source checksum metadata.");
  }

  const entriesById = new Map<string, CategoryCanonicalEntry>();
  for (const entry of parsed.entries) {
    if (!entry.categoryId || entriesById.has(entry.categoryId)) {
      throw new Error("Category mapping contains a missing or duplicate categoryId.");
    }
    if (!VALID_CONFIDENCE.has(entry.confidence) || !VALID_RULES.has(entry.mappingRule)) {
      throw new Error("Category mapping contains an invalid confidence or mappingRule.");
    }
    entriesById.set(entry.categoryId, entry);
  }

  const sourcePath = path.resolve(process.cwd(), parsed.sourceFile);
  const sourceBuffer = await readFile(sourcePath);
  const currentSourceChecksum = sha256(sourceBuffer);
  if (currentSourceChecksum !== parsed.sourceChecksum) {
    throw new Error("Category mapping source checksum does not match the current dataset.");
  }

  return {
    file: parsed,
    mappingPath,
    mappingChecksum: sha256(mappingBuffer),
    entriesById,
  };
}
