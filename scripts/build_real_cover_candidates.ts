import fs from "node:fs";
import path from "node:path";

interface DatasetBook {
  id: number;
  title: string;
  category_id: number;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
}

interface Dataset {
  meta: { note: string };
  books: DatasetBook[];
  categories: Array<{ id: number; name: string }>;
  authors: Array<{ id: number; name: string }>;
  book_authors: Array<{ book_id: number; author_id: number }>;
}

const root = process.cwd();
const sourcePath = path.join(root, "data", "json", "bookverse_ultra_seed_2200.json");
const outputPath = path.join(root, "docs", "REAL_COVER_CANDIDATES.csv");
const dataset = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as Dataset;

const categoryById = new Map(dataset.categories.map((category) => [category.id, category.name]));
const authorById = new Map(dataset.authors.map((author) => [author.id, author.name]));
const firstAuthorByBookId = new Map<number, string>();
for (const relation of dataset.book_authors) {
  if (!firstAuthorByBookId.has(relation.book_id)) {
    firstAuthorByBookId.set(relation.book_id, authorById.get(relation.author_id) ?? "Không rõ");
  }
}

const candidates = [...dataset.books]
  .sort((left, right) => {
    if (left.is_featured !== right.is_featured) return Number(right.is_featured) - Number(left.is_featured);
    if (left.rating_count !== right.rating_count) return right.rating_count - left.rating_count;
    if (left.rating_avg !== right.rating_avg) return right.rating_avg - left.rating_avg;
    return left.id - right.id;
  })
  .slice(0, 120);

const escapeCsv = (value: string | number | boolean) => `"${String(value).replaceAll('"', '""')}"`;
const header = [
  "rank",
  "book_id",
  "title",
  "author",
  "category",
  "is_featured",
  "rating_count_synthetic",
  "current_cover_status",
  "real_cover_status",
  "required_legal_source",
];

const rows = candidates.map((book, index) => [
  index + 1,
  `B${String(book.id).padStart(4, "0")}`,
  book.title,
  firstAuthorByBookId.get(book.id) ?? "Không rõ",
  categoryById.get(book.category_id) ?? "Không rõ",
  book.is_featured,
  book.rating_count,
  book.cover_url?.includes("/covers/flat/") ? "LEGACY_SYNTHETIC" : "NOT_VERIFIED",
  "NOT_AVAILABLE",
  "Cần URL/file do NXB, tác giả hoặc nguồn có giấy phép cung cấp",
]);

const csv = [
  `# DATA_LABEL=SYNTHETIC_DATA; SOURCE_NOTE=${dataset.meta.note}`,
  `# SELECTION=120 sách ưu tiên deterministic: featured, rating_count, rating_avg, id; rating là synthetic`,
  header.map(escapeCsv).join(","),
  ...rows.map((row) => row.map(escapeCsv).join(",")),
  "",
].join("\n");

fs.writeFileSync(outputPath, csv, "utf8");
console.log(JSON.stringify({ status: "VERIFIED", outputPath, candidates: rows.length }));
