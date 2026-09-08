export type ReaderRagBenchmarkScope = "IN_SCOPE" | "OUT_OF_SCOPE";

export interface ReaderRagBenchmarkQuestion {
  questionId: string;
  bookId: string;
  question: string;
  scope: ReaderRagBenchmarkScope;
  relevantChunkIds: string[];
  expectedCitations: string[];
  annotatorId: string;
  notes?: string;
}

export interface ReaderRagBenchmarkDataset {
  datasetVersion: string;
  corpusChecksum: string;
  questions: ReaderRagBenchmarkQuestion[];
}

export interface ReaderRagBenchmarkValidation {
  ready: boolean;
  errors: string[];
  questionCount: number;
}

/** Chỉ kiểm tra cấu trúc; hàm không tự sinh câu hỏi hoặc nhãn nghiên cứu. */
export function validateReaderRagBenchmark(
  dataset: ReaderRagBenchmarkDataset,
): ReaderRagBenchmarkValidation {
  const errors: string[] = [];
  const questions = Array.isArray(dataset.questions) ? dataset.questions : [];

  if (!dataset.datasetVersion?.trim()) errors.push("Thiếu datasetVersion.");
  if (!/^[a-f0-9]{64}$/iu.test(dataset.corpusChecksum ?? "")) {
    errors.push("corpusChecksum phải là SHA-256 gồm 64 ký tự hex.");
  }
  if (questions.length < 50 || questions.length > 100) {
    errors.push("Benchmark chỉ sẵn sàng khi có từ 50 đến 100 câu hỏi có nhãn.");
  }

  const seenIds = new Set<string>();
  questions.forEach((item, index) => {
    const label = `Câu ${index + 1}`;
    if (!item.questionId?.trim()) errors.push(`${label}: thiếu questionId.`);
    if (seenIds.has(item.questionId)) errors.push(`${label}: questionId bị trùng.`);
    seenIds.add(item.questionId);

    if (!/^(?:B\d{4}|RB\d{5})$/u.test(item.bookId ?? "")) {
      errors.push(`${label}: bookId không hợp lệ.`);
    }
    if ((item.question?.trim().length ?? 0) < 5) {
      errors.push(`${label}: câu hỏi quá ngắn.`);
    }
    if (item.scope !== "IN_SCOPE" && item.scope !== "OUT_OF_SCOPE") {
      errors.push(`${label}: scope không hợp lệ.`);
    }
    if (!item.annotatorId?.trim()) errors.push(`${label}: thiếu annotatorId.`);

    const relevantIds = Array.isArray(item.relevantChunkIds)
      ? item.relevantChunkIds.filter((value) => value.trim())
      : [];
    if (item.scope === "IN_SCOPE" && relevantIds.length === 0) {
      errors.push(`${label}: câu IN_SCOPE phải có relevantChunkIds do người gán nhãn xác nhận.`);
    }
    if (item.scope === "OUT_OF_SCOPE" && relevantIds.length > 0) {
      errors.push(`${label}: câu OUT_OF_SCOPE không được có relevantChunkIds.`);
    }
  });

  return { ready: errors.length === 0, errors, questionCount: questions.length };
}
