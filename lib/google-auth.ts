import type { GoogleProfile } from "next-auth/providers/google";

export interface GoogleIdentity {
  email: string;
  name: string;
  picture: string | null;
}

function readEnvironmentValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    readEnvironmentValue(process.env.AUTH_GOOGLE_ID) &&
      readEnvironmentValue(process.env.AUTH_GOOGLE_SECRET),
  );
}

export function parseVerifiedGoogleIdentity(profile: unknown): GoogleIdentity | null {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const googleProfile = profile as Partial<GoogleProfile>;
  const email = typeof googleProfile.email === "string" ? googleProfile.email.trim().toLowerCase() : "";
  const name = typeof googleProfile.name === "string" ? googleProfile.name.trim() : "";
  const picture = typeof googleProfile.picture === "string" ? googleProfile.picture.trim() : "";

  if (!googleProfile.email_verified || !email || !name) {
    return null;
  }

  return {
    email,
    name,
    picture: picture || null,
  };
}
