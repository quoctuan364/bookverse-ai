import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, MessageSquare, PackageCheck, ReceiptText, Star, Truck } from "lucide-react";
import { cancelPendingOrder, getOrderDetailData } from "@/actions/order.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { BookCover } from "@/components/shared/BookCover";
import { getCurrentUser } from "@/lib/permissions";
import { createDemoPaymentQr } from "@/lib/demo-payment-qr";

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
  const orderQrCode =
    order.paymentMethod === "BANK_TRANSFER_DEMO" && order.status === "PENDING"
      ? await createDemoPaymentQr(order.id, Number(order.totalAmount))
      : null;

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">Chi tiết đơn hàng</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{order.id}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Timeline, item và địa chỉ giao hàng snapshot của đơn đã thanh toán.
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

          <section className="rounded-3xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-ink">
              <PackageCheck className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Sản phẩm
            </h2>
            <div className="mt-5 grid gap-4">
              {order.items.map((item) => (
                <article className="flex flex-col gap-4 rounded-2xl border border-bv-ink/8 bg-bv-ivory/50 p-4 sm:flex-row" key={item.id}>
                  <Link className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-[#EDE3D5]" href={`/book/${item.book.id}`}>
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
                    <Link className="line-clamp-2 text-base font-black text-bv-ink transition hover:text-bv-primary" href={`/book/${item.book.id}`}>
                      {item.book.title}
                    </Link>
                    <p className="mt-1 text-sm text-bv-text-subtle">{item.book.author}</p>
                    <p className="mt-1 text-xs text-bv-text-muted">Người bán: {item.seller?.name ?? "BookVerse"}</p>
                    <p className="mt-2 text-sm font-semibold text-bv-text">
                      {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between gap-3 sm:text-right">
                    <p className="text-lg font-black text-bv-primary">{formatPrice(item.totalPrice)}</p>
                    <Link
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-black text-amber-900 shadow-xs transition hover:bg-amber-100 hover:shadow-sm active:scale-95"
                      href={`/book/${item.book.id}#reviews-section`}
                      title="Viết nhận xét & chấm sao cho cuốn sách này"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                      <span>Đánh giá sách</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-ink">
              <Truck className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Tiến trình đơn hàng
            </h2>
            <div className="mt-5 grid gap-3">
              {order.timeline.map((event) => (
                <div className="rounded-2xl border border-bv-ink/8 bg-bv-ivory/40 p-4" key={event.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={event.status} />
                    <span className="text-xs text-bv-text-muted">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-bv-text">{event.note ?? "Cập nhật trạng thái đơn hàng."}</p>
                  <p className="mt-1 text-xs text-bv-text-subtle">Người cập nhật: {event.actorName ?? "Hệ thống"}</p>
                </div>
              ))}
              {order.timeline.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-bv-ink/12 bg-bv-ivory/20 p-5 text-sm text-bv-text-subtle">
                  Chưa có tiến trình.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="rounded-3xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-bv-ink">Tóm tắt đơn hàng</h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-bv-text-muted">Trạng thái</dt>
                <dd>
                  <StatusBadge status={order.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-bv-text-muted">Thanh toán</dt>
                <dd className="font-bold text-bv-ink">{paymentLabel(order.paymentMethod)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-bv-text-muted">Ngày tạo</dt>
                <dd className="font-bold text-bv-ink">{formatDate(order.createdAt)}</dd>
              </div>
              <div className="border-t border-bv-ink/8 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-bv-text-muted">{order.isSellerScoped ? "Doanh thu phần của bạn" : "Tổng tiền"}</dt>
                  <dd className="text-xl font-black text-bv-primary">{formatPrice(order.totalAmount)}</dd>
                </div>
              </div>
            </dl>

            {order.paymentMethod === "BANK_TRANSFER_DEMO" && order.status === "PENDING" ? (
              <div className="mt-5 rounded-2xl border border-bv-gold/30 bg-[#FFFDF5] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-bv-accent">Mã QR thanh toán mô phỏng</p>
                <div className="mt-3 flex gap-3 items-center">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-bv-ink/8 bg-white p-1.5 shadow-sm">
                    {orderQrCode ? (
                      <Image
                        alt="Mã QR demo chứa thông tin đơn hàng, không dùng để chuyển tiền"
                        className="h-full w-full object-contain"
                        height={96}
                        priority
                        src={orderQrCode}
                        width={96}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-xs space-y-1 text-bv-text">
                    <p className="font-bold text-[#8A5C00]">Chỉ để trình diễn, không kết nối ngân hàng.</p>
                    <p className="text-bv-text-subtle">Quét mã chỉ xem mã đơn và số tiền; không chuyển tiền.</p>
                    <p><span className="text-bv-text-muted">Mã đơn:</span> <strong className="font-mono text-bv-ink">{order.id.slice(-8).toUpperCase()}</strong></p>
                    <p><span className="text-bv-text-muted">Số tiền:</span> <strong className="text-bv-primary">{formatPrice(Number(order.totalAmount))}</strong></p>
                  </div>
                </div>
              </div>
            ) : null}

            {order.canCancel ? (
              <form action={cancelOrderAction} className="mt-5">
                <input name="orderId" type="hidden" value={order.id} />
                <ConfirmSubmitButton
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100"
                  confirmMessage="Bạn chắc chắn muốn hủy đơn PENDING này?"
                >
                  Hủy đơn
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </section>

          <section className="rounded-3xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-ink">
              <MapPin className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Địa chỉ giao hàng
            </h2>
            <div className="mt-4 rounded-2xl border border-bv-ink/8 bg-bv-ivory/40 p-4 text-sm leading-6 text-bv-text">
              <p className="font-black text-bv-ink">{order.shipping.fullName ?? "Chưa có tên người nhận"}</p>
              <p className="text-bv-text-subtle">{order.shipping.phone ?? "Chưa có số điện thoại"}</p>
              <p className="mt-1">{shippingParts.join(", ") || "Chưa có địa chỉ snapshot"}</p>
              {order.shipping.note ? <p className="mt-2 text-xs text-bv-text-muted border-t border-bv-ink/8 pt-2">Ghi chú: {order.shipping.note}</p> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-ink">
              <CalendarClock className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Người mua
            </h2>
            <p className="mt-4 font-black text-bv-ink">{order.buyer.name}</p>
            <p className="mt-1 text-sm text-bv-text-muted">{order.buyer.email ?? order.buyer.id}</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
