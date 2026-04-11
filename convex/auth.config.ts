import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://rtvppztfzkfspzuhgjwe.supabase.co/auth/v1",
      applicationID: "authenticated",
    },
  ],
} satisfies AuthConfig;
