const DEFAULT_CONVEX_URL = "https://shocking-panda-595.convex.cloud";

export function normalizeConvexUrl(url: string | undefined | null): string | undefined {
  const normalized = url?.trim().replace(/\/+$/, "");
  return normalized || undefined;
}

export function getConvexUrl(): string {
  return normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL) || DEFAULT_CONVEX_URL;
}
