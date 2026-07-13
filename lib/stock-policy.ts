export type InventoryListingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "SOLD"
  | "REJECTED"
  | "HIDDEN"
  | "ARCHIVED";

export interface InventoryBackfillInput {
  id: string;
  status: InventoryListingStatus;
  stock: number;
  soldAt: Date | null;
  updatedAt: Date;
  sourceStock?: number;
  latestReservedAt?: Date | null;
  activeReservedQuantity?: number;
}

export interface InventoryBackfillDecision {
  stock: number;
  soldAt: Date | null;
  status: InventoryListingStatus;
  source: "SOLD_STATUS" | "DATASET" | "LEGACY_DEFAULT";
  needsReview: boolean;
}

export function isValidStock(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function validateRequestedQuantity(quantity: number, stock: number): string | null {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return "Số lượng phải là số nguyên lớn hơn hoặc bằng 1.";
  }

  if (!isValidStock(stock)) {
    return "Tồn kho listing không hợp lệ.";
  }

  if (quantity > stock) {
    return `Listing chỉ còn ${stock} sản phẩm.`;
  }

  return null;
}

export function inventoryStateAfterReservation(
  stock: number,
  quantity: number,
  reservedAt: Date,
): { stock: number; status: "APPROVED" | "SOLD"; soldAt: Date | null } {
  const error = validateRequestedQuantity(quantity, stock);
  if (error) {
    throw new Error(error);
  }

  const remainingStock = stock - quantity;
  return {
    stock: remainingStock,
    status: remainingStock === 0 ? "SOLD" : "APPROVED",
    soldAt: remainingStock === 0 ? reservedAt : null,
  };
}

export function inventoryStateAfterRestock(
  stock: number,
  quantity: number,
  currentStatus: InventoryListingStatus,
): { stock: number; status: InventoryListingStatus; soldAt: Date | null } {
  if (!isValidStock(stock) || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Dữ liệu hoàn kho không hợp lệ.");
  }

  const nextStock = stock + quantity;
  if (currentStatus === "SOLD") {
    return {
      stock: nextStock,
      status: "APPROVED",
      soldAt: null,
    };
  }

  return {
    stock: nextStock,
    status: currentStatus,
    soldAt: null,
  };
}

export function planInventoryBackfill(input: InventoryBackfillInput): InventoryBackfillDecision {
  if (input.status === "SOLD") {
    return {
      stock: 0,
      soldAt: input.soldAt ?? input.latestReservedAt ?? input.updatedAt,
      status: "SOLD",
      source: "SOLD_STATUS",
      needsReview: input.sourceStock === undefined,
    };
  }

  if (input.sourceStock !== undefined) {
    if (!isValidStock(input.sourceStock)) {
      throw new Error(`Stock nguồn của listing ${input.id} không hợp lệ.`);
    }

    if (input.sourceStock === 0 && input.status === "APPROVED") {
      return {
        stock: 0,
        soldAt: input.soldAt ?? input.latestReservedAt ?? input.updatedAt,
        status: "SOLD",
        source: "DATASET",
        needsReview: false,
      };
    }

    return {
      stock: input.sourceStock,
      soldAt: input.sourceStock > 0 ? null : input.soldAt,
      status: input.status,
      source: "DATASET",
      needsReview: false,
    };
  }

  const activeReservedQuantity = input.activeReservedQuantity ?? 0;
  if (!Number.isInteger(activeReservedQuantity) || activeReservedQuantity < 0) {
    throw new Error(`Tổng quantity đã giữ của listing ${input.id} không hợp lệ.`);
  }
  if (activeReservedQuantity > 0) {
    return {
      stock: 0,
      soldAt: input.soldAt ?? input.latestReservedAt ?? input.updatedAt,
      status: input.status === "APPROVED" ? "SOLD" : input.status,
      source: "LEGACY_DEFAULT",
      needsReview: true,
    };
  }

  return {
    stock: 1,
    soldAt: null,
    status: input.status,
    source: "LEGACY_DEFAULT",
    needsReview: true,
  };
}
