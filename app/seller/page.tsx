import Link from "next/link";
import { Bell, ClipboardList, PackagePlus, Plus, ShieldCheck, Star } from "lucide-react";
import { getSellerOverviewData } from "@/actions/seller.actions";
import {
  formatDate,
  formatPrice,
  listingStatusLabel,
  orderStatusLabel,
  primaryButton,
  secondaryButton,
  SellerAlert,
  SellerGatePanel,
  SellerHero,
  SellerNav,
  StatusBadge,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface SellerPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

function metricValue(metric: { value: number; tone?: "money" | "warning" | "success" }): string {
  if (metric.tone === "money") {
    return formatPrice(metric.value);
  }

  return metric.value.toLocaleString("vi-VN");
}

export default async function SellerDashboardPage({ searchParams }: SellerPageProps) {
  const [params, data] = await Promise.all([searchParams, getSellerOverviewData()]);

  return (
    <main className="bv-page bv-seller">
      <SellerHero
        action={
          data.gate.canSell ? (
            <Link className={primaryButton} href="/seller/listings/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Đăng bán sách
            </Link>
          ) : null
        }
        description="Quản lý tin bán sách cũ, theo dõi đơn hàng, trao đổi với người mua và xem tổng quan doanh thu của bạn."
        title="Kênh bán sách thành viên"
      />

      {!data.gate.canSell ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <SellerAlert message={params?.message} tone="success" />
          <SellerAlert message={params?.error} tone="error" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.metrics.map((metric) => (
              <article className="bv-card rounded-2xl p-5 shadow-sm" key={metric.label}>
                <p className="text-sm font-bold text-bv-text-muted">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-bv-heading">{metricValue(metric)}</p>
              </article>
            ))}
          </div>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-6">
              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-bv-ink/10 pb-4">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                      <PackagePlus className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                      Tin bán sách gần đây
                    </h2>
                    <p className="mt-1 text-sm text-bv-text-muted">Các tin bán sách mới nhất của bạn.</p>
                  </div>
                  <Link className={secondaryButton} href="/seller/listings">
                    Xem tất cả
                  </Link>
                </div>

                <div className="grid gap-3">
                  {data.recentListings.map((listing) => (
                    <article className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4" key={listing.id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="line-clamp-1 font-black text-bv-heading">{listing.title}</h3>
                            <StatusBadge label={listingStatusLabel(listing.status)} value={listing.status} />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-bv-text-muted">
                            <span className="font-bold text-bv-primary">{formatPrice(listing.price)}</span> · {listing.book?.title ?? "Không liên kết danh mục sách"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-bv-heading/80">{listing.description}</p>
                        </div>
                        <Link className={neutralLinkClass} href={`/seller/listings/${listing.id}/edit`}>
                          Sửa
                        </Link>
                      </div>
                    </article>
                  ))}
                  {data.recentListings.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface/30 p-5 text-sm font-semibold text-bv-text-muted">
                      Chưa có tin bán sách. Hãy tạo tin đầu tiên; hệ thống sẽ tự kiểm tra và đăng ngay khi đủ thông tin.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-bv-ink/10 pb-4">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                      <ClipboardList className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                      Đơn hàng gần đây
                    </h2>
                    <p className="mt-1 text-sm text-bv-text-muted">Chỉ hiển thị sản phẩm thuộc các tin đăng của bạn.</p>
                  </div>
                  <Link className={secondaryButton} href="/seller/orders">
                    Xem đơn
                  </Link>
                </div>

                <div className="grid gap-3">
                  {data.recentOrders.map((order) => (
                    <Link
                      className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4 transition hover:bg-bv-mint/30"
                      href={`/seller/orders/${order.id}`}
                      key={order.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-bv-heading">Đơn #{order.id.slice(-8)}</p>
                        <StatusBadge label={orderStatusLabel(order.status)} value={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-bv-text-muted">
                        Người mua: {order.buyerName} · {formatDate(order.createdAt)}
                      </p>
                      <p className="mt-2 text-sm font-black text-bv-primary">{formatPrice(order.sellerRevenue)}</p>
                    </Link>
                  ))}
                  {data.recentOrders.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface/30 p-5 text-sm font-semibold text-bv-text-muted">
                      Chưa có đơn liên quan tới tin bán sách của bạn.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="grid h-fit gap-6">
              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                  <ShieldCheck className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                  Điểm uy tín
                </h2>
                <div className="mt-5 rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-4xl font-black text-bv-primary">{data.score.score}/100</p>
                    <StatusBadge label={data.score.badge} value={data.score.badge} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-bv-heading/80">
                    {data.score.reasons.map((reason) => (
                      <p className="inline-flex items-start gap-2" key={reason}>
                        <Star className="mt-0.5 h-4 w-4 shrink-0 text-bv-gold" aria-hidden="true" />
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bv-card rounded-2xl p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                  <Bell className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                  Thông báo bán hàng
                </h2>
                <div className="mt-5 grid gap-3">
                  {data.notifications.map((notification) => (
                    <Link
                      className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4 text-sm transition hover:bg-bv-mint/30"
                      href={notification.href ?? "/notifications"}
                      key={notification.id}
                    >
                      <p className="font-black text-bv-heading">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 leading-6 text-bv-text-muted">{notification.message}</p>
                      <p className="mt-2 text-xs font-semibold text-bv-primary">{formatDate(notification.createdAt)}</p>
                    </Link>
                  ))}
                  {data.notifications.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface/30 p-5 text-sm font-semibold text-bv-text-muted">
                      Chưa có thông báo marketplace hoặc order.
                    </p>
                  ) : null}
                </div>
              </section>
            </aside>
          </section>
        </section>
      )}
    </main>
  );
}

const neutralLinkClass =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-bv-ink/15 bg-white px-3 text-xs font-black text-bv-heading shadow-xs transition hover:bg-bv-surface active:scale-95";
