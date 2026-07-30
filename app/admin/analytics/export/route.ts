import { NextResponse } from "next/server";

import { getAdminAnalytics } from "@/actions/admin-analytics.actions";

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const data = await getAdminAnalytics();
    const header = [
      "Ngày",
      "Số thanh toán hội viên",
      "Doanh thu hội viên",
      "Số đơn chợ sách",
      "Doanh thu chợ sách",
    ];
    const rows = data.daily.map((day) => [
      day.key,
      day.membershipPayments,
      day.membershipRevenue,
      day.marketplaceOrders,
      day.marketplaceRevenue,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition":
          'attachment; filename="bookverse-analytics-30-ngay.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Bạn không có quyền xuất báo cáo này." },
      { status: 403 },
    );
  }
}
