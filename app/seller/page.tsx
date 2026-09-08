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
          data.gate.status === "SELLER" ? (
            <Link className={primaryButton} href="/seller/listings/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tạo listing
            </Link>
          ) : null
        }
        description="Quản lý listing, đơn hàng, thông báo kiểm duyệt, doanh thu và điểm chất lượng theo quy tắc trong một luồng demo hoàn chỉnh."
        title="Seller Dashboard"
      />

      {data.gate.status !== "SELLER" ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <SellerAlert message={params?.message} tone="success" />
          <SellerAlert message={params?.error} tone="error" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.metrics.map((metric) => (
              <article className="bv-card rounded-lg p-5" key={metric.label}>
                <p className="text-sm font-bold text-zinc-400">{metric.label}</p>
                <p className="mt-3 text-3xl font-black text-white">{metricValue(metric)}</p>
              </article>
            ))}
          </div>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-6">
              <section className="bv-card rounded-lg p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                      <PackagePlus className="h-5 w-5 text-bv-gold" aria-hidden="true" />
                      Listing gần đây
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">Các tin bán mới nhất của tài khoản seller hiện tại.</p>
                  </div>
                  <Link className={secondaryButton} href="/seller/listings">
                    Xem tất cả
                  </Link>
                </div>

                <div className="grid gap-3">
                  {data.recentListings.map((listing) => (
                    <article className="rounded-lg border border-white/10 bg-white/[0.05] p-4" key={listing.id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="line-clamp-1 font-black text-white">{listing.title}</h3>
                            <StatusBadge label={listingStatusLabel(listing.status)} value={listing.status} />
                          </div>
                          <p className="mt-1 text-sm text-zinc-400">
                            {formatPrice(listing.price)} - {listing.book?.title ?? "Không liên kết catalog"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-300">{listing.description}</p>
                        </div>
                        <Link className={neutralLinkClass} href={`/seller/listings/${listing.id}/edit`}>
                          Sửa
                        </Link>
                      </div>
                    </article>
                  ))}
                  {data.recentListings.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                      Chưa có listing. Hãy tạo listing đầu tiên để gửi admin duyệt.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="bv-card rounded-lg p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                      <ClipboardList className="h-5 w-5 text-bv-gold" aria-hidden="true" />
                      Đơn hàng gần đây
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">Chỉ hiển thị phần item thuộc listing của seller này.</p>
                  </div>
                  <Link className={secondaryButton} href="/seller/orders">
                    Xem đơn
                  </Link>
                </div>

                <div className="grid gap-3">
                  {data.recentOrders.map((order) => (
                    <Link
                      className="rounded-lg border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.09]"
                      href={`/seller/orders/${order.id}`}
                      key={order.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-white">{order.id}</p>
                        <StatusBadge label={orderStatusLabel(order.status)} value={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        Buyer {order.buyerName} - {formatDate(order.createdAt)}
                      </p>
                      <p className="mt-2 text-sm font-black text-bv-gold">{formatPrice(order.sellerRevenue)}</p>
                    </Link>
                  ))}
                  {data.recentOrders.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                      Chưa có đơn liên quan tới listing của bạn.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="grid h-fit gap-6">
              <section className="bv-card rounded-lg p-5">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                  <ShieldCheck className="h-5 w-5 text-bv-gold" aria-hidden="true" />
                  Điểm uy tín
                </h2>
                <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-4xl font-black text-bv-gold">{data.score.score}/100</p>
                    <StatusBadge label={data.score.badge} value={data.score.badge} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                    {data.score.reasons.map((reason) => (
                      <p className="inline-flex items-start gap-2" key={reason}>
                        <Star className="mt-0.5 h-4 w-4 shrink-0 text-bv-gold" aria-hidden="true" />
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bv-card rounded-lg p-5">
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                  <Bell className="h-5 w-5 text-bv-gold" aria-hidden="true" />
                  Thông báo seller
                </h2>
                <div className="mt-5 grid gap-3">
                  {data.notifications.map((notification) => (
                    <Link
                      className="rounded-lg border border-white/10 bg-white/[0.05] p-4 text-sm transition hover:bg-white/[0.09]"
                      href={notification.href ?? "/notifications"}
                      key={notification.id}
                    >
                      <p className="font-black text-white">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 leading-6 text-zinc-300">{notification.message}</p>
                      <p className="mt-2 text-xs text-zinc-500">{formatDate(notification.createdAt)}</p>
                    </Link>
                  ))}
                  {data.notifications.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
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
  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] px-3 text-xs font-black text-zinc-100 transition hover:bg-white/[0.12]";
