import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Ban,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  CircleCheckBig,
  ClipboardList,
  Database,
  EyeOff,
  Flag,
  Lock,
  MessageSquareText,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
  UserCog,
} from "lucide-react";
import { BookStatus, ListingStatus, OrderStatus, PostStatus, UserRole } from "@prisma/client";
import {
  getAdminCenterData,
  moderateComment,
  moderateListing,
  moderatePost,
  regenerateBookEmbedding,
  rerunRecommendationForUser,
  toggleUserLock,
  updateBookStatus,
  updateOrderStatus,
  updateUserRole,
} from "@/actions/dashboard.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireModeratorUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface AdminDashboardPageProps {
  searchParams?: Promise<{
    q?: string;
    role?: string;
    userStatus?: string;
    bookStatus?: string;
    listingStatus?: string;
    orderStatus?: string;
    page?: string;
  }>;
}

const dangerButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600";
const neutralButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-bv-border bg-bv-ivory px-3 py-2 text-xs font-black text-bv-heading transition hover:bg-[#EDF7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-bv-focus px-3 py-2 text-xs font-black text-white transition hover:bg-[#0F5F59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus focus-visible:ring-offset-2";

async function updateUserRoleAction(formData: FormData) {
  "use server";

  await updateUserRole(String(formData.get("userId") ?? ""), String(formData.get("role") ?? ""));
  revalidatePath("/admin");
}

async function lockUserAction(formData: FormData) {
  "use server";

  await toggleUserLock(
    String(formData.get("userId") ?? ""),
    true,
    String(formData.get("reason") ?? "Khóa bởi admin."),
  );
  revalidatePath("/admin");
}

async function unlockUserAction(formData: FormData) {
  "use server";

  await toggleUserLock(String(formData.get("userId") ?? ""), false, "");
  revalidatePath("/admin");
}

async function updateBookStatusAction(formData: FormData) {
  "use server";

  await updateBookStatus(
    String(formData.get("bookId") ?? ""),
    String(formData.get("status") ?? ""),
    String(formData.get("reason") ?? ""),
  );
  revalidatePath("/admin");
}

async function regenerateBookEmbeddingAction(formData: FormData) {
  "use server";

  await regenerateBookEmbedding(String(formData.get("bookId") ?? ""));
  revalidatePath("/admin");
}

async function moderateListingAction(formData: FormData) {
  "use server";

  await moderateListing(
    String(formData.get("listingId") ?? ""),
    String(formData.get("status") ?? "") as ListingStatus,
    String(formData.get("reason") ?? ""),
  );
  revalidatePath("/admin");
}

async function updateOrderStatusAction(formData: FormData) {
  "use server";

  await updateOrderStatus(
    String(formData.get("orderId") ?? ""),
    String(formData.get("status") ?? ""),
    String(formData.get("note") ?? ""),
  );
  revalidatePath("/admin");
}

async function moderatePostAction(formData: FormData) {
  "use server";

  await moderatePost(
    String(formData.get("postId") ?? ""),
    String(formData.get("status") ?? "") as PostStatus,
    String(formData.get("reason") ?? ""),
  );
  revalidatePath("/admin");
}

async function moderateCommentAction(formData: FormData) {
  "use server";

  await moderateComment(
    String(formData.get("commentId") ?? ""),
    String(formData.get("status") ?? "") as PostStatus,
    String(formData.get("reason") ?? ""),
  );
  revalidatePath("/admin");
}

async function rerunRecommendationAction(formData: FormData) {
  "use server";

  await rerunRecommendationForUser(String(formData.get("userId") ?? ""));
  revalidatePath("/admin");
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function percent(part: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function statusClass(status: string): string {
  if (["APPROVED", "PUBLISHED", "ACTIVE", "COMPLETED", "PAID", "PAID_DEMO"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (["PENDING", "PENDING_REVIEW", "DRAFT", "SHIPPED"].includes(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (["REJECTED", "HIDDEN", "REMOVED", "CANCELLED", "ARCHIVED", "REFUNDED"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClass(value)}`}>{value}</span>;
}

function sectionTitle(icon: ReactNode, title: string, description: string) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-bv-focus">{icon}</span>
        <div>
          <h2 className="text-xl font-black text-bv-heading">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-bv-text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  try {
    await requireModeratorUser();
  } catch {
    redirect("/");
  }

  const params = await searchParams;
  const page = Number(params?.page ?? "1");
  const data = await getAdminCenterData({
    q: params?.q,
    role: params?.role,
    userStatus: params?.userStatus,
    bookStatus: params?.bookStatus,
    listingStatus: params?.listingStatus,
    orderStatus: params?.orderStatus,
    page,
  });
  const metricValue = (label: string) =>
    data.metrics.find((metric) => metric.label === label)?.value ?? 0;
  const totalUsers = metricValue("Người dùng");
  const lockedUsers = metricValue("Tài khoản bị khóa");
  const totalBooks = metricValue("Sách");
  const hiddenBooks = metricValue("Sách ẩn/lưu trữ");
  const totalListings = metricValue("Listing");
  const pendingListings = metricValue("Listing chờ duyệt");
  const totalReports = metricValue("Report");
  const overviewItems = [
    {
      label: "Tài khoản bình thường",
      value: Math.max(0, totalUsers - lockedUsers),
      total: totalUsers,
      icon: UserCheck,
      note: `${lockedUsers.toLocaleString("vi-VN")} tài khoản đang khóa`,
    },
    {
      label: "Sách đang hiển thị",
      value: Math.max(0, totalBooks - hiddenBooks),
      total: totalBooks,
      icon: BookOpen,
      note: `${hiddenBooks.toLocaleString("vi-VN")} sách ẩn hoặc lưu trữ`,
    },
    {
      label: "Listing đã qua hàng chờ",
      value: Math.max(0, totalListings - pendingListings),
      total: totalListings,
      icon: Store,
      note: `${pendingListings.toLocaleString("vi-VN")} listing chờ duyệt`,
    },
    {
      label: "Hội thoại Nova",
      value: data.ai.totalChatbotSessions,
      total: data.ai.totalChatbotSessions,
      icon: MessageSquareText,
      note: `${data.ai.totalChatbotMessages.toLocaleString("vi-VN")} tin nhắn đã ghi nhận`,
    },
  ];

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-bv-gold" aria-hidden="true" />
            BookVerse Admin Center
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Trung tâm quản trị hệ thống</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-bv-mint-soft">
            Quản lý user, sách, listing, đơn hàng, báo cáo cộng đồng, AI feedback và audit log cho đồ án BookVerse AI.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-bv-ivory px-4 text-sm font-black text-[#0F3F3C] transition hover:bg-bv-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
              href="/admin/data-quality"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Mở Data Quality Admin
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
              href="/admin/analytics"
            >
              <BarChart3 className="h-4 w-4 text-bv-gold" aria-hidden="true" />
              Xem Analytics
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
              href="/admin/integrations"
            >
              <ServerCog className="h-4 w-4 text-bv-gold" aria-hidden="true" />
              Kiểm tra tích hợp
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section
          aria-labelledby="admin-overview-title"
          className="grid min-w-0 gap-5 lg:grid-cols-[1.45fr_0.55fr]"
        >
          <div className="bv-card min-w-0 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-bv-primary">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  Live overview
                </p>
                <h2
                  className="mt-2 text-2xl font-black text-bv-heading"
                  id="admin-overview-title"
                >
                  Tổng quan vận hành
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-bv-text-muted">
                  Số liệu lấy trực tiếp từ database hiện tại, giúp kiểm tra nhanh
                  trước khi đi vào từng bảng quản trị.
                </p>
              </div>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-emerald-50 px-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
                <CircleCheckBig className="h-4 w-4" aria-hidden="true" />
                Dữ liệu đã tải
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {overviewItems.map((item) => {
                const Icon = item.icon;
                const progress =
                  item.label === "Hội thoại Nova"
                    ? 100
                    : percent(item.value, item.total);
                return (
                  <article
                    className="rounded-xl border border-bv-primary/15 bg-[#FAF8F2] p-4"
                    key={item.label}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-bv-heading">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-bv-text-muted">
                          {item.note}
                        </p>
                      </div>
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bv-mint text-bv-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <p className="text-2xl font-black tabular-nums text-bv-heading">
                        {item.value.toLocaleString("vi-VN")}
                      </p>
                      <p className="text-xs font-black tabular-nums text-bv-primary">
                        {progress}%
                      </p>
                    </div>
                    <div
                      aria-label={`${item.label}: ${progress}%`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={progress}
                      className="mt-2 h-2 overflow-hidden rounded-full bg-[#DCE9E5]"
                      role="progressbar"
                    >
                      <div
                        className="h-full rounded-full bg-bv-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl bg-bv-primary-dark p-5 text-white shadow-lg sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-bv-gold">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#BFE2DA]">
                  Attention queue
                </p>
                <h2 className="mt-1 text-xl font-black">Việc cần xử lý</h2>
              </div>
            </div>
            <dl className="mt-6 grid gap-3">
              {[
                ["Listing chờ duyệt", pendingListings],
                ["Báo cáo cộng đồng", totalReports],
                ["Feedback AI chưa tốt", data.ai.lowRatedChatbotFeedback.length],
                ["Tài khoản đang khóa", lockedUsers],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  key={String(label)}
                >
                  <dt className="text-sm font-bold text-[#D9EEEA]">{label}</dt>
                  <dd className="text-xl font-black tabular-nums text-white">
                    {Number(value).toLocaleString("vi-VN")}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 grid gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-between rounded-xl bg-white px-4 text-sm font-black text-bv-primary-dark transition hover:bg-bv-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
                href="/admin/analytics"
              >
                Phân tích chi tiết
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-between rounded-xl border border-white/20 px-4 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
                href="/admin/subscriptions"
              >
                Quản lý hội viên
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </section>

        <form className="bv-card grid min-w-0 grid-cols-1 gap-3 rounded-lg p-4 lg:grid-cols-[1fr_repeat(5,160px)_auto]" method="get">
          <Input
            aria-label="Từ khóa tìm kiếm trong trung tâm quản trị"
            defaultValue={params?.q ?? ""}
            name="q"
            placeholder="Tìm user, sách, listing, order..."
          />
          <select aria-label="Lọc người dùng theo vai trò" className="h-11 w-full min-w-0 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.role ?? "ALL"} name="role">
            <option value="ALL">Tất cả role</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select aria-label="Lọc trạng thái người dùng" className="h-11 w-full min-w-0 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.userStatus ?? "all"} name="userStatus">
            <option value="all">Tất cả user</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
          </select>
          <select aria-label="Lọc trạng thái sách" className="h-11 w-full min-w-0 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.bookStatus ?? "ALL"} name="bookStatus">
            <option value="ALL">Tất cả sách</option>
            {Object.values(BookStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select aria-label="Lọc trạng thái tin bán" className="h-11 w-full min-w-0 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.listingStatus ?? "ALL"} name="listingStatus">
            <option value="ALL">Tất cả listing</option>
            {Object.values(ListingStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select aria-label="Lọc trạng thái đơn hàng" className="h-11 w-full min-w-0 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.orderStatus ?? "ALL"} name="orderStatus">
            <option value="ALL">Tất cả order</option>
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button type="submit">
            Lọc
          </Button>
        </form>

        <nav className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["#users", "Users", UserCog],
            ["#books", "Books", BookOpen],
            ["#marketplace", "Marketplace", Store],
            ["#orders", "Orders", Truck],
            ["#community", "Community", Flag],
            ["#ai", "AI", Bot],
          ].map(([href, label, Icon]) => {
            const TabIcon = Icon as typeof UserCog;
            return (
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#17191F]/10 bg-white px-3 text-sm font-black text-bv-heading shadow-sm transition hover:bg-bv-muted"
                href={href as string}
                key={href as string}
              >
                <TabIcon className="h-4 w-4" aria-hidden="true" />
                {label as string}
              </Link>
            );
          })}
        </nav>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.metrics.map((metric) => (
            <article className="bv-card rounded-lg p-5" key={metric.label}>
              <p className="text-sm font-bold text-bv-text-muted">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-bv-heading">{metric.value.toLocaleString("vi-VN")}</p>
            </article>
          ))}
        </div>

        <section className="bv-card min-w-0 overflow-hidden rounded-lg p-5" id="users">
          {sectionTitle(<UserCog className="h-5 w-5" aria-hidden="true" />, "Admin Users", "Tìm kiếm, đổi role, khóa/mở khóa và xem hoạt động gần đây của user.")}
          <div aria-label="Bảng đơn hàng, cuộn ngang để xem thêm cột" className="overflow-x-auto" tabIndex={0}>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-bv-text-muted">
                <tr>
                  <th className="py-3">User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Hoạt động</th>
                  <th>Thống kê</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17191F]/10">
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-4">
                      <p className="font-black text-bv-heading">{user.name}</p>
                      <p className="text-xs text-bv-text-muted">{user.email ?? user.id}</p>
                      <p className="text-xs text-bv-text-muted">Tạo: {formatDate(user.createdAt)}</p>
                    </td>
                    <td><StatusBadge value={user.role} /></td>
                    <td>
                      <StatusBadge value={user.isLocked ? "LOCKED" : "ACTIVE"} />
                      {user.lockReason ? <p className="mt-1 max-w-44 text-xs text-red-600">{user.lockReason}</p> : null}
                    </td>
                    <td>
                      <p className="text-xs text-bv-text-muted">Last active: {formatDate(user.lastActiveAt)}</p>
                      <div className="mt-2 space-y-1">
                        {user.recentActivity.slice(0, 2).map((activity) => (
                          <p className="line-clamp-1 text-xs text-bv-text-muted" key={`${activity.actionType}-${activity.createdAt.toISOString()}`}>
                            {activity.actionType}: {activity.bookTitle}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs text-bv-text-muted">
                      Listing {user.counts.listings} · Order {user.counts.orders} · Post {user.counts.posts} · Rec {user.counts.recommendations}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <form action={updateUserRoleAction} className="flex gap-2">
                          <input name="userId" type="hidden" value={user.id} />
                          <select aria-label={`Vai trò của ${user.name}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={user.role} name="role">
                            {Object.values(UserRole).map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <ConfirmSubmitButton className={neutralButton} confirmMessage="Xác nhận đổi vai trò user?">
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            Lưu role
                          </ConfirmSubmitButton>
                        </form>
                        {user.isLocked ? (
                          <form action={unlockUserAction}>
                            <input name="userId" type="hidden" value={user.id} />
                            <ConfirmSubmitButton className={primaryButton} confirmMessage="Mở khóa user này?">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              Mở khóa
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <form action={lockUserAction} className="flex gap-2">
                            <input name="userId" type="hidden" value={user.id} />
                            <input aria-label={`Lý do khóa ${user.name}`} className="h-11 w-36 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Lý do khóa" />
                            <ConfirmSubmitButton className={dangerButton} confirmMessage="Khóa user này?">
                              <Lock className="h-4 w-4" aria-hidden="true" />
                              Khóa
                            </ConfirmSubmitButton>
                          </form>
                        )}
                        <form action={rerunRecommendationAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <ConfirmSubmitButton className={neutralButton} confirmMessage="Chạy lại recommendation cho user ngay?">
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Rerun AI
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bv-card min-w-0 overflow-hidden rounded-lg p-5" id="books">
          {sectionTitle(<BookOpen className="h-5 w-5" aria-hidden="true" />, "Admin Books", "Kiểm tra sách thiếu cover/mô tả/embedding và cập nhật trạng thái mềm.")}
          <div className="grid gap-3 lg:grid-cols-2">
            {data.books.map((book) => (
              <article className="rounded-lg bg-bv-surface p-4" key={book.id}>
                <div className="flex gap-4">
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#153A3F] text-xs font-black text-white">
                    <BookCover
                      alt={book.title}
                      author={book.author}
                      bookId={book.id}
                      category={book.category}
                      className="h-full w-full object-cover"
                      src={book.coverPath}
                      title={book.title}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="line-clamp-1 font-black text-bv-heading">{book.title}</h3>
                      <StatusBadge value={book.status} />
                    </div>
                    <p className="mt-1 text-sm text-bv-text-muted">{book.author} · {book.category}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {!book.hasCover ? <StatusBadge value="MISSING_COVER" /> : null}
                      {!book.hasDescription ? <StatusBadge value="MISSING_DESCRIPTION" /> : null}
                      {!book.isEbook ? <StatusBadge value="NO_EBOOK" /> : null}
                      {!book.hasEmbedding ? <StatusBadge value="NO_EMBEDDING" /> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={updateBookStatusAction} className="flex gap-2">
                        <input name="bookId" type="hidden" value={book.id} />
                        <select aria-label={`Trạng thái sách ${book.title}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={book.status} name="status">
                          {Object.values(BookStatus).map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <input aria-label={`Ghi chú trạng thái sách ${book.title}`} className="h-11 w-32 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Ghi chú" />
                        <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật trạng thái sách?">
                          Lưu
                        </ConfirmSubmitButton>
                      </form>
                      <form action={regenerateBookEmbeddingAction}>
                        <input name="bookId" type="hidden" value={book.id} />
                        <ConfirmSubmitButton className={neutralButton} confirmMessage="Tạo lại embedding cho sách này ngay?">
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          Embedding
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bv-card min-w-0 overflow-hidden rounded-lg p-5" id="marketplace">
          {sectionTitle(<Store className="h-5 w-5" aria-hidden="true" />, "Admin Marketplace", "Duyệt, từ chối hoặc ẩn listing; xem điểm chất lượng theo quy tắc và lý do từ chối.")}
          <div className="space-y-3">
            {data.listings.map((listing) => (
              <article className="rounded-lg bg-bv-surface p-4" key={listing.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-bv-heading">{listing.title}</h3>
                      <StatusBadge value={listing.status} />
                      <StatusBadge value={listing.condition} />
                    </div>
                    <p className="mt-1 text-sm text-bv-text-muted">
                      {formatPrice(listing.price)} · Seller {listing.seller.name} · {listing.seller.listingCount} listing · Điểm chất lượng {listing.seller.sellerQualityScore}/100
                    </p>
                    {listing.rejectionReason ? <p className="mt-2 text-sm text-red-700">Lý do: {listing.rejectionReason}</p> : null}
                  </div>
                  <form action={moderateListingAction} className="flex flex-wrap items-center gap-2">
                    <input name="listingId" type="hidden" value={listing.id} />
                    <select aria-label={`Trạng thái tin bán ${listing.title}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={listing.status} name="status">
                      <option value={ListingStatus.APPROVED}>APPROVED</option>
                      <option value={ListingStatus.REJECTED}>REJECTED</option>
                      <option value={ListingStatus.HIDDEN}>HIDDEN</option>
                      <option value={ListingStatus.ARCHIVED}>ARCHIVED</option>
                    </select>
                    <input aria-label={`Lý do kiểm duyệt tin bán ${listing.title}`} className="h-11 w-44 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Lý do khi từ chối" />
                    <ConfirmSubmitButton className={primaryButton} confirmMessage="Cập nhật listing này?">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Cập nhật
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bv-card min-w-0 overflow-hidden rounded-lg p-5" id="orders">
          {sectionTitle(<Truck className="h-5 w-5" aria-hidden="true" />, "Admin Orders", "Theo dõi đơn hàng và ghi timeline/notification khi đổi trạng thái.")}
          <div aria-label="Bảng đơn hàng, cuộn ngang để xem thêm cột" className="overflow-x-auto" tabIndex={0}>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase text-bv-text-muted">
                <tr><th className="py-3">Order</th><th>Buyer</th><th>Seller</th><th>Tổng</th><th>Status</th><th>Hành động</th></tr>
              </thead>
              <tbody className="divide-y divide-[#17191F]/10">
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-4"><p className="font-black text-bv-heading">{order.id}</p><p className="text-xs text-bv-text-muted">{formatDate(order.createdAt)} · {order.itemCount} item</p></td>
                    <td>{order.buyer.name}<p className="text-xs text-bv-text-muted">{order.buyer.email}</p></td>
                    <td className="max-w-56 text-xs text-bv-text-muted">{order.sellers.join(", ") || "BookVerse"}</td>
                    <td className="font-black text-bv-accent">{formatPrice(order.totalAmount)}</td>
                    <td><StatusBadge value={order.status} /></td>
                    <td>
                      <form action={updateOrderStatusAction} className="flex flex-wrap gap-2">
                        <input name="orderId" type="hidden" value={order.id} />
                        <select aria-label={`Trạng thái đơn hàng ${order.id}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={order.status} name="status">
                          {Object.values(OrderStatus).map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <input aria-label={`Ghi chú cho đơn hàng ${order.id}`} className="h-11 w-40 rounded-lg border border-bv-border px-2 text-xs" name="note" placeholder="Ghi chú timeline" />
                        <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật trạng thái đơn hàng?">
                          <ClipboardList className="h-4 w-4" aria-hidden="true" />
                          Lưu
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" id="community">
          <div className="bv-card rounded-lg p-5">
            {sectionTitle(<Flag className="h-5 w-5" aria-hidden="true" />, "Bài viết bị report", "Ẩn, khôi phục hoặc xóa mềm bài viết cộng đồng.")}
            <div className="space-y-3">
              {data.reportedPosts.map((post) => (
                <article className="rounded-lg bg-bv-surface p-4" key={post.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-bv-heading">{post.title}</h3>
                    <StatusBadge value={post.status} />
                    <StatusBadge value={`${post.reportCount}_REPORT`} />
                  </div>
                  <p className="mt-1 text-sm text-bv-text-muted">Tác giả {post.authorName}</p>
                  <form action={moderatePostAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="postId" type="hidden" value={post.id} />
                    <select aria-label={`Trạng thái bài viết ${post.title}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={post.status} name="status">
                      <option value={PostStatus.PUBLISHED}>PUBLISHED</option>
                      <option value={PostStatus.HIDDEN}>HIDDEN</option>
                      <option value={PostStatus.REMOVED}>REMOVED</option>
                    </select>
                    <input aria-label={`Lý do kiểm duyệt bài viết ${post.title}`} className="h-11 w-44 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Lý do kiểm duyệt" />
                    <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật bài viết?">
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      Lưu
                    </ConfirmSubmitButton>
                  </form>
                </article>
              ))}
              {data.reportedPosts.length === 0 ? <p className="text-sm text-bv-text-muted">Không có bài viết bị report.</p> : null}
            </div>
          </div>

          <div className="bv-card rounded-lg p-5">
            {sectionTitle(<Flag className="h-5 w-5" aria-hidden="true" />, "Bình luận bị report", "Xử lý comment vi phạm dựa trên reaction REPORT.")}
            <div className="space-y-3">
              {data.reportedComments.map((comment) => (
                <article className="rounded-lg bg-bv-surface p-4" key={comment.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={comment.status} />
                    <StatusBadge value={`${comment.reportCount}_REPORT`} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-bv-heading">{comment.content}</p>
                  <p className="mt-1 text-xs text-bv-text-muted">{comment.authorName} · {comment.postTitle}</p>
                  <form action={moderateCommentAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="commentId" type="hidden" value={comment.id} />
                    <select aria-label={`Trạng thái bình luận của ${comment.authorName}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={comment.status} name="status">
                      <option value={PostStatus.PUBLISHED}>PUBLISHED</option>
                      <option value={PostStatus.HIDDEN}>HIDDEN</option>
                      <option value={PostStatus.REMOVED}>REMOVED</option>
                    </select>
                    <input aria-label={`Lý do kiểm duyệt bình luận của ${comment.authorName}`} className="h-11 w-44 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Lý do kiểm duyệt" />
                    <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật bình luận?">
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      Lưu
                    </ConfirmSubmitButton>
                  </form>
                </article>
              ))}
              {data.reportedComments.length === 0 ? <p className="text-sm text-bv-text-muted">Không có bình luận bị report.</p> : null}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" id="ai">
          <div className="bv-card min-w-0 rounded-lg p-5">
            {sectionTitle(<Bot className="h-5 w-5" aria-hidden="true" />, "AI Management", "Theo dõi recommendation, evidence, phiên Nova và feedback xấu.")}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Recommendations", data.ai.totalRecommendations + data.ai.totalDailyRecommendations],
                ["Evidence", data.ai.totalEvidence],
                ["Rec feedback", data.ai.totalRecommendationFeedback],
                ["Chat sessions", data.ai.totalChatbotSessions],
                ["Chat messages", data.ai.totalChatbotMessages],
                ["Chat feedback", data.ai.totalChatbotFeedback],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-bv-surface p-4" key={label as string}>
                  <p className="text-sm font-bold text-bv-text-muted">{label}</p>
                  <p className="mt-2 text-2xl font-black text-bv-heading">{Number(value).toLocaleString("vi-VN")}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <h3 className="font-black text-bv-heading">Chatbot feedback thấp</h3>
              {data.ai.lowRatedChatbotFeedback.map((feedback) => (
                <article className="rounded-lg bg-bv-surface p-4" key={feedback.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={feedback.value} />
                    <span className="text-xs text-bv-text-muted">{feedback.userName ?? "Ẩn danh"} · {formatDate(feedback.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-bv-heading">{feedback.message ?? "Không có message liên kết."}</p>
                  {feedback.note ? <p className="mt-1 text-xs text-bv-text-muted">{feedback.note}</p> : null}
                </article>
              ))}
              {data.ai.lowRatedChatbotFeedback.length === 0 ? <p className="text-sm text-bv-text-muted">Chưa có feedback xấu.</p> : null}
            </div>
          </div>

          <aside className="bv-card h-fit min-w-0 rounded-lg p-5">
            {sectionTitle(<ClipboardList className="h-5 w-5" aria-hidden="true" />, "Audit Log", "Các hành động quản trị quan trọng gần đây.")}
            <div className="space-y-3">
              {data.auditLogs.map((log) => (
                <div className="rounded-lg bg-bv-surface px-4 py-3 text-sm" key={log.id}>
                  <p className="font-black text-bv-heading">{log.action}</p>
                  <p className="mt-1 break-all text-xs text-bv-text-muted">{log.entityType}:{log.entityId}</p>
                  <p className="mt-1 text-xs text-bv-text-muted">{log.actorName ?? "System"} · {formatDate(log.createdAt)}</p>
                </div>
              ))}
              {data.auditLogs.length === 0 ? <p className="text-sm text-bv-text-muted">Chưa có audit log.</p> : null}
            </div>
          </aside>
        </section>

        <div className="flex items-center justify-between rounded-lg border border-[#17191F]/10 bg-white px-4 py-3 text-sm text-bv-text-muted">
          <p>Trang {data.pagination.page} · page size {data.pagination.pageSize}</p>
          <div className="flex gap-2">
            <Link className={neutralButton} href={`/admin?page=${Math.max(1, data.pagination.page - 1)}`}>Trang trước</Link>
            <Link className={neutralButton} href={`/admin?page=${data.pagination.page + 1}`}>Trang sau</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
