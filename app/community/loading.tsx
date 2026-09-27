export default function CommunityLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[75vh]">
      <section className="border-b border-bv-ink/8 bg-bv-ivory/70">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="h-8 w-56 animate-pulse rounded-xl bg-bv-ink/10" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded-lg bg-bv-ink/8" />
            </div>
            <div className="h-11 w-36 animate-pulse rounded-xl bg-bv-primary/20" />
          </div>

          <div className="mt-6 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-xl bg-bv-ink/8" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-bv-ink/8 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-bv-ink/10" />
                <div className="space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-bv-ink/10" />
                  <div className="h-3 w-20 animate-pulse rounded-full bg-bv-ink/6" />
                </div>
              </div>
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-bv-ink/10" />
              <div className="h-4 w-full animate-pulse rounded-lg bg-bv-ink/6" />
              <div className="h-4 w-2/3 animate-pulse rounded-lg bg-bv-ink/6" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
