import { Skeleton } from "@/components/ui/skeleton";

export default function BookDetailLoading() {
  return (
    <main className="bv-page relative min-h-screen pb-20 pt-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-9 w-64 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        {/* Primary grid */}
        <section className="grid gap-8 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] lg:gap-12">
          {/* Left Column */}
          <aside className="space-y-6">
            <div className="mx-auto max-w-[340px] sm:max-w-[380px] lg:max-w-none">
              <Skeleton className="aspect-[2/3] w-full rounded-3xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-3xl" />
          </aside>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="h-12 w-3/4 rounded-xl" />
              <Skeleton className="h-5 w-48 rounded-lg" />
            </div>

            {/* 4 Metric cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton className="h-24 rounded-2xl" key={i} />
              ))}
            </div>

            {/* Purchasing Console */}
            <Skeleton className="h-72 w-full rounded-3xl" />

            {/* Synopsis */}
            <Skeleton className="h-44 w-full rounded-3xl" />

            {/* Specs */}
            <Skeleton className="h-56 w-full rounded-3xl" />
          </div>
        </section>
      </div>
    </main>
  );
}
