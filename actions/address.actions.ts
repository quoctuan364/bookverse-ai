"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { PermissionError, requireAuthenticatedUser } from "@/lib/permissions";

export interface ShippingAddressItem {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
  makeDefault?: boolean;
}

export interface AddressActionResult {
  success: boolean;
  message: string;
  reason?: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

type ValidatedAddress = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note: string | null;
};

function cleanText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function validateAddressInput(input: ShippingAddressInput): ValidatedAddress | string {
  const fullName = cleanText(input.fullName, 120);
  const phone = cleanText(input.phone, 30);
  const province = cleanText(input.province, 100);
  const district = cleanText(input.district, 100);
  const ward = cleanText(input.ward, 100);
  const addressLine = cleanText(input.addressLine, 220);
  const note = cleanText(input.note ?? "", 220) || null;

  if (!fullName || !phone || !province || !district || !ward || !addressLine) {
    return "Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.";
  }

  if (!/^[0-9+\-\s().]{8,30}$/.test(phone)) {
    return "Số điện thoại không hợp lệ.";
  }

  return {
    fullName,
    phone,
    province,
    district,
    ward,
    addressLine,
    note,
  };
}

function handleAddressError(error: unknown, fallbackMessage: string): AddressActionResult {
  if (error instanceof PermissionError) {
    return {
      success: false,
      message: error.message,
      reason: "AUTH_REQUIRED",
    };
  }

  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[address] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
    reason: "DATABASE_ERROR",
  };
}

export async function getShippingAddresses(): Promise<ShippingAddressItem[]> {
  const user = await requireAuthenticatedUser();

  return prisma.shippingAddress.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function createShippingAddress(input: ShippingAddressInput): Promise<AddressActionResult> {
  try {
    const user = await requireAuthenticatedUser();
    const validated = validateAddressInput(input);

    if (typeof validated === "string") {
      return {
        success: false,
        message: validated,
        reason: "VALIDATION_ERROR",
      };
    }

    await prisma.$transaction(async (tx) => {
      const existingCount = await tx.shippingAddress.count({
        where: {
          userId: user.id,
        },
      });
      const isDefault = Boolean(input.makeDefault) || existingCount === 0;

      if (isDefault) {
        await tx.shippingAddress.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const address = await tx.shippingAddress.create({
        data: {
          userId: user.id,
          ...validated,
          isDefault,
        },
        select: {
          id: true,
        },
      });

      await recordAuditLog(
        {
          actorId: user.id,
          action: "USER_SHIPPING_ADDRESS_CREATE",
          entityType: "SHIPPING_ADDRESS",
          entityId: address.id,
          metadata: {
            isDefault,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath("/profile/addresses");
    revalidatePath("/cart");

    return {
      success: true,
      message: "Đã thêm địa chỉ giao hàng.",
    };
  } catch (error: unknown) {
    return handleAddressError(error, "Không thể thêm địa chỉ giao hàng.");
  }
}

export async function updateShippingAddress(
  addressId: string,
  input: ShippingAddressInput,
): Promise<AddressActionResult> {
  try {
    const user = await requireAuthenticatedUser();
    const cleanAddressId = addressId.trim();
    const validated = validateAddressInput(input);

    if (!cleanAddressId) {
      return {
        success: false,
        message: "Thiếu mã địa chỉ.",
        reason: "VALIDATION_ERROR",
      };
    }

    if (typeof validated === "string") {
      return {
        success: false,
        message: validated,
        reason: "VALIDATION_ERROR",
      };
    }

    const existingAddress = await prisma.shippingAddress.findFirst({
      where: {
        id: cleanAddressId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingAddress) {
      return {
        success: false,
        message: "Không tìm thấy địa chỉ của bạn.",
        reason: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (input.makeDefault) {
        await tx.shippingAddress.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      await tx.shippingAddress.update({
        where: {
          id: cleanAddressId,
        },
        data: {
          ...validated,
          ...(input.makeDefault ? { isDefault: true } : {}),
        },
      });

      await recordAuditLog(
        {
          actorId: user.id,
          action: "USER_SHIPPING_ADDRESS_UPDATE",
          entityType: "SHIPPING_ADDRESS",
          entityId: cleanAddressId,
          metadata: {
            makeDefault: Boolean(input.makeDefault),
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath("/profile/addresses");
    revalidatePath("/cart");

    return {
      success: true,
      message: "Đã cập nhật địa chỉ giao hàng.",
    };
  } catch (error: unknown) {
    return handleAddressError(error, "Không thể cập nhật địa chỉ giao hàng.");
  }
}

export async function deleteShippingAddress(addressId: string): Promise<AddressActionResult> {
  try {
    const user = await requireAuthenticatedUser();
    const cleanAddressId = addressId.trim();

    if (!cleanAddressId) {
      return {
        success: false,
        message: "Thiếu mã địa chỉ.",
        reason: "VALIDATION_ERROR",
      };
    }

    const existingAddress = await prisma.shippingAddress.findFirst({
      where: {
        id: cleanAddressId,
        userId: user.id,
      },
      select: {
        id: true,
        isDefault: true,
      },
    });

    if (!existingAddress) {
      return {
        success: false,
        message: "Không tìm thấy địa chỉ của bạn.",
        reason: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.shippingAddress.delete({
        where: {
          id: cleanAddressId,
        },
      });

      if (existingAddress.isDefault) {
        const nextDefault = await tx.shippingAddress.findFirst({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
          },
        });

        if (nextDefault) {
          await tx.shippingAddress.update({
            where: {
              id: nextDefault.id,
            },
            data: {
              isDefault: true,
            },
          });
        }
      }

      await recordAuditLog(
        {
          actorId: user.id,
          action: "USER_SHIPPING_ADDRESS_DELETE",
          entityType: "SHIPPING_ADDRESS",
          entityId: cleanAddressId,
        },
        tx,
      );
    });

    revalidatePath("/profile/addresses");
    revalidatePath("/cart");

    return {
      success: true,
      message: "Đã xóa địa chỉ giao hàng.",
    };
  } catch (error: unknown) {
    return handleAddressError(error, "Không thể xóa địa chỉ giao hàng.");
  }
}

export async function setDefaultShippingAddress(addressId: string): Promise<AddressActionResult> {
  try {
    const user = await requireAuthenticatedUser();
    const cleanAddressId = addressId.trim();

    const existingAddress = await prisma.shippingAddress.findFirst({
      where: {
        id: cleanAddressId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingAddress) {
      return {
        success: false,
        message: "Không tìm thấy địa chỉ của bạn.",
        reason: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.shippingAddress.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      await tx.shippingAddress.update({
        where: {
          id: cleanAddressId,
        },
        data: {
          isDefault: true,
        },
      });

      await recordAuditLog(
        {
          actorId: user.id,
          action: "USER_SHIPPING_ADDRESS_SET_DEFAULT",
          entityType: "SHIPPING_ADDRESS",
          entityId: cleanAddressId,
        },
        tx,
      );
    });

    revalidatePath("/profile/addresses");
    revalidatePath("/cart");

    return {
      success: true,
      message: "Đã đặt địa chỉ mặc định.",
    };
  } catch (error: unknown) {
    return handleAddressError(error, "Không thể đặt địa chỉ mặc định.");
  }
}
