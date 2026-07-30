import { stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { isUsableCoverDimensions, isValidCoverImageBytes } from "@/lib/cover-policy";

export interface LocalCoverInspection {
  valid: boolean;
  relativePath: string;
  reason: string | null;
}

export function expectedLocalCoverPath(bookId: string): string {
  if (!/^RB\d{5}$/u.test(bookId)) {
    throw new Error("Mã sách không thuộc catalog RBxxxxx.");
  }
  return `/covers/real-catalog-local/${bookId}.jpg`;
}

export async function inspectLocalBookCover(bookId: string): Promise<LocalCoverInspection> {
  const relativePath = expectedLocalCoverPath(bookId);
  const absolutePath = path.resolve(
    process.cwd(),
    "public",
    "covers",
    "real-catalog-local",
    `${bookId}.jpg`,
  );

  try {
    const file = await stat(absolutePath);
    if (!file.isFile() || !isValidCoverImageBytes(file.size)) {
      return { valid: false, relativePath, reason: "FILE_SIZE_INVALID" };
    }
    const metadata = await sharp(absolutePath, { failOn: "error" }).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      !["jpeg", "jpg", "png", "webp"].includes(metadata.format ?? "") ||
      !isUsableCoverDimensions(metadata.width, metadata.height)
    ) {
      return { valid: false, relativePath, reason: "IMAGE_DIMENSION_OR_FORMAT_INVALID" };
    }
    return { valid: true, relativePath, reason: null };
  } catch (error: unknown) {
    const reason =
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? "FILE_NOT_FOUND"
        : "IMAGE_DECODE_FAILED";
    return { valid: false, relativePath, reason };
  }
}
