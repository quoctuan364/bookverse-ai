import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin, PackageCheck, Save, Truck, UserCircle } from "lucide-react";
import { updateSellerOrderStatus, getSellerOrderDetailData } from "@/actions/seller.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import {
  formatDate,
  formatPrice,
  orderStatusLabel,
  paymentLabel,
  primaryButton,
  secondaryButton,
  selectClass,
  SellerAlert,
  SellerGatePanel,
  SellerHero,
  SellerNav,
  StatusBadge,
  textareaClass,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface SellerOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

async function updateStatusAction(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  const note = String(formData.get("note") ?? "");
  const result = await updateSellerOrderStatus(orderId, nextStatus, note);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/seller/orders/${encodeURIComponent(orderId)}`);
    }

    if (result.reason === "FORBIDDEN") {
      redirect(`/seller?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/seller/orders/${encodeURIComponent(orderId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/seller/orders/${encodeURIComponent(orderId)}?message=${encodeURIComponent(result.message)}`);
}

export default async function SellerOrderDetailPage({ params, searchParams }: SellerOrderDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getSellerOrderDetailData(id);

  const order = data.order;
  const shippingParts = order
    ? [order.shipping.addressLine, order.shipping.ward, order.shipping.district, order.shipping.province].filter(Boolean)
    : [];

  return (
    <main className="bv-page bv-seller">
      <SellerHero
        description="Chi tiết đơn hàng chỉ gồm các sản phẩm thuộc tin bán của bạn; các sản phẩm khác trong đơn không được hiển thị tại đây."
        title={order?.id ?? "Chi tiết đơn hàng"}
      />

      {!data.gate.canSell || !order ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className={secondaryButton} href="/seller/orders">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Về danh sách đơn
            </Link>
            <StatusBadge label={orderStatusLabel(order.status)} value={order.status} />
          </div>

          <div className="grid gap-3">
            <SellerAlert message={query?.message} tone="success" />
            <SellerAlert message={query?.error} tone="error" />
          </div>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-6">
              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                  <PackageCheck className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                  Sản phẩm của bạn
                </h2>
                <div className="mt-5 grid gap-3">
                  {order.items.map((item) => (
                    <article className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4" key={item.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-bv-heading">{item.listingTitle ?? item.bookTitle}</p>
                          <p className="mt-1 text-sm text-bv-text-muted">{item.bookTitle}</p>
                          <p className="mt-2 text-sm font-semibold text-bv-heading/80">Số lượng: {item.quantity}</p>
                        </div>
                        <p className="text-lg font-black text-bv-primary">{formatPrice(item.totalPrice)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                  <Truck className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                  Lịch sử trạng thái
                </h2>
                <div className="mt-5 grid gap-3">
                  {order.timeline.map((event) => (
                    <article className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4" key={event.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge label={orderStatusLabel(event.status)} value={event.status} />
                        <span className="text-xs text-bv-text-muted">{formatDate(event.createdAt)}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-bv-heading/85">
                        {event.note ?? "Cập nhật trạng thái đơn hàng."}
                      </p>
                      <p className="mt-1 text-xs text-bv-text-muted">Người cập nhật: {event.actorName ?? "Hệ thống"}</p>
                    </article>
                  ))}
                  {order.timeline.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface/30 p-5 text-sm font-semibold text-bv-text-muted">
                      Chưa có cập nhật trạng thái.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="grid h-fit gap-6">
              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-black text-bv-heading">Tóm tắt</h2>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-bv-text-muted">Trạng thái</dt>
                    <dd className="font-black text-bv-primary">{orderStatusLabel(order.status)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-bv-text-muted">Thanh toán</dt>
                    <dd className="font-black text-bv-heading">{paymentLabel(order.paymentMethod)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-bv-text-muted">Ngày tạo</dt>
                    <dd className="font-black text-bv-heading">{formatDate(order.createdAt)}</dd>
                  </div>
                  <div className="border-t border-bv-ink/10 pt-3">
                    <div className="flex justify-between gap-3">
                      <dt className="text-bv-text-muted">Doanh thu của bạn</dt>
                      <dd className="text-xl font-black text-bv-primary">{formatPrice(order.sellerRevenue)}</dd>
                    </div>
                  </div>
                </dl>
              </section>

              {order.allowedNextStatuses.length > 0 ? (
                <form action={updateStatusAction} className="bv-card rounded-2xl p-6 shadow-sm">
                  <input name="orderId" type="hidden" value={order.id} />
                  <h2 className="text-xl font-black text-bv-heading">Cập nhật trạng thái</h2>
                  <div className="mt-4 grid gap-3">
                    <select className={selectClass} name="nextStatus" required>
                      {order.allowedNextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {orderStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className={textareaClass}
                      maxLength={240}
                      name="note"
                      placeholder="Ghi chú cho người mua..."
                    />
                    <ConfirmSubmitButton className={primaryButton} confirmMessage="Cập nhật trạng thái đơn hàng?">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Lưu trạng thái
                    </ConfirmSubmitButton>
                  </div>
                </form>
              ) : (
                <section className="bv-card rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-black text-bv-heading">Cập nhật trạng thái</h2>
                  <p className="mt-3 text-sm leading-6 text-bv-text-muted">
                    Đơn hàng chưa thể chuyển sang trạng thái khác.
                  </p>
                </section>
              )}

              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                  <MapPin className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                  Giao hàng
                </h2>
                <div className="mt-4 rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4 text-sm leading-6 text-bv-heading/85">
                  <p className="font-black text-bv-heading">{order.shipping.fullName ?? "Chưa có tên người nhận"}</p>
                  <p>{order.shipping.phone ?? "Chưa có số điện thoại"}</p>
                  <p>{shippingParts.join(", ") || "Chưa có địa chỉ snapshot"}</p>
                  {order.shipping.note ? <p className="mt-2 text-xs text-bv-text-muted">{order.shipping.note}</p> : null}
                </div>
              </section>

              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                  <UserCircle className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                  Người mua
                </h2>
                <p className="mt-4 font-black text-bv-heading">{order.buyerName}</p>
                <p className="mt-1 text-sm text-bv-text-muted">{order.buyerEmail ?? "Không có email"}</p>
              </section>
            </aside>
          </section>
        </section>
      )}
    </main>
  );
}
