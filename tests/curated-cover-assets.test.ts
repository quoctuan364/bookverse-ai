import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

interface CoverManifest {
  dataLabel: string;
  count: number;
  rightsStatus: string;
  covers: Array<{
    bookId: string;
    isbn: string;
    localPath: string;
    verificationStatus: string;
    rightsStatus: string;
    width: number;
    height: number;
    bytes: number;
    sha256: string;
  }>;
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } {
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xd8);
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (startOfFrameMarkers.has(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (segmentLength < 2) break;
    offset += marker === 0xd8 || marker === 0xd9 ? 2 : 2 + segmentLength;
  }
  throw new Error("Không đọc được kích thước JPEG.");
}

test("20 bìa curated khớp manifest, checksum và quality gate", () => {
  const root = process.cwd();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "config", "curated-demo-cover-sources.json"), "utf8"),
  ) as CoverManifest;
  assert.equal(manifest.dataLabel, "EXTERNAL_PROVIDER_ASSET");
  assert.equal(manifest.rightsStatus, "NOT_VERIFIED");
  assert.equal(manifest.count, 20);
  assert.equal(manifest.covers.length, 20);
  assert.equal(new Set(manifest.covers.map((cover) => cover.bookId)).size, 20);
  assert.equal(new Set(manifest.covers.map((cover) => cover.sha256)).size, 20);

  const expectedFiles = manifest.covers
    .map((cover) => path.basename(cover.localPath))
    .sort();
  const outputDirectory = path.join(root, "public", "covers", "curated-real");
  const actualFiles = fs.readdirSync(outputDirectory).filter((file) => file.endsWith(".jpg")).sort();
  assert.deepEqual(actualFiles, expectedFiles);

  for (const cover of manifest.covers) {
    assert.match(cover.isbn, /^\d{13}$/u);
    assert.equal(cover.verificationStatus, "VERIFIED_BY_ISBN_AND_METADATA");
    assert.equal(cover.rightsStatus, "NOT_VERIFIED");
    const buffer = fs.readFileSync(path.join(root, "public", cover.localPath.replace(/^\//u, "")));
    const dimensions = readJpegDimensions(buffer);
    assert.equal(buffer.length, cover.bytes);
    assert.equal(createHash("sha256").update(buffer).digest("hex"), cover.sha256);
    assert.deepEqual(dimensions, { width: cover.width, height: cover.height });
    assert.ok(dimensions.width >= 200);
    assert.ok(dimensions.height >= 300);
    assert.ok(dimensions.width / dimensions.height >= 0.55);
    assert.ok(dimensions.width / dimensions.height <= 0.85);
  }
});

test("file derived đủ 20 dòng và không thay thế data/demo/books.csv", () => {
  const root = process.cwd();
  const source = fs.readFileSync(path.join(root, "data", "demo", "books.csv"), "utf8");
  const derived = fs.readFileSync(path.join(root, "data", "derived", "demo-books-with-local-covers.csv"), "utf8");
  assert.equal(source.trim().split(/\r?\n/u).length - 1, 20);
  assert.equal(derived.trim().split(/\r?\n/u).length - 1, 20);
  assert.match(derived, /\/covers\/curated-real\/b001-9780134610993\.jpg/u);
  assert.match(source, /https:\/\/covers\.openlibrary\.org\/b\/isbn\/9780134610993-L\.jpg/u);
});
