/**
 * Trang Quản trị — Dữ liệu Nghiên cứu & Huấn luyện AI
 * Giao diện giám sát dữ liệu tương tác độc giả thực tế và xuất tập dữ liệu Benchmark
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Heart,
  HelpCircle,
  Info,
  MousePointerClick,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/permissions";
import {
  getRecentTelemetryLogs,
  getResearchDataStats,
} from "@/actions/research-data.actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dữ liệu Nghiên cứu & AI | BookVerse Admin",
  description: "Giám sát dữ liệu tương tác thực tế và xuất tập dữ liệu đánh giá mô hình gợi ý AI.",
};

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: typeof Eye; color: string; bg: string; badge: string }
> = {
  VIEW: {
    label: "Xem chi tiết sách",
    icon: Eye,
    color: "text-blue-600",
    bg: "bg-blue-50",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  RECOMMENDATION_CLICK: {
    label: "Click sách gợi ý AI",
    icon: MousePointerClick,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  SEARCH: {
    label: "Tìm kiếm từ khóa",
    icon: Search,
    color: "text-amber-600",
    bg: "bg-amber-50",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  FAVORITE: {
    label: "Thêm yêu thích",
    icon: Heart,
    color: "text-rose-600",
    bg: "bg-rose-50",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
  },
  BOOKMARK: {
    label: "Đánh dấu trang đọc",
    icon: Bookmark,
    color: "text-purple-600",
    bg: "bg-purple-50",
    badge: "border-purple-200 bg-purple-50 text-purple-700",
  },
  ADD_TO_CART: {
    label: "Thêm vào giỏ hàng",
    icon: ShoppingCart,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  PURCHASE: {
    label: "Mua sách / Kích hoạt",
    icon: ShoppingBag,
    color: "text-teal-600",
    bg: "bg-teal-50",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
  },
  RATING: {
    label: "Đánh giá xếp hạng",
    icon: Star,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    badge: "border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  IMPRESSION: {
    label: "Lượt hiển thị (Impression)",
    icon: Activity,
    color: "text-slate-600",
    bg: "bg-slate-50",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export default async function ResearchDataPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MODERATOR")) {
    redirect("/");
  }

  const [stats, recentLogs] = await Promise.all([
    getResearchDataStats(),
    getRecentTelemetryLogs(8),
  ]);

  if (!stats) {
    return (
      <main className="bv-page bg-[#F8F9FA] p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-red-600">Không thể tải dữ liệu nghiên cứu.</p>
          <Link href="/admin" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bv-primary px-4 py-2 font-bold text-white">
            <ArrowLeft className="h-4 w-4" /> Quay lại Bảng điều hành
          </Link>
        </div>
      </main>
    );
  }

  const isReady = stats.dataReadiness.status === "READY_FOR_ASSESSMENT";

  return (
    <main className="bv-page bg-[#F8FAFC] pb-16">
      {/* Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0C3B37] via-[#12534C] to-[#1A6E64] text-white">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#E7B95A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-[#E6F3F0] backdrop-blur-sm transition hover:bg-white/20"
              href="/admin"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Bảng điều hành Admin
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full bg-[#E7B95A]/20 px-3 py-1 text-xs font-bold text-[#FDEAB8] border border-[#E7B95A]/30">
              <GraduationCap className="h-3.5 w-3.5 text-[#E7B95A]" />
              Phân hệ Nghiên cứu Đồ án Tốt nghiệp
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                <Cpu className="h-3.5 w-3.5" /> Dữ liệu &amp; Thuật toán AI Gợi ý
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
                Dữ liệu Nghiên cứu &amp; Đánh giá Mô hình AI
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#D2ECE6]">
                Thu thập dữ liệu tương tác đọc sách thực tế đã được độc giả đồng ý.
                Cung cấp bộ dữ liệu thực nghiệm để đánh giá và cải thiện thuật toán gợi ý sách Hybrid (Collaborative Filtering + Content-Based).
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
              <div className="relative flex h-3 w-3">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isReady ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    isReady ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-200">Trạng thái dữ liệu Benchmark</p>
                <p className="text-xs font-black text-white">
                  {isReady ? "Đủ điều kiện Nghiệm thu" : "Đang tích lũy tương tác"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto mt-6 max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Thesis Explanation Card */}
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white p-5 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 text-xs text-slate-700 leading-relaxed">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900">
                  Ý nghĩa của trang này trong Báo cáo &amp; Hội đồng Bảo vệ Đồ án
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  Chương 4 &amp; 5: Thực nghiệm &amp; Đánh giá
                </span>
              </div>
              <p className="mt-1.5 text-slate-600">
                Trang này chứng minh hệ thống BookVerse có <strong>thu thập dữ liệu tương tác người dùng thực tế</strong> theo chuẩn khoa học.
                Dữ liệu người dùng được mã hóa băm SHA-256 ẩn danh bảo vệ quyền riêng tư, cho phép xuất file để tính toán các độ đo học máy như{" "}
                <span className="font-semibold text-emerald-900">CTR (Click-Through Rate), Precision@K, Recall@K và NDCG</span>.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Độc giả đồng ý tham gia (Consent v1)</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{stats.consentedUsers}</p>
            <p className="mt-1 text-xs text-slate-400">
              Đủ điều kiện benchmark: <span className="font-bold text-emerald-700">{stats.eligibleForBenchmark} độc giả</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Lượt hiển thị (Impressions)</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Activity className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{stats.impressions.toLocaleString("vi-VN")}</p>
            <p className="mt-1 text-xs text-slate-400">Số lần widget AI gợi ý xuất hiện</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Click sách gợi ý</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <MousePointerClick className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{stats.clicks.toLocaleString("vi-VN")}</p>
            <p className="mt-1 text-xs text-slate-400">Số lượt click vào sách do AI gợi ý</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Tỷ lệ CTR (Click-Through Rate)</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Star className="h-4 w-4" />
              </span>
            </div>
            {stats.ctr.available && stats.ctr.value !== null ? (
              <>
                <p className="mt-3 text-3xl font-black text-emerald-600">
                  {(stats.ctr.value * 100).toFixed(2)}%
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {stats.clicks} clicks / {stats.impressions} impressions
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-xl font-bold text-amber-700">Đang tính toán</p>
                <p className="mt-1 text-xs text-slate-400">{stats.ctr.reason ?? "Cần thêm impression & click"}</p>
              </>
            )}
          </div>
        </div>

        {/* Export Data Action Strip */}
        <div className="rounded-2xl border border-emerald-300/80 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-bv-primary">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Xuất tập dữ liệu thực nghiệm (Empirical Dataset Export)</span>
              </div>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Tải bộ dữ liệu tương tác để đưa vào Phụ lục Luận văn
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Tập dữ liệu đã chuẩn hóa, loại bỏ hoàn toàn thông tin cá nhân (PII), chỉ lưu mã băm an toàn 
                và các sự kiện đọc, tìm kiếm, đánh giá phục vụ chạy mô hình gợi ý.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176B62] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#104C47]"
                download
                href="/api/interactions/export?format=csv"
              >
                <Download className="h-4 w-4" />
                Xuất file CSV (Mở Excel)
              </a>
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                download
                href="/api/interactions/export?format=json"
              >
                <Download className="h-4 w-4" />
                Xuất file JSON (Huấn luyện AI / Python)
              </a>
            </div>
          </div>
        </div>

        {/* 2-Column: Event Breakdown & Readiness Checklist */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Detailed Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Phân bố các loại tương tác</h2>
                <p className="text-xs text-slate-400">
                  Tổng cộng {stats.totalInteractions.toLocaleString("vi-VN")} lượt tương tác được ghi nhận
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                <Radio className="h-3 w-3 animate-pulse text-emerald-600" />
                Cập nhật trực tiếp
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {Object.entries(stats.interactionsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const cfg = EVENT_CONFIG[type] ?? {
                    label: type,
                    icon: Activity,
                    color: "text-slate-600",
                    bg: "bg-slate-50",
                    badge: "border-slate-200 bg-slate-50 text-slate-700",
                  };
                  const Icon = cfg.icon;
                  const percent = stats.totalInteractions > 0 ? (count / stats.totalInteractions) * 100 : 0;

                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-bold text-slate-800">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${cfg.bg} ${cfg.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900">{count.toLocaleString("vi-VN")}</span>
                          <span className="w-12 text-right text-slate-400 font-semibold">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#176B62] transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Operational Readiness Assessment */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <ShieldCheck className="h-5 w-5 text-bv-primary" />
                <div>
                  <h2 className="text-base font-black text-slate-900">Tiêu chuẩn nghiệm thu dữ liệu</h2>
                  <p className="text-xs text-slate-400">Danh mục kiểm tra dữ liệu đối chuẩn</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  {
                    label: "Số lượng độc giả",
                    current: stats.dataReadiness.current.users,
                    threshold: stats.dataReadiness.thresholds.minUsers,
                    unit: "người dùng",
                  },
                  {
                    label: "Lượt hiển thị (Impressions)",
                    current: stats.dataReadiness.current.impressions,
                    threshold: stats.dataReadiness.thresholds.minImpressions,
                    unit: "lượt",
                  },
                  {
                    label: "Mục tiêu mua & đọc (Chuyển đổi)",
                    current: stats.dataReadiness.current.outcomes,
                    threshold: stats.dataReadiness.thresholds.minOutcomes,
                    unit: "tương tác",
                  },
                  {
                    label: "Thời gian thu thập",
                    current: stats.dataReadiness.current.days,
                    threshold: stats.dataReadiness.thresholds.minDays,
                    unit: "ngày",
                  },
                ].map((item) => {
                  const passed = item.current >= item.threshold;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between rounded-xl p-3.5 border ${
                        passed
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-amber-200 bg-amber-50/50"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-700">{item.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.current.toLocaleString("vi-VN")} / {item.threshold.toLocaleString("vi-VN")} {item.unit}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
                        passed ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                      }`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {passed ? "Đạt chuẩn" : "Tích lũy"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Clock className="h-3.5 w-3.5" />
                <span>Giai đoạn ghi nhận:</span>
              </div>
              <p className="mt-1">
                {stats.collectionPeriod.earliest
                  ? new Date(stats.collectionPeriod.earliest).toLocaleDateString("vi-VN")
                  : "Chưa bắt đầu"}{" "}
                đến{" "}
                {stats.collectionPeriod.latest
                  ? new Date(stats.collectionPeriod.latest).toLocaleDateString("vi-VN")
                  : "Hôm nay"}{" "}
                ({stats.collectionPeriod.daysCollected} ngày).
              </p>
            </div>
          </div>
        </div>

        {/* Live Stream Telemetry Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
                <h2 className="text-base font-black text-slate-900">Nhật ký tương tác gần đây (Trực tiếp)</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Các sự kiện tương tác vừa phát sinh từ độc giả trên nền tảng BookVerse
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Mẫu 8 sự kiện mới nhất
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            {recentLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Chưa có bản ghi tương tác nào được ghi nhận.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Thời gian</th>
                    <th className="pb-3">Hoạt động</th>
                    <th className="pb-3">Sách / Đối tượng</th>
                    <th className="pb-3">Nguồn</th>
                    <th className="pb-3">Mô hình AI</th>
                    <th className="pb-3 pr-2 text-right">Mã người dùng (Hash)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLogs.map((log) => {
                    const cfg = EVENT_CONFIG[log.eventType] ?? {
                      label: log.eventType,
                      badge: "border-slate-200 bg-slate-50 text-slate-700",
                    };
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 pl-2 font-mono text-slate-500">{log.createdAt}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-bold ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-900 max-w-xs truncate" title={log.bookTitle}>
                          {log.bookTitle}
                        </td>
                        <td className="py-3 text-slate-500 font-mono">{log.sourcePage}</td>
                        <td className="py-3 text-slate-500 font-mono text-[11px]">{log.recommendationModel}</td>
                        <td className="py-3 pr-2 text-right font-mono text-slate-400">{log.userHash}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Admin note about keeping vs hiding this tab */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Info className="h-4 w-4 text-bv-primary" />
            <span>Tư vấn quản trị &amp; bảo vệ đồ án:</span>
          </div>
          <div className="mt-2 space-y-1.5 leading-relaxed text-slate-600">
            <p>
              • <strong>Khuyên dùng cho buổi bảo vệ đồ án:</strong> Nên giữ tab <em>&quot;Dữ liệu &amp; AI&quot;</em> này trên thanh điều hướng để thầy cô trong Hội đồng thấy rõ sự liên kết chặt chẽ giữa <strong>hệ thống phần mềm web</strong> và <strong>mô hình trí tuệ nhân tạo (AI Recommendation)</strong> được nêu trong báo cáo tốt nghiệp.
            </p>
            <p>
              • <strong>Nếu muốn thanh Menu gọn gàng hơn:</strong> Khi chuyển giao cho người dùng vận hành bình thường, nếu bạn không muốn tab này xuất hiện trên thanh Menu chính, bạn chỉ cần báo tôi ẩn nó đi — trang dữ liệu này vẫn hoạt động ngầm để lưu vết và xuất báo cáo bất cứ khi nào cần!
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
