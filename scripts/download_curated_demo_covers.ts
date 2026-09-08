import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface DemoBookRow {
  book_id: string;
  title: string;
  author: string;
  cover_path: string;
  [key: string]: string;
}

interface OpenLibraryDocument {
  key?: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  editions?: {
    docs?: Array<{ title?: string }>;
  };
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDocument[];
}

interface CuratedCover {
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  sourceDatasetIsbn: string;
  selectionNote: string;
  localPath: string;
  sourceUrl: string;
  sourcePageUrl: string;
  provider: "OPEN_LIBRARY";
  verificationStatus: "VERIFIED_BY_ISBN_AND_METADATA";
  rightsStatus: "NOT_VERIFIED";
  remoteTitle: string;
  remoteAuthors: string[];
  openLibraryKey: string | null;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  retrievedAt: string;
}

const root = process.cwd();
const sourceCsvPath = path.join(root, "data", "demo", "books.csv");
const outputDirectory = path.join(root, "public", "covers", "curated-real");
const derivedCsvPath = path.join(root, "data", "derived", "demo-books-with-local-covers.csv");
const manifestPath = path.join(root, "config", "curated-demo-cover-sources.json");
const USER_AGENT = "BookVerse-Academic-Demo/1.0 (curated cover verifier)";
const ISBN_OVERRIDES: Readonly<Record<string, { isbn: string; reason: string }>> = {
  B014: {
    isbn: "9781400062751",
    reason: "ISBN trong CSV trả ảnh chụp màn hình tỷ lệ 0.45; dùng ấn bản gốc cùng title/author có bìa sạch 329x500.",
  },
  B019: {
    isbn: "9780099505693",
    reason: "ISBN trong CSV trả ảnh 183x276; dùng ấn bản khác cùng title/author có ảnh 200x311.",
  },
};
const OBSOLETE_GENERATED_FILES = [
  "b014-9780345472328.jpg",
  "b019-9781400064281.jpg",
] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/u, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows;
}

function loadDemoBooks(): DemoBookRow[] {
  const rows = parseCsv(fs.readFileSync(sourceCsvPath, "utf8"));
  const [header, ...values] = rows;
  if (!header?.includes("book_id") || !header.includes("cover_path")) {
    throw new Error("data/demo/books.csv thiếu book_id hoặc cover_path.");
  }

  return values.map((cells) =>
    Object.fromEntries(header.map((column, index) => [column, cells[index] ?? ""])),
  ) as DemoBookRow[];
}

function extractIsbn(sourceUrl: string): string {
  const match = sourceUrl.match(/\/isbn\/([0-9Xx-]{10,17})-[SML]\.jpg/i);
  if (!match) throw new Error(`Không lấy được ISBN từ URL: ${sourceUrl}`);
  return match[1].replaceAll("-", "").toUpperCase();
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  const ignored = new Set(["a", "an", "and", "for", "of", "the", "to", "with"]);
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 1 && !ignored.has(token)),
  );
}

function tokenCoverage(expected: string, actual: string): number {
  const expectedTokens = tokenSet(expected);
  const actualTokens = tokenSet(actual);
  if (expectedTokens.size === 0 || actualTokens.size === 0) return 0;
  const intersection = [...expectedTokens].filter((token) => actualTokens.has(token)).length;
  return intersection / Math.min(expectedTokens.size, actualTokens.size);
}

async function fetchWithTimeout(url: string, timeoutMs = 12_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json,image/*", "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyMetadata(book: DemoBookRow, isbn: string): Promise<OpenLibraryDocument> {
  // Work title có thể giữ ngôn ngữ gốc (ví dụ O Alquimista), nên cần edition title
  // để xác minh đúng ấn bản ISBN mà dataset đang tham chiếu.
  const fields = "key,title,author_name,isbn,editions";
  const url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&fields=${fields}&limit=5`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`Open Library Search trả HTTP ${response.status} cho ISBN ${isbn}.`);
  const payload = (await response.json()) as OpenLibrarySearchResponse;
  const document = payload.docs?.find((item) => item.isbn?.includes(isbn));
  if (!document?.title) throw new Error(`Không tìm thấy metadata chứa đúng ISBN ${isbn}.`);

  const remoteAuthors = document.author_name ?? [];
  const titleCandidates = [document.title, ...(document.editions?.docs ?? []).map((edition) => edition.title)]
    .filter((title): title is string => Boolean(title));
  const bestRemoteTitle = titleCandidates.sort(
    (left, right) => tokenCoverage(book.title, right) - tokenCoverage(book.title, left),
  )[0];
  const titleScore = tokenCoverage(book.title, bestRemoteTitle);
  const authorScore = tokenCoverage(book.author, remoteAuthors.join(" "));
  if (titleScore < 0.6 || authorScore < 0.5) {
    throw new Error(
      `Metadata không khớp ${book.book_id}: title=${titleScore.toFixed(2)}, author=${authorScore.toFixed(2)}, remote=${bestRemoteTitle}.`,
    );
  }
  return { ...document, title: bestRemoteTitle };
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error("File tải về không có JPEG signature.");
  let offset = 2;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    if (segmentLength < 2) break;
    offset += 2 + segmentLength;
  }
  throw new Error("Không đọc được kích thước JPEG.");
}

async function downloadCover(
  book: DemoBookRow,
  isbn: string,
  sourceDatasetIsbn: string,
  selectionNote: string,
  metadata: OpenLibraryDocument,
): Promise<CuratedCover> {
  const sourceUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  const fileName = `${book.book_id.toLowerCase()}-${isbn}.jpg`;
  const absolutePath = path.join(outputDirectory, fileName);
  let buffer: Buffer;
  let retrievedAt: string;
  if (fs.existsSync(absolutePath)) {
    buffer = fs.readFileSync(absolutePath);
    retrievedAt = fs.statSync(absolutePath).mtime.toISOString();
  } else {
    const response = await fetchWithTimeout(sourceUrl);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!response.ok) throw new Error(`Cover ISBN ${isbn} trả HTTP ${response.status}.`);
    if (!contentType.startsWith("image/jpeg")) {
      throw new Error(`Cover ISBN ${isbn} không phải JPEG: ${contentType || "missing content-type"}.`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(absolutePath, buffer);
    retrievedAt = new Date().toISOString();
  }

  const { width, height } = readJpegDimensions(buffer);
  const aspectRatio = width / height;
  if (buffer.length < 5_000 || width < 200 || height < 300 || aspectRatio < 0.55 || aspectRatio > 0.85) {
    throw new Error(
      `Cover ISBN ${isbn} không đạt quality gate: ${width}x${height}, ratio=${aspectRatio.toFixed(2)}, ${buffer.length} bytes.`,
    );
  }

  return {
    bookId: book.book_id,
    title: book.title,
    author: book.author,
    isbn,
    sourceDatasetIsbn,
    selectionNote,
    localPath: `/covers/curated-real/${fileName}`,
    sourceUrl,
    sourcePageUrl: `https://openlibrary.org/isbn/${isbn}`,
    provider: "OPEN_LIBRARY",
    verificationStatus: "VERIFIED_BY_ISBN_AND_METADATA",
    rightsStatus: "NOT_VERIFIED",
    remoteTitle: metadata.title ?? "",
    remoteAuthors: metadata.author_name ?? [],
    openLibraryKey: metadata.key ?? null,
    width,
    height,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    retrievedAt,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function writeDerivedCsv(books: DemoBookRow[], covers: CuratedCover[]): void {
  const coverByBookId = new Map(covers.map((cover) => [cover.bookId, cover]));
  const header = [...Object.keys(books[0]), "isbn", "local_cover_path", "cover_verification", "rights_status"];
  const rows = books.map((book) => {
    const cover = coverByBookId.get(book.book_id);
    if (!cover) throw new Error(`Thiếu cover đã xác minh cho ${book.book_id}.`);
    return [
      ...Object.keys(books[0]).map((key) => book[key] ?? ""),
      cover.isbn,
      cover.localPath,
      cover.verificationStatus,
      cover.rightsStatus,
    ];
  });
  fs.writeFileSync(
    derivedCsvPath,
    `${[header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  const books = loadDemoBooks();
  if (books.length !== 20) throw new Error(`Phạm vi curated phải đúng 20 sách, hiện có ${books.length}.`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.mkdirSync(path.dirname(derivedCsvPath), { recursive: true });

  const covers: CuratedCover[] = [];
  for (const [index, book] of books.entries()) {
    const sourceDatasetIsbn = extractIsbn(book.cover_path);
    const override = ISBN_OVERRIDES[book.book_id];
    const isbn = override?.isbn ?? sourceDatasetIsbn;
    const metadata = await verifyMetadata(book, isbn);
    const cover = await downloadCover(
      book,
      isbn,
      sourceDatasetIsbn,
      override?.reason ?? "Dùng đúng ISBN được tham chiếu trong data/demo/books.csv.",
      metadata,
    );
    covers.push(cover);
    console.log(
      `[${String(index + 1).padStart(2, "0")}/${books.length}] VERIFIED ${book.book_id} | ${isbn} | ${cover.width}x${cover.height}`,
    );
  }

  const manifest = {
    dataLabel: "EXTERNAL_PROVIDER_ASSET",
    scope: "20 sách thật trong data/demo/books.csv; không ghi database và không ghi đè dataset/cover gốc.",
    provider: "Open Library Covers API",
    providerGuideline: "https://openlibrary.org/dev/docs/api/covers",
    rightsStatus: "NOT_VERIFIED",
    rightsNote:
      "Open Library cung cấp API hiển thị cover nhưng manifest này không chứng minh quyền tái phân phối từng bìa. Chỉ dùng cho academic demo cho đến khi có giấy phép riêng.",
    generatedAt: new Date().toISOString(),
    count: covers.length,
    covers,
  };
  for (const fileName of OBSOLETE_GENERATED_FILES) {
    const obsoletePath = path.join(outputDirectory, fileName);
    if (path.dirname(obsoletePath) !== outputDirectory) {
      throw new Error(`Từ chối dọn file ngoài output cover: ${obsoletePath}`);
    }
    if (fs.existsSync(obsoletePath)) fs.unlinkSync(obsoletePath);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeDerivedCsv(books, covers);
  console.log(JSON.stringify({ status: "VERIFIED", covers: covers.length, manifestPath, derivedCsvPath }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
