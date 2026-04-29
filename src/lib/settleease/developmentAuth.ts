import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { UserProfile } from "./types";

export const DEVELOPMENT_CONVEX_URL = "https://shocking-panda-595.convex.cloud";
export const PRODUCTION_CONVEX_URL = "https://fortunate-fox-427.convex.cloud";

export const DEVELOPMENT_SUPABASE_USER_ID = "settleease-development-admin";
export const DEVELOPMENT_USER_EMAIL = "development@settleease.local";
export const DEVELOPMENT_USER_NAME = "Development Admin";

export function isLocalDevelopmentEnvironment() {
  return process.env.NODE_ENV === "development";
}

export const developmentSupabaseUser = {
  id: DEVELOPMENT_SUPABASE_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: DEVELOPMENT_USER_EMAIL,
  phone: "",
  app_metadata: {
    provider: "development",
    providers: ["development"],
  },
  user_metadata: {
    full_name: DEVELOPMENT_USER_NAME,
    name: DEVELOPMENT_USER_NAME,
  },
  identities: [],
  created_at: "2026-04-29T00:00:00.000Z",
  updated_at: "2026-04-29T00:00:00.000Z",
} as SupabaseUser;

export const developmentUserProfile: UserProfile = {
  id: DEVELOPMENT_SUPABASE_USER_ID,
  user_id: DEVELOPMENT_SUPABASE_USER_ID,
  role: "admin",
  first_name: "Development",
  last_name: "Admin",
  font_preference: "google-sans",
  theme_preference: "light",
  last_active_view: "dashboard",
  has_seen_welcome_toast: true,
  should_show_welcome_toast: false,
  created_at: "2026-04-29T00:00:00.000Z",
  updated_at: "2026-04-29T00:00:00.000Z",
};
