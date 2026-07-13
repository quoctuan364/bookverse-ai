import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCategoryCanonicalMapping,
  calculateCategoryDepth,
  validateParentAssignments,
  type CategoryCanonicalEntry,
  type CategoryNode,
} from "@/lib/category-hierarchy";

const DEFAULT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "data",
  "json",
  "bookverse_ultra_seed_2200.json",
);

interface DatasetCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number | null;
}

interface DatasetBook {
  category_id: number;
}

interface DatasetShape {
  categories: DatasetCategory[];
  books: DatasetBook[];
}

interface CategoryMappingFile {
  schemaVersion: 1;
  sourceFile: string;
  sourceChecksum: string;
  entries: CategoryCanonicalEntry[];
}

function categoryId(value: number): string {
  return "C" + String(value).padStart(3, "0");
}

function csvEscape(value: unknown): string {
  return '"' + String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
}

function countBy<T>(values: T[], keyOf: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = keyOf(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function duplicateNameGroups(categories: DatasetCategory[]): Array<{ name: string; ids: number[] }> {
  const groups = new Map<string, { name: string; ids: number[] }>();
  for (const category of categories) {
    const key = category.name.trim().toLocaleLowerCase("vi-VN");
    const group = groups.get(key) ?? { name: category.name, ids: [] };
    group.ids.push(category.id);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.ids.length > 1);
}

function buildReportMarkdown(analysis: {
  generatedAt: string;
  sourceChecksum: string;
  mappingChecksum: string;
  total: number;
  roots: number;
  parents: number;
  leaves: number;
  orphans: number;
  cycles: number;
  selfParents: number;
  maxDepth: number;
  duplicateNames: number;
  syntheticNames: number;
  categoriesWithOneBook: number;
  categoriesWithoutBooks: number;
  canonicalGroups: Record<string, number>;
  booksByCanonicalGroup: Record<string, number>;
  confidence: Record<string, number>;
  unmapped: number;
}): string {
  const canonicalRows = Object.keys(analysis.canonicalGroups)
    .sort()
    .map(
      (key) =>
        "| " +
        key +
        " | " +
        analysis.canonicalGroups[key] +
        " | " +
        (analysis.booksByCanonicalGroup[key] ?? 0) +
        " |",
    )
    .join("\n");

  return [
    "# BookVerse AI Category Report",
    "",
    "Ngày tạo: " + analysis.generatedAt,
    "",
    "## 1. Hiện trạng",
    "",
    "- Category hiện có id/name/slug/description và quan hệ Book–Category một-nhiều.",
    "- Dataset dùng parent_id trỏ trực tiếp tới Category.id dạng số; khi import được đổi sang ID Cxxx hiện hữu.",
    "- Tên và slug hiện đã unique; migration không thay đổi hai constraint này.",
    "",
    "## 2. Schema trước/sau",
    "",
    "- Giữ nguyên id, name, slug, description, books, createdAt và updatedAt.",
    "- Thêm nullable parentId/parent/children với onDelete SetNull.",
    "- Thêm nullable level, canonicalKey và canonicalName.",
    "- Thêm index parentId, canonicalKey và level. Không đổi Book.categoryId.",
    "",
    "## 3. Mapping strategy",
    "",
    "- 43 root được review bằng ID/tên chính xác và ánh xạ qua bảng manual rule.",
    "- 2.157 child kế thừa canonical group của parent.",
    "- Không fuzzy matching, không AI, không sửa tên category gốc.",
    "- Root không có rule sẽ nhận canonicalKey=unmapped và confidence=UNMAPPED.",
    "",
    "## 4. Canonical groups",
    "",
    "| Canonical key | Category | Book |",
    "|---|---:|---:|",
    canonicalRows,
    "",
    "## 5. Hierarchy statistics",
    "",
    "| Chỉ số | Giá trị |",
    "|---|---:|",
    "| Tổng category | " + analysis.total + " |",
    "| Root | " + analysis.roots + " |",
    "| Parent | " + analysis.parents + " |",
    "| Leaf | " + analysis.leaves + " |",
    "| Orphan | " + analysis.orphans + " |",
    "| Cycle | " + analysis.cycles + " |",
    "| Self-parent | " + analysis.selfParents + " |",
    "| Độ sâu lớn nhất | " + analysis.maxDepth + " |",
    "| Nhóm tên trùng | " + analysis.duplicateNames + " |",
    "| Tên có dấu hiệu synthetic | " + analysis.syntheticNames + " |",
    "| Category một sách | " + analysis.categoriesWithOneBook + " |",
    "| Category không có sách | " + analysis.categoriesWithoutBooks + " |",
    "| Chưa map canonical | " + analysis.unmapped + " |",
    "",
    "## 6. Migration",
    "",
    "Migration chỉ thêm field/FK/index nullable, không xóa column, không đổi primary key và không sửa Book.categoryId.",
    "",
    "## 7. Backfill",
    "",
    "Backfill đọc data/derived/category-canonical-map.json, kiểm tra checksum nguồn, orphan/cycle/self-parent/level trước transaction và có dry-run/execute riêng.",
    "",
    "## 8. Test",
    "",
    "Unit test bao phủ mapping, unmapped, orphan, self-parent, cycle, depth và deterministic output. Integration test chạy trên bookverse_ai_test.",
    "",
    "## 9. Limitations",
    "",
    "- 2.157 tên child là synthetic; canonical signal chỉ dựa trên root đã review.",
    "- Canonical group là taxonomy phục vụ kỹ thuật, không thay thế category gốc.",
    "- Không công bố metric recommendation mới trong lượt này.",
    "",
    "## 10. Rollback",
    "",
    "Rollback ứng dụng trước; các field mới nullable nên code cũ vẫn hoạt động. Chỉ drop field/index/FK bằng migration riêng sau khi xác minh. Backup test DB phải restore được trước khi xem xét database demo.",
    "",
    "## 11. Demo database status",
    "",
    "Database bookverse_ai chưa được apply migration hoặc backfill trong Lượt 1B.",
    "",
    "Source SHA-256: " + analysis.sourceChecksum,
    "",
    "Mapping SHA-256: " + analysis.mappingChecksum,
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const sourceArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  const sourcePath = path.resolve(
    process.cwd(),
    sourceArgument ?? process.env.BOOKVERSE_DATASET_PATH ?? DEFAULT_SOURCE_PATH,
  );
  const sourceBuffer = await readFile(sourcePath);
  const dataset = JSON.parse(sourceBuffer.toString("utf-8").replace(/^\uFEFF/, "")) as DatasetShape;
  const sourceChecksum = createHash("sha256").update(sourceBuffer).digest("hex");
  const nodes: CategoryNode[] = dataset.categories.map((category) => ({
    id: categoryId(category.id),
    name: category.name,
    parentId: category.parent_id === null ? null : categoryId(category.parent_id),
    level: category.level,
  }));
  const validation = validateParentAssignments(nodes);
  const mapping = buildCategoryCanonicalMapping(nodes);
  const mappingFile: CategoryMappingFile = {
    schemaVersion: 1,
    sourceFile: path.relative(process.cwd(), sourcePath).replace(/\\/g, "/"),
    sourceChecksum,
    entries: mapping,
  };
  const mappingText = JSON.stringify(mappingFile, null, 2) + "\n";
  const mappingChecksum = createHash("sha256").update(mappingText).digest("hex");
  const parentIds = new Set(nodes.map((node) => node.parentId).filter((value): value is string => Boolean(value)));
  const roots = nodes.filter((node) => node.parentId === null);
  const leaves = nodes.filter((node) => !parentIds.has(node.id));
  const bookCountByCategory = new Map<string, number>();
  for (const book of dataset.books) {
    const id = categoryId(book.category_id);
    bookCountByCategory.set(id, (bookCountByCategory.get(id) ?? 0) + 1);
  }
  const mappingByCategory = new Map(mapping.map((entry) => [entry.categoryId, entry]));
  const canonicalGroups = countBy(mapping, (entry) => entry.canonicalKey);
  const booksByCanonicalGroup: Record<string, number> = {};
  for (const [id, count] of bookCountByCategory) {
    const key = mappingByCategory.get(id)?.canonicalKey ?? "unmapped";
    booksByCanonicalGroup[key] = (booksByCanonicalGroup[key] ?? 0) + count;
  }
  const maxDepth = Math.max(
    0,
    ...nodes.map((node) => calculateCategoryDepth(node.id, nodes) ?? 0),
  );
  const analysis = {
    generatedAt: new Date().toISOString(),
    sourceFile: mappingFile.sourceFile,
    sourceChecksum,
    mappingChecksum,
    total: nodes.length,
    roots: roots.length,
    parents: parentIds.size,
    leaves: leaves.length,
    orphans: validation.orphans.length,
    orphanIds: validation.orphans,
    cycles: validation.cycles.length,
    cyclePaths: validation.cycles,
    selfParents: validation.selfParents.length,
    selfParentIds: validation.selfParents,
    levelMismatches: validation.levelMismatches.length,
    levelMismatchIds: validation.levelMismatches,
    maxDepth,
    levelDistribution: countBy(nodes, (node) => String(node.level ?? "null")),
    duplicateNames: duplicateNameGroups(dataset.categories).length,
    duplicateNameGroups: duplicateNameGroups(dataset.categories),
    syntheticNames: dataset.categories.filter((category) => /#\d+|\b\d{3,4}\b|case study/i.test(category.name)).length,
    categoriesWithOneBook: [...bookCountByCategory.values()].filter((count) => count === 1).length,
    categoriesWithoutBooks: nodes.filter((node) => !bookCountByCategory.has(node.id)).length,
    canonicalGroups,
    booksByCanonicalGroup: Object.fromEntries(
      Object.entries(booksByCanonicalGroup).sort(([left], [right]) => left.localeCompare(right)),
    ),
    confidence: countBy(mapping, (entry) => entry.confidence),
    mappingRules: countBy(mapping, (entry) => entry.mappingRule),
    unmapped: mapping.filter((entry) => entry.confidence === "UNMAPPED").length,
  };

  const derivedDirectory = path.resolve(process.cwd(), "data", "derived");
  const outputDirectory = path.resolve(process.cwd(), "outputs", "categories");
  const docsPath = path.resolve(process.cwd(), "docs", "CATEGORY_REPORT.md");
  await Promise.all([
    mkdir(derivedDirectory, { recursive: true }),
    mkdir(outputDirectory, { recursive: true }),
    mkdir(path.dirname(docsPath), { recursive: true }),
  ]);

  const reviewHeader = [
    "categoryId",
    "categoryName",
    "parentId",
    "level",
    "canonicalKey",
    "canonicalName",
    "mappingRule",
    "confidence",
  ];
  const reviewRows = mapping.map((entry) =>
    [
      entry.categoryId,
      entry.categoryName,
      entry.parentId ?? "",
      entry.level ?? "",
      entry.canonicalKey,
      entry.canonicalName,
      entry.mappingRule,
      entry.confidence,
    ]
      .map(csvEscape)
      .join(","),
  );
  const metricRows = Object.entries(analysis)
    .filter(([, value]) => typeof value !== "object" || value === null)
    .map(([key, value]) => [csvEscape(key), csvEscape(value)].join(","));

  await Promise.all([
    writeFile(path.join(derivedDirectory, "category-canonical-map.json"), mappingText, "utf-8"),
    writeFile(
      path.join(outputDirectory, "category-analysis.json"),
      JSON.stringify({ ...analysis, entries: mapping }, null, 2) + "\n",
      "utf-8",
    ),
    writeFile(
      path.join(outputDirectory, "category-analysis.csv"),
      ["metric,value", ...metricRows].join("\n") + "\n",
      "utf-8",
    ),
    writeFile(
      path.join(outputDirectory, "category-mapping-review.csv"),
      [reviewHeader.join(","), ...reviewRows].join("\n") + "\n",
      "utf-8",
    ),
    writeFile(docsPath, buildReportMarkdown(analysis), "utf-8"),
  ]);

  console.log(
    JSON.stringify(
      {
        total: analysis.total,
        roots: analysis.roots,
        parents: analysis.parents,
        leaves: analysis.leaves,
        orphans: analysis.orphans,
        cycles: analysis.cycles,
        selfParents: analysis.selfParents,
        maxDepth: analysis.maxDepth,
        canonicalGroups: Object.keys(analysis.canonicalGroups).length,
        unmapped: analysis.unmapped,
        sourceChecksum,
        mappingChecksum,
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
