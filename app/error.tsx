"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("BookVerse route error", error);
  }, [error]);

  return (
    <main className="bv-page flex min-h-[70vh] items-center justify-center px-4 py-12">
      <section className="max-w-xl rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm sm:p-10" role="alert">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-700" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-black text-bv-heading">BookVerse gặp sự cố</h1>
        <p className="mt-3 leading-7 text-bv-text-muted">Dữ liệu chưa thể tải ở thời điểm này. Bạn có thể thử lại mà không mất thông tin đã lưu trước đó.</p>
        {error.digest ? <p className="mt-3 font-mono text-xs text-bv-text-subtle">Mã lỗi: {error.digest}</p> : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-bv-primary px-5 py-3 font-black text-white transition hover:bg-bv-primary-dark" onClick={reset} type="button"><RotateCcw className="h-4 w-4" aria-hidden="true" />Thử lại</button>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-bv-border px-5 py-3 font-black text-bv-heading transition hover:bg-bv-surface" href="/"><Home className="h-4 w-4" aria-hidden="true" />Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}
