import assert from "node:assert/strict";
import test from "node:test";

import {
  validateReaderRagBenchmark,
  type ReaderRagBenchmarkDataset,
} from "../lib/reader-rag-benchmark";

function buildDataset(questionCount: number): ReaderRagBenchmarkDataset {
  return {
    datasetVersion: "reader-rag-v1",
    corpusChecksum: "a".repeat(64),
    questions: Array.from({ length: questionCount }, (_, index) => ({
      questionId: `Q${String(index + 1).padStart(3, "0")}`,
      bookId: "B0001",
      question: `Câu hỏi kiểm thử cấu trúc số ${index + 1}?`,
      scope: "IN_SCOPE" as const,
      relevantChunkIds: [`chunk-${index + 1}`],
      expectedCitations: ["Chương 1, Trang 1"],
      annotatorId: "A01",
    })),
  };
}

test("benchmark cần 50 đến 100 câu hỏi có nhãn", () => {
  assert.equal(validateReaderRagBenchmark(buildDataset(49)).ready, false);
  assert.equal(validateReaderRagBenchmark(buildDataset(50)).ready, true);
  assert.equal(validateReaderRagBenchmark(buildDataset(100)).ready, true);
  assert.equal(validateReaderRagBenchmark(buildDataset(101)).ready, false);
});

test("không chấp nhận nhãn phạm vi mâu thuẫn", () => {
  const dataset = buildDataset(50);
  dataset.questions[0] = {
    ...dataset.questions[0],
    scope: "OUT_OF_SCOPE",
    relevantChunkIds: ["chunk-khong-hop-le"],
  };

  const result = validateReaderRagBenchmark(dataset);
  assert.equal(result.ready, false);
  assert.match(result.errors.join("\n"), /OUT_OF_SCOPE/u);
});
