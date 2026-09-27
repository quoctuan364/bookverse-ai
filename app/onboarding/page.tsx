import { redirect } from "next/navigation";

/**
 * /onboarding → redirect về /onboarding/preferences
 * Tránh 404 khi user vào đúng /onboarding
 */
export default function OnboardingIndexPage() {
  redirect("/onboarding/preferences");
}
