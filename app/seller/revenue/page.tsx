import Link from "next/link";
import { BarChart3, ReceiptText, Trophy } from "lucide-react";
import { getSellerRevenueData } from "@/actions/seller.actions";
import {
  formatDate,
  formatPrice,
  orderStatusLabel,
  paymentLabel,
  secondaryButton,
  SellerGatePanel,
  SellerHero,
  SellerNav,
  StatusBadge,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

export default async function SellerRevenuePage() {
  const data = await getSellerRevenueData();

  return (
    <main className="bv-page bv-seller">
      <SellerHero
        description="Doanh thu được tính từ các đơn hàng hoàn tất đối với các sản phẩm do bạn đăng bán."
        title="Doanh thu bán sách"
      />

      {!data.gate.canSell ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid min-w-0 w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Tổng doanh thu đã hoàn tất", formatPrice(data.totalCompletedRevenue)],
              ["Doanh thu tháng này", formatPrice(data.monthRevenue)],
              ["Doanh thu 7 ngày", formatPrice(data.sevenDayRevenue)],
              ["Đơn đã hoàn tất", data.completedOrderCount.toLocaleString("vi-VN")],
              ["Đơn cancelled", data.cancelledOrderCount.toLocaleString("vi-VN")],
            ].map(([label, value]) => (
              <article className="bv-card rounded-2xl p-5 shadow-sm" key={label}>
                <p className="text-sm font-bold text-bv-text-muted">{label}</p>
                <p className="mt-2 text-2xl font-black text-bv-heading">{value}</p>
              </article>
            ))}
          </div>

          <section className="grid min-w-0 gap-6 lg:grid-cols-[1fr_420px]">
            <div className="bv-card min-w-0 rounded-2xl p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-bv-ink/10 pb-4">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                    <Trophy className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                    Top tin bán sách
                  </h2>
                  <p className="mt-1 text-sm text-bv-text-muted">Xếp hạng theo doanh thu từ các đơn đã hoàn tất.</p>
                </div>
                <Link className={secondaryButton} href="/seller/listings">
                  Quản lý tin bán sách
                </Link>
              </div>

              <div className="grid gap-3">
                {data.topListings.map((listing, index) => (
                  <article className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4" key={listing.listingId}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-primary">
                          Top {index + 1}
                        </p>
                        <h3 className="mt-1 font-black text-bv-heading">{listing.title}</h3>
                        <p className="mt-1 text-sm text-bv-text-muted">
                          Đã bán {listing.quantity.toLocaleString("vi-VN")} cuốn
                        </p>
                      </div>
                      <p className="text-xl font-black text-bv-primary">{formatPrice(listing.revenue)}</p>
                    </div>
                  </article>
                ))}
                {data.topListings.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface/30 p-5 text-sm font-semibold text-bv-text-muted">
                    Chưa có doanh thu từ đơn đã hoàn tất để xếp hạng tin bán sách.
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="bv-card h-fit rounded-2xl p-6 shadow-sm">
              <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
                <BarChart3 className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                Gợi ý vận hành
              </h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-bv-heading/85">
                <p>Doanh thu chỉ được ghi nhận khi đơn hàng đã hoàn tất.</p>
                <p>Người bán xác nhận đã giao hàng, sau đó cập nhật khi đơn hoàn tất.</p>
                <p>Tin bán sách bị report hoặc đơn cancelled sẽ kéo điểm chất lượng theo quy tắc xuống ở trang tổng quan.</p>
              </div>
            </aside>
          </section>

          <section className="bv-card min-w-0 rounded-2xl p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
              <ReceiptText className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Giao dịch gần đây
            </h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs font-bold uppercase text-bv-text-muted">
                  <tr>
                    <th className="py-3">Đơn</th>
                    <th>Người mua</th>
                    <th>Ngày tạo</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bv-ink/10">
                  {data.recentTransactions.map((order) => (
                    <tr key={order.id}>
                      <td className="py-4">
                        <Link className="font-black text-bv-primary hover:underline" href={`/seller/orders/${order.id}`}>
                          #{order.id.slice(-8)}
                        </Link>
                      </td>
                      <td className="text-bv-heading">{order.buyerName}</td>
                      <td className="text-bv-text-muted">{formatDate(order.createdAt)}</td>
                      <td className="text-bv-heading/80">{paymentLabel(order.paymentMethod)}</td>
                      <td>
                        <StatusBadge label={orderStatusLabel(order.status)} value={order.status} />
                      </td>
                      <td className="font-black text-bv-primary">{formatPrice(order.sellerRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.recentTransactions.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface/30 p-5 text-center text-sm font-semibold text-bv-text-muted">
                Chưa có giao dịch bán sách.
              </p>
            ) : null}
          </section>
        </section>
      )}
    </main>
  );
}
