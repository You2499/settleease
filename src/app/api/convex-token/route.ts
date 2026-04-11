import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importPKCS8, SignJWT } from "jose";
import {
  CONVEX_JWT_AUDIENCE,
  CONVEX_JWT_ISSUER,
  CONVEX_JWT_KID,
} from "@convex/jwtConfig";
import { supabaseAnonKey, supabaseUrl } from "@/lib/settleease/constants";

export const runtime = "nodejs";

const TOKEN_TTL_SECONDS = 15 * 60;

function getPrivateKeyPem() {
  const encoded = process.env.CONVEX_JWT_PRIVATE_KEY_BASE64;
  if (encoded) {
    return Buffer.from(encoded, "base64").toString("utf8");
  }

  const raw = process.env.CONVEX_JWT_PRIVATE_KEY;
  return raw?.replace(/\\n/g, "\n");
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function POST(request: NextRequest) {
  const supabaseAccessToken = getBearerToken(request);

  if (!supabaseAccessToken) {
    return Response.json({ error: "Missing Supabase bearer token." }, { status: 401 });
  }

  const privateKeyPem = getPrivateKeyPem();
  if (!privateKeyPem) {
    return Response.json({ error: "Convex JWT signing key is not configured." }, { status: 500 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: "Supabase auth is not configured." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(supabaseAccessToken);
  const user = data.user;

  if (error || !user) {
    return Response.json({ error: "Invalid Supabase session." }, { status: 401 });
  }

  const signingKey = await importPKCS8(privateKeyPem, "RS256");
  const token = await new SignJWT({
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: CONVEX_JWT_KID })
    .setIssuer(CONVEX_JWT_ISSUER)
    .setAudience(CONVEX_JWT_AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(signingKey);

  return Response.json({ token, expiresIn: TOKEN_TTL_SECONDS });
}
