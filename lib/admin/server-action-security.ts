import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireRateLimitedAdminClient({
  scope,
  loginPath,
  failurePath,
  limit = 30,
  windowSeconds = 60,
}: {
  scope: string;
  loginPath: string;
  failurePath: string;
  limit?: number;
  windowSeconds?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect(loginPath);

  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "consume_api_rate_limit",
    {
      p_scope: `admin-action:${scope}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    },
  );

  if (rateLimitError || allowed !== true) redirect(failurePath);
  return supabase;
}
