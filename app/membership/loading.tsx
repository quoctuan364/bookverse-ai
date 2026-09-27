export default function MembershipLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[75vh]">
      <section className="border-b border-bv-ink/8 bg-bv-ivory/70 py-12 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mx-auto h-8 w-64 animate-pulse rounded-xl bg-bv-ink/10" />
          <div className="mx-auto mt-3 h-4 w-96 animate-pulse rounded-lg bg-bv-ink/8" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-bv-ink/8 bg-white p-6 shadow-sm"
            >
              <div className="h-6 w-32 animate-pulse rounded-lg bg-bv-ink/10" />
              <div className="mt-4 h-10 w-44 animate-pulse rounded-xl bg-bv-primary/20" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-bv-ink/8" />
              <div className="my-6 space-y-3">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="h-4 w-full animate-pulse rounded-lg bg-bv-ink/6" />
                ))}
              </div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-bv-primary/30" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
