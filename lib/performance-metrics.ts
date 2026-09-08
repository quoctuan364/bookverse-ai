export type PerformanceSample = {
  durationMs: number;
  ok: boolean;
  status: number;
};

export type PerformanceSummary = {
  requests: number;
  successful: number;
  failed: number;
  errorRate: number;
  minMs: number;
  averageMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function percentile(sortedValues: number[], ratio: number): number {
  if (sortedValues.length === 0) return 0;
  const boundedRatio = Math.min(1, Math.max(0, ratio));
  const index = Math.ceil(boundedRatio * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

export function summarizePerformance(samples: PerformanceSample[]): PerformanceSummary {
  if (samples.length === 0) {
    return {
      requests: 0,
      successful: 0,
      failed: 0,
      errorRate: 0,
      minMs: 0,
      averageMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
    };
  }

  const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const failed = samples.filter((sample) => !sample.ok).length;
  return {
    requests: samples.length,
    successful: samples.length - failed,
    failed,
    errorRate: round(failed / samples.length),
    minMs: round(durations[0]),
    averageMs: round(durations.reduce((total, value) => total + value, 0) / durations.length),
    p50Ms: round(percentile(durations, 0.5)),
    p95Ms: round(percentile(durations, 0.95)),
    p99Ms: round(percentile(durations, 0.99)),
    maxMs: round(durations[durations.length - 1]),
  };
}
