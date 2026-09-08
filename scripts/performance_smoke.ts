import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { summarizePerformance, type PerformanceSample } from "../lib/performance-metrics";

type TargetResult = {
  path: string;
  summary: ReturnType<typeof summarizePerformance>;
  statuses: Record<string, number>;
  passed: boolean;
};

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} phải là số nguyên dương.`);
  return value;
}

const baseUrl = (process.env.PERF_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/u, "");
const requestCount = readPositiveInteger("PERF_REQUESTS", 30);
const concurrency = readPositiveInteger("PERF_CONCURRENCY", 5);
const p95LimitMs = readPositiveInteger("PERF_P95_LIMIT_MS", 3_000);
const maxErrorRate = Number(process.env.PERF_MAX_ERROR_RATE ?? "0.02");
const targetPaths = (process.env.PERF_PATHS ?? "/,/catalog,/api/marketplace")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!Number.isFinite(maxErrorRate) || maxErrorRate < 0 || maxErrorRate > 1) {
  throw new Error("PERF_MAX_ERROR_RATE phải nằm trong khoảng 0 đến 1.");
}

async function measure(targetPath: string): Promise<TargetResult> {
  const samples: PerformanceSample[] = [];
  let cursor = 0;

  // Một request khởi động giúp kết quả bớt lệch bởi lần biên dịch/làm nóng đầu tiên.
  await fetch(`${baseUrl}${targetPath}`, { redirect: "follow" }).catch(() => undefined);

  async function worker(): Promise<void> {
    while (cursor < requestCount) {
      cursor += 1;
      const startedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${targetPath}`, {
          headers: { "user-agent": "BookVerse-Performance-Smoke/1.0" },
          redirect: "follow",
        });
        samples.push({
          durationMs: performance.now() - startedAt,
          ok: response.ok,
          status: response.status,
        });
        await response.arrayBuffer();
      } catch {
        samples.push({ durationMs: performance.now() - startedAt, ok: false, status: 0 });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));
  const summary = summarizePerformance(samples);
  const statuses = samples.reduce<Record<string, number>>((result, sample) => {
    const key = String(sample.status);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});

  return {
    path: targetPath,
    summary,
    statuses,
    passed: summary.p95Ms <= p95LimitMs && summary.errorRate <= maxErrorRate,
  };
}

async function main(): Promise<void> {
  console.info(`Đo ${requestCount} request/đường dẫn, concurrency=${concurrency}, base=${baseUrl}`);
  const results: TargetResult[] = [];

  // Chạy lần lượt từng trang để số liệu dễ giải thích trong báo cáo.
  for (const targetPath of targetPaths) {
    const result = await measure(targetPath);
    results.push(result);
    console.info(
      `${result.passed ? "PASS" : "FAIL"} ${targetPath}: p50=${result.summary.p50Ms}ms, ` +
        `p95=${result.summary.p95Ms}ms, lỗi=${(result.summary.errorRate * 100).toFixed(1)}%`,
    );
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    configuration: { baseUrl, requestCount, concurrency, p95LimitMs, maxErrorRate },
    results,
    passed: results.every((result) => result.passed),
  };
  const outputDirectory = path.resolve("outputs", "performance");
  await mkdir(outputDirectory, { recursive: true });
  const runId = artifact.generatedAt.replace(/[:.]/gu, "-");
  const outputPath = path.join(outputDirectory, `performance-${runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(`Đã lưu bằng chứng: ${outputPath}`);

  if (!artifact.passed) process.exitCode = 1;
}

void main();
