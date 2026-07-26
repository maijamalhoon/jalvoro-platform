import { createClient } from "@/lib/supabase/server";

export type AccountRealm = "individual" | "business" | "legacy_dual";
export type RequiredAccountRealm = Exclude<AccountRealm, "legacy_dual">;
type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function isAccountRealm(value: unknown): value is AccountRealm {
  return value === "individual" || value === "business" || value === "legacy_dual";
}

export function accountRealmAllows(
  realm: AccountRealm | null,
  required: RequiredAccountRealm,
) {
  return realm === required || realm === "legacy_dual";
}

export async function loadAccountRealm(client: ServerSupabaseClient) {
  const { data, error } = await client.rpc("get_my_account_realm");
  if (error || !isAccountRealm(data)) return null;
  return data;
}
