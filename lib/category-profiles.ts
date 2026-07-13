import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CANONICAL_ROOT_RULES,
  type CategoryCanonicalEntry,
  type CategoryMappingConfidence,
  type CategoryMappingRule,
} from "@/lib/category-hierarchy";
import { loadCategoryMapping } from "@/lib/category-mapping-file";

export interface CategoryIdentity {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryProfileEntry {
  expectedId: string;
  expectedName: string;
  expectedSlug: string;
  expectedNormalizedName: string;
  expectedNormalizedSlug: string;
  parentId: string | null;
  level: number | null;
  canonicalKey: string;
  canonicalName: string;
  mappingRule: CategoryMappingRule;
  reason: string;
  confidence: CategoryMappingConfidence;
}

export interface CategoryProfileDefinition {
  schemaVersion: 1;
  profileName: "ultra-2200" | "legacy-demo-24";
  profileVersion: string;
  expectedCategoryCount: number;
  fingerprintAlgorithm: "sha256-json-lines-id-name-slug-v1";
  sourceFingerprint: string;
  entries: CategoryProfileEntry[];
  mappingPath: string;
  mappingChecksum: string;
  sourceChecksum: string;
}

export interface CategoryProfileDiagnostic {
  profileName: string;
  expectedCount: number;
  actualCount: number;
  countMatches: boolean;
  fingerprintMatches: boolean;
  missingIdentities: string[];
  unexpectedIdentities: string[];
  idMismatches: string[];
}

export interface DetectedCategoryProfile {
  profile: CategoryProfileDefinition;
  fingerprint: string;
  canonicalEntries: CategoryCanonicalEntry[];
}

interface LegacyProfileFile {
  schemaVersion: 1;
  profileName: "legacy-demo-24";
  profileVersion: string;
  expectedCategoryCount: number;
  fingerprintAlgorithm: "sha256-json-lines-id-name-slug-v1";
  sourceFingerprint: string;
  entries: CategoryProfileEntry[];
}

interface UltraDataset {
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const APPROVED_CANONICAL_GROUPS: ReadonlyMap<string, string> = new Map(
  Object.values(CANONICAL_ROOT_RULES).map((rule) => [rule.canonicalKey, rule.canonicalName]),
);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedId(value: string): string {
  return value.normalize("NFC").trim();
}

/** Chuẩn hóa vừa đủ để so khớp, không xóa dấu và không fuzzy matching. */
export function normalizeCategoryIdentityValue(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("vi-VN");
}

function normalizedIdentity(identity: CategoryIdentity): CategoryIdentity {
  return {
    id: normalizedId(identity.id),
    name: normalizeCategoryIdentityValue(identity.name),
    slug: normalizeCategoryIdentityValue(identity.slug),
  };
}

/**
 * Fingerprint là SHA-256 của các JSON line [id, normalizedName, normalizedSlug]
 * đã sort theo ID. Cách biểu diễn này tránh phụ thuộc thứ tự query.
 */
export function buildCategoryProfileFingerprint(identities: CategoryIdentity[]): string {
  const payload = identities
    .map(normalizedIdentity)
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
    .map((identity) => JSON.stringify([identity.id, identity.name, identity.slug]))
    .join("\n");
  return sha256(payload);
}

function assertUniqueIdentities(identities: CategoryIdentity[], label: string): void {
  const ids = new Map<string, string>();
  const names = new Map<string, string>();
  const slugs = new Map<string, string>();

  for (const raw of identities) {
    const identity = normalizedIdentity(raw);
    if (!identity.id || !identity.name || !identity.slug) {
      throw new Error(`${label} chứa ID, name hoặc slug rỗng.`);
    }

    const duplicateId = ids.get(identity.id);
    const duplicateName = names.get(identity.name);
    const duplicateSlug = slugs.get(identity.slug);
    if (duplicateId) {
      throw new Error(`${label} có duplicate ID: ${identity.id}.`);
    }
    if (duplicateName) {
      throw new Error(
        `${label} có duplicate normalized name giữa ${duplicateName} và ${identity.id}: ${identity.name}.`,
      );
    }
    if (duplicateSlug) {
      throw new Error(
        `${label} có duplicate normalized slug giữa ${duplicateSlug} và ${identity.id}: ${identity.slug}.`,
      );
    }
    ids.set(identity.id, identity.id);
    names.set(identity.name, identity.id);
    slugs.set(identity.slug, identity.id);
  }
}

function identitiesFromProfile(profile: CategoryProfileDefinition): CategoryIdentity[] {
  return profile.entries.map((entry) => ({
    id: entry.expectedId,
    name: entry.expectedNormalizedName,
    slug: entry.expectedNormalizedSlug,
  }));
}

export function validateCategoryProfile(profile: CategoryProfileDefinition): void {
  if (profile.schemaVersion !== 1 || profile.fingerprintAlgorithm !== "sha256-json-lines-id-name-slug-v1") {
    throw new Error(`Profile ${profile.profileName} có schema hoặc fingerprint algorithm không hỗ trợ.`);
  }
  if (!Number.isInteger(profile.expectedCategoryCount) || profile.expectedCategoryCount < 1) {
    throw new Error(`Profile ${profile.profileName} có expectedCategoryCount không hợp lệ.`);
  }
  if (profile.entries.length !== profile.expectedCategoryCount) {
    throw new Error(
      `Profile ${profile.profileName} thiếu/thừa entry: expected=${profile.expectedCategoryCount}, actual=${profile.entries.length}.`,
    );
  }
  if (!SHA256_PATTERN.test(profile.sourceFingerprint)) {
    throw new Error(`Profile ${profile.profileName} có source fingerprint không hợp lệ.`);
  }

  const identities = identitiesFromProfile(profile);
  assertUniqueIdentities(identities, `Profile ${profile.profileName}`);

  for (const entry of profile.entries) {
    if (entry.expectedNormalizedName !== normalizeCategoryIdentityValue(entry.expectedName)) {
      throw new Error(`Profile ${profile.profileName} sai normalized name tại ${entry.expectedId}.`);
    }
    if (entry.expectedNormalizedSlug !== normalizeCategoryIdentityValue(entry.expectedSlug)) {
      throw new Error(`Profile ${profile.profileName} sai normalized slug tại ${entry.expectedId}.`);
    }
    const approvedName = APPROVED_CANONICAL_GROUPS.get(entry.canonicalKey);
    if (!approvedName || approvedName !== entry.canonicalName) {
      throw new Error(
        `Profile ${profile.profileName} có canonical key/name ngoài 27 nhóm tại ${entry.expectedId}.`,
      );
    }
  }

  const calculatedFingerprint = buildCategoryProfileFingerprint(identities);
  if (calculatedFingerprint !== profile.sourceFingerprint) {
    throw new Error(
      `Profile ${profile.profileName} có source fingerprint không khớp nội dung mapping.`,
    );
  }
}

function identityKey(identity: CategoryIdentity): string {
  const normalized = normalizedIdentity(identity);
  return normalized.name + "\u001f" + normalized.slug;
}

function compareProfile(
  actualIdentities: CategoryIdentity[],
  profile: CategoryProfileDefinition,
): CategoryProfileDiagnostic {
  const countMatches = actualIdentities.length === profile.expectedCategoryCount;
  const actualByIdentity = new Map(actualIdentities.map((identity) => [identityKey(identity), identity]));
  const expectedByIdentity = new Map(
    profile.entries.map((entry) => [
      identityKey({
        id: entry.expectedId,
        name: entry.expectedNormalizedName,
        slug: entry.expectedNormalizedSlug,
      }),
      entry,
    ]),
  );
  // Nếu count đã khác xa (24 so với 2.200), chỉ báo count để report không phình lớn.
  // Khi count đúng, liệt kê chính xác identity bị thiếu/thừa để hỗ trợ xử lý tamper.
  const missingIdentities = countMatches
    ? profile.entries
        .filter((entry) =>
          !actualByIdentity.has(
            identityKey({
              id: entry.expectedId,
              name: entry.expectedNormalizedName,
              slug: entry.expectedNormalizedSlug,
            }),
          ),
        )
        .map((entry) => `${entry.expectedId}:${entry.expectedName}|${entry.expectedSlug}`)
    : [];
  const unexpectedIdentities = countMatches
    ? actualIdentities
        .filter((identity) => !expectedByIdentity.has(identityKey(identity)))
        .map((identity) => `${identity.id}:${identity.name}|${identity.slug}`)
    : [];
  const idMismatches: string[] = [];

  for (const entry of profile.entries) {
    const actual = actualByIdentity.get(
      identityKey({
        id: entry.expectedId,
        name: entry.expectedNormalizedName,
        slug: entry.expectedNormalizedSlug,
      }),
    );
    if (actual && normalizedId(actual.id) !== normalizedId(entry.expectedId)) {
      idMismatches.push(`${entry.expectedId}->${actual.id}:${entry.expectedName}`);
    }
  }

  return {
    profileName: profile.profileName,
    expectedCount: profile.expectedCategoryCount,
    actualCount: actualIdentities.length,
    countMatches,
    fingerprintMatches:
      buildCategoryProfileFingerprint(actualIdentities) === profile.sourceFingerprint,
    missingIdentities,
    unexpectedIdentities,
    idMismatches,
  };
}

export function detectCategoryProfile(
  actualIdentities: CategoryIdentity[],
  profiles: CategoryProfileDefinition[],
): DetectedCategoryProfile {
  if (profiles.length === 0) {
    throw new Error("Không có Category profile nào để nhận diện.");
  }
  assertUniqueIdentities(actualIdentities, "Database Category");
  profiles.forEach(validateCategoryProfile);

  const diagnostics = profiles.map((profile) => compareProfile(actualIdentities, profile));
  const matches = diagnostics.filter(
    (diagnostic) =>
      diagnostic.countMatches &&
      diagnostic.fingerprintMatches &&
      diagnostic.missingIdentities.length === 0 &&
      diagnostic.unexpectedIdentities.length === 0 &&
      diagnostic.idMismatches.length === 0,
  );

  if (matches.length !== 1) {
    throw new Error(
      "Category profile không khớp chính xác; fail-closed trước write. Diagnostics: " +
        JSON.stringify(diagnostics),
    );
  }

  const selected = profiles.find((profile) => profile.profileName === matches[0].profileName);
  if (!selected) {
    throw new Error("Không tìm thấy profile đã nhận diện.");
  }

  return {
    profile: selected,
    fingerprint: buildCategoryProfileFingerprint(actualIdentities),
    canonicalEntries: selected.entries.map((entry) => ({
      categoryId: entry.expectedId,
      categoryName: entry.expectedName,
      parentId: entry.parentId,
      level: entry.level,
      canonicalKey: entry.canonicalKey,
      canonicalName: entry.canonicalName,
      mappingRule: entry.mappingRule,
      confidence: entry.confidence,
    })),
  };
}

function ultraCategoryId(value: number): string {
  return "C" + String(value).padStart(3, "0");
}

async function loadUltraProfile(): Promise<CategoryProfileDefinition> {
  const mapping = await loadCategoryMapping();
  const sourcePath = path.resolve(process.cwd(), mapping.file.sourceFile);
  const sourceBuffer = await readFile(sourcePath);
  const dataset = JSON.parse(
    sourceBuffer.toString("utf-8").replace(/^\uFEFF/, ""),
  ) as UltraDataset;
  const categoriesById = new Map(
    dataset.categories.map((category) => [ultraCategoryId(category.id), category]),
  );
  const entries: CategoryProfileEntry[] = mapping.file.entries.map((mappingEntry) => {
    const category = categoriesById.get(mappingEntry.categoryId);
    if (!category) {
      throw new Error(`Dataset ultra thiếu Category ${mappingEntry.categoryId} có trong mapping.`);
    }
    return {
      expectedId: mappingEntry.categoryId,
      expectedName: category.name,
      expectedSlug: category.slug,
      expectedNormalizedName: normalizeCategoryIdentityValue(category.name),
      expectedNormalizedSlug: normalizeCategoryIdentityValue(category.slug),
      parentId: mappingEntry.parentId,
      level: mappingEntry.level,
      canonicalKey: mappingEntry.canonicalKey,
      canonicalName: mappingEntry.canonicalName,
      mappingRule: mappingEntry.mappingRule,
      reason: "Giữ nguyên mapping taxonomy ultra-2200 đã duyệt.",
      confidence: mappingEntry.confidence,
    };
  });
  const identities = entries.map((entry) => ({
    id: entry.expectedId,
    name: entry.expectedName,
    slug: entry.expectedSlug,
  }));
  const profile: CategoryProfileDefinition = {
    schemaVersion: 1,
    profileName: "ultra-2200",
    profileVersion: "1.0.0",
    expectedCategoryCount: entries.length,
    fingerprintAlgorithm: "sha256-json-lines-id-name-slug-v1",
    sourceFingerprint: buildCategoryProfileFingerprint(identities),
    entries,
    mappingPath: mapping.mappingPath,
    mappingChecksum: mapping.mappingChecksum,
    sourceChecksum: mapping.file.sourceChecksum,
  };
  validateCategoryProfile(profile);
  return profile;
}

async function loadLegacyProfile(): Promise<CategoryProfileDefinition> {
  const mappingPath = path.resolve(
    process.cwd(),
    "data",
    "mappings",
    "category_canonical_legacy_24.json",
  );
  const mappingBuffer = await readFile(mappingPath);
  const parsed = JSON.parse(mappingBuffer.toString("utf-8")) as LegacyProfileFile;
  const profile: CategoryProfileDefinition = {
    ...parsed,
    mappingPath,
    mappingChecksum: sha256(mappingBuffer),
    sourceChecksum: parsed.sourceFingerprint,
  };
  validateCategoryProfile(profile);
  return profile;
}

export async function loadCategoryProfiles(): Promise<CategoryProfileDefinition[]> {
  const [ultra, legacy] = await Promise.all([loadUltraProfile(), loadLegacyProfile()]);
  return [ultra, legacy];
}
