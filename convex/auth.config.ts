import type { AuthConfig } from "convex/server";
import {
  CONVEX_JWT_AUDIENCE,
  CONVEX_JWT_ISSUER,
  CONVEX_JWT_PUBLIC_JWKS,
} from "./jwtConfig";

const jwksDataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
  JSON.stringify(CONVEX_JWT_PUBLIC_JWKS),
)}`;

export default {
  providers: [
    {
      type: "customJwt",
      issuer: CONVEX_JWT_ISSUER,
      applicationID: CONVEX_JWT_AUDIENCE,
      jwks: jwksDataUri,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
