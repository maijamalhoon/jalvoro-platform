"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  AuthFeedback,
  AuthField,
  AuthPasswordField,
  AuthPasswordRequirements,
  AuthProviderButton,
  AuthSubmitAction,
} from "@/components/auth/AuthControls";
import AuthShell from "@/components/auth/AuthShell";
import { checkPasswordProtection } from "@/lib/auth/password-protection";
import {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/client";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

type ProductRealm = "individual" | "business";
type AuthMode = "login" | "signup";
export type BusinessProduct =
  | "solo_business"
  | "retail_pos"
  | "growing_business"
  | "enterprise";

type ProductRealmAuthProps = {
  realm: ProductRealm;
  mode: AuthMode;
  product?: BusinessProduct | null;
  next?: string | null;
  initialError?: string | null;
};

type LoadingAction = "password" | "google" | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

const PRODUCT_LABELS: Record<BusinessProduct, string> = {
  solo_business: "Solo Business",
  retail_pos: "Retail & POS",
  growing_business: "Growing Business",
  enterprise: "Enterprise Operations",
};

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.3 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  );
}

function setupDestination({
  realm,
  mode,
  product,
  next,
}: {
  realm: ProductRealm;
  mode: AuthMode;
  product: BusinessProduct | null;
  next: string;
}) {
  const params = new URLSearchParams({ realm, mode, next });
  if (product) params.set("product", product);
  return `/auth/realm-setup?${params.toString()}`;
}

function callbackDestination(next: string) {
  return `/auth/callback?next=${encodeURIComponent(next)}`;
}

function isBusinessInvitationAcceptance(next: string) {
  try {
    const parsed = new URL(next, "https://jalvoro.invalid");
    return (
      parsed.origin === "https://jalvoro.invalid" &&
      parsed.pathname === "/business/invitations/accept" &&
      /^[0-9a-f]{64}$/i.test(parsed.searchParams.get("token") ?? "")
    );
  } catch {
    return false;
  }
}

function normalizeAuthError(message: string | undefined, mode: AuthMode) {
  const value = message?.toLowerCase() ?? "";
  if (value.includes("rate") || value.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (value.includes("email not confirmed") || value.includes("email_not_confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (value.includes("network") || value.includes("fetch") || value.includes("timeout")) {
    return "Authentication is temporarily unavailable. Check your connection and try again.";
  }
  return mode === "login"
    ? "The email or password is incorrect, or this account cannot use this product."
    : "The account could not be created. Check the details and try again.";
}

export default function ProductRealmAuth({
  realm,
  mode,
  product = null,
  next = null,
  initialError = null,
}: ProductRealmAuthProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fallback = realm === "business" ? "/business" : "/dashboard";
  const safeNext = sanitizeInternalRedirect(next, fallback);
  const productLabel = product ? PRODUCT_LABELS[product] : "Business";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [error, setError] = useState(
    initialError === "no_access"
      ? "This account has no active Business organization access. Ask an administrator to invite or reactivate you."
      : "",
  );
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === "signup";
  const isBusiness = realm === "business";
  const isBusy = loading !== null;

  async function verifyBusinessMembership(userId: string) {
    const { data, error: membershipError } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw new Error("membership_unavailable");
    }

    return Boolean(data?.business_id);
  }

  async function prepareSelectedRealm(userId: string) {
    const choice = isBusiness ? "business" : "personal";
    const { error: preferenceError } = await supabase
      .from("business_workspace_preferences")
      .upsert({
        user_id: userId,
        default_workspace: choice,
        active_business_id: null,
        onboarding_choice: choice,
        updated_at: new Date().toISOString(),
      });

    if (preferenceError) {
      throw new Error("realm_setup_failed");
    }
  }

  async function finishAuthenticated(userId: string) {
    if (isSignup) {
      await prepareSelectedRealm(userId);
      if (isBusiness) {
        const params = new URLSearchParams({ setup: "1" });
        if (product) params.set("product", product);
        router.replace(`/business?${params.toString()}`);
      } else {
        router.replace(`/onboarding?next=${encodeURIComponent(safeNext)}`);
      }
      router.refresh();
      return;
    }

    const acceptingInvitation =
      isBusiness && isBusinessInvitationAcceptance(safeNext);

    if (isBusiness && !acceptingInvitation && !(await verifyBusinessMembership(userId))) {
      await supabase.auth.signOut({ scope: "local" });
      setError(
        "This account has no active Business organization access. Ask an administrator to invite or reactivate you.",
      );
      return;
    }

    router.replace(safeNext);
    router.refresh();
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    setError("");

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (isSignup && (normalizedName.length < 2 || normalizedName.length > 120)) {
      setError("Enter the account holder's full name.");
      return;
    }

    if (isSignup && isBusiness && !product) {
      setError("Choose a Business product before registering the organization.");
      return;
    }

    if (isSignup) {
      const policy = validatePasswordPolicy(password);
      if (!policy.ok) {
        setError(policy.error);
        return;
      }
    }

    setLoading("password");

    try {
      if (isSignup) {
        const protection = await checkPasswordProtection(password);
        if (!protection.ok) {
          setError(protection.error);
          return;
        }

        const setup = setupDestination({ realm, mode, product, next: safeNext });
        const { data, error: signupError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: normalizedName,
              requested_account_realm: realm,
              requested_business_product: product,
            },
            emailRedirectTo: `${window.location.origin}${callbackDestination(setup)}`,
          },
        });

        if (signupError) {
          setError(normalizeAuthError(signupError.message, mode));
          return;
        }

        if (data.session && data.user) {
          await finishAuthenticated(data.user.id);
          return;
        }

        setCheckEmail(true);
        return;
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError || !data.user) {
        setError(normalizeAuthError(loginError?.message, mode));
        return;
      }

      await finishAuthenticated(data.user.id);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "unknown";
      setError(
        code === "membership_unavailable"
          ? "Business access could not be verified right now. Try again."
          : "Account setup could not be completed. Check your connection and try again.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    if (isBusy || !GOOGLE_ENABLED || isBusiness) return;
    setError("");
    setLoading("google");

    const destination = isSignup
      ? setupDestination({ realm, mode, product, next: safeNext })
      : safeNext;

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${callbackDestination(destination)}`,
          queryParams: { prompt: "select_account" },
        },
      });

      if (oauthError) {
        setError("Google sign-in could not be completed. Use email and password instead.");
        setLoading(null);
      }
    } catch {
      setError("Google sign-in could not be completed. Use email and password instead.");
      setLoading(null);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell
        eyebrow={`${isBusiness ? productLabel : "Individual"} registration`}
        title="Check your email"
        description="Use the time-limited confirmation link to finish secure account setup."
        icon={isBusiness ? Building2 : ShieldCheck}
        minimal
      >
        <div className="space-y-4">
          <AuthFeedback tone="info">
            If the address can be registered, a confirmation email will arrive shortly. Check the
            inbox and spam folder.
          </AuthFeedback>
          <Link
            href={isBusiness ? "/business/login" : "/individual/login"}
            className="finance-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
          >
            Return to sign in <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  const title = isSignup
    ? isBusiness
      ? `Register ${productLabel}`
      : "Create your Individual account"
    : isBusiness
      ? "Business sign in"
      : "Individual sign in";

  const description = isSignup
    ? isBusiness
      ? "This identity becomes Organization Owner. Staff are invited from inside the organization."
      : "Create a private personal-finance account."
    : isBusiness
      ? "Use an account already connected to a Business organization or accepted invitation."
      : "Continue to your personal finance workspace.";

  return (
    <AuthShell
      eyebrow={`${isBusiness ? "Business" : "Individual"} ${isSignup ? "registration" : "access"}`}
      progress={isBusiness ? "Organization controlled" : "Personal account"}
      title={title}
      description={description}
      icon={isBusiness ? Building2 : ShieldCheck}
      minimal
    >
      <form onSubmit={handlePasswordSubmit} noValidate className="space-y-2" aria-busy={isBusy}>
        {isSignup ? (
          <AuthField
            id={`${realm}-full-name`}
            name="full_name"
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            placeholder="Enter your full name"
            disabled={isBusy}
            icon={<UserRound className="size-4" />}
          />
        ) : null}

        <AuthField
          id={`${realm}-email`}
          name="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="name@example.com"
          disabled={isBusy}
          icon={<Mail className="size-4" />}
        />

        <AuthPasswordField
          id={`${realm}-password`}
          name="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder={isSignup ? "Create a password" : "Enter your password"}
          disabled={isBusy}
          helper={
            isSignup
              ? `Use at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number or symbol.`
              : undefined
          }
          icon={<LockKeyhole className="size-4" />}
        />

        {isSignup ? (
          <AuthPasswordRequirements password={password} minimumLength={PASSWORD_MIN_LENGTH} />
        ) : null}

        {error ? <AuthFeedback tone="danger">{error}</AuthFeedback> : null}

        <AuthSubmitAction
          type="submit"
          loading={loading === "password"}
          loadingLabel={isSignup ? "Creating account..." : "Signing in..."}
          disabled={isBusy}
        >
          {isSignup ? "Create account" : "Sign in"} <ArrowRight className="size-4" />
        </AuthSubmitAction>

        {!isSignup ? (
          <Link
            href={`/login?mode=forgot&next=${encodeURIComponent(safeNext)}`}
            className="finance-focus block py-2 text-center text-sm font-bold text-primary"
          >
            Forgot password?
          </Link>
        ) : null}

        {!isBusiness && GOOGLE_ENABLED ? (
          <AuthProviderButton
            icon={<GoogleLogo />}
            loading={loading === "google"}
            loadingLabel="Connecting to Google..."
            disabled={isBusy}
            onClick={() => void handleGoogle()}
          >
            Continue with Google
          </AuthProviderButton>
        ) : null}
      </form>

      <div className="mt-5 border-t border-border pt-4 text-center text-sm text-text-secondary">
        {isBusiness ? (
          isSignup ? (
            <>
              Already connected to an organization?{" "}
              <Link href="/business/login" className="finance-focus font-black text-primary">
                Business sign in
              </Link>
            </>
          ) : (
            <>
              Need to create an organization?{" "}
              <Link href="/business/register" className="finance-focus font-black text-primary">
                Choose a Business product
              </Link>
            </>
          )
        ) : isSignup ? (
          <>
            Already have an Individual account?{" "}
            <Link href="/individual/login" className="finance-focus font-black text-primary">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New Individual user?{" "}
            <Link href="/individual/signup" className="finance-focus font-black text-primary">
              Create account
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
