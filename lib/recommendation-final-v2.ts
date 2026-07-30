import crypto from "node:crypto";

interface ExportEvent {
  eventId: string;
  requestItemId: string;
  type: "IMPRESSION" | "CLICK" | "CONVERSION";
  attributionAnchor?: "LAST_CLICK" | "LAST_IMPRESSION" | null;
  occurredAt: string;
}

interface ExportRequest {
  requestId: string;
  userId: string;
  algorithmVersion: string;
  generatedAt: string;
  items: Array<{ requestItemId: string; bookId: string }>;
  events: ExportEvent[];
}

export interface PilotExportForSplit {
  schemaVersion: string;
  datasetSha256: string;
  readiness: { decision: string };
  requests: ExportRequest[];
}

export interface LockedFinalV2Manifest {
  decision: "READY_FOR_MODELING" | "BLOCKED_BY_DATA";
  primaryMetric: "NDCG@10";
  secondaryMetrics: string[];
  validationStart: string;
  finalV2Start: string;
  datasetSha256: string;
  splitManifestSha256: string;
  windows: {
    train: { eventIds: string[]; users: number; books: number };
    validation: { eventIds: string[]; users: number; books: number };
    finalV2: { eventIds: string[]; users: number; books: number };
  };
  preFinalV2Readiness: FinalV2ReadinessDiagnostics;
  finalV2MetricStatus: "LOCKED_NOT_COMPUTED";
  failureReasons: string[];
}

export const FINAL_V2_READINESS_THRESHOLDS = {
  minimumPositiveUsersValidation: 10,
  minimumPositiveUsersFinalV2: 10,
  minimumPositiveEventsValidation: 20,
  minimumPositiveEventsFinalV2: 20,
  minimumCandidateCatalogFinalV2: 20,
  minimumImpressionsPerObservedAlgorithmFinalV2: 100,
  minimumValidAttributionRatio: 0.9,
  maximumConservativeCtrCiHalfWidth: 0.1,
} as const;

interface SplitDiagnostics {
  positiveUsers: number;
  positiveEvents: number;
  impressions: number;
  candidateCatalog: number;
  validAttributionRatio: number | null;
  impressionsByAlgorithm: Record<string, number>;
}

export interface FinalV2ReadinessDiagnostics {
  thresholdClass: "PRE_FINAL_V2_SPLIT_READINESS";
  statisticalPowerGuaranteed: false;
  validation: SplitDiagnostics;
  finalV2: SplitDiagnostics;
  finalV2PositiveUsersByCohort: {
    cold: number;
    sparse: number;
    warm: number;
  };
  conservativeCtrCiHalfWidthByAlgorithm: Record<string, number>;
}

function normalizedTimestamp(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} không phải timestamp ISO hợp lệ.`);
  }
  return parsed;
}

export function buildLockedFinalV2Manifest(
  input: PilotExportForSplit,
  validationStart: string,
  finalV2Start: string,
): LockedFinalV2Manifest {
  const validation = normalizedTimestamp(validationStart, "validationStart");
  const finalV2 = normalizedTimestamp(finalV2Start, "finalV2Start");
  if (validation.getTime() >= finalV2.getTime()) {
    throw new Error("validationStart phải trước finalV2Start.");
  }

  const itemBooks = new Map<string, string>();
  const itemAlgorithms = new Map<string, string>();
  for (const request of input.requests) {
    for (const item of request.items) {
      itemBooks.set(item.requestItemId, item.bookId);
      itemAlgorithms.set(item.requestItemId, request.algorithmVersion);
    }
  }
  const flat = input.requests.flatMap((request) =>
    request.events.map((event) => ({
      eventId: event.eventId,
      requestItemId: event.requestItemId,
      userId: request.userId,
      algorithmVersion:
        itemAlgorithms.get(event.requestItemId) ?? request.algorithmVersion,
      type: event.type,
      attributionAnchor: event.attributionAnchor ?? null,
      // Export event không cần lặp Book; map qua request item vẫn deterministic.
      bookId:
        itemBooks.get(event.requestItemId) ?? "",
      occurredAt: normalizedTimestamp(event.occurredAt, "event.occurredAt"),
    })),
  );
  const buildWindow = (
    rows: typeof flat,
  ): { eventIds: string[]; users: number; books: number } => ({
    eventIds: rows.map((row) => row.eventId).sort(),
    users: new Set(rows.map((row) => row.userId)).size,
    books: new Set(rows.map((row) => row.bookId).filter(Boolean)).size,
  });
  const trainRows = flat.filter(
    (row) => row.occurredAt.getTime() < validation.getTime(),
  );
  const validationRows = flat.filter(
    (row) =>
      row.occurredAt.getTime() >= validation.getTime() &&
      row.occurredAt.getTime() < finalV2.getTime(),
  );
  const finalRows = flat.filter(
    (row) => row.occurredAt.getTime() >= finalV2.getTime(),
  );
  const positiveTypes = new Set(["CLICK", "CONVERSION"]);
  const trainCountByUser = new Map<string, number>();
  for (const row of trainRows) {
    trainCountByUser.set(row.userId, (trainCountByUser.get(row.userId) ?? 0) + 1);
  }
  const splitDiagnostics = (rows: typeof flat): SplitDiagnostics => {
    const positives = rows.filter((row) => positiveTypes.has(row.type));
    const impressions = rows.filter((row) => row.type === "IMPRESSION");
    const impressionsByItem = new Set(
      impressions.map((row) => row.requestItemId),
    );
    const attributable = positives.filter(
      (row) =>
        row.type === "CLICK" ||
        (row.type === "CONVERSION" && row.attributionAnchor !== null),
    );
    const validAttribution = attributable.filter(
      (row) =>
        row.type === "CONVERSION" ||
        impressionsByItem.has(row.requestItemId),
    );
    const impressionsByAlgorithm: Record<string, number> = {};
    for (const row of impressions) {
      impressionsByAlgorithm[row.algorithmVersion] =
        (impressionsByAlgorithm[row.algorithmVersion] ?? 0) + 1;
    }
    return {
      positiveUsers: new Set(positives.map((row) => row.userId)).size,
      positiveEvents: positives.length,
      impressions: impressions.length,
      candidateCatalog: new Set(rows.map((row) => row.bookId).filter(Boolean))
        .size,
      validAttributionRatio:
        attributable.length > 0
          ? validAttribution.length / attributable.length
          : null,
      impressionsByAlgorithm,
    };
  };
  const validationDiagnostics = splitDiagnostics(validationRows);
  const finalDiagnostics = splitDiagnostics(finalRows);
  const finalPositiveUsers = new Set(
    finalRows
      .filter((row) => positiveTypes.has(row.type))
      .map((row) => row.userId),
  );
  const finalV2PositiveUsersByCohort = { cold: 0, sparse: 0, warm: 0 };
  for (const userId of finalPositiveUsers) {
    const history = trainCountByUser.get(userId) ?? 0;
    if (history === 0) finalV2PositiveUsersByCohort.cold += 1;
    else if (history < 5) finalV2PositiveUsersByCohort.sparse += 1;
    else finalV2PositiveUsersByCohort.warm += 1;
  }
  const conservativeCtrCiHalfWidthByAlgorithm = Object.fromEntries(
    Object.entries(finalDiagnostics.impressionsByAlgorithm).map(
      ([algorithm, impressions]) => [
        algorithm,
        Number((0.98 / Math.sqrt(impressions)).toFixed(6)),
      ],
    ),
  );
  const preFinalV2Readiness: FinalV2ReadinessDiagnostics = {
    thresholdClass: "PRE_FINAL_V2_SPLIT_READINESS",
    statisticalPowerGuaranteed: false,
    validation: validationDiagnostics,
    finalV2: finalDiagnostics,
    finalV2PositiveUsersByCohort,
    conservativeCtrCiHalfWidthByAlgorithm,
  };
  const failureReasons: string[] = [];
  if (input.readiness.decision !== "READY_FOR_FINAL_V2_ASSESSMENT") {
    failureReasons.push("pilot export chưa đạt operational minimum");
  }
  if (trainRows.length === 0) failureReasons.push("train window rỗng");
  if (validationRows.length === 0) failureReasons.push("validation window rỗng");
  if (finalRows.length === 0) failureReasons.push("final_v2 window rỗng");
  if (
    validationDiagnostics.positiveUsers <
    FINAL_V2_READINESS_THRESHOLDS.minimumPositiveUsersValidation
  ) {
    failureReasons.push("validation thiếu user có positive");
  }
  if (
    finalDiagnostics.positiveUsers <
    FINAL_V2_READINESS_THRESHOLDS.minimumPositiveUsersFinalV2
  ) {
    failureReasons.push("final_v2 thiếu user có positive");
  }
  if (
    validationDiagnostics.positiveEvents <
    FINAL_V2_READINESS_THRESHOLDS.minimumPositiveEventsValidation
  ) {
    failureReasons.push("validation thiếu positive event");
  }
  if (
    finalDiagnostics.positiveEvents <
    FINAL_V2_READINESS_THRESHOLDS.minimumPositiveEventsFinalV2
  ) {
    failureReasons.push("final_v2 thiếu positive event");
  }
  if (
    finalDiagnostics.candidateCatalog <
    FINAL_V2_READINESS_THRESHOLDS.minimumCandidateCatalogFinalV2
  ) {
    failureReasons.push("candidate catalog final_v2 quá nhỏ");
  }
  if (
    finalDiagnostics.validAttributionRatio === null ||
    finalDiagnostics.validAttributionRatio <
      FINAL_V2_READINESS_THRESHOLDS.minimumValidAttributionRatio
  ) {
    failureReasons.push("tỷ lệ attribution hợp lệ chưa đạt");
  }
  for (const [algorithm, impressions] of Object.entries(
    finalDiagnostics.impressionsByAlgorithm,
  )) {
    if (
      impressions <
      FINAL_V2_READINESS_THRESHOLDS.minimumImpressionsPerObservedAlgorithmFinalV2
    ) {
      failureReasons.push(`algorithm ${algorithm} thiếu impression final_v2`);
    }
  }
  for (const [algorithm, halfWidth] of Object.entries(
    conservativeCtrCiHalfWidthByAlgorithm,
  )) {
    if (
      halfWidth >
      FINAL_V2_READINESS_THRESHOLDS.maximumConservativeCtrCiHalfWidth
    ) {
      failureReasons.push(`CI dự kiến của ${algorithm} quá rộng`);
    }
  }
  const deterministic = {
    primaryMetric: "NDCG@10" as const,
    secondaryMetrics: [
      "HitRate@10",
      "Recall@10",
      "MRR@10",
      "Coverage@10",
    ],
    validationStart: validation.toISOString(),
    finalV2Start: finalV2.toISOString(),
    datasetSha256: input.datasetSha256,
    windows: {
      train: buildWindow(trainRows),
      validation: buildWindow(validationRows),
      finalV2: buildWindow(finalRows),
    },
    preFinalV2Readiness,
    finalV2MetricStatus: "LOCKED_NOT_COMPUTED" as const,
    failureReasons,
  };
  const splitManifestSha256 = crypto
    .createHash("sha256")
    .update(JSON.stringify(deterministic))
    .digest("hex");
  return {
    decision:
      failureReasons.length === 0 ? "READY_FOR_MODELING" : "BLOCKED_BY_DATA",
    ...deterministic,
    splitManifestSha256,
  };
}
