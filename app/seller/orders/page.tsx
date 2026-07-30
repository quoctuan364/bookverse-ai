import Link from "next/link";
import { ClipboardList, Eye, Filter, Search } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { getSellerOrdersData } from "@/actions/seller.actions";
import { Input } from "@/components/ui/input";
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
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface SellerOrdersPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    q?: string;
    status?: string;
  }>;
}

export default async function SellerOrdersPage({ searchParams }: SellerOrdersPageProps) {
  const params = await searchParams;
  const data = await getSellerOrdersData({
    q: params?.q,
    status: params?.status,
  });

  return (
    <main className="bv-page bv-seller">
      <SellerHero
        description="Theo dõi các đơn có item thuộc listing của bạn. Seller chỉ được chuyển PAID/PAID_DEMO sang SHIPPED và SHIPPED sang COMPLETED."
        title="Đơn hàng seller"
      />

      {data.gate.status !== "SELLER" ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid min-w-0 w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />
          <SellerAlert message={params?.message} tone="success" />
          <SellerAlert message={params?.error} tone="error" />

          <form className="bv-card grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_220px_auto]" method="get">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <Input
                aria-label="Tìm đơn hàng của người bán"
                className="h-11 pl-10"
                defaultValue={data.filters.q}
                name="q"
                placeholder="Tìm mã đơn, buyer, tên sách..."
                type="search"
              />
            </div>
            <select aria-label="Lọc đơn hàng theo trạng thái" className={selectClass} defaultValue={data.filters.status} name="status">
              <option value="ALL">Tất cả trạng thái</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
            <button className={primaryButton} type="submit">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Lọc
            </button>
          </form>

          <section className="bv-card min-w-0 rounded-lg p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
                  <ClipboardList className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
                  Danh sách đơn
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {data.orders.length.toLocaleString("vi-VN")} đơn phù hợp với bộ lọc.
                </p>
              </div>
              <Link className={secondaryButton} href="/seller/revenue">
                Xem doanh thu
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-3">Đơn</th>
                    <th>Buyer</th>
                    <th>Item của seller</th>
                    <th>Thanh toán</th>
                    <th>Doanh thu</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-4">
                        <p className="font-black text-white">{order.id}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatDate(order.createdAt)}</p>
                      </td>
                      <td>
                        <p className="font-bold text-white">{order.buyerName}</p>
                        <p className="mt-1 text-xs text-zinc-500">{order.buyerEmail ?? "Không có email"}</p>
                      </td>
                      <td>
                        <div className="grid gap-1">
                          {order.items.slice(0, 2).map((item) => (
                            <p className="line-clamp-1 text-xs text-zinc-300" key={item.id}>
                              {item.quantity} x {item.listingTitle ?? item.bookTitle}
                            </p>
                          ))}
                          {order.items.length > 2 ? (
                            <p className="text-xs text-zinc-500">+{order.items.length - 2} item khác</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-zinc-300">{paymentLabel(order.paymentMethod)}</td>
                      <td className="font-black text-[#F2C14E]">{formatPrice(order.sellerRevenue)}</td>
                      <td>
                        <StatusBadge label={orderStatusLabel(order.status)} value={order.status} />
                      </td>
                      <td>
                        <Link className={secondaryButton} href={`/seller/orders/${order.id}`}>
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.orders.length === 0 ? (
              <p className="mt-5 rounded-lg border border-dashed border-white/12 bg-white/[0.04] p-5 text-center text-sm text-zinc-400">
                Chưa có đơn hàng phù hợp với bộ lọc.
              </p>
            ) : null}
          </section>
        </section>
      )}
    </main>
  );
}
