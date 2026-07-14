export const RECOMMENDATION_ATTRIBUTION_WINDOW_DAYS_DEFAULT = 7;
export const RECOMMENDATION_EVENT_BODY_LIMIT_BYTES = 2_048;
export const RECOMMENDATION_EVENT_RATE_LIMIT_PER_MINUTE = 120;
export const IMPRESSION_VISIBILITY_RATIO = 0.5;
export const IMPRESSION_MINIMUM_MS = 1_000;

const ATTRIBUTABLE_PURCHASE_STATUSES = new Set(["PAID", "PAID_DEMO", "SHIPPED", "COMPLETED"]);

export type ClientTelemetryEvent = "IMPRESSION" | "CLICK";

export interface ParsedTelemetryPayload {
  requestId: string;
  bookId: string;
  eventType: ClientTelemetryEvent;
}

export interface ExposureCandidate {
  requestId: string;
  requestItemId: string;
  bookId: string;
  type: ClientTelemetryEvent;
  occurredAt: Date;
}

export interface VerifiedConversion {
  bookId: string;
  sourceType: string;
  sourceId: string;
  canonicalEvent: string;
  occurredAt: Date;
}

export interface ConversionAttribution {
  exposure: ExposureCandidate;
  conversion: VerifiedConversion;
  anchor: "LAST_CLICK" | "LAST_IMPRESSION";
}

function readShortIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function parseTelemetryPayload(value: unknown): ParsedTelemetryPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Payload telemetry không hợp lệ.");
  }

  const input = value as Record<string, unknown>;
  const requestId = readShortIdentifier(input.requestId);
  const bookId = readShortIdentifier(input.bookId);
  const eventType = input.eventType;
  if (!requestId || !bookId || (eventType !== "IMPRESSION" && eventType !== "CLICK")) {
    throw new Error("requestId, bookId hoặc eventType không hợp lệ.");
  }

  // Chỉ trả ba field được phép; score/rank/userId từ client bị bỏ qua hoàn toàn.
  return { requestId, bookId, eventType };
}

export function attributionWindowDays(value?: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return RECOMMENDATION_ATTRIBUTION_WINDOW_DAYS_DEFAULT;
  return Math.min(30, Math.max(1, parsed));
}

export function isAttributablePurchaseStatus(status: string): boolean {
  return ATTRIBUTABLE_PURCHASE_STATUSES.has(status.trim().toUpperCase());
}

export function qualifiesAsImpression(intersectionRatio: number, visibleMs: number): boolean {
  return intersectionRatio >= IMPRESSION_VISIBILITY_RATIO && visibleMs >= IMPRESSION_MINIMUM_MS;
}

export function selectConversionAttributions(
  exposures: ExposureCandidate[],
  conversions: VerifiedConversion[],
  windowMs: number,
): ConversionAttribution[] {
  if (windowMs <= 0) throw new Error("Attribution window phải lớn hơn 0.");
  const results: ConversionAttribution[] = [];

  for (const conversion of conversions) {
    const eligible = exposures.filter(
      (exposure) =>
        exposure.bookId === conversion.bookId &&
        exposure.occurredAt.getTime() <= conversion.occurredAt.getTime() &&
        conversion.occurredAt.getTime() <= exposure.occurredAt.getTime() + windowMs,
    );
    const clicks = eligible.filter((exposure) => exposure.type === "CLICK");
    const pool = clicks.length > 0 ? clicks : eligible.filter((exposure) => exposure.type === "IMPRESSION");
    pool.sort((left, right) => {
      const timeDelta = right.occurredAt.getTime() - left.occurredAt.getTime();
      return timeDelta || right.requestItemId.localeCompare(left.requestItemId);
    });
    const selected = pool[0];
    if (selected) {
      results.push({
        exposure: selected,
        conversion,
        anchor: selected.type === "CLICK" ? "LAST_CLICK" : "LAST_IMPRESSION",
      });
    }
  }
  return results;
}

export function calculateInstrumentedCtr(
  impressionItemIds: Iterable<string>,
  clickItemIds: Iterable<string>,
): { status: "AVAILABLE" | "NOT_AVAILABLE"; impressions: number; clicks: number; ctr: number | null } {
  const impressions = new Set(impressionItemIds);
  const clicks = new Set(clickItemIds);
  if (impressions.size === 0) {
    return { status: "NOT_AVAILABLE", impressions: 0, clicks: clicks.size, ctr: null };
  }
  let validClicks = 0;
  for (const itemId of clicks) if (impressions.has(itemId)) validClicks += 1;
  return {
    status: "AVAILABLE",
    impressions: impressions.size,
    clicks: validClicks,
    ctr: validClicks / impressions.size,
  };
}

interface RateBucket {
  startedAt: number;
  count: number;
}

export class TelemetryRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(
    private readonly limit = RECOMMENDATION_EVENT_RATE_LIMIT_PER_MINUTE,
    private readonly windowMs = 60_000,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const current = this.buckets.get(key);
    if (!current || now - current.startedAt >= this.windowMs) {
      this.buckets.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}
