import assert from "node:assert/strict";
import test from "node:test";

import { percentile, summarizePerformance } from "../lib/performance-metrics";

test("tính percentile theo nearest-rank", () => {
  const values = [10, 20, 30, 40, 50];
  assert.equal(percentile(values, 0.5), 30);
  assert.equal(percentile(values, 0.95), 50);
});

test("tổng hợp latency và tỷ lệ lỗi", () => {
  const result = summarizePerformance([
    { durationMs: 10, ok: true, status: 200 },
    { durationMs: 20, ok: true, status: 200 },
    { durationMs: 40, ok: false, status: 500 },
  ]);

  assert.equal(result.requests, 3);
  assert.equal(result.successful, 2);
  assert.equal(result.failed, 1);
  assert.equal(result.errorRate, 0.33);
  assert.equal(result.averageMs, 23.33);
  assert.equal(result.p95Ms, 40);
});
