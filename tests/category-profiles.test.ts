import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategoryProfileFingerprint,
  detectCategoryProfile,
  loadCategoryProfiles,
  normalizeCategoryIdentityValue,
  validateCategoryProfile,
  type CategoryIdentity,
  type CategoryProfileDefinition,
} from "@/lib/category-profiles";

const profilesPromise = loadCategoryProfiles();

function identities(profile: CategoryProfileDefinition): CategoryIdentity[] {
  return profile.entries.map((entry) => ({
    id: entry.expectedId,
    name: entry.expectedName,
    slug: entry.expectedSlug,
  }));
}

function cloneProfile(profile: CategoryProfileDefinition): CategoryProfileDefinition {
  return structuredClone(profile);
}

test("normalization giữ dấu Unicode, trim, collapse khoảng trắng và lowercase", () => {
  const decomposed = "  TA\u0302M   LY\u0301  HỌC  ";
  assert.equal(normalizeCategoryIdentityValue(decomposed), "tâm lý học");
  assert.equal(normalizeCategoryIdentityValue("  AI--Machine   Learning "), "ai--machine learning");
});

test("fingerprint deterministic, không phụ thuộc thứ tự query", () => {
  const rows = [
    { id: "C002", name: "  Tâm   lý học ", slug: "TAM-LY-HOC" },
    { id: "C001", name: "Khoa học dữ liệu", slug: "khoa-hoc-du-lieu" },
  ];
  const reversed = [...rows].reverse();
  assert.equal(buildCategoryProfileFingerprint(rows), buildCategoryProfileFingerprint(reversed));
});

test("load profile giữ đúng ultra-2200 và mapping checksum đã duyệt", async () => {
  const profiles = await profilesPromise;
  const ultra = profiles.find((profile) => profile.profileName === "ultra-2200");
  assert.ok(ultra);
  assert.equal(ultra.expectedCategoryCount, 2_200);
  assert.equal(
    ultra.mappingChecksum,
    "dd07599644f68458139e836b8f5cb7529de28fb197076392fe5f8f2c6cc09527",
  );
  assert.equal(detectCategoryProfile(identities(ultra), profiles).profile.profileName, "ultra-2200");
});

test("auto detection chọn đúng legacy-demo-24 theo toàn bộ name/slug/fingerprint", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const detected = detectCategoryProfile(identities(legacy), profiles);
  assert.equal(detected.profile.profileName, "legacy-demo-24");
  assert.equal(detected.fingerprint, legacy.sourceFingerprint);
  assert.equal(detected.canonicalEntries.length, 24);
});

test("unknown profile bị từ chối fail-closed", async () => {
  const profiles = await profilesPromise;
  assert.throws(
    () => detectCategoryProfile([{ id: "X001", name: "Không xác định", slug: "khong-xac-dinh" }], profiles),
    /không khớp chính xác|fail-closed/i,
  );
});

test("count đúng nhưng name sai vẫn bị từ chối", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const tampered = identities(legacy);
  tampered[0] = { ...tampered[0], name: "Tên đã bị sửa" };
  assert.throws(() => detectCategoryProfile(tampered, profiles), /missingIdentities.*unexpectedIdentities/i);
});

test("ID trùng taxonomy ultra nhưng name legacy không bị map theo ID", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const detected = detectCategoryProfile(identities(legacy), profiles);
  const first = detected.canonicalEntries.find((entry) => entry.categoryId === "C001");
  assert.equal(detected.profile.profileName, "legacy-demo-24");
  assert.equal(first?.canonicalKey, "artificial-intelligence");
  assert.notEqual(first?.canonicalKey, "technology");
});

test("duplicate normalized name bị từ chối", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const duplicate = identities(legacy);
  duplicate[1] = { ...duplicate[1], name: "  AI & MACHINE   LEARNING " };
  assert.throws(() => detectCategoryProfile(duplicate, profiles), /duplicate normalized name/i);
});

test("duplicate normalized slug bị từ chối", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const duplicate = identities(legacy);
  duplicate[1] = { ...duplicate[1], slug: "  AI-MACHINE-LEARNING " };
  assert.throws(() => detectCategoryProfile(duplicate, profiles), /duplicate normalized slug/i);
});

test("canonical key ngoài 27 nhóm đã duyệt bị từ chối", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const invalid = cloneProfile(legacy);
  invalid.entries[0].canonicalKey = "nhom-tu-tao";
  invalid.entries[0].canonicalName = "Nhóm tự tạo";
  assert.throws(() => validateCategoryProfile(invalid), /ngoài 27 nhóm/i);
});

test("mapping thiếu hoặc thừa entry bị từ chối", async () => {
  const profiles = await profilesPromise;
  const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
  assert.ok(legacy);
  const missing = cloneProfile(legacy);
  missing.entries.pop();
  assert.throws(() => validateCategoryProfile(missing), /thiếu\/thừa entry/i);

  const extra = cloneProfile(legacy);
  extra.entries.push({ ...extra.entries[0], expectedId: "C999" });
  assert.throws(() => validateCategoryProfile(extra), /thiếu\/thừa entry/i);
});
