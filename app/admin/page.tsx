import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Ban,
  BarChart3,
  BookOpen,
  BookPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  Database,
  EyeOff,
  Flag,
  KeyRound,
  Lock,
  MapPin,
  Package,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { BookStatus, PostStatus, UserRole } from "@prisma/client";
import { buildCatalogPaginationItems } from "@/lib/catalog-pagination";
import { getAdminStatistics } from "@/actions/admin-statistics.actions";
import {
  adminCreateBook,
  adminCreateUser,
  adminDeleteBook,
  adminDeleteUser,
  adminResetPassword,
  adminUpdateBook,
  adminUpdateUser,
  getAdminCenterData,
  moderateComment,
  moderatePost,
  regenerateBookEmbedding,
  rerunRecommendationForUser,
  toggleUserLock,
  updateBookStatus,
  updateOrderStatus,
  updateUserRole,
} from "@/actions/dashboard.actions";
import { AdminSectionTabs } from "@/components/admin/AdminSectionTabs";
import { AdminSubNav } from "@/components/admin/AdminSubNav";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { DetailsCloseButton } from "@/components/admin/DetailsCloseButton";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireModeratorUser, requireAdminUser, type CurrentUserSession } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface AdminDashboardPageProps {
  searchParams?: Promise<{
    q?: string;
    role?: string;
    userStatus?: string;
    bookStatus?: string;
    orderStatus?: string;
    buyerId?: string;
    page?: string;
    tab?: string;
    message?: string;
    error?: string;
  }>;
}

const dangerButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600";
const neutralButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-bv-border bg-bv-ivory px-3 py-2 text-xs font-black text-bv-heading transition hover:bg-[#EDF7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus";
const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-bv-focus px-3 py-2 text-xs font-black text-white transition hover:bg-[#0F5F59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus focus-visible:ring-offset-2";

function getAdminRedirectUrl(
  tab: "users" | "books" | "orders",
  formData: FormData,
  result?: { success: boolean; message: string }
): string {
  const next = new URLSearchParams();
  next.set("tab", tab);
  const page = String(formData.get("page") ?? "").trim();
  if (page && page !== "1") next.set("page", page);
  const q = String(formData.get("q") ?? "").trim();
  if (q) next.set("q", q);
  const role = String(formData.get("role") ?? "").trim();
  if (role && role !== "ALL") next.set("role", role);
  const userStatus = String(formData.get("userStatus") ?? "").trim();
  if (userStatus && userStatus !== "all") next.set("userStatus", userStatus);
  const bookStatus = String(formData.get("bookStatus") ?? "").trim();
  if (bookStatus && bookStatus !== "ALL") next.set("bookStatus", bookStatus);
  const orderStatus = String(formData.get("orderStatus") ?? "").trim();
  if (orderStatus && orderStatus !== "ALL") next.set("orderStatus", orderStatus);
  const buyerId = String(formData.get("buyerId") ?? "").trim();
  if (buyerId && buyerId !== "ALL") next.set("buyerId", buyerId);
  if (result) {
    next.set(result.success ? "message" : "error", result.message);
  }
  return `/admin?${next.toString()}`;
}

async function updateOrderStatusAction(formData: FormData) {
  "use server";
  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  const note = String(formData.get("note") ?? "Quản trị viên cập nhật trạng thái");
  const result = await updateOrderStatus(orderId, nextStatus, note);
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("orders", formData, result));
}

async function createUserAction(formData: FormData) {
  "use server";
  const result = await adminCreateUser(formData);
  revalidatePath("/admin");
  redirect(`/admin?tab=users&${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
}

async function updateUserAction(formData: FormData) {
  "use server";
  const result = await adminUpdateUser(formData);
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("users", formData, result));
}

async function resetPasswordAction(formData: FormData) {
  "use server";
  const result = await adminResetPassword(formData);
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("users", formData, result));
}

async function deleteUserAction(formData: FormData) {
  "use server";
  const result = await adminDeleteUser(formData);
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("users", formData, result));
}

async function updateUserRoleAction(formData: FormData) {
  "use server";
  await updateUserRole(String(formData.get("userId") ?? ""), String(formData.get("role") ?? ""));
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("users", formData));
}

async function lockUserAction(formData: FormData) {
  "use server";
  await toggleUserLock(
    String(formData.get("userId") ?? ""),
    true,
    String(formData.get("reason") ?? "Khóa bởi admin."),
  );
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("users", formData));
}

async function unlockUserAction(formData: FormData) {
  "use server";
  await toggleUserLock(String(formData.get("userId") ?? ""), false, "");
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("users", formData));
}

async function createBookAction(formData: FormData) {
  "use server";
  const result = await adminCreateBook(formData);
  revalidatePath("/admin");
  redirect(`/admin?tab=books&${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
}

async function updateBookAction(formData: FormData) {
  "use server";
  const result = await adminUpdateBook(formData);
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("books", formData, result));
}

async function deleteBookAction(formData: FormData) {
  "use server";
  const bookId = String(formData.get("bookId") ?? "");
  const result = await adminDeleteBook(bookId);
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("books", formData, result));
}

async function updateBookStatusAction(formData: FormData) {
  "use server";
  const result = await updateBookStatus(
    String(formData.get("bookId") ?? ""),
    String(formData.get("status") ?? ""),
    String(formData.get("reason") ?? ""),
  );
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("books", formData, result));
}

async function regenerateBookEmbeddingAction(formData: FormData) {
  "use server";
  await regenerateBookEmbedding(String(formData.get("bookId") ?? ""));
  revalidatePath("/admin");
  redirect(getAdminRedirectUrl("books", formData));
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
  redirect(getAdminRedirectUrl("users", formData));
}

function formatDate(value: Date | null): string {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function statusClass(status: string): string {
  if (["APPROVED", "PUBLISHED", "ACTIVE", "COMPLETED", "PAID", "PAID_DEMO"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (["PENDING", "PENDING_REVIEW", "DRAFT", "SHIPPED"].includes(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (["REJECTED", "HIDDEN", "REMOVED", "CANCELLED", "ARCHIVED", "REFUNDED", "LOCKED"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

const STATUS_LABELS: Record<string, string> = {
  // Vai trò người dùng (Roles)
  BUYER: "Độc giả",
  SELLER: "Người bán",
  MODERATOR: "Kiểm duyệt viên",
  ADMIN: "Quản trị viên",
  MEMBER: "Thành viên",
  USER: "Người dùng",

  // Trạng thái tài khoản
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đang bị khóa",

  // Trạng thái sách & Tin bán
  DRAFT: "Bản nháp",
  HIDDEN: "Tạm ẩn",
  ARCHIVED: "Đã lưu trữ",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SOLD: "Đã bán hết",

  // Kiểm duyệt chất lượng sách & AI
  MISSING_COVER: "Thiếu ảnh bìa",
  MISSING_DESCRIPTION: "Thiếu tóm tắt",
  NO_EBOOK: "Chưa có Ebook",
  NO_EMBEDDING: "Chưa có AI vector",
  NEEDS_COVER_REVIEW: "Cần duyệt bìa",
  VERIFIED_LOCAL: "Bìa hợp lệ",

  // Trạng thái bài viết & bình luận
  PUBLISHED: "Đã đăng",
  REMOVED: "Đã gỡ bỏ",

  // Trạng thái đơn hàng
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PAID_DEMO: "Đã thanh toán (Thử nghiệm)",
  SHIPPED: "Đang giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

function formatStatusLabel(value: string): string {
  if (value.endsWith("_REPORT")) {
    const count = value.replace("_REPORT", "");
    return `${count} Báo cáo vi phạm`;
  }
  return STATUS_LABELS[value] ?? value;
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClass(value)}`}>
      {formatStatusLabel(value)}
    </span>
  );
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  ADMIN_BOOK_CREATE: "Thêm sách mới",
  ADMIN_BOOK_UPDATE: "Sửa thông tin sách",
  ADMIN_BOOK_STATUS_UPDATE: "Đổi trạng thái sách",
  ADMIN_BOOK_DELETE: "Xóa sách",
  ADMIN_BOOK_ARCHIVE: "Lưu trữ sách",
  ADMIN_BOOK_EMBEDDING_REGENERATE: "Tạo lại AI vector",
  ADMIN_USER_CREATE: "Thêm tài khoản",
  ADMIN_USER_UPDATE: "Sửa tài khoản",
  ADMIN_USER_PASSWORD_RESET: "Đặt lại mật khẩu",
  ADMIN_USER_DELETE: "Xóa tài khoản",
  ADMIN_USER_LOCK: "Khóa tài khoản",
  ADMIN_USER_UNLOCK: "Mở khóa tài khoản",
  ADMIN_USER_ROLE_UPDATE: "Đổi quyền tài khoản",
  ADMIN_POST_MODERATED: "Kiểm duyệt bài viết",
  ADMIN_COMMENT_MODERATED: "Kiểm duyệt bình luận",
  ADMIN_RECOMMENDATION_RERUN_REQUEST: "Chạy lại gợi ý AI",
  DATA_QUALITY_COVER_VERIFIED: "Duyệt bìa sách",
  DATA_QUALITY_LANGUAGE_UPDATED: "Sửa ngôn ngữ sách",
  DATA_QUALITY_VISIBILITY_UPDATED: "Cập nhật hiển thị",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  BOOK: "Sách",
  USER: "Người dùng",
  POST: "Bài viết",
  COMMENT: "Bình luận",
  LISTING: "Tin bán",
  ORDER: "Đơn hàng",
};

function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function formatEntityType(type: string): string {
  return ENTITY_TYPE_LABELS[type] ?? type;
}

function sectionTitle(icon: ReactNode, title: string, description: string) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1 text-bv-focus">{icon}</span>
      <div>
        <h2 className="text-xl font-black text-bv-heading">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-bv-text-muted">{description}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  let currentUser: CurrentUserSession;
  try {
    currentUser = await requireModeratorUser();
  } catch {
    redirect("/");
  }

  const isAdmin = currentUser!.role === "ADMIN";

  const params = await searchParams;
  const requestedPage = Number(params?.page ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const allowedTabs = new Set(["overview", "users", "books", "orders", "community", "audit"]);
  const currentTab = allowedTabs.has(params?.tab ?? "overview") ? (params?.tab ?? "overview") : "overview";

  const [data, statistics] = await Promise.all([
    getAdminCenterData({
      q: params?.q,
      role: params?.role,
      userStatus: params?.userStatus,
      bookStatus: params?.bookStatus,
      orderStatus: params?.orderStatus,
      buyerId: params?.buyerId,
      page,
    }),
    getAdminStatistics(),
  ]);

  const selectedBuyer =
    params?.buyerId && params.buyerId !== "ALL"
      ? data.buyers.find((b) => b.id === params.buyerId)
      : null;

  const metricValue = (label: string) => data.metrics.find((metric) => metric.label === label)?.value ?? 0;
  const totalUsers = metricValue("Người dùng");
  const totalBooks = metricValue("Sách");
  const lockedUsers = metricValue("Tài khoản bị khóa");
  const hiddenBooks = metricValue("Sách ẩn/lưu trữ");
  const totalReports = metricValue("Report");
  const urgentCount = lockedUsers + totalReports;

  const buildPageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (currentTab !== "overview") next.set("tab", currentTab);
    if (params?.q) next.set("q", params.q);
    if (params?.role) next.set("role", params.role);
    if (params?.userStatus) next.set("userStatus", params.userStatus);
    if (params?.bookStatus) next.set("bookStatus", params.bookStatus);
    if (params?.orderStatus) next.set("orderStatus", params.orderStatus);
    if (params?.buyerId) next.set("buyerId", params.buyerId);
    next.set("page", String(Math.max(1, nextPage)));
    return `/admin?${next.toString()}`;
  };

  const currentTotalItems =
    currentTab === "users"
      ? data.pagination.usersTotal
      : currentTab === "books"
      ? data.pagination.booksTotal
      : currentTab === "orders"
      ? data.pagination.ordersTotal
      : 0;
  const totalPages = Math.max(1, Math.ceil(currentTotalItems / data.pagination.pageSize));
  if (page > totalPages && totalPages > 0 && (currentTab === "users" || currentTab === "books" || currentTab === "orders")) {
    redirect(buildPageHref(totalPages));
  }

  const userHiddenPageInputs = (
    <>
      <input name="page" type="hidden" value={page} />
      {params?.q ? <input name="q" type="hidden" value={params.q} /> : null}
      {params?.role ? <input name="role" type="hidden" value={params.role} /> : null}
      {params?.userStatus ? <input name="userStatus" type="hidden" value={params.userStatus} /> : null}
    </>
  );

  const bookHiddenPageInputs = (
    <>
      <input name="page" type="hidden" value={page} />
      {params?.q ? <input name="q" type="hidden" value={params.q} /> : null}
      {params?.bookStatus ? <input name="bookStatus" type="hidden" value={params.bookStatus} /> : null}
    </>
  );

  const orderHiddenPageInputs = (
    <>
      <input name="page" type="hidden" value={page} />
      {params?.q ? <input name="q" type="hidden" value={params.q} /> : null}
      {params?.orderStatus ? <input name="orderStatus" type="hidden" value={params.orderStatus} /> : null}
      {params?.buyerId ? <input name="buyerId" type="hidden" value={params.buyerId} /> : null}
    </>
  );

  const overviewItems = [
    {
      label: "Tài khoản người dùng",
      value: totalUsers,
      icon: Users,
      note: `${lockedUsers.toLocaleString("vi-VN")} tài khoản đang khóa`,
      iconBg: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
      accentBorder: "hover:border-blue-300",
    },
    {
      label: "Sách trong hệ thống",
      value: totalBooks,
      icon: BookOpen,
      note: `${(statistics.summary.catalogStoreStockUnits ?? 11128).toLocaleString("vi-VN")} cuốn sách giấy tồn kho BookVerse`,
      iconBg: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
      accentBorder: "hover:border-emerald-300",
    },
    {
      label: "Lượt xem sách (30 ngày)",
      value: statistics.summary.totalViews30d,
      icon: Activity,
      note: `${statistics.summary.trackedViewers30d.toLocaleString("vi-VN")} người dùng đã xác định`,
      iconBg: "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
      accentBorder: "hover:border-violet-300",
    },
    {
      label: "Sách cũ đang bán (Chợ sách C2C)",
      value: statistics.summary.totalActiveListings,
      icon: Package,
      note: `${statistics.summary.totalInventoryUnits.toLocaleString("vi-VN")} cuốn từ các tài khoản thành viên`,
      iconBg: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
      accentBorder: "hover:border-amber-300",
    },
  ];

  return (
    <main className="bv-page bg-[#F8F9FA]">
      <AdminSubNav urgentCount={urgentCount} />

      <header className="border-b border-bv-primary/10 bg-gradient-to-r from-[#0C3835] via-[#144D47] to-[#1A5C57] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-bv-gold">
              <Database aria-hidden="true" className="h-3.5 w-3.5" />
              Trung tâm điều hành BookVerse
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Quản trị nền tảng</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Tập trung vào tài khoản, kho sách, an toàn cộng đồng và số liệu vận hành thực tế.
            </p>
            {/* Badge vai trò đang đăng nhập */}
            <div className="mt-3 inline-flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${
                isAdmin
                  ? "bg-rose-500/20 text-rose-200 ring-rose-400/40"
                  : "bg-amber-500/20 text-amber-200 ring-amber-400/40"
              }`}>
                <ShieldAlert aria-hidden="true" className="h-3 w-3" />
                {isAdmin ? "Đăng nhập với quyền: Quản trị viên" : "Đăng nhập với quyền: Kiểm duyệt viên"}
              </span>
              {!isAdmin && (
                <span className="text-[11px] text-white/50">
                  Một số thao tác xóa/tạo tài khoản chỉ dành cho Quản trị viên.
                </span>
              )}
            </div>
          </div>
          <Link
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bv-gold px-4 text-sm font-black text-bv-primary-dark transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            href="/admin/statistics"
          >
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
            Xem thống kê
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {params?.message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800" role="status">
            ✓ {params.message}
          </div>
        ) : null}
        {params?.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">
            ⚠ {params.error}
          </div>
        ) : null}

        <section aria-labelledby="admin-overview-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-bv-mint/40 px-2.5 py-0.5 text-[11px] font-bold text-bv-primary">
                <CircleCheckBig aria-hidden="true" className="h-3.5 w-3.5" />
                Dữ liệu thời gian thực
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-900" id="admin-overview-title">
                Tổng quan vận hành
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Số liệu thực tế về doanh thu, lượt đọc sách và tương tác của độc giả trong 30 ngày qua.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cập nhật {formatDateTime(statistics.summary.generatedAt)}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewItems.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.accentBorder}`}
                  key={item.label}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-slate-900">
                        {item.value.toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-200 group-hover:scale-105 ${item.iconBg}`}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-3.5 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500">{item.note}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Thanh trạng thái hàng đợi quản trị tinh gọn */}
        <section aria-labelledby="admin-queue-title" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              urgentCount > 0 ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
            }`}>
              {urgentCount > 0 ? (
                <ShieldAlert aria-hidden="true" className="h-5 w-5" />
              ) : (
                <CircleCheckBig aria-hidden="true" className="h-5 w-5" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900" id="admin-queue-title">Hàng đợi quản trị</h3>
                {urgentCount > 0 ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {urgentCount} mục cần chú ý
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                    Hệ thống ổn định
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Theo dõi và xử lý nhanh báo cáo người dùng, tài khoản vi phạm và sách tạm ẩn.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Đơn hàng chờ duyệt",
                value: data.orders.filter((o) => o.status === "PENDING").length,
                href: "/admin?tab=orders&orderStatus=PENDING",
                hasPending: data.orders.filter((o) => o.status === "PENDING").length > 0,
              },
              {
                label: "Báo cáo cộng đồng",
                value: totalReports,
                href: "/admin?tab=community",
                hasPending: totalReports > 0,
              },
              {
                label: "Tài khoản đang khóa",
                value: lockedUsers,
                href: "/admin?tab=users&userStatus=locked",
                hasPending: lockedUsers > 0,
              },
              {
                label: "Sách ẩn / lưu trữ",
                value: hiddenBooks,
                href: "/admin?tab=books",
                hasPending: hiddenBooks > 0,
              },
            ].map((item) => (
              <Link
                className={`group flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus ${
                  item.hasPending
                    ? "border-rose-200 bg-rose-50/70 text-rose-800 hover:bg-rose-50 hover:border-rose-300"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                }`}
                href={item.href}
                key={item.label}
              >
                <span>{item.label}</span>
                <span className={`flex items-center gap-1 text-sm font-black tabular-nums ${
                  item.hasPending ? "text-rose-600" : "text-slate-900"
                }`}>
                  {item.value.toLocaleString("vi-VN")}
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <AdminSectionTabs
          counts={{
            users: totalUsers,
            books: totalBooks,
            orders: data.pagination.ordersTotal,
            pendingOrders: data.orders.filter((o) => o.status === "PENDING").length,
            reports: totalReports,
            audit: data.auditLogs.length,
          }}
          currentTab={currentTab}
        />

        {currentTab === "overview" ? (
          <div className="space-y-6">
            {/* Khối 1: Đơn hàng mới nhất cần kiểm tra & duyệt */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="overview-orders-title">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bv-mint text-bv-primary">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900" id="overview-orders-title">
                      Đơn hàng mới nhất
                    </h3>
                    <p className="text-xs text-slate-500">
                      Giao dịch mua sách phát sinh cần kiểm tra thanh toán và giao hàng.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin?tab=orders"
                  className="inline-flex items-center gap-1 text-xs font-bold text-bv-primary hover:underline"
                >
                  Xem toàn bộ {data.pagination.ordersTotal} đơn hàng
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {data.orders.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">Chưa có đơn hàng nào phát sinh.</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {data.orders.slice(0, 4).map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          #{order.id}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{order.buyer.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(order.createdAt)} · {order.itemCount} cuốn sách
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge value={order.status} />
                        <span className="font-mono text-xs font-black text-emerald-700">
                          {order.totalAmount.toLocaleString("vi-VN")} đ
                        </span>
                        <Link
                          href={`/admin?tab=orders&buyerId=${encodeURIComponent(order.buyer.id)}`}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                        >
                          Duyệt đơn
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Khối 2: Grid 2 cột — Người dùng mới & Sách trong kho */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Cột 1: Người dùng mới */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="overview-users-title">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-bv-primary" />
                    <h3 className="text-sm font-black text-slate-900" id="overview-users-title">
                      Tài khoản người dùng
                    </h3>
                  </div>
                  <Link href="/admin?tab=users" className="text-xs font-bold text-bv-primary hover:underline">
                    Xem {totalUsers} tài khoản →
                  </Link>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {data.users.slice(0, 4).map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.email ?? user.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={user.role} />
                        {user.counts.orders > 0 ? (
                          <Link
                            href={`/admin?tab=orders&buyerId=${encodeURIComponent(user.id)}`}
                            className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200 hover:underline"
                            title={`Xem ${user.counts.orders} đơn hàng`}
                          >
                            {user.counts.orders} đơn
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Cột 2: Kho sách & Tồn kho */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="overview-books-title">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-bv-primary" />
                    <h3 className="text-sm font-black text-slate-900" id="overview-books-title">
                      Kho sách &amp; Tồn kho
                    </h3>
                  </div>
                  <Link href="/admin?tab=books" className="text-xs font-bold text-bv-primary hover:underline">
                    Quản lý {totalBooks} sách →
                  </Link>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {data.books.slice(0, 4).map((book) => (
                    <div key={book.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 pr-3">
                        <p className="line-clamp-1 text-xs font-bold text-slate-900">{book.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{book.author} · {book.category}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        book.stock > 5
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : book.stock > 0
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          : "bg-red-50 text-red-700 ring-1 ring-red-200"
                      }`}>
                        Tồn: {book.stock}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {(currentTab === "users" || currentTab === "books") ? (
          <form className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row" method="get">
            <input name="tab" type="hidden" value={currentTab} />
            <Input
              aria-label="Từ khóa tìm kiếm trong trung tâm quản trị"
              className="min-w-0 flex-1"
              defaultValue={params?.q ?? ""}
              name="q"
              placeholder={currentTab === "users" ? "Tìm tên hoặc email người dùng..." : "Tìm tên sách hoặc tác giả..."}
            />
            {currentTab === "users" ? (
              <>
                <select aria-label="Lọc người dùng theo vai trò" className="h-11 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.role ?? "ALL"} name="role">
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="BUYER">Độc giả</option>
                  <option value="SELLER">Người bán</option>
                  <option value="MODERATOR">Kiểm duyệt viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="MEMBER">Thành viên</option>
                </select>
                <select aria-label="Lọc trạng thái người dùng" className="h-11 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.userStatus ?? "all"} name="userStatus">
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Đang bị khóa</option>
                </select>
              </>
            ) : (
              <select aria-label="Lọc trạng thái sách" className="h-11 rounded-lg border border-bv-border px-3 text-sm font-semibold" defaultValue={params?.bookStatus ?? "ALL"} name="bookStatus">
                <option value="ALL">Tất cả trạng thái sách</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="HIDDEN">Tạm ẩn</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>
            )}
            <Button className="cursor-pointer" type="submit">Lọc kết quả</Button>
          </form>
        ) : null}

        {currentTab === "users" ? (
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="users">
            {sectionTitle(<UserCog aria-hidden="true" className="h-5 w-5" />, "Tài khoản người dùng", "Thêm mới, sửa thông tin, đặt lại mật khẩu, phân quyền và khóa/mở khóa tài khoản.")}

            {/* Form thêm tài khoản mới — chỉ ADMIN */}
            {isAdmin ? (
            <details className="mb-6 rounded-2xl border border-bv-primary/20 bg-emerald-50/40 p-4 group">
              <summary className="cursor-pointer font-black text-bv-primary flex items-center justify-between list-none">
                <span className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Thêm tài khoản người dùng mới (Độc giả / Quản trị / Người bán)
                </span>
                <span className="rounded-lg bg-bv-primary px-3 py-1 text-xs font-bold text-white group-open:bg-zinc-200 group-open:text-zinc-700">
                  + Mở biểu mẫu tạo
                </span>
              </summary>
              <form action={createUserAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-emerald-100">
                <div>
                  <label className="text-xs font-bold text-bv-heading">Họ và tên *</label>
                  <input name="name" required placeholder="Ví dụ: Nguyễn Văn A" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Email đăng nhập *</label>
                  <input name="email" type="email" required placeholder="user@bookverse.local" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Mật khẩu tạm thời</label>
                  <input name="password" type="text" defaultValue="123456" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-mono" />
                  <p className="mt-0.5 text-[10px] text-amber-700">⚠ Mặc định: 123456 — đây là môi trường demo/sandbox</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Phân quyền</label>
                  <select name="role" defaultValue="BUYER" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-bold">
                    <option value="BUYER">Độc giả (Mua sách &amp; đọc sách)</option>
                    <option value="SELLER">Người bán (Chủ tiệm sách cũ)</option>
                    <option value="MODERATOR">Kiểm duyệt viên nội dung</option>
                    <option value="ADMIN">Quản trị viên (Toàn quyền)</option>
                    <option value="MEMBER">Thành viên</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
                  <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-bv-focus px-4 py-2 text-xs font-black text-white hover:bg-[#0F5F59]">
                    <Check className="h-4 w-4" /> Tạo tài khoản ngay
                  </button>
                </div>
              </form>
            </details>
            ) : (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs font-bold text-amber-800">
                <ShieldAlert className="mr-1.5 inline h-3.5 w-3.5" />
                Chức năng tạo tài khoản mới chỉ dành cho Quản trị viên.
              </div>
            )}

            <div aria-label="Bảng tài khoản, cuộn ngang để xem thêm cột" className="overflow-x-auto" tabIndex={0}>
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="text-xs uppercase text-bv-text-muted">
                  <tr><th className="py-3">Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Hoạt động</th><th>Thống kê</th><th>Quản lý &amp; Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-4 pr-4">
                        <p className="font-black text-bv-heading">{user.name}</p>
                        <p className="text-xs text-bv-text-muted">{user.email ?? user.id}</p>
                        <p className="text-xs text-bv-text-muted">Tạo: {formatDate(user.createdAt)}</p>
                        {user.preferredGenres.length > 0 ? (
                          <div className="mt-2 flex max-w-72 flex-wrap gap-1">
                            {user.preferredGenres.slice(0, 5).map((genre) => (
                              <span className="rounded-full bg-bv-mint px-2 py-0.5 text-[10px] font-black text-bv-primary" key={genre}>{genre}</span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td><StatusBadge value={user.role} /></td>
                      <td>
                        <StatusBadge value={user.isLocked ? "LOCKED" : "ACTIVE"} />
                        {user.lockReason ? <p className="mt-1 max-w-44 text-xs text-red-600">{user.lockReason}</p> : null}
                      </td>
                      <td>
                        <p className="text-xs text-bv-text-muted">Gần nhất: {formatDate(user.lastActiveAt)}</p>
                      </td>
                      <td className="text-xs text-bv-text-muted">
                        <span>Tin bán {user.counts.listings}</span>
                        {" · "}
                        {user.counts.orders > 0 ? (
                          <Link
                            href={`/admin?tab=orders&buyerId=${encodeURIComponent(user.id)}`}
                            className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100 hover:underline"
                            title={`Lọc xem ${user.counts.orders} đơn hàng của ${user.name}`}
                          >
                            Đơn {user.counts.orders} ↗
                          </Link>
                        ) : (
                          <span>Đơn {user.counts.orders}</span>
                        )}
                        {" · "}
                        <span>Bài viết {user.counts.posts}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Lọc nhanh đơn hàng của tài khoản này */}
                          {user.counts.orders > 0 ? (
                            <Link
                              href={`/admin?tab=orders&buyerId=${encodeURIComponent(user.id)}`}
                              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 shadow-2xs"
                              title={`Xem danh sách ${user.counts.orders} đơn hàng của ${user.name}`}
                            >
                              <ShoppingBag className="h-3 w-3" /> Đơn ({user.counts.orders})
                            </Link>
                          ) : null}
                          {/* Sửa thông tin tài khoản */}
                          <details className="relative inline-block text-left">
                            <summary className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100 list-none">
                              <Pencil className="h-3 w-3" /> Sửa
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl">
                              <p className="text-xs font-bold text-slate-800 mb-2">Sửa tài khoản {user.name}</p>
                              <form action={updateUserAction} className="space-y-2">
                                <input name="userId" type="hidden" value={user.id} />
                                {userHiddenPageInputs}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500">Họ và tên</label>
                                  <input name="name" defaultValue={user.name} required className="h-8 w-full rounded border px-2 text-xs" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500">Email</label>
                                  <input name="email" defaultValue={user.email ?? ""} type="email" required className="h-8 w-full rounded border px-2 text-xs" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500">Vai trò</label>
                                  <select name="role" defaultValue={user.role} className="h-8 w-full rounded border px-2 text-xs font-bold">
                                    <option value="BUYER">Độc giả</option>
                                    <option value="SELLER">Người bán</option>
                                    <option value="MODERATOR">Kiểm duyệt viên</option>
                                    <option value="ADMIN">Quản trị viên</option>
                                    <option value="MEMBER">Thành viên</option>
                                  </select>
                                </div>
                                <ConfirmSubmitButton
                                  className="w-full inline-flex justify-center items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700"
                                  confirmMessage={`Lưu cập nhật cho ${user.name}?`}
                                >
                                  <Check className="h-3.5 w-3.5" /> Lưu cập nhật
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </details>

                          {/* Reset mật khẩu */}
                          <details className="relative inline-block text-left">
                            <summary className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-800 transition hover:bg-amber-100 list-none">
                              <KeyRound className="h-3 w-3" /> Đặt lại MK
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                              <p className="text-xs font-bold text-slate-800 mb-1">Đặt lại mật khẩu</p>
                              <p className="text-[11px] text-slate-500 mb-2">Tài khoản: {user.email ?? user.name}</p>
                              <form action={resetPasswordAction} className="space-y-2">
                                <input name="userId" type="hidden" value={user.id} />
                                {userHiddenPageInputs}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500">Mật khẩu mới</label>
                                  <input
                                    name="newPassword"
                                    type="text"
                                    defaultValue="123456"
                                    className="h-8 w-full rounded border px-2 text-xs font-mono"
                                  />
                                  <p className="mt-0.5 text-[9px] text-amber-600">⚠ Mặc định: 123456 (môi trường demo)</p>
                                </div>
                                <ConfirmSubmitButton
                                  className="w-full inline-flex justify-center items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-700"
                                  confirmMessage={`Đặt lại mật khẩu cho ${user.name}?`}
                                >
                                  <KeyRound className="h-3.5 w-3.5" /> Đặt lại ngay
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </details>

                          {/* Khóa / Mở khóa */}
                          {user.isLocked ? (
                            <form action={unlockUserAction}>
                              <input name="userId" type="hidden" value={user.id} />
                              {userHiddenPageInputs}
                              <ConfirmSubmitButton className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700" confirmMessage="Mở khóa người dùng này?">
                                <Check aria-hidden="true" className="h-3 w-3" /> Mở khóa
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <form action={lockUserAction} className="flex items-center gap-1">
                              <input name="userId" type="hidden" value={user.id} />
                              {userHiddenPageInputs}
                              <ConfirmSubmitButton className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 hover:bg-red-100" confirmMessage="Khóa người dùng này?">
                                <Lock aria-hidden="true" className="h-3 w-3" /> Khóa
                              </ConfirmSubmitButton>
                            </form>
                          )}

                          {/* Xóa tài khoản — chỉ ADMIN */}
                          {isAdmin ? (
                          <form action={deleteUserAction} className="inline-block">
                            <input name="userId" type="hidden" value={user.id} />
                            {userHiddenPageInputs}
                            <ConfirmSubmitButton
                              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-300 bg-red-100/60 px-2.5 py-1.5 text-xs font-black text-red-800 transition hover:bg-red-200"
                              confirmMessage={`CẢNH BÁO: Xóa vĩnh viễn tài khoản "${user.name}" (${user.email ?? ""})? Thao tác này không thể hoàn tác.`}
                            >
                              <Trash2 className="h-3 w-3" /> Xóa
                            </ConfirmSubmitButton>
                          </form>
                          ) : null}

                          {/* Chạy lại AI */}
                          <form action={rerunRecommendationAction}>
                            <input name="userId" type="hidden" value={user.id} />
                            {userHiddenPageInputs}
                            <ConfirmSubmitButton
                              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-bv-border bg-bv-ivory px-2 py-1.5 text-xs font-black text-bv-heading hover:bg-[#EDF7F5]"
                              confirmMessage="Chạy lại thuật toán gợi ý sách cá nhân hóa cho người dùng này?"
                              title="Kích hoạt lại pipeline gợi ý AI: phân tích sở thích, hành vi đọc và lịch sử mua để cập nhật danh sách sách được đề xuất"
                            >
                              <RefreshCw aria-hidden="true" className="h-3 w-3" /> Gợi ý AI
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
        ) : null}

        {currentTab === "books" ? (
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="books">
            {sectionTitle(
              <BookOpen aria-hidden="true" className="h-5 w-5" />,
              "Kho sách & Danh mục",
              "Thêm sách mới, chỉnh sửa thông tin, giá bán, số trang, thể loại, ảnh bìa, phân quyền ebook và quản lý trạng thái.",
            )}

            {/* Form Thêm Sách Mới */}
            <details className="mb-6 rounded-2xl border border-bv-primary/20 bg-emerald-50/40 p-4 group">
              <summary className="cursor-pointer font-black text-bv-primary flex items-center justify-between list-none">
                <span className="flex items-center gap-2 text-sm">
                  <BookPlus className="h-4 w-4" />
                  Thêm sách mới vào kho hệ thống (Ebook & Sách giấy)
                </span>
                <span className="rounded-lg bg-bv-primary px-3 py-1 text-xs font-bold text-white group-open:bg-zinc-200 group-open:text-zinc-700">
                  + Mở biểu mẫu thêm sách
                </span>
              </summary>
              <form action={createBookAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3 border-t border-emerald-100">
                <div>
                  <label className="text-xs font-bold text-bv-heading">Tiêu đề sách *</label>
                  <input name="title" required placeholder="Ví dụ: Đắc Nhân Tâm" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Tên tác giả *</label>
                  <input name="authorName" required placeholder="Ví dụ: Dale Carnegie" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Thể loại *</label>
                  <select name="categoryId" required defaultValue={data.categories[0]?.id ?? ""} className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-semibold">
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Giá bán (VNĐ) *</label>
                  <input name="price" type="number" min="0" step="1000" defaultValue="50000" required className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Số lượng tồn kho (Sách giấy)</label>
                  <input name="stock" type="number" min="0" defaultValue="10" placeholder="Ví dụ: 20" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Số trang</label>
                  <input name="pages" type="number" min="1" placeholder="Ví dụ: 320" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Năm xuất bản</label>
                  <input name="publishYear" type="number" min="1800" max="2100" defaultValue="2024" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Ngôn ngữ</label>
                  <select name="languageCode" defaultValue="vi" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-semibold">
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">Tiếng Anh (English)</option>
                    <option value="ja">Tiếng Nhật</option>
                    <option value="zh">Tiếng Trung</option>
                    <option value="fr">Tiếng Pháp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Trạng thái phát hành</label>
                  <select name="status" defaultValue="ACTIVE" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-semibold">
                    <option value="ACTIVE">Hoạt động (Hiển thị ngay trên sàn)</option>
                    <option value="DRAFT">Bản nháp (Chưa công bố)</option>
                    <option value="HIDDEN">Tạm ẩn (Không hiển thị)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bv-heading">Đường dẫn ảnh bìa (URL)</label>
                  <input name="coverPath" type="text" placeholder="https://... hoặc /covers/sach.jpg" className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-bv-heading">Mô tả tóm tắt nội dung sách</label>
                  <textarea name="description" rows={3} placeholder="Giới thiệu nội dung, thông điệp cuốn sách..." className="mt-1 w-full rounded-lg border border-bv-border bg-white p-3 text-xs" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between pt-2 border-t border-emerald-100">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input name="isEbook" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-bv-primary" />
                    <span>Sách điện tử Ebook (Kích hoạt kho đọc thử &amp; xem trực tuyến)</span>
                  </label>
                  <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-bv-focus px-5 py-2 text-xs font-black text-white hover:bg-[#0F5F59] transition">
                    <Check className="h-4 w-4" /> Thêm sách vào hệ thống ngay
                  </button>
                </div>
              </form>
            </details>

            <div className="grid gap-4 lg:grid-cols-2">
              {data.books.map((book) => (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md" key={book.id}>
                  <div className="flex gap-4">
                    <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#153A3F] text-xs font-black text-white shadow-inner">
                      <BookCover alt={book.title} author={book.author} bookId={book.id} category={book.category} className="h-full w-full object-cover" src={book.coverPath} title={book.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <Link href={`/book/${book.id}`} target="_blank" className="hover:underline">
                          <h3 className="line-clamp-1 font-black text-bv-heading text-sm sm:text-base">{book.title}</h3>
                        </Link>
                        <StatusBadge value={book.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-bv-text-muted">{book.author} · <span className="font-semibold text-slate-700">{book.category}</span></p>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {book.price > 0 ? `${book.price.toLocaleString("vi-VN")} đ` : "Miễn phí"}
                        </span>

                        {/* Huy hiệu tồn kho sách giấy */}
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded border ${
                          book.stock > 10 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : book.stock > 0 
                            ? "bg-amber-50 text-amber-700 border-amber-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          <Package className="h-3 w-3" />
                          {book.stock > 0 ? `Kho: ${book.stock.toLocaleString("vi-VN")} cuốn` : "Hết sách giấy"}
                        </span>

                        {book.isEbook ? (
                          <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                            <BookOpen className="h-3 w-3" /> Ebook
                          </span>
                        ) : null}

                        {book.listingsCount > 0 ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                            Chợ sách: {book.listingsCount} tin
                          </span>
                        ) : null}

                        {book.ordersCount > 0 ? (
                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                            Đã bán: {book.ordersCount}
                          </span>
                        ) : null}

                        {book.pages ? <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{book.pages} trang</span> : null}
                        {book.publishYear ? <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{book.publishYear}</span> : null}
                      </div>

                      {book.description ? (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">{book.description}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        {/* Popover Chỉnh sửa thông tin sách */}
                        <details className="relative inline-block">
                          <summary className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 list-none">
                            <Pencil className="h-3 w-3 text-bv-primary" /> Sửa thông tin
                          </summary>
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-xs">
                            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-left">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                  <Pencil className="h-4 w-4 text-bv-primary" /> Chỉnh sửa thông tin sách
                                </h4>
                                <span className="text-xs text-slate-400 font-mono">Mã: {book.id.slice(0, 10)}</span>
                              </div>
                              <form action={updateBookAction} className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                                <input name="bookId" type="hidden" value={book.id} />
                                {bookHiddenPageInputs}
                                <div className="sm:col-span-2">
                                  <label className="font-bold text-slate-700">Tiêu đề sách *</label>
                                  <input name="title" defaultValue={book.title} required className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs" />
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Tác giả *</label>
                                  <input name="authorName" defaultValue={book.author} required className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs" />
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Thể loại</label>
                                  <select name="categoryId" defaultValue={book.categoryId} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 font-semibold text-xs">
                                    {data.categories.map((c) => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Giá bán (VNĐ) *</label>
                                  <input name="price" type="number" min="0" step="1000" defaultValue={book.price} required className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 font-mono font-bold text-xs" />
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Số lượng tồn kho (Sách giấy)</label>
                                  <input name="stock" type="number" min="0" defaultValue={book.stock} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 font-mono font-bold text-xs" />
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Trạng thái</label>
                                  <select name="status" defaultValue={book.status} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 font-semibold text-xs">
                                    {Object.values(BookStatus).map((status) => (
                                      <option key={status} value={status}>{formatStatusLabel(status)}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Số trang</label>
                                  <input name="pages" type="number" min="1" defaultValue={book.pages ?? ""} placeholder="320" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs" />
                                </div>
                                <div>
                                  <label className="font-bold text-slate-700">Năm xuất bản</label>
                                  <input name="publishYear" type="number" defaultValue={book.publishYear ?? ""} placeholder="2024" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="font-bold text-slate-700">Đường dẫn ảnh bìa</label>
                                  <input name="coverPath" defaultValue={book.coverPath ?? ""} placeholder="https://... hoặc /covers/book.jpg" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="font-bold text-slate-700">Mô tả tóm tắt nội dung</label>
                                  <textarea name="description" rows={3} defaultValue={book.description ?? ""} placeholder="Nội dung tóm tắt..." className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs" />
                                </div>
                                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                  <DetailsCloseButton>Đóng</DetailsCloseButton>
                                  <button type="submit" className="rounded-lg bg-bv-primary px-4 py-2 text-xs font-black text-white hover:bg-[#0F5F59]">
                                    Lưu thay đổi
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        </details>

                        {/* Cập nhật nhanh trạng thái */}
                        <form action={updateBookStatusAction} className="flex items-center gap-1">
                          <input name="bookId" type="hidden" value={book.id} />
                          {bookHiddenPageInputs}
                          <select aria-label={`Trạng thái sách ${book.title}`} className="h-9 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={book.status} name="status">
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="DRAFT">Bản nháp</option>
                            <option value="HIDDEN">Tạm ẩn</option>
                            <option value="ARCHIVED">Lưu trữ</option>
                          </select>
                          <ConfirmSubmitButton className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100" confirmMessage="Cập nhật trạng thái sách?">
                            Lưu
                          </ConfirmSubmitButton>
                        </form>

                        {/* Tạo lại Embedding AI */}
                        <form action={regenerateBookEmbeddingAction}>
                          <input name="bookId" type="hidden" value={book.id} />
                          {bookHiddenPageInputs}
                          <ConfirmSubmitButton className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100" confirmMessage="Tạo lại embedding cho sách này?">
                            <RefreshCw aria-hidden="true" className="h-3 w-3" /> Vector AI
                          </ConfirmSubmitButton>
                        </form>

                        {/* Xóa sách */}
                        <form action={deleteBookAction}>
                          <input name="bookId" type="hidden" value={book.id} />
                          {bookHiddenPageInputs}
                          <ConfirmSubmitButton
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                            confirmMessage={`Xóa cuốn sách "${book.title}"? Nếu sách đã phát sinh đơn mua, hệ thống sẽ tự động chuyển sang lưu trữ ẩn để bảo vệ lịch sử giao dịch.`}
                          >
                            <Trash2 className="h-3 w-3" /> Xóa
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {currentTab === "orders" ? (
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="orders">
            {sectionTitle(
              <ShoppingBag aria-hidden="true" className="h-5 w-5" />,
              "Đơn hàng & Quản lý duyệt đơn",
              "Theo dõi trạng thái đơn hàng khi người dùng mua sách, duyệt xác nhận thanh toán, xử lý giao hàng và hoàn kho.",
            )}

            {/* Thanh tìm kiếm & bộ lọc trạng thái đơn */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-4">
              <form method="get" className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="tab" value="orders" />
                <div className="relative min-w-56 flex-1 sm:max-w-xs">
                  <Input
                    name="q"
                    defaultValue={params?.q ?? ""}
                    placeholder="Mã đơn, tên/email người mua..."
                    className="h-10 bg-white text-xs pl-3"
                  />
                </div>
                <select
                  name="orderStatus"
                  defaultValue={params?.orderStatus ?? "ALL"}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-bv-focus"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ thanh toán / xác nhận</option>
                  <option value="PAID">Đã thanh toán (Chuyển khoản)</option>
                  <option value="PAID_DEMO">Đã thanh toán (Thử nghiệm)</option>
                  <option value="SHIPPED">Đang giao hàng</option>
                  <option value="COMPLETED">Hoàn tất thành công</option>
                  <option value="CANCELLED">Đã hủy đơn (Đã hoàn kho)</option>
                </select>
                <select
                  name="buyerId"
                  defaultValue={params?.buyerId ?? "ALL"}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-bv-focus max-w-[240px]"
                >
                  <option value="ALL">👤 Tất cả tài khoản</option>
                  {data.buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.orderCount > 0 ? `(${b.orderCount} đơn)` : "(0 đơn)"}
                    </option>
                  ))}
                </select>
                <Button type="submit" className="h-10 px-4 text-xs font-bold bg-bv-primary text-white hover:bg-[#0F5F59]">
                  Lọc đơn
                </Button>
                {params?.q || (params?.orderStatus && params.orderStatus !== "ALL") || (params?.buyerId && params.buyerId !== "ALL") ? (
                  <Link
                    href="/admin?tab=orders"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Xóa lọc
                  </Link>
                ) : null}
              </form>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Tổng cộng: <strong className="text-bv-heading">{data.pagination.ordersTotal.toLocaleString("vi-VN")}</strong> đơn hàng</span>
              </div>
            </div>

            {/* Banner hiển thị khi đang lọc theo một tài khoản người mua cụ thể */}
            {selectedBuyer ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <User className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-emerald-800">
                        Đang lọc đơn theo tài khoản:
                      </p>
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                        {data.pagination.ordersTotal} đơn hàng
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {selectedBuyer.name}
                      {selectedBuyer.email ? (
                        <span className="ml-1.5 text-xs font-medium text-slate-500">
                          ({selectedBuyer.email})
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin?tab=orders"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 shadow-2xs"
                >
                  <XCircle className="h-3.5 w-3.5 text-emerald-600" /> Xem tất cả tài khoản
                </Link>
              </div>
            ) : null}

            {/* Danh sách đơn hàng */}
            {data.orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-sm font-black text-slate-800">Không tìm thấy đơn hàng nào</h3>
                <p className="mt-1 text-xs text-slate-500">Chưa có đơn hàng nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.orders.map((order) => (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-sm"
                  >
                    {/* Header đơn hàng: Mã đơn, ngày đặt, trạng thái, phương thức thanh toán */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                          #{order.id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDateTime(order.createdAt)}
                        </span>
                        <StatusBadge value={order.status} />
                        {order.paymentMethod ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
                            <CreditCard className="h-3 w-3" />
                            {order.paymentMethod === "COD"
                              ? "Thanh toán khi nhận hàng (COD)"
                              : order.paymentMethod === "BANK_TRANSFER_DEMO"
                              ? "Chuyển khoản (Demo Sandbox)"
                              : "Ví điện tử (Demo)"}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Tổng thanh toán:</span>
                        <span className="text-base font-black text-emerald-700 font-mono">
                          {order.totalAmount.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </div>

                    <div className="p-5 grid gap-5 lg:grid-cols-3">
                      {/* Cột 1: Thông tin người mua & địa chỉ nhận hàng */}
                      <div className="space-y-3 lg:border-r lg:border-slate-100 lg:pr-5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Người đặt hàng</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                              {order.buyer.name}
                            </p>
                            <Link
                              href={`/admin?tab=orders&buyerId=${encodeURIComponent(order.buyer.id)}`}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:ring-1 hover:ring-emerald-300"
                              title={`Lọc chỉ xem đơn hàng của ${order.buyer.name}`}
                            >
                              Chỉ xem TK này ↗
                            </Link>
                          </div>
                          <p className="text-xs text-slate-500">{order.buyer.email ?? "Chưa có email"}</p>
                        </div>

                        {order.shippingInfo?.fullName || order.shippingInfo?.phone || order.shippingInfo?.address ? (
                          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Địa chỉ giao hàng</p>
                            <p className="font-bold text-slate-800">
                              {order.shippingInfo.fullName ?? order.buyer.name}
                              {order.shippingInfo.phone ? ` · ${order.shippingInfo.phone}` : ""}
                            </p>
                            {order.shippingInfo.address ? (
                              <p className="text-slate-600 leading-relaxed flex items-start gap-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                                <span>{order.shippingInfo.address}</span>
                              </p>
                            ) : null}
                            {order.shippingInfo.note ? (
                              <p className="text-amber-700 bg-amber-50 rounded p-1.5 text-[11px] font-medium">
                                Ghi chú: {order.shippingInfo.note}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {/* Cột 2: Danh sách các sách trong đơn */}
                      <div className="space-y-3 lg:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Sản phẩm trong đơn ({order.items.length} cuốn sách)
                        </p>
                        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/30 p-2 sm:p-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-slate-200">
                                  <BookCover
                                    alt={item.title}
                                    author={item.authorName}
                                    bookId={item.bookId}
                                    className="h-full w-full object-cover"
                                    src={item.coverPath}
                                    title={item.title}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <Link href={`/book/${item.bookId}`} target="_blank" className="hover:underline">
                                    <h4 className="line-clamp-1 text-xs font-bold text-slate-900">{item.title}</h4>
                                  </Link>
                                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.authorName}</p>
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {item.sellerName}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-xs font-bold text-slate-800 font-mono">
                                  {item.unitPrice.toLocaleString("vi-VN")} đ × {item.quantity}
                                </p>
                                <p className="text-xs font-black text-emerald-700 font-mono">
                                  {item.totalPrice.toLocaleString("vi-VN")} đ
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Thanh hành động duyệt đơn dành cho Admin / Moderator */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          <div className="text-xs text-slate-500 font-medium">
                            {order.status === "COMPLETED" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="h-4 w-4" /> Đơn hàng đã giao thành công và hoàn tất
                              </span>
                            ) : order.status === "CANCELLED" ? (
                              <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                <XCircle className="h-4 w-4" /> Đơn hàng đã hủy (Số lượng sách đã được hoàn lại kho)
                              </span>
                            ) : (
                              <span>Hành động quản trị viên:</span>
                            )}
                          </div>

                          {/* Bộ nút duyệt trạng thái theo AllowedNextStatuses */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Duyệt thanh toán / xác nhận đơn */}
                            {order.allowedNextStatuses.includes("PAID") || order.allowedNextStatuses.includes("PAID_DEMO") ? (
                              <form action={updateOrderStatusAction}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value={order.paymentMethod === "COD" ? "PAID" : "PAID_DEMO"} />
                                <input type="hidden" name="note" value="Quản trị viên đã xác nhận duyệt đơn hàng" />
                                {orderHiddenPageInputs}
                                <ConfirmSubmitButton
                                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-2xs"
                                  confirmMessage={`Xác nhận DUYỆT ĐƠN HÀNG #${order.id}?`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt đơn hàng
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}

                            {/* Giao hàng */}
                            {order.allowedNextStatuses.includes("SHIPPED") ? (
                              <form action={updateOrderStatusAction}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="SHIPPED" />
                                <input type="hidden" name="note" value="Đơn hàng đã được bàn giao cho đối tác vận chuyển" />
                                {orderHiddenPageInputs}
                                <ConfirmSubmitButton
                                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700 shadow-2xs"
                                  confirmMessage={`Chuyển đơn hàng #${order.id} sang trạng thái ĐANG GIAO HÀNG?`}
                                >
                                  <Truck className="h-3.5 w-3.5" /> Giao hàng
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}

                            {/* Hoàn tất đơn hàng */}
                            {order.allowedNextStatuses.includes("COMPLETED") ? (
                              <form action={updateOrderStatusAction}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="COMPLETED" />
                                <input type="hidden" name="note" value="Khách hàng đã nhận sách thành công" />
                                {orderHiddenPageInputs}
                                <ConfirmSubmitButton
                                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-800 shadow-2xs"
                                  confirmMessage={`Xác nhận đơn hàng #${order.id} đã HOÀN TẤT THÀNH CÔNG?`}
                                >
                                  <Check aria-hidden="true" className="h-3.5 w-3.5" /> Hoàn tất đơn
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}

                            {/* Hủy đơn & hoàn kho */}
                            {order.allowedNextStatuses.includes("CANCELLED") ? (
                              <form action={updateOrderStatusAction}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="CANCELLED" />
                                <input type="hidden" name="note" value="Quản trị viên hủy đơn và hoàn lại tồn kho" />
                                {orderHiddenPageInputs}
                                <ConfirmSubmitButton
                                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-100"
                                  confirmMessage={`CẢNH BÁO: HỦY ĐƠN HÀNG #${order.id}? Toàn bộ số lượng sách trong đơn sẽ được hoàn trả tự động vào kho tồn.`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Hủy & Hoàn kho
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {currentTab === "community" ? (
          <section className="grid gap-6 lg:grid-cols-2" id="community">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {sectionTitle(<Flag aria-hidden="true" className="h-5 w-5" />, "Bài viết bị báo cáo", "Chỉ hiển thị nội dung có báo cáo để admin xử lý an toàn cộng đồng.")}
              <div className="space-y-3">
                {data.reportedPosts.map((post) => (
                  <article className="rounded-xl bg-bv-surface p-4" key={post.id}>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-bv-heading">{post.title}</h3><StatusBadge value={post.status} /><StatusBadge value={`${post.reportCount}_REPORT`} /></div>
                    <p className="mt-1 text-sm text-bv-text-muted">Tác giả {post.authorName}</p>
                    <form action={moderatePostAction} className="mt-3 flex flex-wrap gap-2">
                      <input name="postId" type="hidden" value={post.id} />
                      <select aria-label={`Trạng thái bài viết ${post.title}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={post.status} name="status">
                        <option value={PostStatus.PUBLISHED}>Hiển thị (Đã duyệt)</option>
                        <option value={PostStatus.HIDDEN}>Tạm ẩn nội dung</option>
                        <option value={PostStatus.REMOVED}>Gỡ bỏ vi phạm</option>
                      </select>
                      <input aria-label={`Lý do kiểm duyệt bài viết ${post.title}`} className="h-11 w-44 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Lý do kiểm duyệt" />
                      <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật bài viết?"><EyeOff aria-hidden="true" className="h-4 w-4" /> Lưu</ConfirmSubmitButton>
                    </form>
                  </article>
                ))}
                {data.reportedPosts.length === 0 ? <p className="text-sm text-bv-text-muted">Không có bài viết bị báo cáo.</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {sectionTitle(<Flag aria-hidden="true" className="h-5 w-5" />, "Bình luận bị báo cáo", "Xử lý bình luận vi phạm dựa trên báo cáo của cộng đồng.")}
              <div className="space-y-3">
                {data.reportedComments.map((comment) => (
                  <article className="rounded-xl bg-bv-surface p-4" key={comment.id}>
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge value={comment.status} /><StatusBadge value={`${comment.reportCount}_REPORT`} /></div>
                    <p className="mt-2 line-clamp-2 text-sm text-bv-heading">{comment.content}</p>
                    <p className="mt-1 text-xs text-bv-text-muted">{comment.authorName} · {comment.postTitle}</p>
                    <form action={moderateCommentAction} className="mt-3 flex flex-wrap gap-2">
                      <input name="commentId" type="hidden" value={comment.id} />
                      <select aria-label={`Trạng thái bình luận của ${comment.authorName}`} className="h-11 rounded-lg border border-bv-border px-2 text-xs font-bold" defaultValue={comment.status} name="status">
                        <option value={PostStatus.PUBLISHED}>Hiển thị (Đã duyệt)</option>
                        <option value={PostStatus.HIDDEN}>Tạm ẩn nội dung</option>
                        <option value={PostStatus.REMOVED}>Gỡ bỏ vi phạm</option>
                      </select>
                      <input aria-label={`Lý do kiểm duyệt bình luận của ${comment.authorName}`} className="h-11 w-44 rounded-lg border border-bv-border px-2 text-xs" name="reason" placeholder="Lý do kiểm duyệt" />
                      <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật bình luận?"><Ban aria-hidden="true" className="h-4 w-4" /> Lưu</ConfirmSubmitButton>
                    </form>
                  </article>
                ))}
                {data.reportedComments.length === 0 ? <p className="text-sm text-bv-text-muted">Không có bình luận bị báo cáo.</p> : null}
              </div>
            </div>
          </section>
        ) : null}

        {currentTab === "audit" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="audit">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-bv-focus"><Database aria-hidden="true" className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-xl font-black text-bv-heading">Nhật ký quản trị gần đây</h2>
                  <p className="mt-1 text-sm leading-6 text-bv-text-muted">Truy vết người thực hiện, hành động, đối tượng và thời gian thay đổi.</p>
                </div>
              </div>
              <Link
                href="/admin/analytics"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-bv-border bg-bv-surface px-3 py-1.5 text-xs font-bold text-bv-heading transition hover:bg-bv-mint"
              >
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                Xem thống kê chi tiết
              </Link>
            </div>
            {data.auditLogs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-bv-border bg-bv-surface px-4 py-5 text-sm text-bv-text-muted">Chưa có thao tác quản trị được ghi nhận.</p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.auditLogs.slice(0, 10).map((log) => (
                    <article className="rounded-xl border border-bv-primary/10 bg-[#FAF8F2] p-4" key={log.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-bv-heading">{formatAuditAction(log.action)}</p>
                        <span className="rounded-full bg-bv-mint px-2 py-1 text-[10px] font-black text-bv-primary">{formatEntityType(log.entityType)}</span>
                      </div>
                      <p className="mt-2 break-all text-xs text-bv-text-muted">Đối tượng: {log.entityId}</p>
                      <p className="mt-1 text-xs text-bv-text-muted">Người thực hiện: {log.actorName ?? "Hệ thống"}</p>
                      <time className="mt-2 block text-xs font-bold text-bv-primary" dateTime={log.createdAt.toISOString()}>{formatDateTime(log.createdAt)}</time>
                    </article>
                  ))}
                </div>
                {data.auditLogs.length >= 10 && (
                  <p className="mt-3 text-center text-xs text-bv-text-muted">
                    Hiển thị 10 / {data.auditLogs.length} thao tác gần nhất. Xem toàn bộ lịch sử tại trang
                    {" "}<Link href="/admin/analytics" className="font-bold text-bv-primary underline">Thống kê chi tiết</Link>.
                  </p>
                )}
              </>
            )}
          </section>
        ) : null}

        {(currentTab === "users" || currentTab === "books" || currentTab === "orders") ? (() => {
          const totalItems =
            currentTab === "users"
              ? data.pagination.usersTotal
              : currentTab === "books"
              ? data.pagination.booksTotal
              : data.pagination.ordersTotal;
          const totalPages = Math.max(1, Math.ceil(totalItems / data.pagination.pageSize));
          const paginationItems = buildCatalogPaginationItems(data.pagination.page, totalPages);
          return (
            <nav aria-label="Phân trang quản trị" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-6 py-4 shadow-sm text-sm">
              {data.pagination.page > 1 ? (
                <Link className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50" href={buildPageHref(data.pagination.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trang trước</span>
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200/50 bg-slate-100/60 px-4 text-xs font-bold text-slate-400">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trang trước</span>
                </span>
              )}

              <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Danh sách số trang">
                {paginationItems.map((item, idx) =>
                  typeof item === "number" ? (
                    item === data.pagination.page ? (
                      <span
                        key={item}
                        aria-current="page"
                        className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-bv-primary px-3 text-xs font-black text-white shadow-xs"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={buildPageHref(item)}
                        className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:border-bv-primary/40 hover:bg-slate-50"
                      >
                        {item}
                      </Link>
                    )
                  ) : (
                    <span key={`ellipsis-${idx}`} className="inline-flex h-10 min-w-6 items-center justify-center text-xs font-bold text-slate-400">
                      …
                    </span>
                  )
                )}
              </div>

              {data.pagination.page < totalPages ? (
                <Link className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-bv-focus px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#0F5F59]" href={buildPageHref(data.pagination.page + 1)}>
                  <span>Trang sau</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200/50 bg-slate-100/60 px-4 text-xs font-bold text-slate-400">
                  <span>Trang sau</span>
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </nav>
          );
        })() : null}
      </section>
    </main>
  );
}
