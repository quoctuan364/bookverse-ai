import { notFound } from "next/navigation";

import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { resolveCollectionMetadata } from "@/lib/recommendation-telemetry-policy";

export const dynamic = "force-dynamic";

interface TelemetryHarnessPageProps {
  searchParams?: Promise<{ case?: string }>;
}

export default async function TelemetryHarnessPage({
  searchParams,
}: TelemetryHarnessPageProps) {
  if (process.env.BOOKVERSE_E2E_MODE !== "1") notFound();

  const scenario = (await searchParams)?.case ?? "qualified";
  const metadata = resolveCollectionMetadata(process.env);
  const requestId =
    scenario === "no-consent"
      ? metadata.collectionContext === "PILOT_CONSENTED"
        ? "TEST-FIXTURE-CONSENTED-REQUEST"
        : null
      : "TEST-FIXTURE-REQUEST";
  const wrapperClass =
    scenario === "partial"
      ? "h-10 overflow-hidden"
      : scenario === "leave"
        ? "mt-[120vh]"
        : "";

  return (
    <main data-collection-context={metadata.collectionContext}>
      {scenario === "leave" ? <div className="h-4" data-testid="leave-start" /> : null}
      <div className={wrapperClass}>
        <RecommendationTrackedLink
          bookId="B-TEST-FIXTURE-AI"
          className="block h-[100px] w-[240px] bg-emerald-100 p-4"
          data-testid="tracked-recommendation"
          href="/book/B-TEST-FIXTURE-AI"
          requestId={requestId}
        >
          Recommendation TEST_FIXTURE
        </RecommendationTrackedLink>
      </div>
      {scenario === "leave" ? <div className="h-[120vh]" data-testid="leave-end" /> : null}
    </main>
  );
}
