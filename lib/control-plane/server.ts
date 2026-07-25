import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
  CONTROL_PLANE_SUPABASE_URL,
} from "@/lib/control-plane/config";

export async function createControlPlaneServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    CONTROL_PLANE_SUPABASE_URL,
    CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
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
            // Server Components cannot always write cookies. The proxy refreshes
            // the independent Control Plane session on every protected request.
          }
        },
      },
    },
  );
}
