import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import IconSystemLibrary from "@/components/admin/IconSystemLibrary";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Icon System | JALVORO Admin",
  description:
    "Private JALVORO icon library, design review and code reference center.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminIconSystemPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=%2Fadmin%2Ficon-system");
  }

  const { error } = await supabase.rpc("get_platform_admin_snapshot");

  if (error?.code === "42501") {
    notFound();
  }

  if (error) {
    throw new Error(`Admin icon system access unavailable: ${error.code ?? "unknown"}`);
  }

  return <IconSystemLibrary />;
}
