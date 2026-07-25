import { createBrowserClient } from "@supabase/ssr";

import {
  CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
  CONTROL_PLANE_SUPABASE_URL,
} from "@/lib/control-plane/config";

export function createControlPlaneBrowserClient() {
  return createBrowserClient(
    CONTROL_PLANE_SUPABASE_URL,
    CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
      },
    },
  );
}
