import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  invokeCommandCenterRpc,
  isCommandCenterOperation,
} from "@/lib/admin/command-center-client";

export const createClient = async () => {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          } catch {}
        },
      },
    },
  );

  const directRpc = client.rpc.bind(client);
  client.rpc = ((operation, args, options) => {
    if (!isCommandCenterOperation(operation)) {
      return directRpc(operation, args, options);
    }
    return invokeCommandCenterRpc(client, operation, args);
  }) as typeof client.rpc;

  return client;
};
