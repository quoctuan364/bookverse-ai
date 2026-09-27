import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_LISTING_IMAGE_SIZE_BYTES } from "@/lib/listing-upload-policy";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function hasExpectedSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export interface PreparedListingUpload {
  bytes: Uint8Array;
  extension: string;
}

export async function prepareListingUpload(file: File): Promise<PreparedListingUpload> {
  const extension = EXTENSION_BY_MIME_TYPE[file.type];

  if (!extension) {
    throw new Error("Ảnh sách chỉ nhận tệp JPG, PNG hoặc WebP.");
  }

  if (file.size <= 0) {
    throw new Error("Tệp ảnh đang trống. Vui lòng chọn ảnh khác.");
  }

  if (file.size > MAX_LISTING_IMAGE_SIZE_BYTES) {
    throw new Error("Ảnh sách không được lớn hơn 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!hasExpectedSignature(bytes, file.type)) {
    throw new Error("Nội dung tệp không khớp định dạng ảnh đã chọn.");
  }

  return { bytes, extension };
}

export async function storeListingUpload(
  userId: string,
  upload: PreparedListingUpload,
): Promise<string> {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "seller";
  const listingDirectory = path.join(process.cwd(), "public", "uploads", "listings");
  const fileName = `${safeUserId}-${randomUUID()}.${upload.extension}`;
  const destination = path.join(listingDirectory, fileName);

  await mkdir(listingDirectory, { recursive: true });
  // flag "wx" bảo đảm ảnh mới không bao giờ ghi đè tệp đã có.
  await writeFile(destination, upload.bytes, { flag: "wx" });

  return `/uploads/listings/${fileName}`;
}
