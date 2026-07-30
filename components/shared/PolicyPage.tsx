import type { ReactNode } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

interface PolicySection {
  title: string;
  content: ReactNode;
}

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: PolicySection[];
}

export function PolicyPage({ eyebrow, title, description, sections }: PolicyPageProps) {
  return (
    <main className="bv-page min-h-[70vh]">
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#176B62] transition hover:bg-[#E6F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]" href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về trang chủ
        </Link>
        <header className="mt-5 rounded-2xl bg-[#173F3A] p-6 text-white sm:p-9">
          <span className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-[#F2C14E]"><FileText className="h-4 w-4" aria-hidden="true" />{eyebrow}</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#EAF5F1]">{description}</p>
          <p className="mt-4 text-xs text-[#CFE5DF]">Cập nhật: 24/07/2026 · Áp dụng cho bản demo học thuật BookVerse AI.</p>
        </header>
        <div className="mt-6 space-y-4">
          {sections.map((section, index) => (
            <section className="rounded-2xl border border-[#D8D0C2] bg-white p-5 shadow-sm sm:p-7" key={section.title}>
              <h2 className="text-xl font-black text-[#17202A]"><span className="mr-2 text-[#C65D43]">{index + 1}.</span>{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[#536071]">{section.content}</div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
