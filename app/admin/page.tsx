import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Ban,
  BookOpen,
  Bot,
  Check,
  ClipboardList,
  Database,
  EyeOff,
  Flag,
  Lock,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
  UserCog,
  X,
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
import { SafeBookCover } from "@/components/shared/SafeBookCover";
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
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-black text-red-700 transition hover:bg-red-100";
const neutralButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-xs font-black text-[#17202A] transition hover:bg-[#EDF7F5]";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-3 text-xs font-black text-white transition hover:bg-[#0F5F59]";

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
        <span className="mt-1 text-[#0F766E]">{icon}</span>
        <div>
          <h2 className="text-xl font-black text-[#17202A]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#66706B]">{description}</p>
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

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
            BookVerse Admin Center
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Trung tâm quản trị hệ thống</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#EAF5F1]">
            Quản lý user, sách, listing, đơn hàng, báo cáo cộng đồng, AI feedback và audit log cho đồ án BookVerse AI.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <form className="bv-card grid gap-3 rounded-lg p-4 lg:grid-cols-[1fr_repeat(5,160px)_auto]" method="get">
          <Input
            className="h-10"
            defaultValue={params?.q ?? ""}
            name="q"
            placeholder="Tìm user, sách, listing, order..."
          />
          <select className="rounded-lg border border-[#D8D0C2] px-3 text-sm font-semibold" defaultValue={params?.role ?? "ALL"} name="role">
            <option value="ALL">Tất cả role</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-[#D8D0C2] px-3 text-sm font-semibold" defaultValue={params?.userStatus ?? "all"} name="userStatus">
            <option value="all">Tất cả user</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
          </select>
          <select className="rounded-lg border border-[#D8D0C2] px-3 text-sm font-semibold" defaultValue={params?.bookStatus ?? "ALL"} name="bookStatus">
            <option value="ALL">Tất cả sách</option>
            {Object.values(BookStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-[#D8D0C2] px-3 text-sm font-semibold" defaultValue={params?.listingStatus ?? "ALL"} name="listingStatus">
            <option value="ALL">Tất cả listing</option>
            {Object.values(ListingStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-[#D8D0C2] px-3 text-sm font-semibold" defaultValue={params?.orderStatus ?? "ALL"} name="orderStatus">
            <option value="ALL">Tất cả order</option>
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button className="h-10" type="submit">
            Lọc
          </Button>
        </form>

        <nav className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#17191F]/10 bg-white px-3 text-sm font-black text-[#17202A] shadow-sm transition hover:bg-[#EAF2EF]"
                href={href as string}
                key={href as string}
              >
                <TabIcon className="h-4 w-4" aria-hidden="true" />
                {label as string}
              </Link>
            );
          })}
        </nav>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.metrics.map((metric) => (
            <article className="bv-card rounded-lg p-5" key={metric.label}>
              <p className="text-sm font-bold text-[#66706B]">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-[#17202A]">{metric.value.toLocaleString("vi-VN")}</p>
            </article>
          ))}
        </div>

        <section className="bv-card rounded-lg p-5" id="users">
          {sectionTitle(<UserCog className="h-5 w-5" aria-hidden="true" />, "Admin Users", "Tìm kiếm, đổi role, khóa/mở khóa và xem hoạt động gần đây của user.")}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-[#66706B]">
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
                      <p className="font-black text-[#17202A]">{user.name}</p>
                      <p className="text-xs text-[#66706B]">{user.email ?? user.id}</p>
                      <p className="text-xs text-[#66706B]">Tạo: {formatDate(user.createdAt)}</p>
                    </td>
                    <td><StatusBadge value={user.role} /></td>
                    <td>
                      <StatusBadge value={user.isLocked ? "LOCKED" : "ACTIVE"} />
                      {user.lockReason ? <p className="mt-1 max-w-44 text-xs text-red-600">{user.lockReason}</p> : null}
                    </td>
                    <td>
                      <p className="text-xs text-[#66706B]">Last active: {formatDate(user.lastActiveAt)}</p>
                      <div className="mt-2 space-y-1">
                        {user.recentActivity.slice(0, 2).map((activity) => (
                          <p className="line-clamp-1 text-xs text-[#66706B]" key={`${activity.actionType}-${activity.createdAt.toISOString()}`}>
                            {activity.actionType}: {activity.bookTitle}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs text-[#66706B]">
                      Listing {user.counts.listings} · Order {user.counts.orders} · Post {user.counts.posts} · Rec {user.counts.recommendations}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <form action={updateUserRoleAction} className="flex gap-2">
                          <input name="userId" type="hidden" value={user.id} />
                          <select className="h-9 rounded-lg border border-[#D8D0C2] px-2 text-xs font-bold" defaultValue={user.role} name="role">
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
                            <input className="h-9 w-36 rounded-lg border border-[#D8D0C2] px-2 text-xs" name="reason" placeholder="Lý do khóa" />
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

        <section className="bv-card rounded-lg p-5" id="books">
          {sectionTitle(<BookOpen className="h-5 w-5" aria-hidden="true" />, "Admin Books", "Kiểm tra sách thiếu cover/mô tả/embedding và cập nhật trạng thái mềm.")}
          <div className="grid gap-3 lg:grid-cols-2">
            {data.books.map((book) => (
              <article className="rounded-lg bg-[#F7F4ED] p-4" key={book.id}>
                <div className="flex gap-4">
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#153A3F] text-xs font-black text-white">
                    <SafeBookCover alt={book.title} className="h-full w-full object-cover" src={book.coverPath} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="line-clamp-1 font-black text-[#17202A]">{book.title}</h3>
                      <StatusBadge value={book.status} />
                    </div>
                    <p className="mt-1 text-sm text-[#66706B]">{book.author} · {book.category}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {!book.hasCover ? <StatusBadge value="MISSING_COVER" /> : null}
                      {!book.hasDescription ? <StatusBadge value="MISSING_DESCRIPTION" /> : null}
                      {!book.isEbook ? <StatusBadge value="NO_EBOOK" /> : null}
                      {!book.hasEmbedding ? <StatusBadge value="NO_EMBEDDING" /> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={updateBookStatusAction} className="flex gap-2">
                        <input name="bookId" type="hidden" value={book.id} />
                        <select className="h-9 rounded-lg border border-[#D8D0C2] px-2 text-xs font-bold" defaultValue={book.status} name="status">
                          {Object.values(BookStatus).map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <input className="h-9 w-32 rounded-lg border border-[#D8D0C2] px-2 text-xs" name="reason" placeholder="Ghi chú" />
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

        <section className="bv-card rounded-lg p-5" id="marketplace">
          {sectionTitle(<Store className="h-5 w-5" aria-hidden="true" />, "Admin Marketplace", "Duyệt, từ chối hoặc ẩn listing; xem điểm chất lượng theo quy tắc và lý do từ chối.")}
          <div className="space-y-3">
            {data.listings.map((listing) => (
              <article className="rounded-lg bg-[#F7F4ED] p-4" key={listing.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-[#17202A]">{listing.title}</h3>
                      <StatusBadge value={listing.status} />
                      <StatusBadge value={listing.condition} />
                    </div>
                    <p className="mt-1 text-sm text-[#66706B]">
                      {formatPrice(listing.price)} · Seller {listing.seller.name} · {listing.seller.listingCount} listing · Điểm chất lượng {listing.seller.sellerQualityScore}/100
                    </p>
                    {listing.rejectionReason ? <p className="mt-2 text-sm text-red-700">Lý do: {listing.rejectionReason}</p> : null}
                  </div>
                  <form action={moderateListingAction} className="flex flex-wrap items-center gap-2">
                    <input name="listingId" type="hidden" value={listing.id} />
                    <select className="h-9 rounded-lg border border-[#D8D0C2] px-2 text-xs font-bold" defaultValue={listing.status} name="status">
                      <option value={ListingStatus.APPROVED}>APPROVED</option>
                      <option value={ListingStatus.REJECTED}>REJECTED</option>
                      <option value={ListingStatus.HIDDEN}>HIDDEN</option>
                      <option value={ListingStatus.ARCHIVED}>ARCHIVED</option>
                    </select>
                    <input className="h-9 w-44 rounded-lg border border-[#D8D0C2] px-2 text-xs" name="reason" placeholder="Reason bắt buộc khi từ chối" />
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

        <section className="bv-card rounded-lg p-5" id="orders">
          {sectionTitle(<Truck className="h-5 w-5" aria-hidden="true" />, "Admin Orders", "Theo dõi đơn hàng và ghi timeline/notification khi đổi trạng thái.")}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase text-[#66706B]">
                <tr><th className="py-3">Order</th><th>Buyer</th><th>Seller</th><th>Tổng</th><th>Status</th><th>Hành động</th></tr>
              </thead>
              <tbody className="divide-y divide-[#17191F]/10">
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-4"><p className="font-black text-[#17202A]">{order.id}</p><p className="text-xs text-[#66706B]">{formatDate(order.createdAt)} · {order.itemCount} item</p></td>
                    <td>{order.buyer.name}<p className="text-xs text-[#66706B]">{order.buyer.email}</p></td>
                    <td className="max-w-56 text-xs text-[#66706B]">{order.sellers.join(", ") || "BookVerse"}</td>
                    <td className="font-black text-[#E76F51]">{formatPrice(order.totalAmount)}</td>
                    <td><StatusBadge value={order.status} /></td>
                    <td>
                      <form action={updateOrderStatusAction} className="flex flex-wrap gap-2">
                        <input name="orderId" type="hidden" value={order.id} />
                        <select className="h-9 rounded-lg border border-[#D8D0C2] px-2 text-xs font-bold" defaultValue={order.status} name="status">
                          {Object.values(OrderStatus).map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <input className="h-9 w-40 rounded-lg border border-[#D8D0C2] px-2 text-xs" name="note" placeholder="Ghi chú timeline" />
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
                <article className="rounded-lg bg-[#F7F4ED] p-4" key={post.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-[#17202A]">{post.title}</h3>
                    <StatusBadge value={post.status} />
                    <StatusBadge value={`${post.reportCount}_REPORT`} />
                  </div>
                  <p className="mt-1 text-sm text-[#66706B]">Tác giả {post.authorName}</p>
                  <form action={moderatePostAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="postId" type="hidden" value={post.id} />
                    <select className="h-9 rounded-lg border border-[#D8D0C2] px-2 text-xs font-bold" defaultValue={post.status} name="status">
                      <option value={PostStatus.PUBLISHED}>PUBLISHED</option>
                      <option value={PostStatus.HIDDEN}>HIDDEN</option>
                      <option value={PostStatus.REMOVED}>REMOVED</option>
                    </select>
                    <input className="h-9 w-44 rounded-lg border border-[#D8D0C2] px-2 text-xs" name="reason" placeholder="Lý do kiểm duyệt" />
                    <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật bài viết?">
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      Lưu
                    </ConfirmSubmitButton>
                  </form>
                </article>
              ))}
              {data.reportedPosts.length === 0 ? <p className="text-sm text-[#66706B]">Không có bài viết bị report.</p> : null}
            </div>
          </div>

          <div className="bv-card rounded-lg p-5">
            {sectionTitle(<Flag className="h-5 w-5" aria-hidden="true" />, "Bình luận bị report", "Xử lý comment vi phạm dựa trên reaction REPORT.")}
            <div className="space-y-3">
              {data.reportedComments.map((comment) => (
                <article className="rounded-lg bg-[#F7F4ED] p-4" key={comment.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={comment.status} />
                    <StatusBadge value={`${comment.reportCount}_REPORT`} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#17202A]">{comment.content}</p>
                  <p className="mt-1 text-xs text-[#66706B]">{comment.authorName} · {comment.postTitle}</p>
                  <form action={moderateCommentAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="commentId" type="hidden" value={comment.id} />
                    <select className="h-9 rounded-lg border border-[#D8D0C2] px-2 text-xs font-bold" defaultValue={comment.status} name="status">
                      <option value={PostStatus.PUBLISHED}>PUBLISHED</option>
                      <option value={PostStatus.HIDDEN}>HIDDEN</option>
                      <option value={PostStatus.REMOVED}>REMOVED</option>
                    </select>
                    <input className="h-9 w-44 rounded-lg border border-[#D8D0C2] px-2 text-xs" name="reason" placeholder="Lý do kiểm duyệt" />
                    <ConfirmSubmitButton className={neutralButton} confirmMessage="Cập nhật bình luận?">
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      Lưu
                    </ConfirmSubmitButton>
                  </form>
                </article>
              ))}
              {data.reportedComments.length === 0 ? <p className="text-sm text-[#66706B]">Không có bình luận bị report.</p> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]" id="ai">
          <div className="bv-card rounded-lg p-5">
            {sectionTitle(<Bot className="h-5 w-5" aria-hidden="true" />, "AI Management", "Theo dõi recommendation, evidence, chatbot session và feedback xấu.")}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Recommendations", data.ai.totalRecommendations + data.ai.totalDailyRecommendations],
                ["Evidence", data.ai.totalEvidence],
                ["Rec feedback", data.ai.totalRecommendationFeedback],
                ["Chat sessions", data.ai.totalChatbotSessions],
                ["Chat messages", data.ai.totalChatbotMessages],
                ["Chat feedback", data.ai.totalChatbotFeedback],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-[#F7F4ED] p-4" key={label as string}>
                  <p className="text-sm font-bold text-[#66706B]">{label}</p>
                  <p className="mt-2 text-2xl font-black text-[#17202A]">{Number(value).toLocaleString("vi-VN")}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <h3 className="font-black text-[#17202A]">Chatbot feedback thấp</h3>
              {data.ai.lowRatedChatbotFeedback.map((feedback) => (
                <article className="rounded-lg bg-[#F7F4ED] p-4" key={feedback.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={feedback.value} />
                    <span className="text-xs text-[#66706B]">{feedback.userName ?? "Ẩn danh"} · {formatDate(feedback.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#17202A]">{feedback.message ?? "Không có message liên kết."}</p>
                  {feedback.note ? <p className="mt-1 text-xs text-[#66706B]">{feedback.note}</p> : null}
                </article>
              ))}
              {data.ai.lowRatedChatbotFeedback.length === 0 ? <p className="text-sm text-[#66706B]">Chưa có feedback xấu.</p> : null}
            </div>
          </div>

          <aside className="bv-card h-fit rounded-lg p-5">
            {sectionTitle(<ClipboardList className="h-5 w-5" aria-hidden="true" />, "Audit Log", "Các hành động quản trị quan trọng gần đây.")}
            <div className="space-y-3">
              {data.auditLogs.map((log) => (
                <div className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm" key={log.id}>
                  <p className="font-black text-[#17202A]">{log.action}</p>
                  <p className="mt-1 text-xs text-[#66706B]">{log.entityType}:{log.entityId}</p>
                  <p className="mt-1 text-xs text-[#66706B]">{log.actorName ?? "System"} · {formatDate(log.createdAt)}</p>
                </div>
              ))}
              {data.auditLogs.length === 0 ? <p className="text-sm text-[#66706B]">Chưa có audit log.</p> : null}
            </div>
          </aside>
        </section>

        <div className="flex items-center justify-between rounded-lg border border-[#17191F]/10 bg-white px-4 py-3 text-sm text-[#66706B]">
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
