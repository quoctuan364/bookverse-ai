import { OrderStatus, UserRole } from "@prisma/client";

export type OrderTransitionActor = "BUYER" | "SELLER" | "ADMIN" | "MODERATOR";

export interface OrderTransitionCheck {
  allowed: boolean;
  message: string;
}

export function actorFromRole(role: UserRole, isBuyer = false): OrderTransitionActor {
  if (role === UserRole.ADMIN) {
    return "ADMIN";
  }

  if (role === UserRole.MODERATOR) {
    return "MODERATOR";
  }

  if (role === UserRole.SELLER) {
    return "SELLER";
  }

  return isBuyer ? "BUYER" : "BUYER";
}

export function isPaidOrderStatus(status: OrderStatus): boolean {
  return status === OrderStatus.PAID || status === OrderStatus.PAID_DEMO;
}

export function getAllowedOrderNextStatuses(
  currentStatus: OrderStatus,
  actor: OrderTransitionActor,
): OrderStatus[] {
  if (currentStatus === OrderStatus.COMPLETED || currentStatus === OrderStatus.CANCELLED) {
    return [];
  }

  if (actor === "BUYER") {
    return currentStatus === OrderStatus.PENDING ? [OrderStatus.CANCELLED] : [];
  }

  if (actor === "SELLER") {
    if (isPaidOrderStatus(currentStatus)) {
      return [OrderStatus.SHIPPED];
    }

    if (currentStatus === OrderStatus.SHIPPED) {
      return [OrderStatus.COMPLETED];
    }

    return [];
  }

  if (actor === "ADMIN" || actor === "MODERATOR") {
    if (currentStatus === OrderStatus.PENDING) {
      return [OrderStatus.PAID, OrderStatus.PAID_DEMO, OrderStatus.CANCELLED];
    }

    if (isPaidOrderStatus(currentStatus)) {
      return [OrderStatus.SHIPPED, OrderStatus.CANCELLED];
    }

    if (currentStatus === OrderStatus.SHIPPED) {
      return [OrderStatus.COMPLETED, OrderStatus.CANCELLED];
    }
  }

  return [];
}

export function checkOrderTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  actor: OrderTransitionActor,
): OrderTransitionCheck {
  if (currentStatus === nextStatus) {
    return {
      allowed: false,
      message: "Trạng thái đơn hàng không thay đổi.",
    };
  }

  const allowedStatuses = getAllowedOrderNextStatuses(currentStatus, actor);

  if (!allowedStatuses.includes(nextStatus)) {
    return {
      allowed: false,
      message: `Không thể chuyển đơn từ ${currentStatus} sang ${nextStatus} với quyền ${actor}.`,
    };
  }

  return {
    allowed: true,
    message: "Transition hợp lệ.",
  };
}

export function parseOrderStatus(value: string): OrderStatus | null {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue in OrderStatus) {
    return OrderStatus[normalizedValue as keyof typeof OrderStatus];
  }

  return null;
}
