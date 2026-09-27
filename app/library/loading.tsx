export default function LibraryLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[75vh]">
      <section className="border-b border-bv-ink/8 bg-bv-ivory/70">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-56 animate-pulse rounded-xl bg-bv-ink/10" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded-lg bg-bv-ink/8" />

          <div className="mt-6 flex gap-3">
            <div className="h-10 w-28 animate-pulse rounded-xl bg-bv-primary/20" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-bv-ink/8" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-bv-ink/8" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-bv-ink/8 bg-white shadow-sm"
            >
              <div className="aspect-[2/3] animate-pulse bg-gradient-to-b from-[#E8E3D8] to-[#DDD8CC]" />
              <div className="space-y-2.5 p-3.5">
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#E8E3D8]" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#EDF0EC]" />
                <div className="h-2 w-full animate-pulse rounded-full bg-[#E8E3D8]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
