import fs from "node:fs";
import path from "node:path";

import { loadAndValidateRealCatalog } from "@/lib/real-catalog";

const TARGET_BOOK_IDS = ["RB00583", "RB00822"] as const;
const USER_AGENT = "BookVerse-Academic-Audit/1.0 (graduation-project; source-identity-check)";
const outputDirectory = path.resolve(process.cwd(), "outputs", "real-catalog-source-identity-audit");

interface EndpointEvidence {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string | null;
  responseKey: string | null;
  workKeys: string[];
  searchDocs: Array<{ key: string | null; editionKeys: string[] }>;
}

async function inspectJson(url: string): Promise<EndpointEvidence> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // HTTP status/content-type vẫn là bằng chứng; body không JSON được giữ rỗng.
  }
  const workKeys = Array.isArray(body.works)
    ? body.works.flatMap((item) =>
        item && typeof item === "object" && "key" in item && typeof item.key === "string" ? [item.key] : [],
      )
    : [];
  const searchDocs = Array.isArray(body.docs)
    ? body.docs.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        return [{
          key: typeof record.key === "string" ? record.key : null,
          editionKeys: Array.isArray(record.edition_key)
            ? record.edition_key.filter((value): value is string => typeof value === "string")
            : [],
        }];
      })
    : [];
  return {
    requestedUrl: url,
    finalUrl: response.url,
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    responseKey: typeof body.key === "string" ? body.key : null,
    workKeys,
    searchDocs,
  };
}

async function main(): Promise<void> {
  const sourcePath = path.resolve(process.cwd(), "data", "real-catalog", "bookverse_real_catalog.json");
  const validation = loadAndValidateRealCatalog(sourcePath);
  if (!validation.catalog) throw new Error("FAILED_CATALOG_VALIDATION");
  const rows = [];
  for (const bookId of TARGET_BOOK_IDS) {
    const book = validation.catalog.books.find((item) => item.id === bookId);
    if (!book || !book.openLibraryEditionKey || !book.isbn) throw new Error(`MISSING_SOURCE_RECORD:${bookId}`);
    const editionOlid = book.openLibraryEditionKey.replace("/books/", "");
    const endpoints = [
      `https://openlibrary.org/books/${editionOlid}.json`,
      `https://openlibrary.org/isbn/${book.isbn}.json`,
      `https://openlibrary.org/works/${editionOlid}.json`,
      `https://openlibrary.org/search.json?isbn=${encodeURIComponent(book.isbn)}&fields=key,title,edition_key,isbn&limit=10`,
    ];
    const evidence: EndpointEvidence[] = [];
    for (const endpoint of endpoints) evidence.push(await inspectJson(endpoint));
    const editionEvidence = evidence[0];
    const directWorkKey = editionEvidence.workKeys.find((key) => /^\/works\/OL\d+W$/u.test(key)) ?? null;
    rows.push({
      bookId,
      sourceRecordKey: `/books/${editionOlid}`,
      rawWorkField: book.openLibraryWorkKey,
      editionKey: book.openLibraryEditionKey,
      isbn: book.isbn,
      directWorkKey,
      conclusion: directWorkKey ? "VERIFIED_WORK_RELATION" : "EDITION_ONLY",
      evidence,
    });
  }
  const report = {
    status: rows.every((row) => row.conclusion === "EDITION_ONLY") ? "VERIFIED" : "PARTIAL",
    checkedAt: new Date().toISOString(),
    source: "OPEN_LIBRARY_OFFICIAL_ENDPOINTS",
    acceptanceCriterion: "3.046 source record = 3.044 WORK + 2 EDITION_ONLY",
    rows,
  };
  fs.mkdirSync(outputDirectory, { recursive: true });
  const id = report.checkedAt.replace(/[:.]/gu, "-");
  const jsonPath = path.join(outputDirectory, `source-identity-${id}.json`);
  const markdownPath = path.join(outputDirectory, `source-identity-${id}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const markdownRows = rows.map((row) => {
    const endpointRows = row.evidence.map((item) => {
      const search = item.searchDocs.map((doc) => `${doc.key ?? "NOT_AVAILABLE"} [${doc.editionKeys.join(",")}]`).join("; ");
      return `${item.requestedUrl} → HTTP ${item.httpStatus}, final ${item.finalUrl}, key ${item.responseKey ?? "NOT_AVAILABLE"}, works ${item.workKeys.join(", ") || "NOT_AVAILABLE"}, search ${search || "NOT_AVAILABLE"}`;
    }).join("<br>");
    return `| ${row.bookId} | ${row.sourceRecordKey} | ${row.isbn} | ${row.directWorkKey ?? "NOT_AVAILABLE"} | ${row.conclusion} | ${endpointRows} |`;
  });
  fs.writeFileSync(
    markdownPath,
    `# Điều tra source identity G2.1\n\nKiểm tra: ${report.checkedAt}. Acceptance criterion: **${report.acceptanceCriterion}**.\n\n| Book | Source record | ISBN | Direct work | Kết luận | Endpoint |\n|---|---|---|---|---|---|\n${markdownRows.join("\n")}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  console.log(JSON.stringify({ status: report.status, acceptanceCriterion: report.acceptanceCriterion, rows: rows.map(({ bookId, sourceRecordKey, isbn, directWorkKey, conclusion }) => ({ bookId, sourceRecordKey, isbn, directWorkKey, conclusion })), jsonPath, markdownPath }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
