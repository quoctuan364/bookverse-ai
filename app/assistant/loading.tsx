export default function AssistantLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="bv-page min-h-[75vh]">
      <div className="mx-auto flex h-[calc(100vh-140px)] max-w-4xl flex-col p-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 border-b border-bv-ink/8 pb-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-bv-primary/20" />
          <div className="space-y-1">
            <div className="h-5 w-40 animate-pulse rounded-lg bg-bv-ink/10" />
            <div className="h-3 w-56 animate-pulse rounded-lg bg-bv-ink/6" />
          </div>
        </div>

        {/* Chat message bubbles skeleton */}
        <div className="flex-1 space-y-4 py-6">
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-bv-primary/20" />
            <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-white p-4 shadow-sm" />
          </div>

          <div className="flex justify-end">
            <div className="h-12 w-1/2 animate-pulse rounded-2xl bg-bv-primary/10 p-4" />
          </div>

          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-bv-primary/20" />
            <div className="h-32 w-4/5 animate-pulse rounded-2xl bg-white p-4 shadow-sm" />
          </div>
        </div>

        {/* Input bar skeleton */}
        <div className="h-14 w-full animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
