import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import "dotenv/config";
import prisma from "../lib/prisma";

interface GeneratedChapter {
  title: string;
  paragraphs: string[];
}

interface GeneratedBookContent {
  schemaVersion: "bookverse-original-content.v1";
  bookId: string;
  originalCatalogTitle: string;
  titleVi: string;
  contentLabel: "NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE";
  disclaimer: string;
  chapters: GeneratedChapter[];
  provenance: {
    provider: "openai" | "gemini";
    model: string;
    generatedAt: string;
    promptHash: string;
  };
}

interface CandidateBook {
  id: string;
  title: string;
  authorName: string;
  description: string | null;
  pages: number | null;
  publishYear: number | null;
  category: {
    name: string;
  };
}

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "data",
  "derived",
  "bookverse-original-content",
);
const MIN_CHAPTERS = 6;
const MIN_PARAGRAPHS_PER_CHAPTER = 5;
const MIN_WORDS = 2_500;

function readPositiveIntegerArgument(name: string, fallback: number): number {
  const raw = process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} phải là số nguyên dương.`);
  }
  return value;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function wordCount(value: string): number {
  return value.split(/\s+/gu).filter(Boolean).length;
}

function buildPrompt(book: CandidateBook): string {
  const metadataDescription = cleanText(book.description).slice(0, 1_500);
  return [
    "Bạn là biên tập viên tiếng Việt của BookVerse.",
    "Hãy viết một SỔ TAY ĐỒNG HÀNH ĐỌC hoàn toàn nguyên bản bằng tiếng Việt.",
    "Không chép, dịch, mô phỏng văn phong, tái dựng cốt truyện hoặc giả làm nội dung của tác phẩm gốc.",
    "Chỉ dùng metadata bên dưới để chọn chủ đề giáo dục tổng quát.",
    `Tạo ít nhất ${MIN_CHAPTERS} chương; mỗi chương ít nhất ${MIN_PARAGRAPHS_PER_CHAPTER} đoạn.`,
    `Tổng cộng tối thiểu ${MIN_WORDS} từ, nội dung cụ thể, có ví dụ, bài tập và câu hỏi suy ngẫm.`,
    "Không dùng câu đệm lặp lại giữa các chương.",
    "Tên titleVi phải là tên tiếng Việt tự nhiên cho sổ tay đồng hành, không mạo nhận là tên bản dịch chính thức.",
    "Chỉ trả JSON hợp lệ theo cấu trúc:",
    '{"titleVi":"...","disclaimer":"Nội dung nguyên bản do BookVerse biên soạn; không phải bản dịch, trích đoạn hoặc 50% nguyên tác.","chapters":[{"title":"...","paragraphs":["..."]}]}',
    "",
    `Mã sách: ${book.id}`,
    `Tiêu đề catalog: ${book.title}`,
    `Tác giả metadata: ${book.authorName}`,
    `Thể loại: ${book.category.name}`,
    `Năm: ${book.publishYear ?? "không rõ"}`,
    `Số trang metadata: ${book.pages ?? "không rõ"}`,
    `Mô tả metadata tham khảo chủ đề: ${metadataDescription || "không có"}`,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  return JSON.parse(clean);
}

function validateGeneratedPayload(
  payload: unknown,
): Omit<GeneratedBookContent, "schemaVersion" | "bookId" | "originalCatalogTitle" | "contentLabel" | "provenance"> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Provider không trả JSON object.");
  }
  const record = payload as Record<string, unknown>;
  const titleVi = cleanText(record.titleVi);
  const disclaimer = cleanText(record.disclaimer);
  const rawChapters = Array.isArray(record.chapters) ? record.chapters : [];
  const chapters = rawChapters.map((chapter, chapterIndex) => {
    if (!chapter || typeof chapter !== "object") {
      throw new Error(`Chương ${chapterIndex + 1} không hợp lệ.`);
    }
    const chapterRecord = chapter as Record<string, unknown>;
    const title = cleanText(chapterRecord.title);
    const paragraphs = Array.isArray(chapterRecord.paragraphs)
      ? chapterRecord.paragraphs.map(cleanText).filter(Boolean)
      : [];
    if (!title || paragraphs.length < MIN_PARAGRAPHS_PER_CHAPTER) {
      throw new Error(
        `Chương ${chapterIndex + 1} phải có tiêu đề và ít nhất ${MIN_PARAGRAPHS_PER_CHAPTER} đoạn.`,
      );
    }
    return { title, paragraphs };
  });

  if (!titleVi) throw new Error("Thiếu titleVi.");
  if (!disclaimer.includes("BookVerse") || !disclaimer.toLowerCase().includes("không")) {
    throw new Error("Disclaimer chưa phân biệt rõ nội dung BookVerse với nguyên tác.");
  }
  if (chapters.length < MIN_CHAPTERS) {
    throw new Error(`Nội dung phải có ít nhất ${MIN_CHAPTERS} chương.`);
  }

  const allParagraphs = chapters.flatMap((chapter) => chapter.paragraphs);
  const totalWords = wordCount(allParagraphs.join(" "));
  if (totalWords < MIN_WORDS) {
    throw new Error(`Nội dung chỉ có ${totalWords}/${MIN_WORDS} từ tối thiểu.`);
  }
  const uniqueParagraphs = new Set(
    allParagraphs.map((paragraph) => paragraph.toLocaleLowerCase("vi")),
  );
  if (uniqueParagraphs.size !== allParagraphs.length) {
    throw new Error("Phát hiện đoạn văn bị lặp nguyên vẹn.");
  }

  return { titleVi, disclaimer, chapters };
}

function providerConfiguration(): {
  provider: "openai" | "gemini";
  apiKey: string;
  model: string;
} {
  const configuredProvider =
    process.env.BOOKVERSE_CONTENT_PROVIDER?.trim().toLowerCase();
  const provider =
    configuredProvider === "gemini" || (!configuredProvider && process.env.GEMINI_API_KEY)
      ? "gemini"
      : "openai";
  const apiKey =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      `Thiếu ${provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"}. ` +
        "Không dùng template lặp thay cho nội dung chất lượng.",
    );
  }
  return {
    provider,
    apiKey,
    model:
      process.env.BOOKVERSE_CONTENT_MODEL?.trim() ||
      // Luna phù hợp công việc sinh nội dung theo lô lớn; có thể đổi bằng biến môi trường.
      (provider === "gemini" ? "gemini-2.5-flash" : "gpt-5.6-luna"),
  };
}

async function callProvider(
  prompt: string,
  configuration: ReturnType<typeof providerConfiguration>,
): Promise<string> {
  if (configuration.provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: configuration.model,
        input: prompt,
        reasoning: { effort: "low" },
        max_output_tokens: 12_000,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}.`);
    const body = (await response.json()) as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text = body.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")
      ?.text;
    if (!text) throw new Error("OpenAI không trả output_text.");
    return text;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(configuration.model)}:generateContent?key=${encodeURIComponent(configuration.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}.`);
  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini không trả nội dung.");
  return text;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const limit = readPositiveIntegerArgument("limit", 3);
  const books = await prisma.book.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: { id: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      authorName: true,
      description: true,
      pages: true,
      publishYear: true,
      category: { select: { name: true } },
    },
  });

  if (!execute) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          selectedBooks: books.length,
          outputDirectory: OUTPUT_DIR,
          requirements: {
            minimumChapters: MIN_CHAPTERS,
            minimumParagraphsPerChapter: MIN_PARAGRAPHS_PER_CHAPTER,
            minimumWords: MIN_WORDS,
            label: "NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE",
          },
          books: books.map((book) => ({ id: book.id, title: book.title })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const configuration = providerConfiguration();
  await mkdir(OUTPUT_DIR, { recursive: true });
  const results: Array<{ bookId: string; status: "generated" | "skipped"; words?: number }> = [];

  for (const book of books) {
    const outputPath = path.join(OUTPUT_DIR, `${book.id}.json`);
    if (await fileExists(outputPath)) {
      results.push({ bookId: book.id, status: "skipped" });
      continue;
    }

    const prompt = buildPrompt(book);
    const providerText = await callProvider(prompt, configuration);
    const validated = validateGeneratedPayload(extractJson(providerText));
    const output: GeneratedBookContent = {
      schemaVersion: "bookverse-original-content.v1",
      bookId: book.id,
      originalCatalogTitle: book.title,
      titleVi: validated.titleVi,
      contentLabel: "NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE",
      disclaimer: validated.disclaimer,
      chapters: validated.chapters,
      provenance: {
        provider: configuration.provider,
        model: configuration.model,
        generatedAt: new Date().toISOString(),
        promptHash: createHash("sha256").update(prompt).digest("hex"),
      },
    };
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    const words = wordCount(
      output.chapters.flatMap((chapter) => chapter.paragraphs).join(" "),
    );
    results.push({ bookId: book.id, status: "generated", words });
    console.log(`[content] ${book.id}: ${words} từ.`);
  }

  console.log(
    JSON.stringify(
      {
        mode: "execute",
        provider: configuration.provider,
        model: configuration.model,
        results,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
