import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyMarketplaceNewPage() {
  redirect("/seller/listings/new");
}
