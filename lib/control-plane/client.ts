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
      // The application and Control Plane use different Supabase projects.
      // Never reuse the application's browser singleton for this security realm.
      isSingleton: false,
      auth: {
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
      },
    },
  );
}
