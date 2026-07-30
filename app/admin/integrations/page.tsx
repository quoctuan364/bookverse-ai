import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  ExternalLink,
  KeyRound,
  ServerCog,
} from "lucide-react";
import Link from "next/link";

import { getIntegrationReadiness } from "@/actions/integration-readiness.actions";

export const dynamic = "force-dynamic";

const statusConfig = {
  READY: {
    icon: CheckCircle2,
    label: "Sẵn sàng",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  PARTIAL: {
    icon: AlertTriangle,
    label: "Một phần",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  MISSING: {
    icon: CircleOff,
    label: "Chưa cấu hình",
    className: "border-red-200 bg-red-50 text-red-800",
  },
} as const;

export default async function AdminIntegrationsPage() {
  const data = await getIntegrationReadiness();

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-black text-[#D9EEEA] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C14E]"
            href="/admin"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại Admin Center
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <ServerCog className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
            Production Readiness
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Trạng thái tích hợp
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-[#D9EEEA]">
            Kiểm tra Google OAuth, email, AI và hạ tầng mà không hiển thị giá trị
            khóa bí mật ra giao diện.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Sẵn sàng", data.summary.ready, "text-emerald-700"],
            ["Một phần", data.summary.partial, "text-amber-700"],
            ["Chưa cấu hình", data.summary.missing, "text-red-700"],
          ].map(([label, value, className]) => (
            <article
              className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm"
              key={String(label)}
            >
              <p className="text-sm font-bold text-[#66706B]">{label}</p>
              <p className={`mt-2 text-3xl font-black ${className}`}>
                {Number(value)}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((item) => {
            const status = statusConfig[item.status];
            const StatusIcon = status.icon;
            return (
              <article
                className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm sm:p-6"
                key={item.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F3F0] text-[#176B62]">
                      <KeyRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-[#17202A]">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[#66706B]">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-black ${status.className}`}
                  >
                    <StatusIcon className="h-4 w-4" aria-hidden="true" />
                    {status.label}
                  </span>
                </div>
                <div className="mt-5 rounded-xl bg-[#F7F4ED] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#66706B]">
                    Biến môi trường cần kiểm tra
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.envKeys.map((key) => (
                      <code
                        className="rounded-lg border border-[#D8D0C2] bg-white px-2 py-1 text-xs font-bold text-[#364152]"
                        key={key}
                      >
                        {key}
                      </code>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-[#176B62]/20 bg-[#104C47] p-6 text-white">
          <h2 className="text-xl font-black">Cách hoàn tất production</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D9EEEA]">
            Sao chép `.env.example` thành `.env`, điền giá trị thật trên máy chủ
            và chạy bộ kiểm tra production. Không commit Client Secret hoặc API key.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-[#104C47] transition hover:bg-[#F2C14E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C14E]"
              href="/help"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Mở trợ giúp
            </Link>
            <code className="inline-flex min-h-11 items-center rounded-lg border border-white/20 bg-white/10 px-4 text-xs font-bold text-[#D9EEEA]">
              npm run test:production-env
            </code>
          </div>
        </aside>
      </section>
    </main>
  );
}
