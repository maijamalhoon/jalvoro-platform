import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  COMMAND_CENTER_SUPABASE_PUBLISHABLE_KEY,
  COMMAND_CENTER_SUPABASE_URL,
} from "@/lib/command-center/config";

export async function createCommandCenterServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    COMMAND_CENTER_SUPABASE_URL,
    COMMAND_CENTER_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always persist a refreshed cookie. The
            // browser client refreshes the dedicated session while the private
            // Command Center is open.
          }
        },
      },
    },
  );
}
