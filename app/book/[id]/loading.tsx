import { Skeleton } from "@/components/ui/skeleton";

export default function BookDetailLoading() {
  return (
    <main className="bv-page">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <aside className="space-y-4">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </aside>

          <section className="rounded-lg border border-[#17191F]/10 bg-bv-ivory p-6 shadow-[0_12px_34px_rgba(39,44,51,0.08)] sm:p-8">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-6 h-12 w-4/5" />
            <Skeleton className="mt-4 h-6 w-56" />
            <Skeleton className="mt-8 h-16 w-full rounded-lg" />

            <div className="mt-8 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton className="h-20 rounded-lg" key={index} />
              ))}
            </div>
          </section>
        </section>

        <section className="mt-12">
          <Skeleton className="mb-5 h-8 w-72" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </section>
      </div>
    </main>
  );
}
