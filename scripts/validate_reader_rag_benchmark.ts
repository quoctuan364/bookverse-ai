import { readFileSync } from "node:fs";
import path from "node:path";

import {
  validateReaderRagBenchmark,
  type ReaderRagBenchmarkDataset,
} from "@/lib/reader-rag-benchmark";

const fileArgument = process.argv.find((argument) => argument.startsWith("--file="));
if (!fileArgument) {
  console.error("Cách dùng: npm run benchmark:reader:validate -- --file=<duong-dan-json>");
  process.exitCode = 2;
} else {
  const inputPath = path.resolve(fileArgument.slice("--file=".length));
  const dataset = JSON.parse(readFileSync(inputPath, "utf8")) as ReaderRagBenchmarkDataset;
  const result = validateReaderRagBenchmark(dataset);

  console.log(`Số câu hỏi: ${result.questionCount}`);
  if (!result.ready) {
    console.error("[NOT_AVAILABLE] Benchmark chưa đủ điều kiện công bố:");
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log("[PASS] Bộ câu hỏi đạt điều kiện cấu trúc để chạy benchmark.");
  }
}
