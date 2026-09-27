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
      return "bg-bv-focus/15 text-[#0F5F59]";
    case "MARKETPLACE":
      return "bg-bv-gold/25 text-[#8A5C00]";
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
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-bv-gold">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Trung tâm thông báo
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Thông báo của tôi</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Xem tin mới về sách bạn đăng bán, đơn hàng và những cuộc trò chuyện.
            </p>
          </div>
          <form action={markAllReadAction}>
            <Button className="min-h-11 gap-2 bg-bv-gold text-slate-950 hover:bg-bv-gold/90" disabled={data.unreadCount === 0} type="submit">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Đánh dấu đã đọc
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Tất cả", href: "/notifications" },
            { value: "unread", label: "Chưa đọc", href: "/notifications?filter=unread" },
          ].map((item) => (
            <Link
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition ${
                filter === item.value
                  ? "bg-bv-primary text-white shadow-xs"
                  : "border border-bv-ink/10 bg-white text-bv-ink hover:bg-bv-surface"
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
                className={`rounded-2xl border p-5 shadow-xs transition ${
                  notification.readAt
                    ? "border-bv-ink/10 bg-white"
                    : "border-bv-primary/25 bg-[#FAF6EE] shadow-sm"
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
                        <span className="rounded-full bg-bv-gold px-2.5 py-1 text-xs font-black text-slate-950">
                          Mới
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-lg font-black text-bv-heading">{notification.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-bv-text-muted">{notification.message}</p>
                    <p className="mt-2 text-xs text-bv-text-muted">{formatDate(notification.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {notification.href ? (
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-bv-primary/25 bg-white px-4 text-xs font-bold text-bv-primary transition hover:bg-bv-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                        href={notification.href}
                      >
                        Mở
                      </Link>
                    ) : null}
                    {!notification.readAt ? (
                      <form action={markReadAction}>
                        <input name="notificationId" type="hidden" value={notification.id} />
                        <button className="min-h-11 cursor-pointer rounded-xl border border-bv-ink/10 bg-white px-4 text-xs font-bold text-bv-ink transition hover:bg-bv-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" type="submit">
                          Đánh dấu đã đọc
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {data.notifications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-bv-ink/15 bg-white p-8 text-center text-sm text-bv-text-muted">
              Chưa có thông báo mới. Khi sách bạn đăng được duyệt hoặc đơn hàng thay đổi, tin nhắn sẽ xuất hiện tại đây.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
