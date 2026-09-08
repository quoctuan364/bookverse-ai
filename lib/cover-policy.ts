import coverPolicyJson from "@/config/cover-policy.json";

export interface CoverPolicy {
  schemaVersion: number;
  provider: "OPEN_LIBRARY";
  sourceAllowlist: Array<{
    protocol: "https:";
    hostname: string;
    pathPrefix: string;
    pathSuffix: string;
    requiredQuery: Record<string, string>;
  }>;
  followedStorageRedirectAllowlist: string[];
  maxRedirects: number;
  maxConcurrency: number;
  maxRetries: number;
  minImageBytes: number;
  minWidth: number;
  minHeight: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  targetAspectRatio: number;
  maxImageBytes: number;
  rightsStatus: "NOT_VERIFIED";
}

export const COVER_POLICY = coverPolicyJson as CoverPolicy;

function getOpenLibraryRule(): CoverPolicy["sourceAllowlist"][number] {
  const rule = COVER_POLICY.sourceAllowlist[0];
  if (!rule) throw new Error("COVER_POLICY_SOURCE_ALLOWLIST_EMPTY");
  return rule;
}

export function isAllowedCoverSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const rule = getOpenLibraryRule();
    if (url.protocol !== rule.protocol || url.hostname !== rule.hostname) return false;
    if (!url.pathname.startsWith(rule.pathPrefix) || !url.pathname.endsWith(rule.pathSuffix)) return false;
    const id = url.pathname.slice(rule.pathPrefix.length, -rule.pathSuffix.length);
    if (!/^\d+$/u.test(id)) return false;
    for (const [key, expected] of Object.entries(rule.requiredQuery)) {
      if (url.searchParams.get(key) !== expected) return false;
    }
    return url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

export function isAllowedFinalCoverUrl(value: string): boolean {
  if (isAllowedCoverSourceUrl(value)) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    return COVER_POLICY.followedStorageRedirectAllowlist.some(
      (hostname) => url.hostname === hostname || url.hostname.endsWith(`.${hostname}`),
    );
  } catch {
    return false;
  }
}

export function isUsableCoverDimensions(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width < COVER_POLICY.minWidth || height < COVER_POLICY.minHeight) return false;
  const ratio = width / height;
  return ratio >= COVER_POLICY.minAspectRatio && ratio <= COVER_POLICY.maxAspectRatio;
}

export function isValidCoverImageBytes(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes >= COVER_POLICY.minImageBytes && bytes <= COVER_POLICY.maxImageBytes;
}

export function classifyCoverDimension(input: {
  width: number | null;
  height: number | null;
  bytes?: number | null;
  status?: string;
  placeholderSuspected?: boolean;
}): "PLACEHOLDER" | "EMPTY_IMAGE" | "TOO_SMALL" | "LANDSCAPE_INVALID" | "VALID_NON_STANDARD_BOOK_RATIO" | "CORRUPTED" | "TIMEOUT" | "NOT_VERIFIED" {
  if (input.status === "TIMEOUT") return "TIMEOUT";
  if (input.placeholderSuspected) return "PLACEHOLDER";
  if (input.width === null || input.height === null || input.bytes === null || input.width === undefined || input.height === undefined) {
    return input.status === "NOT_FOUND" ? "EMPTY_IMAGE" : "NOT_VERIFIED";
  }
  if (input.width < COVER_POLICY.minWidth || input.height < COVER_POLICY.minHeight || !isValidCoverImageBytes(input.bytes ?? 0)) {
    return "TOO_SMALL";
  }
  const ratio = input.width / input.height;
  if (ratio > COVER_POLICY.maxAspectRatio || ratio < COVER_POLICY.minAspectRatio) return "LANDSCAPE_INVALID";
  if (Math.abs(ratio - COVER_POLICY.targetAspectRatio) > 0.035) return "VALID_NON_STANDARD_BOOK_RATIO";
  return input.status === "INVALID_CONTENT" ? "CORRUPTED" : "NOT_VERIFIED";
}
