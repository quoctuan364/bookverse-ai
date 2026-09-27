import { BookOpen } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-bv-ink/8 bg-white">
      <div className="aspect-[2/3] animate-pulse bg-[#E8E3D8]" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-4/5 animate-pulse rounded-full bg-[#E8E3D8]" />
        <div className="h-4 w-2/5 animate-pulse rounded-full bg-[#EDF0EC]" />
        <div className="h-14 animate-pulse rounded-xl bg-[#F3F0E9]" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[70vh]">
      <section className="border-b border-bv-ink/8 bg-bv-ivory/70">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-8 sm:px-6 lg:px-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDF0EB] text-bv-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-black text-bv-ink">Đợi BookVerse một chút nhé</p>
            <p className="text-sm text-bv-text-subtle">Đang mở trang và chuẩn bị những cuốn sách dành cho bạn.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <span className="sr-only">Đang tải trang</span>
        <div className="mb-6 h-12 max-w-2xl animate-pulse rounded-xl bg-white/80" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
