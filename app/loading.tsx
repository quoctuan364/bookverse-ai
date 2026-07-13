import { Skeleton } from "@/components/ui/skeleton";

function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Skeleton className="h-12 w-full max-w-3xl bg-white/20 sm:h-16" />
          <Skeleton className="mt-8 h-14 w-full max-w-2xl bg-white/20" />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <section>
          <Skeleton className="mb-6 h-8 w-64" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <BookCardSkeleton key={`featured-${index}`} />
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="mb-6 h-8 w-72" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <BookCardSkeleton key={`listing-${index}`} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
