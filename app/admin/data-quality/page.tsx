import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookCheck,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  FileWarning,
  ImageOff,
  Languages,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  getDataQualityPageData,
  setBookPublicVisibility,
  updateBookCoverQuality,
  updateBookLanguageQuality,
  type DataQualityIssueFilter,
} from "@/actions/data-quality.actions";
import { DataQualitySubmitButton } from "@/components/admin/DataQualitySubmitButton";
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
        : "border-[#D8D0C2] bg-[#FFFDF8]";
  return (
    <article className={`rounded-xl border p-4 shadow-[0_8px_24px_rgba(39,44,51,0.06)] ${toneClass}`}>
      <div className="flex items-center justify-between gap-3 text-[#0F766E]">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#66706B]">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-[#17202A]">{value}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#66706B]">{hint}</p>
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

  return (
    <main className="min-h-screen bg-[#F7F4ED] text-[#17202A]">
      <section className="border-b border-white/10 bg-[#0F3F3C] text-[#FFFDF8]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-bold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C14E]"
            href="/admin"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Admin Center
          </Link>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#F2C14E]">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Data Quality Admin
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Chất lượng dữ liệu sách
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#EAF5F1]">
                Theo dõi catalog RBxxxxx, sửa ngôn ngữ và chỉ duyệt bán những sách có bìa local
                hợp lệ.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B8D5CF]">
                Độ phủ bìa thật
              </p>
              <p className="mt-1 text-3xl font-black">{metrics.coverCompletionRate}%</p>
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metricCard("Tổng sách", metrics.totalBooks.toLocaleString("vi-VN"), `${metrics.publiclyVisible.toLocaleString("vi-VN")} đang công khai`, <BookOpen aria-hidden="true" className="h-5 w-5" />)}
          {metricCard("Tiếng Việt", metrics.vietnameseBooks.toLocaleString("vi-VN"), `${metrics.englishBooks.toLocaleString("vi-VN")} sách tiếng Anh`, <Languages aria-hidden="true" className="h-5 w-5" />)}
          {metricCard("Bìa đã duyệt", metrics.verifiedCovers.toLocaleString("vi-VN"), `${metrics.needsCoverReview.toLocaleString("vi-VN")} cần review`, <BookCheck aria-hidden="true" className="h-5 w-5" />, metrics.needsCoverReview === 0 ? "good" : "warn")}
          {metricCard("Thiếu ISBN", metrics.missingIsbn.toLocaleString("vi-VN"), "Cần bổ sung để định danh ấn bản", <FileWarning aria-hidden="true" className="h-5 w-5" />, metrics.missingIsbn > 0 ? "warn" : "good")}
          {metricCard("Thiếu metadata", (metrics.missingDescription + metrics.missingLanguage).toLocaleString("vi-VN"), `${metrics.missingDescription} thiếu mô tả · ${metrics.missingLanguage} thiếu ngôn ngữ`, <ImageOff aria-hidden="true" className="h-5 w-5" />, "warn")}
        </div>

        <form className="grid gap-3 rounded-xl border border-[#D8D0C2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(39,44,51,0.06)] md:grid-cols-[1fr_220px_auto]" method="get">
          <label className="relative block">
            <span className="sr-only">Tìm sách cần kiểm tra</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]" />
            <Input className="h-11 pl-10" defaultValue={query} name="q" placeholder="Mã sách, tiêu đề hoặc tác giả..." />
          </label>
          <label>
            <span className="sr-only">Loại vấn đề dữ liệu</span>
            <select className="h-11 w-full rounded-lg border border-[#D8D0C2] bg-white px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]" defaultValue={issue} name="issue">
              {ISSUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Button className="h-11" type="submit">Lọc dữ liệu</Button>
        </form>

        <section className="overflow-hidden rounded-xl border border-[#D8D0C2] bg-[#FFFDF8] shadow-[0_12px_34px_rgba(39,44,51,0.07)]">
          <div className="flex flex-col gap-2 border-b border-[#E5DED2] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Danh sách cần xử lý</h2>
              <p className="mt-1 text-sm text-[#66706B]">
                {data.totalIssues.toLocaleString("vi-VN")} sách · Trang {data.page}/{data.totalPages}
              </p>
            </div>
            <p className="text-xs font-bold text-[#66706B]">
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
                    <th className="px-4 py-3">Metadata</th>
                    <th className="px-4 py-3">Bìa</th>
                    <th className="px-4 py-3">Công khai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED2]">
                  {data.books.map((book) => {
                    const canApprove = book.coverReviewStatus === "VERIFIED_LOCAL";
                    return (
                      <tr className="align-top transition-colors hover:bg-[#FAF8F2]" key={book.id}>
                        <td className="px-4 py-4">
                          <div className="flex w-72 gap-3">
                            <BookCover
                              author={book.author}
                              bookId={book.id}
                              className="h-[108px] w-[72px] shrink-0 rounded-md border border-[#D8D0C2]"
                              src={book.coverPath}
                              title={book.title}
                            />
                            <div className="min-w-0">
                              <Link className="line-clamp-2 font-black text-[#17202A] hover:text-[#0F766E] hover:underline" href={`/book/${book.id}`}>
                                {book.title}
                              </Link>
                              <p className="mt-1 text-xs font-bold text-[#0F766E]">{book.id}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-[#66706B]">{book.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <form action={updateLanguageAction} className="w-48 space-y-2">
                            <input name="bookId" type="hidden" value={book.id} />
                            <select aria-label={`Ngôn ngữ của ${book.title}`} className="h-11 w-full rounded-lg border border-[#D8D0C2] bg-white px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]" defaultValue={book.languageCode ?? ""} name="languageCode">
                              <option disabled value="">Chưa xác định</option>
                              {LANGUAGE_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <DataQualitySubmitButton className="w-full border border-[#0F766E]/30 bg-[#EDF7F5] text-[#0F5F59] hover:bg-[#DDEFEA]">
                              Sửa ngôn ngữ
                            </DataQualitySubmitButton>
                          </form>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex w-40 flex-wrap gap-2 text-xs font-bold">
                            <span className={`rounded-full px-2.5 py-1 ${book.missingIsbn ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {book.missingIsbn ? "Thiếu ISBN" : `ISBN ${book.isbn}`}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 ${book.missingDescription ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {book.missingDescription ? "Thiếu mô tả" : "Có mô tả"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <form action={updateCoverAction} className="w-56 space-y-2">
                            <input name="bookId" type="hidden" value={book.id} />
                            <input name="coverPath" type="hidden" value={book.coverPath} />
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${canApprove ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                              {canApprove ? "VERIFIED_LOCAL" : "NEEDS_COVER_REVIEW"}
                            </span>
                            <p className="break-all text-[11px] leading-4 text-[#66706B]">{book.coverPath}</p>
                            <DataQualitySubmitButton className="w-full border border-[#D8D0C2] bg-white text-[#17202A] hover:bg-[#F0ECE3]">
                              Cập nhật bìa
                            </DataQualitySubmitButton>
                          </form>
                        </td>
                        <td className="px-4 py-4">
                          <form action={visibilityAction} className="w-40">
                            <input name="bookId" type="hidden" value={book.id} />
                            <input name="visible" type="hidden" value={book.isPubliclyVisible ? "false" : "true"} />
                            <DataQualitySubmitButton
                              className={book.isPubliclyVisible ? "w-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "w-full bg-[#0F766E] text-white hover:bg-[#0F5F59]"}
                              disabled={!book.isPubliclyVisible && !canApprove}
                            >
                              {book.isPubliclyVisible ? <><EyeOff aria-hidden="true" className="h-4 w-4" />Ẩn hiển thị</> : <><Eye aria-hidden="true" className="h-4 w-4" />Duyệt hiển thị</>}
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

          <nav aria-label="Phân trang chất lượng dữ liệu" className="flex items-center justify-between border-t border-[#E5DED2] p-4">
            {data.page > 1 ? (
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[#D8D0C2] px-4 text-sm font-black hover:bg-[#F0ECE3]" href={buildPageHref({ page: data.page - 1, issue, query })}>
                Trang trước
              </Link>
            ) : <span />}
            {data.page < data.totalPages ? (
              <Link className="inline-flex min-h-11 items-center rounded-lg bg-[#0F766E] px-4 text-sm font-black text-white hover:bg-[#0F5F59]" href={buildPageHref({ page: data.page + 1, issue, query })}>
                Trang sau
              </Link>
            ) : <span />}
          </nav>
        </section>
      </section>
    </main>
  );
}
