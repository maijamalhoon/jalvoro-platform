"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, LoaderCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_NAME, brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

type SetupState = "working" | "error";

function businessDestination(value: string | null) {
  const destination = sanitizeInternalRedirect(value);
  return destination === "/business" || destination.startsWith("/business?") || destination.startsWith("/business/")
    ? destination
    : "/business?setup=1";
}

export default function BusinessAccountContinuationPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<SetupState>("working");
  const [message, setMessage] = useState("Preparing your secure business setup…");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function continueBusinessSetup() {
      setState("working");
      setMessage("Preparing your secure business setup…");

      const params = new URLSearchParams(window.location.search);
      const destination = businessDestination(params.get("next"));
      const loginParams = new URLSearchParams({
        mode: "signup",
        intent: "business",
        next: destination,
      });

      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (cancelled) return;

        if (userError || !data.user) {
          router.replace(`/login?${loginParams.toString()}`);
          return;
        }

        const user = data.user;
        const email = user.email?.trim() ?? "";
        const metadataName = String(user.user_metadata?.full_name ?? "").trim();
        const fallbackName = email.includes("@") ? email.split("@")[0] : "Business account";
        const fullName = metadataName || fallbackName;
        const provider = String(user.app_metadata?.provider ?? "email");
        const now = new Date().toISOString();

        const profileResult = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            email,
            full_name: fullName,
            provider,
            onboarding_completed: true,
            updated_at: now,
          });

        if (profileResult.error) {
          console.error("Business profile continuation failed", {
            code: profileResult.error.code,
          });
          if (!cancelled) {
            setMessage("Your business account profile could not be prepared. No workspace was created.");
            setState("error");
          }
          return;
        }

        const preferenceResult = await supabase
          .from("business_workspace_preferences")
          .upsert({
            user_id: user.id,
            default_workspace: "business",
            active_business_id: null,
            onboarding_choice: "business",
            updated_at: now,
          });

        if (preferenceResult.error) {
          console.error("Business workspace preference failed", {
            code: preferenceResult.error.code,
          });
          if (!cancelled) {
            setMessage("Your business workspace preference could not be saved. No workspace was created.");
            setState("error");
          }
          return;
        }

        if (cancelled) return;
        setMessage("Business identity ready. Opening your workspace setup…");
        router.replace(destination);
        router.refresh();
      } catch {
        if (cancelled) return;
        setMessage("Business setup could not continue. Check your connection and try again.");
        setState("error");
      }
    }

    void continueBusinessSetup();
    return () => {
      cancelled = true;
    };
  }, [retry, router, supabase]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8 text-foreground">
      <section className="w-full max-w-xl rounded-[calc(var(--radius-card)+0.25rem)] bg-surface p-6 text-center shadow-[var(--shadow-lg)] sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-[var(--radius-card)] bg-primary-soft">
          <Image src={brand.assets.logoMark} alt="" width={38} height={38} priority />
        </span>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-primary">
          {APP_NAME} business setup
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
          Your business journey stays separate.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-text-secondary">{message}</p>

        <div className="mt-6 rounded-[var(--radius-card)] bg-surface-secondary p-4 text-left text-sm text-text-secondary">
          <span className="flex items-start gap-3">
            {state === "working" ? (
              <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            )}
            <span>
              <strong className="block text-text-primary">
                {state === "working" ? "Secure continuation" : "Setup paused safely"}
              </strong>
              <span className="mt-1 block leading-6">
                Personal accounts, balances, goals, and tracking are not created or modified by this flow.
              </span>
            </span>
          </span>
        </div>

        {state === "error" ? (
          <Button type="button" size="lg" className="mt-6 w-full" onClick={() => setRetry((value) => value + 1)}>
            Try business setup again
          </Button>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-text-tertiary">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            <Building2 className="size-4 text-primary" aria-hidden="true" />
            Verified account · business-only continuation
          </div>
        )}
      </section>
    </main>
  );
}
