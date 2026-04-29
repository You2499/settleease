import {
  DEVELOPMENT_CONVEX_URL,
  PRODUCTION_CONVEX_URL,
  isLocalDevelopmentEnvironment,
} from "./developmentAuth";

function normalizeConvexUrl(url: string | undefined | null): string | undefined {
  const normalized = url?.trim().replace(/\/+$/, "");
  return normalized || undefined;
}

export function getConvexUrl(): string {
  return normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL) ||
    (isLocalDevelopmentEnvironment() ? DEVELOPMENT_CONVEX_URL : PRODUCTION_CONVEX_URL);
}
