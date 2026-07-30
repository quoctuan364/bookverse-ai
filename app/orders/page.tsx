import { OrderStatus } from "@prisma/client";
import { ArrowRight, PackageOpen, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { getMyOrders } from "@/actions/order.actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

const labels: Record<OrderStatus, string> = {
  PENDING: "Chờ xử lý", PAID: "Đã thanh toán", PAID_DEMO: "Đã thanh toán demo",
  SHIPPED: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy", REFUNDED: "Đã hoàn tiền",
};
const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(value);

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getMyOrders(Math.max(1, Number(params.page) || 1), params.status);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (page: number, status = data.status) => `/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(page > 1 ? { page: String(page) } : {}) })}`;

  return (
    <main className="bv-page min-h-[70vh]">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-[0.15em] text-[#C65D43]">Tài khoản</p><h1 className="mt-2 text-4xl font-black text-[#17202A]">Đơn hàng của tôi</h1><p className="mt-2 text-[#66706B]">Theo dõi {data.total} đơn hàng và mở chi tiết từng giao dịch.</p></div>
          <ShoppingBag className="h-10 w-10 text-[#176B62]" aria-hidden="true" />
        </header>

        <nav aria-label="Lọc trạng thái đơn hàng" className="mt-7 flex gap-2 overflow-x-auto pb-2">
          {[["", "Tất cả"], ...Object.values(OrderStatus).map((status) => [status, labels[status]])].map(([value, label]) => (
            <Link className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold transition ${data.status === value ? "bg-[#176B62] text-white" : "border border-[#D8D0C2] bg-white text-[#536071] hover:bg-[#F7F4ED]"}`} href={href(1, value)} key={value}>{label}</Link>
          ))}
        </nav>

        {data.orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#176B62]/30 bg-white p-8 text-center"><PackageOpen className="mx-auto h-11 w-11 text-[#176B62]" aria-hidden="true" /><h2 className="mt-3 text-xl font-black">Không có đơn hàng phù hợp</h2><p className="mt-2 text-[#66706B]">Hãy đổi bộ lọc hoặc khám phá sách đang được đăng bán.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#176B62] px-5 py-3 font-black text-white" href="/marketplace">Đi đến chợ sách</Link></div>
        ) : (
          <div className="mt-8 grid gap-4">
            {data.orders.map((order) => (
              <article className="rounded-2xl border border-[#D8D0C2] bg-white p-5 shadow-sm sm:p-6" key={order.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-sm font-black text-[#17202A]">#{order.id}</h2><span className="rounded-full bg-[#E6F3F0] px-3 py-1 text-xs font-black text-[#176B62]">{labels[order.status]}</span></div><p className="mt-2 text-sm text-[#66706B]">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)} · {order.itemCount} sản phẩm</p><p className="mt-2 line-clamp-2 text-sm text-[#536071]">{order.books.map((book) => `${book.title} ×${book.quantity}`).join(" · ")}</p></div>
                  <div className="flex shrink-0 items-center justify-between gap-5 sm:block sm:text-right"><strong className="block text-lg font-black tabular-nums text-[#176B62]">{money(order.totalAmount)}</strong><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-black text-[#176B62] transition hover:bg-[#E6F3F0]" href={`/orders/${order.id}`}>Chi tiết<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 ? <nav aria-label="Phân trang đơn hàng" className="mt-7 flex items-center justify-center gap-3">{data.page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 font-bold" href={href(data.page - 1)}>Trang trước</Link> : null}<span className="text-sm font-bold text-[#66706B]">Trang {data.page}/{totalPages}</span>{data.page < totalPages ? <Link className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 font-bold" href={href(data.page + 1)}>Trang sau</Link> : null}</nav> : null}
      </section>
    </main>
  );
}
