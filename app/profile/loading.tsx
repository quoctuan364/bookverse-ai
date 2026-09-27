export default function ProfileLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[75vh]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Profile header skeleton */}
        <div className="flex items-center gap-4 rounded-3xl border border-bv-ink/8 bg-white p-6 shadow-sm">
          <div className="h-20 w-20 animate-pulse rounded-full bg-bv-ink/10" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded-xl bg-bv-ink/10" />
            <div className="h-4 w-36 animate-pulse rounded-lg bg-bv-ink/8" />
          </div>
        </div>

        {/* Content cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-bv-ink/8 bg-white p-6 shadow-sm space-y-4">
            <div className="h-5 w-36 animate-pulse rounded-lg bg-bv-ink/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-bv-ink/6" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-bv-ink/6" />
          </div>
          <div className="rounded-3xl border border-bv-ink/8 bg-white p-6 shadow-sm space-y-4">
            <div className="h-5 w-36 animate-pulse rounded-lg bg-bv-ink/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-bv-ink/6" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-bv-ink/6" />
          </div>
        </div>
      </div>
    </main>
  );
}
