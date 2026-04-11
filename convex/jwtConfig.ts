export const CONVEX_JWT_ISSUER = "https://settleease-navy.vercel.app";
export const CONVEX_JWT_AUDIENCE = "settleease-convex";
export const CONVEX_JWT_KID = "settleease-convex-jwt-2026-04";

export const CONVEX_JWT_PUBLIC_JWKS = {
  keys: [
    {
      kty: "RSA",
      n: "lIDub3Vo5Rs82djESSkCcN7M_KlI71UQubiYayd7_GXBkSYY7_B-5z-ejR3YJ17Sf0VZ4WKAlDv8lUJ0BqF6dYQ3UWP8o8SQELhIbfWil2FZvQzxxkFFQ5QPdlHoeWv5rfOQ5awNl-Y_jbJrKbOtkEgZuM9vCHAIaNxBG2t_UY0_uo04bbt4Xmd4lUtOKAQ1sVkUKDKGvhXM1lcc_kxl7g-O_zitTOp_VvnE4ZlokXH3-RvaWotWoRbIZKAn3gzQi-PxJ-RytoXp0fUazSVWThDjCJ62lMYHaZ-ASlYX3imDTxDZXIv_6P86mLSBftmjaIVbjjnxBDjdnRa9kPsyRQ",
      e: "AQAB",
      kid: CONVEX_JWT_KID,
      alg: "RS256",
      use: "sig",
    },
  ],
} as const;
