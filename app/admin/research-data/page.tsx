/**
 * Trang Admin — Research Data
 * Hiển thị thống kê thu thập tương tác người dùng thật cho đồ án
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getResearchDataStats } from "@/actions/research-data.actions";

function StatusBadge({ status }: { status: string }) {
  const isReady = status === "READY_FOR_ASSESSMENT";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        isReady
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isReady ? "bg-green-500" : "bg-red-500"}`} />
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  warning,
}: {
  label: string;
  value: string | number;
  sub?: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        warning
          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
          : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
      }`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function ResearchDataPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const stats = await getResearchDataStats();

  if (!stats) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold text-red-600">Không thể tải dữ liệu.</h1>
      </div>
    );
  }

  const EVENT_LABELS: Record<string, string> = {
    IMPRESSION: "📺 Impression",
    VIEW: "👁 Xem sách",
    RECOMMENDATION_CLICK: "🖱 Click gợi ý",
    SEARCH: "🔍 Tìm kiếm",
    FAVORITE: "❤️ Yêu thích",
    BOOKMARK: "🔖 Bookmark",
    ADD_TO_CART: "🛒 Thêm giỏ hàng",
    PURCHASE: "💳 Mua",
    RATING: "⭐ Đánh giá",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📊 Research Data — Thu thập Tương tác
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Dữ liệu thu thập từ người dùng đã đồng ý (consent v1) · Đồ án tốt nghiệp BookVerse AI
            </p>
          </div>
          <StatusBadge status={stats.dataReadiness.status} />
        </div>

        {/* Consent Summary */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Người dùng đồng ý" value={stats.consentedUsers} sub={`Tối thiểu: ${stats.dataReadiness.thresholds.minUsers}`} warning={stats.consentedUsers < stats.dataReadiness.thresholds.minUsers} />
          <StatCard label="Từ chối / Thu hồi" value={stats.revokedOrDeclined} />
          <StatCard label="Đủ điều kiện benchmark" value={stats.eligibleForBenchmark} sub="≥ 3 interaction" />
          <StatCard label="Ngày thu thập" value={stats.collectionPeriod.daysCollected} sub={`Tối thiểu: ${stats.dataReadiness.thresholds.minDays} ngày`} warning={stats.collectionPeriod.daysCollected < stats.dataReadiness.thresholds.minDays} />
        </section>

        {/* Impression & CTR */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Tổng Impression" value={stats.impressions} sub={`Tối thiểu: ${stats.dataReadiness.thresholds.minImpressions}`} warning={stats.impressions < stats.dataReadiness.thresholds.minImpressions} />
          <StatCard label="Recommendation Click" value={stats.clicks} />
          <div className="rounded-xl p-4 border bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CTR (Click-Through Rate)</p>
            {stats.ctr.available && stats.ctr.value !== null ? (
              <>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(stats.ctr.value * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  = {stats.clicks} click / {stats.impressions} impression
                </p>
              </>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                ⚠ {stats.ctr.reason}
              </p>
            )}
          </div>
        </section>

        {/* Interaction by Type */}
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center gap-2">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Tương tác theo loại</h2>
            <span className="text-xs text-gray-400">Tổng: {stats.totalInteractions}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Loại event</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Số lượng</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {Object.entries(stats.interactionsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <tr key={type} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        {EVENT_LABELS[type] ?? type}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-900 dark:text-white">
                        {count.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {stats.totalInteractions > 0
                          ? ((count / stats.totalInteractions) * 100).toFixed(1) + "%"
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Data Readiness */}
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Operational Data Readiness</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              ["Người dùng", stats.dataReadiness.current.users, stats.dataReadiness.thresholds.minUsers],
              ["Impression", stats.dataReadiness.current.impressions, stats.dataReadiness.thresholds.minImpressions],
              ["Outcomes", stats.dataReadiness.current.outcomes, stats.dataReadiness.thresholds.minOutcomes],
              ["Ngày thu thập", stats.dataReadiness.current.days, stats.dataReadiness.thresholds.minDays],
            ] as [string, number, number][]).map(([label, current, threshold]) => {
              const passed = current >= threshold;
              return (
                <div key={label} className={`rounded-lg p-3 ${passed ? "bg-green-50 dark:bg-green-900/10" : "bg-red-50 dark:bg-red-900/10"}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={`text-lg font-bold ${passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {current.toLocaleString("vi-VN")} / {threshold.toLocaleString("vi-VN")}
                  </p>
                  <p className="text-xs">{passed ? "✅ Đạt" : "❌ Chưa đạt"}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Missing Data */}
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Tỷ lệ dữ liệu thiếu</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Không có userId:</span>{" "}
              <span className="font-mono font-medium">
                {stats.missingDataRate.recordsWithoutUserId} bản ghi
                {stats.totalInteractions > 0 && (
                  <span className="text-gray-400 font-normal ml-1">
                    ({((stats.missingDataRate.recordsWithoutUserId / stats.totalInteractions) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Không có bookId:</span>{" "}
              <span className="font-mono font-medium">
                {stats.missingDataRate.recordsWithoutBookId} bản ghi
                {stats.totalInteractions > 0 && (
                  <span className="text-gray-400 font-normal ml-1">
                    ({((stats.missingDataRate.recordsWithoutBookId / stats.totalInteractions) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Export Links */}
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Export dữ liệu ẩn danh</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/interactions/export?format=json"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              download
            >
              📥 Export JSON
            </a>
            <a
              href="/api/interactions/export?format=csv"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              download
            >
              📊 Export CSV
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            userId được hash SHA-256 một chiều. Không chứa email hoặc thông tin nhạy cảm.
          </p>
        </section>

        {/* Collection Period */}
        {(stats.collectionPeriod.earliest || stats.collectionPeriod.latest) && (
          <section className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">Khoảng thời gian:</span>{" "}
            {stats.collectionPeriod.earliest
              ? new Date(stats.collectionPeriod.earliest).toLocaleDateString("vi-VN")
              : "—"}{" "}
            →{" "}
            {stats.collectionPeriod.latest
              ? new Date(stats.collectionPeriod.latest).toLocaleDateString("vi-VN")
              : "—"}
          </section>
        )}
      </div>
    </div>
  );
}