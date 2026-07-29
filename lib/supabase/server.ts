import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import {
  invokeCommandCenterRpc,
  isCommandCenterOperation,
} from "@/lib/admin/command-center-client";
import { createControlPlaneServerClient } from "@/lib/control-plane/server";

export const createClient = async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
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

  const isCommandCenterRequest =
    requestHeaders.get("x-jalvoro-command-center") === "1";

  if (isCommandCenterRequest) {
    const controlPlane = await createControlPlaneServerClient();
    client.auth.getUser = controlPlane.auth.getUser.bind(
      controlPlane.auth,
    ) as typeof client.auth.getUser;
    client.auth.getSession = controlPlane.auth.getSession.bind(
      controlPlane.auth,
    ) as typeof client.auth.getSession;
    client.auth.getClaims = controlPlane.auth.getClaims.bind(
      controlPlane.auth,
    ) as typeof client.auth.getClaims;
  }

  const directRpc = client.rpc.bind(client);
  client.rpc = ((operation, args, options) => {
    if (!isCommandCenterOperation(operation)) {
      return directRpc(operation, args, options);
    }
    return invokeCommandCenterRpc(client, operation, args);
  }) as typeof client.rpc;

  return client;
};
