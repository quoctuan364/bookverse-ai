import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileWarning,
  ImageOff,
  Search,
  ShieldCheck,
} from "lucide-react";

import { buildCatalogPaginationItems } from "@/lib/catalog-pagination";

import {
  getDataQualityPageData,
  setBookPublicVisibility,
  updateBookCoverQuality,
  updateBookLanguageQuality,
  type DataQualityIssueFilter,
} from "@/actions/data-quality.actions";
import { DataQualitySubmitButton } from "@/components/admin/DataQualitySubmitButton";
import { AdminSubNav } from "@/components/admin/AdminSubNav";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireModeratorUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface DataQualityAdminPageProps {
  searchParams?: Promise<{
    issue?: string;
    q?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
}

const ISSUE_OPTIONS: Array<{ value: DataQualityIssueFilter; label: string }> = [
  { value: "all", label: "Tất cả vấn đề" },
  { value: "cover", label: "Cần duyệt bìa" },
  { value: "language", label: "Thiếu ngôn ngữ" },
  { value: "isbn", label: "Thiếu ISBN" },
  { value: "description", label: "Thiếu mô tả" },
  { value: "hidden", label: "Đang ẩn công khai" },
];

const LANGUAGE_OPTIONS = [
  ["vi", "Tiếng Việt"],
  ["en", "Tiếng Anh"],
  ["es", "Tiếng Tây Ban Nha"],
  ["fr", "Tiếng Pháp"],
  ["de", "Tiếng Đức"],
  ["id", "Tiếng Indonesia"],
  ["it", "Tiếng Ý"],
  ["pt", "Tiếng Bồ Đào Nha"],
  ["ja", "Tiếng Nhật"],
  ["zh", "Tiếng Trung"],
] as const;

function safeIssue(value?: string): DataQualityIssueFilter {
  return ISSUE_OPTIONS.some((option) => option.value === value)
    ? (value as DataQualityIssueFilter)
    : "all";
}

function actionRedirect(result: { success: boolean; message: string }): never {
  const key = result.success ? "message" : "error";
  redirect(`/admin/data-quality?${key}=${encodeURIComponent(result.message)}`);
}

async function updateCoverAction(formData: FormData) {
  "use server";
  const result = await updateBookCoverQuality(
    String(formData.get("bookId") ?? ""),
    String(formData.get("coverPath") ?? ""),
  );
  actionRedirect(result);
}

async function updateLanguageAction(formData: FormData) {
  "use server";
  const result = await updateBookLanguageQuality(
    String(formData.get("bookId") ?? ""),
    String(formData.get("languageCode") ?? ""),
  );
  actionRedirect(result);
}

async function visibilityAction(formData: FormData) {
  "use server";
  const result = await setBookPublicVisibility(
    String(formData.get("bookId") ?? ""),
    String(formData.get("visible") ?? "") === "true",
  );
  actionRedirect(result);
}

function metricCard(
  label: string,
  value: string,
  hint: string,
  icon: React.ReactNode,
  tone: "good" | "warn" | "neutral" = "neutral",
) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50/70"
        : "border-bv-border bg-bv-ivory";
  return (
    <article className={`rounded-xl border p-4 shadow-[0_8px_24px_rgba(39,44,51,0.06)] ${toneClass}`}>
      <div className="flex items-center justify-between gap-3 text-bv-focus">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-bv-text-muted">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-bv-heading">{value}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-bv-text-muted">{hint}</p>
    </article>
  );
}

function buildPageHref(input: {
  page: number;
  issue: DataQualityIssueFilter;
  query: string;
}): string {
  const params = new URLSearchParams();
  params.set("issue", input.issue);
  if (input.query) params.set("q", input.query);
  params.set("page", String(input.page));
  return `/admin/data-quality?${params.toString()}`;
}

export default async function DataQualityAdminPage({
  searchParams,
}: DataQualityAdminPageProps) {
  try {
    await requireModeratorUser();
  } catch {
    redirect("/");
  }

  const params = await searchParams;
  const issue = safeIssue(params?.issue);
  const query = params?.q?.trim() ?? "";
  const data = await getDataQualityPageData({
    issue,
    query,
    page: Number(params?.page ?? "1"),
  });
  const { metrics } = data;
  const paginationItems = buildCatalogPaginationItems(data.page, data.totalPages);

  return (
    <main className="min-h-screen bg-bv-surface text-bv-heading">
      <AdminSubNav />
      <section className="border-b border-white/10 bg-[#0F3F3C] text-bv-ivory">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-bold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
            href="/admin"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Bảng điều hành Admin
          </Link>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-bv-gold">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Kiểm duyệt &amp; Chuẩn hóa sách
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Kiểm duyệt &amp; Chuẩn hóa sách
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-bv-mint-soft">
                Rà soát sách thiếu thông tin (ảnh bìa, ngôn ngữ, mô tả), chuẩn hóa dữ liệu và duyệt hiển thị công khai trên sàn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {params?.message ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            {params.message}
          </div>
        ) : null}
        {params?.error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            {params.error}
          </div>
        ) : null}



        <form className="grid gap-3 rounded-xl border border-bv-border bg-bv-ivory p-4 shadow-[0_10px_28px_rgba(39,44,51,0.06)] md:grid-cols-[1fr_220px_auto]" method="get">
          <label className="relative block">
            <span className="sr-only">Tìm sách cần kiểm tra</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-text-muted" />
            <Input className="h-11 pl-10" defaultValue={query} name="q" placeholder="Mã sách, tiêu đề hoặc tác giả..." />
          </label>
          <label>
            <span className="sr-only">Loại vấn đề dữ liệu</span>
            <select className="h-11 w-full rounded-lg border border-bv-border bg-white px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus" defaultValue={issue} name="issue">
              {ISSUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Button className="h-11" type="submit">Lọc dữ liệu</Button>
        </form>

        <section className="overflow-hidden rounded-xl border border-bv-border bg-bv-ivory shadow-[0_12px_34px_rgba(39,44,51,0.07)]">
          <div className="flex flex-col gap-2 border-b border-[#E5DED2] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Danh sách cần xử lý</h2>
              <p className="mt-1 text-sm text-bv-text-muted">
                Trang {data.page}/{data.totalPages} · Kết quả theo bộ lọc hiện tại
              </p>
            </div>
            <p className="text-xs font-bold text-bv-text-muted">
              Duyệt hiển thị luôn kiểm tra lại file bìa trên máy chủ.
            </p>
          </div>

          {data.books.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 aria-hidden="true" className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-black">Không còn bản ghi phù hợp bộ lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="bg-[#F0ECE3] text-xs uppercase tracking-[0.08em] text-[#59625E]">
                  <tr>
                    <th className="px-4 py-3">Sách</th>
                    <th className="px-4 py-3">Ngôn ngữ</th>
                    <th className="px-4 py-3">Thông tin đặc tả</th>
                    <th className="px-4 py-3">Kiểm duyệt bìa</th>
                    <th className="px-4 py-3 text-right">Trạng thái hiển thị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED2]">
                  {data.books.map((book) => {
                    const canApprove = book.coverReviewStatus === "VERIFIED_LOCAL";
                    return (
                      <tr className="align-middle transition-colors hover:bg-[#FAF8F2]" key={book.id}>
                        <td className="px-4 py-4">
                          <div className="flex w-72 gap-3 items-center">
                            <BookCover
                              author={book.author}
                              bookId={book.id}
                              className="h-[96px] w-[66px] shrink-0 rounded-md border border-bv-border object-cover shadow-xs"
                              src={book.coverPath}
                              title={book.title}
                            />
                            <div className="min-w-0 flex-1">
                              <Link className="line-clamp-2 font-bold text-bv-heading hover:text-bv-focus hover:underline" href={`/book/${book.id}`}>
                                {book.title}
                              </Link>
                              <p className="mt-1 font-mono text-[11px] font-bold text-bv-focus">{book.id}</p>
                              <p className="mt-1 line-clamp-1 text-xs text-bv-text-muted">{book.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <form action={updateLanguageAction} className="w-52">
                            <input name="bookId" type="hidden" value={book.id} />
                            <div className="flex items-center gap-1.5">
                              <select
                                aria-label={`Ngôn ngữ của ${book.title}`}
                                className="h-9 flex-1 rounded-lg border border-bv-border bg-white px-2.5 text-xs font-bold text-bv-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus"
                                defaultValue={book.languageCode ?? ""}
                                name="languageCode"
                              >
                                <option disabled value="">Chưa xác định</option>
                                {LANGUAGE_OPTIONS.map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                              <DataQualitySubmitButton className="h-9 shrink-0 border border-bv-focus/30 bg-[#EDF7F5] px-2.5 text-[#0F5F59] hover:bg-[#DDEFEA]">
                                Lưu
                              </DataQualitySubmitButton>
                            </div>
                          </form>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex w-40 flex-col gap-1.5 text-xs font-bold">
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 ${book.missingIsbn ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {book.missingIsbn ? "Thiếu ISBN" : `ISBN: ${book.isbn}`}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 ${book.missingDescription ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {book.missingDescription ? "Thiếu mô tả" : "Đầy đủ mô tả"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <form action={updateCoverAction} className="w-44 space-y-2">
                            <input name="bookId" type="hidden" value={book.id} />
                            <input name="coverPath" type="hidden" value={book.coverPath} />
                            <div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${canApprove ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                                {canApprove ? "Bìa hợp lệ" : "Cần duyệt bìa"}
                              </span>
                            </div>
                            <DataQualitySubmitButton className="h-8 rounded-lg border border-bv-border bg-white px-2.5 text-xs font-bold text-bv-heading shadow-xs hover:bg-[#F0ECE3]">
                              Cập nhật bìa
                            </DataQualitySubmitButton>
                          </form>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <form action={visibilityAction} className="inline-block w-36">
                            <input name="bookId" type="hidden" value={book.id} />
                            <input name="visible" type="hidden" value={book.isPubliclyVisible ? "false" : "true"} />
                            <DataQualitySubmitButton
                              className={book.isPubliclyVisible ? "h-9 w-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "h-9 w-full bg-bv-focus text-white hover:bg-[#0F5F59]"}
                              disabled={!book.isPubliclyVisible && !canApprove}
                            >
                              {book.isPubliclyVisible ? <><EyeOff aria-hidden="true" className="h-3.5 w-3.5" />Ẩn hiển thị</> : <><Eye aria-hidden="true" className="h-3.5 w-3.5" />Duyệt hiển thị</>}
                            </DataQualitySubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <nav aria-label="Phân trang kiểm duyệt sách" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5DED2] bg-white px-6 py-4">
            {/* Nút Trang trước */}
            {data.page > 1 ? (
              <Link
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-bv-border bg-white px-4 text-xs font-bold text-bv-heading shadow-xs transition hover:bg-[#F0ECE3]"
                href={buildPageHref({ page: data.page - 1, issue, query })}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Trang trước</span>
              </Link>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border border-bv-border/50 bg-zinc-100/60 px-4 text-xs font-bold text-zinc-400">
                <ChevronLeft className="h-4 w-4" />
                <span>Trang trước</span>
              </span>
            )}

            {/* Dãy số trang */}
            <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Danh sách số trang">
              {paginationItems.map((item, idx) =>
                typeof item === "number" ? (
                  item === data.page ? (
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
                      href={buildPageHref({ page: item, issue, query })}
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-bv-border bg-white px-3 text-xs font-bold text-bv-heading shadow-xs transition hover:border-bv-primary/40 hover:bg-[#F0ECE3]"
                    >
                      {item}
                    </Link>
                  )
                ) : (
                  <span key={`ellipsis-${idx}`} className="inline-flex h-10 min-w-6 items-center justify-center text-xs font-bold text-bv-text-muted">
                    …
                  </span>
                )
              )}
            </div>

            {/* Nút Trang sau */}
            {data.page < data.totalPages ? (
              <Link
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-bv-focus px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#0F5F59]"
                href={buildPageHref({ page: data.page + 1, issue, query })}
              >
                <span>Trang sau</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border border-bv-border/50 bg-zinc-100/60 px-4 text-xs font-bold text-zinc-400">
                <span>Trang sau</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
        </section>
      </section>
    </main>
  );
}
