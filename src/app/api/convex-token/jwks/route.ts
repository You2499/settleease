import { CONVEX_JWT_PUBLIC_JWKS } from "@convex/jwtConfig";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(CONVEX_JWT_PUBLIC_JWKS, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
