import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AuthShell from "@/components/auth/AuthShell";
import CompleteWorkspaceOnboarding from "@/components/workspaces/CompleteWorkspaceOnboarding";
import { createClient } from "@/lib/supabase/server";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Completing workspace setup",
  robots: { index: false, follow: false },
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CompleteWorkspaceOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sessionId = firstValue(query.session)?.trim() ?? "";
  const nextPath = sanitizeInternalRedirect(firstValue(query.next) ?? "/dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `/workspaces/onboarding/complete?session=${encodeURIComponent(sessionId)}&next=${encodeURIComponent(nextPath)}`;
    redirect(`/login/personal?next=${encodeURIComponent(returnPath)}`);
  }

  return (
    <AuthShell
      compact
      minimal
      eyebrow="Personal setup"
      progress="Final step"
      title="Completing your Personal workspace"
      description="Your identity and profile are ready. We are recording the final resumable setup state before opening Personal Finance."
    >
      <CompleteWorkspaceOnboarding sessionId={sessionId} nextPath={nextPath} />
    </AuthShell>
  );
}
