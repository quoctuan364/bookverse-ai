import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * @deprecated Under Unified User Model, all members have sell rights by default.
 * Route preserved for backward compatibility to redirect existing links/bookmarks to /seller.
 */
export default async function SellerApplyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?callbackUrl=/seller");
  }

  redirect("/seller");
}
