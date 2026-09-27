export default function CatalogLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[75vh]">
      {/* Hero / Filter skeleton */}
      <section className="border-b border-bv-ink/8 bg-bv-ivory/70">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <div className="h-8 w-64 animate-pulse rounded-xl bg-bv-ink/10" />
            <div className="h-4 w-96 animate-pulse rounded-lg bg-bv-ink/8" />
          </div>

          {/* Search bar & filter pill skeletons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="h-11 w-72 animate-pulse rounded-xl bg-white shadow-sm" />
            <div className="h-11 w-36 animate-pulse rounded-xl bg-white shadow-sm" />
            <div className="h-11 w-32 animate-pulse rounded-xl bg-white shadow-sm" />
            <div className="h-11 w-28 animate-pulse rounded-xl bg-white shadow-sm" />
          </div>

          {/* Category pills skeleton */}
          <div className="mt-5 flex gap-2 overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-bv-ink/8"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-bv-ink/10" />
          <div className="h-8 w-32 animate-pulse rounded-lg bg-bv-ink/8" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-bv-ink/8 bg-white shadow-sm"
            >
              <div className="aspect-[2/3] animate-pulse bg-gradient-to-b from-[#E8E3D8] to-[#DDD8CC]" />
              <div className="space-y-2.5 p-3.5">
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#E8E3D8]" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#EDF0EC]" />
                <div className="flex items-center justify-between pt-1">
                  <div className="h-4 w-16 animate-pulse rounded-full bg-[#E8E3D8]" />
                  <div className="h-8 w-20 animate-pulse rounded-xl bg-[#DDF0EB]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
