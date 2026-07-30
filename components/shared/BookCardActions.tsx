"use client";

import { useActionState } from "react";
import { Heart, LoaderCircle, ShoppingCart } from "lucide-react";
import {
  addBookCardToCart,
  toggleBookCardFavorite,
  type BookCardActionState,
} from "@/actions/book-card.actions";
import { cn } from "@/lib/utils";
import { useFormStatus } from "react-dom";

const INITIAL_STATE: BookCardActionState = {
  success: false,
  message: "",
};

interface BookCardActionsProps {
  availableListingId?: string | null;
  bookId: string;
  initialFavorite?: boolean;
  returnPath?: string;
  showCart?: boolean;
  showFavorite?: boolean;
}

function FavoriteSubmitButton({ active, expanded = false }: { active: boolean; expanded?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={active ? "Bỏ khỏi sách yêu thích" : "Thêm vào sách yêu thích"}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2",
        expanded && "w-full gap-2 px-4",
        active
          ? "border-[#C65D43]/30 bg-[#FFF1ED] text-[#C65D43]"
          : "border-[#1D2433]/10 bg-white text-[#536071] hover:border-[#C65D43]/35 hover:bg-[#FFF7F4] hover:text-[#C65D43]",
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Heart className={cn("h-5 w-5", active && "fill-current")} aria-hidden="true" />
      )}
      {expanded ? <span className="text-sm font-black">{active ? "Đã lưu vào thư viện" : "Lưu vào thư viện"}</span> : null}
    </button>
  );
}

function CartSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176B62] px-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(23,107,98,0.16)] transition duration-200 hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? "Đang thêm..." : "Thêm giỏ"}
    </button>
  );
}

export function BookCardActions({
  availableListingId,
  bookId,
  initialFavorite = false,
  returnPath = "/",
  showCart = true,
  showFavorite = true,
}: BookCardActionsProps) {
  const [favoriteState, favoriteAction] = useActionState(toggleBookCardFavorite, {
    ...INITIAL_STATE,
    isFavorite: initialFavorite,
  });
  const [cartState, cartAction] = useActionState(addBookCardToCart, INITIAL_STATE);
  const isFavorite = favoriteState.isFavorite ?? initialFavorite;
  const message = cartState.message || favoriteState.message;
  const isSuccess = cartState.message ? cartState.success : favoriteState.success;

  return (
    <div>
      <div className="flex gap-2">
        {showFavorite ? (
          <form action={favoriteAction} className={showCart ? undefined : "min-w-0 flex-1"}>
            <input name="bookId" type="hidden" value={bookId} />
            <input name="returnPath" type="hidden" value={returnPath} />
            <FavoriteSubmitButton active={isFavorite} expanded={!showCart} />
          </form>
        ) : null}

        {showCart && availableListingId ? (
          <form action={cartAction} className="flex min-w-0 flex-1">
            <input name="listingId" type="hidden" value={availableListingId} />
            <input name="returnPath" type="hidden" value={returnPath} />
            <CartSubmitButton />
          </form>
        ) : showCart ? (
          <a
            className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#1D2433]/10 bg-[#F7F5EF] px-3 text-sm font-black text-[#536071] transition duration-200 hover:border-[#176B62]/30 hover:bg-[#EDF8F5] hover:text-[#176B62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2"
            href={`/book/${encodeURIComponent(bookId)}`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Xem lựa chọn
          </a>
        ) : null}
      </div>

      {message ? (
        <p
          aria-live="polite"
          className={cn(
            "mt-2 line-clamp-2 text-xs font-semibold leading-5",
            isSuccess ? "text-[#176B62]" : "text-[#B42318]",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
