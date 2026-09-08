import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, PackageCheck, ReceiptText, Truck } from "lucide-react";
import { cancelPendingOrder, getOrderDetailData } from "@/actions/order.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { BookCover } from "@/components/shared/BookCover";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(price);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "PAID":
      return "Đã thanh toán";
    case "PAID_DEMO":
      return "Đã thanh toán demo";
    case "SHIPPED":
      return "Đang giao";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
    case "REFUNDED":
      return "Đã hoàn tiền";
    default:
      return status;
  }
}

function paymentLabel(value: string | null): string {
  switch (value) {
    case "COD":
      return "COD";
    case "BANK_TRANSFER_DEMO":
      return "Chuyển khoản demo";
    case "WALLET_DEMO":
      return "Ví BookVerse demo";
    default:
      return "Chưa chọn";
  }
}

function statusBadgeClass(status: string): string {
  if (["PAID", "PAID_DEMO", "COMPLETED"].includes(status)) {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }

  if (["PENDING", "SHIPPED"].includes(status)) {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (["CANCELLED", "REFUNDED"].includes(status)) {
    return "bg-red-100 text-red-800 ring-red-200";
  }

  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusBadgeClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

async function cancelOrderAction(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const result = await cancelPendingOrder(orderId);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/orders/${encodeURIComponent(orderId)}`);
    }

    redirect(`/orders/${encodeURIComponent(orderId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/orders/${encodeURIComponent(orderId)}?message=${encodeURIComponent(result.message)}`);
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/orders/${encodeURIComponent(id)}`);
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const order = await getOrderDetailData(id);

  if (!order) {
    notFound();
  }

  const shippingParts = [
    order.shipping.addressLine,
    order.shipping.ward,
    order.shipping.district,
    order.shipping.province,
  ].filter(Boolean);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">Order Detail</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{order.id}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Timeline, item và địa chỉ giao hàng snapshot của đơn đã checkout.
            </p>
          </div>
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-bv-ivory px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-bv-gold/95"
            href="/profile"
          >
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Về hồ sơ
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-5">
          {query?.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {query.error}
            </div>
          ) : null}

          {query?.message ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {query.message}
            </div>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <PackageCheck className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              Sản phẩm
            </h2>
            <div className="mt-5 grid gap-4">
              {order.items.map((item) => (
                <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.05] p-4 sm:flex-row" key={item.id}>
                  <Link className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-[#EDE3D5]" href={`/book/${item.book.id}`}>
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
                    <Link className="line-clamp-2 text-lg font-black text-white hover:underline" href={`/book/${item.book.id}`}>
                      {item.book.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-400">{item.book.author}</p>
                    <p className="mt-1 text-sm text-zinc-400">Người bán: {item.seller?.name ?? "BookVerse"}</p>
                    <p className="mt-3 text-sm text-zinc-400">
                      {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-lg font-black text-bv-gold">{formatPrice(item.totalPrice)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <Truck className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              Timeline
            </h2>
            <div className="mt-5 grid gap-3">
              {order.timeline.map((event) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4" key={event.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={event.status} />
                    <span className="text-xs text-zinc-500">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{event.note ?? "Cập nhật trạng thái đơn hàng."}</p>
                  <p className="mt-1 text-xs text-zinc-500">Actor: {event.actorName ?? "Hệ thống"}</p>
                </div>
              ))}
              {order.timeline.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                  Chưa có timeline.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="text-xl font-black text-white">Tóm tắt</h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Trạng thái</dt>
                <dd>
                  <StatusBadge status={order.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Thanh toán</dt>
                <dd className="font-black text-white">{paymentLabel(order.paymentMethod)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Ngày tạo</dt>
                <dd className="font-black text-white">{formatDate(order.createdAt)}</dd>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">{order.isSellerScoped ? "Doanh thu phần của bạn" : "Tổng tiền"}</dt>
                  <dd className="text-xl font-black text-bv-gold">{formatPrice(order.totalAmount)}</dd>
                </div>
              </div>
            </dl>

            {order.paymentMethod === "BANK_TRANSFER_DEMO" && order.status === "PENDING" ? (
              <div className="mt-5 rounded-xl border border-white/15 bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-bv-gold">Thông tin chuyển khoản Sacombank</p>
                <div className="mt-3 flex gap-3 items-center">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-sm">
                    <Image
                      alt="VietQR Sacombank"
                      className="h-full w-full object-contain"
                      height={96}
                      priority
                      src="/images/sacombank-qr-only.png"
                      width={96}
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-xs space-y-1 text-zinc-300">
                    <p><span className="text-zinc-400">STK:</span> <strong className="font-mono text-white">0868792717</strong></p>
                    <p><span className="text-zinc-400">Chủ TK:</span> <strong className="text-white">LUONG NGUYEN QUOC TUAN</strong></p>
                    <p><span className="text-zinc-400">Ngân hàng:</span> <strong className="text-white">SACOMBANK</strong></p>
                    <p><span className="text-zinc-400">Cú pháp:</span> <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-bv-gold">BOOKVERSE {order.id.slice(-6).toUpperCase()}</code></p>
                  </div>
                </div>
              </div>
            ) : null}

            {order.canCancel ? (
              <form action={cancelOrderAction} className="mt-5">
                <input name="orderId" type="hidden" value={order.id} />
                <ConfirmSubmitButton
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 px-4 text-sm font-black text-red-200 transition hover:bg-red-500/20"
                  confirmMessage="Bạn chắc chắn muốn hủy đơn PENDING này?"
                >
                  Hủy đơn
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <MapPin className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              Địa chỉ giao hàng
            </h2>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-zinc-300">
              <p className="font-black text-white">{order.shipping.fullName ?? "Chưa có tên người nhận"}</p>
              <p>{order.shipping.phone ?? "Chưa có số điện thoại"}</p>
              <p>{shippingParts.join(", ") || "Chưa có địa chỉ snapshot"}</p>
              {order.shipping.note ? <p className="mt-2 text-xs text-zinc-500">{order.shipping.note}</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <CalendarClock className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              Buyer
            </h2>
            <p className="mt-4 font-black text-white">{order.buyer.name}</p>
            <p className="mt-1 text-sm text-zinc-400">{order.buyer.email ?? order.buyer.id}</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
