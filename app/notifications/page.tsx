import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import {
  getNotificationCenterData,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function markReadAction(formData: FormData) {
  "use server";

  await markNotificationAsRead(String(formData.get("notificationId") ?? ""));
}

async function markAllReadAction() {
  "use server";

  await markAllNotificationsAsRead();
}

interface NotificationsPageProps {
  searchParams?: Promise<{
    filter?: string;
  }>;
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

function typeClass(type: string): string {
  switch (type) {
    case "ORDER":
      return "bg-[#0F766E]/15 text-[#0F5F59]";
    case "MARKETPLACE":
      return "bg-[#F2C14E]/25 text-[#8A5C00]";
    case "COMMUNITY":
      return "bg-[#E76F51]/15 text-[#B45334]";
    case "AI":
      return "bg-violet-100 text-violet-700";
    case "SECURITY":
      return "bg-red-100 text-red-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    redirect("/login?callbackUrl=/notifications");
  }

  const params = await searchParams;
  const filter = params?.filter === "unread" ? "unread" : "all";
  const data = await getNotificationCenterData(40, filter);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#111827_52%,#18181b_100%)] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F2C14E]">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notification Center
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Thông báo của tôi</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Theo dõi listing, đơn hàng, cộng đồng, bảo mật và AI recommendation.
            </p>
          </div>
          <form action={markAllReadAction}>
            <Button className="min-h-11 gap-2 bg-[#D6A84F] text-slate-950 hover:bg-[#F2C14E]" disabled={data.unreadCount === 0} type="submit">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Đánh dấu đã đọc
            </Button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { value: "all", label: "Tất cả", href: "/notifications" },
            { value: "unread", label: "Chưa đọc", href: "/notifications?filter=unread" },
          ].map((item) => (
            <Link
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition ${
                filter === item.value
                  ? "bg-[#D6A84F] text-slate-950"
                  : "border border-white/10 bg-white/[0.07] text-zinc-100 hover:bg-white/[0.12]"
              }`}
              href={item.href}
              key={item.value}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {data.notifications.map((notification) => {
            return (
              <article
                className={`rounded-2xl border p-4 transition ${
                  notification.readAt
                    ? "border-white/10 bg-white/[0.05]"
                    : "border-[#F2C14E]/30 bg-[#F2C14E]/10"
                }`}
                key={notification.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${typeClass(notification.type)}`}>
                        {notification.type}
                      </span>
                      {!notification.readAt ? (
                        <span className="rounded-full bg-[#F2C14E] px-2.5 py-1 text-xs font-black text-slate-950">
                          Mới
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-lg font-black text-zinc-50">{notification.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-300">{notification.message}</p>
                    <p className="mt-2 text-xs text-zinc-500">{formatDate(notification.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {notification.href ? (
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-bold text-zinc-100 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F]"
                        href={notification.href}
                      >
                        Mở
                      </Link>
                    ) : null}
                    {!notification.readAt ? (
                      <form action={markReadAction}>
                        <input name="notificationId" type="hidden" value={notification.id} />
                        <button className="min-h-11 cursor-pointer rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-bold text-zinc-100 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F]" type="submit">
                          Đã đọc
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {data.notifications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
              Chưa có thông báo. Khi listing được duyệt, đơn hàng đổi trạng thái hoặc AI có cập nhật mới, dữ liệu sẽ xuất hiện ở đây.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
