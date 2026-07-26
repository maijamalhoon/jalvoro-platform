import { createBrowserClient } from "@supabase/ssr";

import {
  COMMAND_CENTER_SUPABASE_PUBLISHABLE_KEY,
  COMMAND_CENTER_SUPABASE_URL,
} from "@/lib/command-center/config";

export function createCommandCenterBrowserClient() {
  return createBrowserClient(
    COMMAND_CENTER_SUPABASE_URL,
    COMMAND_CENTER_SUPABASE_PUBLISHABLE_KEY,
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
