import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { buildImportProjections, resolveCategoryTargets } from "@/lib/real-catalog-import";
import {
  loadAndValidateCategoryMapping,
  loadAndValidateRealCatalog,
  resolveSourceIdentity,
} from "@/lib/real-catalog";

const sourcePath = path.resolve(process.cwd(), "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.resolve(process.cwd(), "config", "real-catalog-category-mapping.json");

const legacyCategories = [
  ["C001", "AI & Machine Learning", "ai-machine-learning", "artificial-intelligence", "Trí tuệ nhân tạo"],
  ["C002", "Lập trình Web", "lap-trinh-web", "technology", "Công nghệ"],
  ["C003", "Khoa học dữ liệu", "khoa-hoc-du-lieu", "data-science", "Khoa học dữ liệu"],
  ["C004", "Kinh doanh & Khởi nghiệp", "kinh-doanh-khoi-nghiep", "business", "Kinh doanh và quản trị"],
  ["C005", "Marketing số", "marketing-so", "marketing", "Marketing"],
  ["C006", "Tài chính cá nhân", "tai-chinh-ca-nhan", "personal-finance", "Tài chính cá nhân"],
  ["C008", "Tâm lý học", "tam-ly-hoc", "psychology", "Tâm lý học"],
  ["C009", "Văn học Việt Nam", "van-hoc-viet-nam", "literature", "Văn học"],
  ["C010", "Văn học nước ngoài", "van-hoc-nuoc-ngoai", "literature", "Văn học"],
  ["C011", "Thiếu nhi", "thieu-nhi", "children", "Thiếu nhi"],
  ["C012", "Lịch sử", "lich-su", "history", "Lịch sử"],
  ["C013", "Khoa học phổ thông", "khoa-hoc-pho-thong", "education", "Giáo dục và ngoại ngữ"],
  ["C014", "Y học & Sức khỏe", "y-hoc-suc-khoe", "health", "Sức khỏe"],
  ["C017", "Thiết kế & Sáng tạo", "thiet-ke-sang-tao", "design", "Thiết kế và UX/UI"],
  ["C018", "Triết học", "triet-hoc", "philosophy", "Triết học"],
  ["C024", "Đời sống & Du lịch", "doi-song-du-lich", "travel", "Du lịch"],
].map(([id, name, slug, canonicalKey, canonicalName]) => ({
  id,
  name,
  slug,
  canonicalKey,
  canonicalName,
  parentId: null,
}));

test("39 source category resolve deterministic vào taxonomy legacy", () => {
  const catalogResult = loadAndValidateRealCatalog(sourcePath);
  assert.ok(catalogResult.catalog);
  const mappingResult = loadAndValidateCategoryMapping(
    mappingPath,
    catalogResult.catalog,
    catalogResult.summary.catalogChecksum,
  );
  assert.ok(mappingResult.mapping);
  const resolution = resolveCategoryTargets(mappingResult.mapping, legacyCategories);
  assert.deepEqual(resolution.errors, []);
  assert.equal(resolution.rows.length, 39);
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "law")?.targetCanonicalKey, "history");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "law")?.resolutionMode, "FALLBACK");
});

test("taxonomy ultra ưu tiên target trực tiếp và giữ confidence cho mapping mơ hồ", () => {
  const catalogResult = loadAndValidateRealCatalog(sourcePath);
  assert.ok(catalogResult.catalog);
  const mappingResult = loadAndValidateCategoryMapping(
    mappingPath,
    catalogResult.catalog,
    catalogResult.summary.catalogChecksum,
  );
  assert.ok(mappingResult.mapping);
  const ultraCategories = mappingResult.mapping.entries.map((entry, index) => ({
    id: `ULTRA-${String(index + 1).padStart(2, "0")}`,
    name: entry.targetCanonicalName,
    slug: entry.preferredTargetSlugs[0] ?? entry.targetCanonicalKey,
    canonicalKey: entry.targetCanonicalKey,
    canonicalName: entry.targetCanonicalName,
    parentId: null,
  }));
  const resolution = resolveCategoryTargets(mappingResult.mapping, ultraCategories);
  assert.deepEqual(resolution.errors, []);
  assert.equal(resolution.rows.length, 39);
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "fantasy")?.targetCanonicalKey, "fantasy");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "science-fiction")?.targetCanonicalKey, "science-fiction");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "mystery")?.targetCanonicalKey, "mystery");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "law")?.targetCanonicalKey, "law");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "environment")?.targetCanonicalKey, "environment");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "science")?.confidence, "LOW");
  assert.equal(resolution.rows.find((row) => row.sourceSlug === "cooking")?.confidence, "LOW");
});

test("projection giữ rating nguồn ngoài Book.rating và giá có metadata demo", () => {
  const catalogResult = loadAndValidateRealCatalog(sourcePath);
  assert.ok(catalogResult.catalog);
  const mappingResult = loadAndValidateCategoryMapping(
    mappingPath,
    catalogResult.catalog,
    catalogResult.summary.catalogChecksum,
  );
  assert.ok(mappingResult.mapping);
  const resolution = resolveCategoryTargets(mappingResult.mapping, legacyCategories);
  const identities = new Map(
    catalogResult.catalog.books.flatMap((book) => {
      const identity = resolveSourceIdentity(book);
      return identity ? [[book.id, identity] as const] : [];
    }),
  );
  const built = buildImportProjections(catalogResult.catalog, identities, resolution.rows);
  assert.deepEqual(built.errors, []);
  assert.equal(built.projections.length, 3_046);
  assert.equal(built.projections[0].book.rating, null);
  assert.equal(built.projections[0].metadata.priceStatus, "SYNTHETIC_DEMO_PRICE");
  assert.equal(built.projections.filter((item) => item.metadata.sourceRecordType === "EDITION_ONLY").length, 2);
});

test("category resolver fail-closed khi canonical target không tồn tại", () => {
  const catalogResult = loadAndValidateRealCatalog(sourcePath);
  assert.ok(catalogResult.catalog);
  const mappingResult = loadAndValidateCategoryMapping(
    mappingPath,
    catalogResult.catalog,
    catalogResult.summary.catalogChecksum,
  );
  assert.ok(mappingResult.mapping);
  const result = resolveCategoryTargets(mappingResult.mapping, []);
  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 39);
});
