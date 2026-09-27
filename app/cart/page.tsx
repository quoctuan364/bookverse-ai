import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  checkoutCart,
  getCartPageData,
  removeCartItem,
  updateCartItemQuantity,
} from "@/actions/cart.actions";
import { CartView } from "@/components/cart/CartView";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giỏ hàng | BookVerse",
  description: "Kiểm tra sản phẩm, địa chỉ giao hàng và hoàn tất thanh toán demo trên BookVerse.",
};

interface CartPageProps {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}

async function updateQuantityAction(formData: FormData) {
  "use server";

  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("nextQuantity") ?? formData.get("quantity") ?? 1);
  const result = await updateCartItemQuantity(itemId, quantity);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/cart");
    }

    redirect(`/cart?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/cart?message=${encodeURIComponent(result.message)}`);
}

async function removeItemAction(formData: FormData) {
  "use server";

  const result = await removeCartItem(String(formData.get("itemId") ?? ""));

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/cart");
    }

    redirect(`/cart?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/cart?message=${encodeURIComponent(result.message)}`);
}

async function checkoutAction(formData: FormData) {
  "use server";

  const result = await checkoutCart(
    String(formData.get("shippingAddressId") ?? ""),
    String(formData.get("paymentMethod") ?? ""),
    String(formData.get("checkoutKey") ?? ""),
  );

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/cart");
    }

    redirect(`/cart?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/orders/${encodeURIComponent(result.orderId ?? "")}?message=${encodeURIComponent(result.message)}`);
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    redirect("/login?callbackUrl=/cart");
  }

  if (currentUser.role === "ADMIN" || currentUser.role === "MODERATOR") {
    redirect("/admin");
  }

  const params = await searchParams;
  const cart = await getCartPageData();

  return (
    <CartView
      cart={cart}
      checkoutAction={checkoutAction}
      error={params?.error}
      message={params?.message}
      removeItemAction={removeItemAction}
      updateQuantityAction={updateQuantityAction}
    />
  );
}
