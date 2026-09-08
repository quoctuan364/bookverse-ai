export interface ReadingAccessDecisionInput {
  totalPages: number;
  samplePages?: number | null;
  hasEntitlement: boolean;
}

export interface ReadingAccessDecision {
  access: "FULL" | "PREVIEW";
  visiblePages: number;
  totalPages: number;
}

/**
 * Giới hạn đọc thử theo cấu hình asset và không vượt quá 10% tổng số trang.
 * Với sách rất ngắn vẫn cho xem tối thiểu một trang.
 */
export function decideReadingAccess(input: ReadingAccessDecisionInput): ReadingAccessDecision {
  const totalPages = Math.max(1, Math.floor(input.totalPages));

  if (input.hasEntitlement) {
    return {
      access: "FULL",
      visiblePages: totalPages,
      totalPages,
    };
  }

  const configuredSamplePages = Math.max(1, Math.floor(input.samplePages ?? 10));
  // Làm tròn xuống để lời hứa "không vượt quá 10%" luôn đúng.
  // Sách dưới 10 phần vẫn được xem tối thiểu một phần để bản đọc thử có ý nghĩa.
  const tenPercentPages = Math.max(1, Math.floor(totalPages * 0.1));

  return {
    access: "PREVIEW",
    visiblePages: Math.min(totalPages, configuredSamplePages, tenPercentPages),
    totalPages,
  };
}
