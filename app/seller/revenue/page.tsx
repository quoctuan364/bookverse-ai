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
    <main className="bv-page">
      <SellerHero
        description="Doanh thu chỉ tính các order COMPLETED và chỉ cộng item thuộc listing của seller hiện tại."
        title="Doanh thu seller"
      />

      {data.gate.status !== "SELLER" ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Tổng doanh thu completed", formatPrice(data.totalCompletedRevenue)],
              ["Doanh thu tháng này", formatPrice(data.monthRevenue)],
              ["Doanh thu 7 ngày", formatPrice(data.sevenDayRevenue)],
              ["Đơn completed", data.completedOrderCount.toLocaleString("vi-VN")],
              ["Đơn cancelled", data.cancelledOrderCount.toLocaleString("vi-VN")],
            ].map(([label, value]) => (
              <article className="bv-card rounded-lg p-5" key={label}>
                <p className="text-sm font-bold text-zinc-400">{label}</p>
                <p className="mt-3 text-2xl font-black text-white">{value}</p>
              </article>
            ))}
          </div>

          <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="bv-card rounded-lg p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                    <Trophy className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
                    Top listing
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">Xếp hạng theo doanh thu completed.</p>
                </div>
                <Link className={secondaryButton} href="/seller/listings">
                  Quản lý listing
                </Link>
              </div>

              <div className="grid gap-3">
                {data.topListings.map((listing, index) => (
                  <article className="rounded-lg border border-white/10 bg-white/[0.05] p-4" key={listing.listingId}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F2C14E]">
                          Top {index + 1}
                        </p>
                        <h3 className="mt-1 font-black text-white">{listing.title}</h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {listing.quantity.toLocaleString("vi-VN")} item đã bán
                        </p>
                      </div>
                      <p className="text-xl font-black text-[#F2C14E]">{formatPrice(listing.revenue)}</p>
                    </div>
                  </article>
                ))}
                {data.topListings.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                    Chưa có doanh thu completed để xếp hạng listing.
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="bv-card h-fit rounded-lg p-5">
              <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                <BarChart3 className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
                Gợi ý vận hành
              </h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
                <p>Doanh thu chỉ được ghi nhận khi đơn chuyển sang COMPLETED.</p>
                <p>Seller có thể tự chuyển PAID/PAID_DEMO sang SHIPPED, sau đó SHIPPED sang COMPLETED.</p>
                <p>Listing bị report hoặc đơn cancelled sẽ kéo điểm chất lượng theo quy tắc xuống ở trang tổng quan.</p>
              </div>
            </aside>
          </section>

          <section className="bv-card rounded-lg p-5">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <ReceiptText className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              Giao dịch gần đây
            </h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-3">Đơn</th>
                    <th>Buyer</th>
                    <th>Ngày tạo</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Doanh thu seller</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.recentTransactions.map((order) => (
                    <tr key={order.id}>
                      <td className="py-4">
                        <Link className="font-black text-white hover:underline" href={`/seller/orders/${order.id}`}>
                          {order.id}
                        </Link>
                      </td>
                      <td className="text-zinc-300">{order.buyerName}</td>
                      <td className="text-zinc-400">{formatDate(order.createdAt)}</td>
                      <td className="text-zinc-300">{paymentLabel(order.paymentMethod)}</td>
                      <td>
                        <StatusBadge label={orderStatusLabel(order.status)} value={order.status} />
                      </td>
                      <td className="font-black text-[#F2C14E]">{formatPrice(order.sellerRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.recentTransactions.length === 0 ? (
              <p className="mt-5 rounded-lg border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                Chưa có giao dịch seller.
              </p>
            ) : null}
          </section>
        </section>
      )}
    </main>
  );
}
