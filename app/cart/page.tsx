import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, MapPin, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  checkoutCart,
  getCartPageData,
  removeCartItem,
  updateCartItemQuantity,
} from "@/actions/cart.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { BookCover } from "@/components/shared/BookCover";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface CartPageProps {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function conditionLabel(value: string | null): string {
  switch (value) {
    case "NEW":
      return "Mới";
    case "LIKE_NEW":
      return "Như mới";
    case "GOOD":
      return "Tốt";
    case "FAIR":
      return "Đã dùng";
    case "POOR":
      return "Cũ";
    case "DIGITAL":
      return "Ebook";
    default:
      return "Không rõ";
  }
}

function listingStatusLabel(value: string | null): string {
  switch (value) {
    case "APPROVED":
      return "Có thể mua";
    case "PENDING_REVIEW":
      return "Chờ duyệt";
    case "REJECTED":
      return "Bị từ chối";
    case "HIDDEN":
      return "Đã ẩn";
    case "SOLD":
      return "Đã bán";
    default:
      return value ?? "Không còn listing";
  }
}

const paymentMethodOptions = [
  { value: "COD", label: "COD" },
  { value: "BANK_TRANSFER_DEMO", label: "Chuyển khoản demo" },
  { value: "WALLET_DEMO", label: "Ví BookVerse demo" },
];

function formatAddressLine(address: {
  addressLine: string;
  ward: string;
  district: string;
  province: string;
}): string {
  return [address.addressLine, address.ward, address.district, address.province].join(", ");
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

  const params = await searchParams;
  const cart = await getCartPageData();

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Thanh toán BookVerse</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Giỏ hàng của bạn</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">
              Kiểm tra sách đã chọn, chỉnh số lượng và hoàn tất thanh toán demo.
            </p>
          </div>

          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#FFFDF8] px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-[#F2C14E]/95"
            href="/marketplace"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Tiếp tục mua sách
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          {params?.message ? (
            <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {params.message}
            </div>
          ) : null}

          {params?.error ? (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}

          {cart.items.length === 0 ? (
            <div className="bv-card rounded-lg p-8 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-[#E76F51]" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black text-[#17202A]">Giỏ hàng đang trống</h2>
              <p className="mt-2 text-sm text-[#66706B]">
                Hãy thêm một tin bán đã duyệt từ chợ sách cũ để demo luồng mua hàng.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <article
                  className="rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] p-4 shadow-[0_12px_34px_rgba(39,44,51,0.08)]"
                  key={item.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Link
                      className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg bg-[#EDE3D5] shadow-[0_12px_26px_rgba(39,44,51,0.12)]"
                      href={`/book/${item.book.id}`}
                    >
                      <BookCover
                        alt={`Bìa sách ${item.book.title}`}
                        author={item.book.author}
                        bookId={item.book.id}
                        className="h-full w-full object-cover"
                        src={item.book.coverImage}
                        title={item.book.title}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        className="line-clamp-2 text-lg font-black text-[#17202A] hover:underline"
                        href={`/book/${item.book.id}`}
                      >
                        {item.listingTitle ?? item.book.title}
                      </Link>
                      <p className="mt-1 text-sm font-medium text-[#66706B]">{item.book.author}</p>
                      <p className="mt-1 text-sm font-medium text-[#66706B]">
                        Người bán: {item.seller?.name ?? "BookVerse"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#0F766E]/20 px-2.5 py-1 text-xs font-black text-[#7DD3C7]">
                          {conditionLabel(item.condition)}
                        </span>
                        <span
                          className={
                            item.availability.ok
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800"
                              : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-800"
                          }
                        >
                          {item.availability.ok ? listingStatusLabel(item.listingStatus) : "Không khả dụng"}
                        </span>
                      </div>
                      {!item.availability.ok ? (
                        <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                          {item.availability.message}
                        </p>
                      ) : null}
                      <p className="mt-3 text-base font-black text-[#E76F51]">
                        {formatPrice(item.totalPrice)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#66706B]">Còn lại: {item.stock}</p>
                    </div>

                    <div className="grid gap-3 sm:w-44">
                      <form action={updateQuantityAction} className="flex items-center gap-2">
                        <input name="itemId" type="hidden" value={item.id} />
                        <Button
                          aria-label="Giảm số lượng"
                          className="shrink-0"
                          disabled={item.quantity <= 1}
                          name="nextQuantity"
                          size="icon"
                          type="submit"
                          value={Math.max(1, item.quantity - 1)}
                          variant="outline"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Input
                          aria-label="Số lượng"
                          className="text-center"
                          max={Math.max(1, item.stock)}
                          min={1}
                          name="quantity"
                          type="number"
                          defaultValue={item.quantity}
                        />
                        <Button
                          aria-label="Tăng số lượng"
                          className="shrink-0"
                          disabled={item.quantity >= item.stock}
                          name="nextQuantity"
                          size="icon"
                          type="submit"
                          value={Math.min(item.stock, item.quantity + 1)}
                          variant="outline"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </form>

                      <form action={removeItemAction}>
                        <input name="itemId" type="hidden" value={item.id} />
                        <Button className="w-full gap-2" type="submit" variant="outline">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Xóa
                        </Button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="bv-card h-fit rounded-lg p-5">
          <h2 className="text-xl font-black text-[#17202A]">Tóm tắt đơn hàng</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[#66706B]">Mã giỏ hàng</dt>
              <dd className="font-black text-[#17202A]">{cart.orderId ?? "Chưa có"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[#66706B]">Số lượng</dt>
              <dd className="font-black text-[#17202A]">{cart.totalItems}</dd>
            </div>
            <div className="border-t border-[#17191F]/10 pt-3">
              <div className="flex items-center justify-between">
                <dt className="text-[#66706B]">Tổng tiền</dt>
                <dd className="text-xl font-black text-[#E76F51]">{formatPrice(cart.totalAmount)}</dd>
              </div>
            </div>
          </dl>

          {cart.checkoutIssues.length > 0 ? (
            <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
              <p className="font-black text-[#F2C14E]">Chưa thể checkout</p>
              <ul className="mt-2 list-inside list-disc">
                {cart.checkoutIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <form action={checkoutAction} className="mt-5 grid gap-4">
            <input name="checkoutKey" type="hidden" value={`checkout-${cart.orderId ?? "empty"}`} />
            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#17202A]">
                  <MapPin className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
                  Địa chỉ giao hàng
                </h3>
                <Link className="text-xs font-black text-[#F2C14E] hover:underline" href="/profile/addresses">
                  Quản lý
                </Link>
              </div>

              {cart.shippingAddresses.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {cart.shippingAddresses.map((address) => (
                    <label
                      className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.05] p-3 text-sm transition hover:bg-white/[0.08]"
                      key={address.id}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          className="mt-1 h-4 w-4 accent-[#D6A84F]"
                          defaultChecked={address.id === cart.selectedShippingAddressId}
                          name="shippingAddressId"
                          required
                          type="radio"
                          value={address.id}
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 font-black text-[#17202A]">
                            {address.fullName}
                            {address.isDefault ? (
                              <span className="rounded-full bg-[#F2C14E]/25 px-2 py-0.5 text-[11px] font-black text-[#8A5C00]">
                                Mặc định
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#66706B]">{address.phone}</span>
                          <span className="mt-1 block text-xs leading-5 text-[#66706B]">
                            {formatAddressLine(address)}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-[#F2C14E]/35 bg-[#F2C14E]/10 p-3 text-sm leading-6 text-[#F7D98A]">
                  Bạn chưa có địa chỉ giao hàng.
                  <Link className="ml-1 font-black text-[#F2C14E] hover:underline" href="/profile/addresses">
                    Thêm địa chỉ
                  </Link>
                </div>
              )}
            </section>

            <section>
              <label className="text-sm font-black text-[#17202A]" htmlFor="paymentMethod">
                Phương thức thanh toán
              </label>
              <select
                className="mt-2 h-11 w-full rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-bold text-[#17202A] outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
                defaultValue="COD"
                id="paymentMethod"
                name="paymentMethod"
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </section>

            <SubmitButton
              className="h-11 w-full gap-2"
              disabled={!cart.canCheckout}
              pendingLabel="Đang giữ tồn kho..."
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Tạo đơn hàng
            </SubmitButton>
          </form>

          <p className="mt-4 rounded-lg bg-[#EAF2EF] px-3 py-2 text-xs leading-5 text-[#42524D]">
            Bản demo không tích hợp cổng thanh toán thật. Checkout dùng để chứng minh nghiệp vụ và tạo
            dữ liệu hành vi cho gợi ý AI.
          </p>
        </aside>
      </section>
    </main>
  );
}
