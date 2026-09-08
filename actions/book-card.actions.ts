"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toggleFavoriteBook } from "@/actions/library.actions";
import { addListingToCart } from "@/actions/marketplace.actions";

export interface BookCardActionState {
  success: boolean;
  message: string;
  isFavorite?: boolean;
}

function safeReturnPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value.trim() : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function toggleBookCardFavorite(
  _previousState: BookCardActionState,
  formData: FormData,
): Promise<BookCardActionState> {
  const bookId = String(formData.get("bookId") ?? "");
  const returnPath = safeReturnPath(formData.get("returnPath"));
  const result = await toggleFavoriteBook(bookId);

  if (!result.success && result.reason === "AUTH_REQUIRED") {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);
  }

  revalidatePath("/");
  revalidatePath("/catalog");

  return {
    success: result.success,
    message: result.message,
    isFavorite: result.isFavorite,
  };
}

export async function addBookCardToCart(
  _previousState: BookCardActionState,
  formData: FormData,
): Promise<BookCardActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  const returnPath = safeReturnPath(formData.get("returnPath"));
  const result = await addListingToCart(listingId);

  if (!result.success && result.reason === "AUTH_REQUIRED") {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);
  }

  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/cart");

  return {
    success: result.success,
    message: result.message,
  };
}
