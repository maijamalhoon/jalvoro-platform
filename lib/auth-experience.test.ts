import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginSource = readFileSync(
  new URL("../app/login/page.tsx", import.meta.url),
  "utf8",
);
const onboardingSource = readFileSync(
  new URL("../app/onboarding/page.tsx", import.meta.url),
  "utf8",
);
const resetPasswordSource = readFileSync(
  new URL("../app/reset-password/page.tsx", import.meta.url),
  "utf8",
);
const authShellSource = readFileSync(
  new URL("../components/auth/AuthShell.tsx", import.meta.url),
  "utf8",
);
const authControlsSource = readFileSync(
  new URL("../components/auth/AuthControls.tsx", import.meta.url),
  "utf8",
);
const productRealmAuthSource = readFileSync(
  new URL("../components/auth/ProductRealmAuth.tsx", import.meta.url),
  "utf8",
);
const globalsCssSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

const authRouteSources = [loginSource, onboardingSource, resetPasswordSource];

function getObjectCall(source: string, callStart: string) {
  const start = source.indexOf(callStart);
  if (start === -1) throw new Error(`Missing call: ${callStart}`);
  const end = source.indexOf("});", start);
  if (end === -1) throw new Error(`Unclosed call: ${callStart}`);
  return source.slice(start, end + 3);
}

describe("Node 8 authentication experience contracts", () => {
  it("retains every existing login and account-recovery auth method", () => {
    expect(loginSource).toContain("supabase.auth.signInWithPassword({");
    expect(loginSource).toContain("supabase.auth.signUp({");
    expect(loginSource).toContain("supabase.auth.signInWithOAuth({");
    expect(loginSource).toContain("supabase.auth.resetPasswordForEmail(");
    for (const step of [
      '"entry"',
      '"password"',
      '"signup-details"',
      '"forgot"',
      '"check-email"',
    ]) {
      expect(loginSource).toContain(step);
    }
  });

  it("keeps credentials out of the URL before client hydration", () => {
    expect(loginSource.match(/method="post"/g) ?? []).toHaveLength(4);
    expect(loginSource.match(/action="\/login"/g) ?? []).toHaveLength(4);
  });

  it("uses an email-first state machine and clears sensitive values on account changes", () => {
    expect(loginSource).toContain('const [step, setStep] = useState<Step>("entry")');
    expect(loginSource).toContain('setStep(authMode === "signup" ? "signup-details" : "password")');
    expect(loginSource).toContain('setPassword("")');
    expect(loginSource).toContain('autoComplete="username"');
    expect(loginSource).toContain("Use another account");
    expect(loginSource).toContain("Change email");
  });

  it("keeps safe redirect sanitization in login and onboarding", () => {
    expect(loginSource).toContain("sanitizeInternalRedirect(params.get(\"next\"))");
    expect(loginSource).toContain("router.replace(safeNext)");
    expect(onboardingSource).toContain("sanitizeInternalRedirect(");
    expect(onboardingSource).toContain("router.replace(destination)");
    expect(onboardingSource).toContain("router.replace(safeNext)");
  });

  it("routes signup through callback and onboarding with full_name metadata", () => {
    const signupCall = getObjectCall(loginSource, "supabase.auth.signUp({");
    expect(loginSource).toContain("function onboardingDestination(next: string)");
    expect(signupCall).toContain("full_name: fullName.trim()");
    expect(signupCall).toContain("/auth/callback?next=");
    expect(signupCall).toContain("onboardingDestination(safeNext)");
    expect(loginSource).toContain("router.replace(onboardingDestination(safeNext))");
    expect(loginSource).toContain("checkPasswordProtection(password)");
    expect(resetPasswordSource).toContain("checkPasswordProtection(password)");
  });

  it("retains Google OAuth redirect protection and provider parameters", () => {
    const oauthCall = getObjectCall(loginSource, "supabase.auth.signInWithOAuth({");
    expect(oauthCall).toContain("provider,");
    expect(oauthCall).toContain("/auth/callback?next=");
    expect(oauthCall).toContain("onboardingDestination(safeNext)");
    expect(oauthCall).toContain('queryParams: { prompt: "select_account" }');
    expect(loginSource).toContain("NEXT_PUBLIC_ENABLE_GOOGLE_AUTH");
    expect(loginSource).not.toContain('access_type: "offline"');
  });

  it("keeps forgot-password recovery pointed at /reset-password", () => {
    const resetCall = loginSource.slice(
      loginSource.indexOf("supabase.auth.resetPasswordForEmail("),
      loginSource.indexOf("if (resetError)", loginSource.indexOf("supabase.auth.resetPasswordForEmail(")),
    );
    expect(resetCall).toContain("redirectTo: `${window.location.origin}/reset-password`");
  });

  it("supports privacy-safe confirmation resend and recovery retry states", () => {
    expect(loginSource).toContain("supabase.auth.resend({");
    expect(loginSource).toContain('type: "signup"');
    expect(loginSource).toContain("resendCooldownSeconds");
    expect(loginSource).toContain("maskEmail(submittedEmail)");
    expect(loginSource).toContain("If this address supports password sign-in");
    expect(loginSource).toContain("navigator.onLine");
  });

  it("does not expose deferred authentication methods in the current UI", () => {
    expect(loginSource).not.toMatch(/Continue with (Apple|Microsoft)/);
    expect(loginSource).not.toMatch(/phone number|WhatsApp|SMS sign-in/i);
    expect(loginSource).not.toMatch(/passkey|single sign-on|MFA/i);
  });

  it("keeps onboarding user verification, workspace choice, and completion checks", () => {
    expect(onboardingSource).toContain("await supabase.auth.getUser()");
    expect(onboardingSource).toContain('.from("profiles")');
    expect(onboardingSource).toContain('.select("full_name, age, onboarding_completed")');
    expect(onboardingSource).toContain('.eq("id", user.id)');
    expect(onboardingSource).toContain("if (profile?.onboarding_completed)");
    expect(onboardingSource).toContain("numericAge < 10 || numericAge > 120");
    expect(onboardingSource).toContain("async function handleProfileSubmit");
    expect(onboardingSource).toContain("onboarding_completed: businessFlow");
    expect(onboardingSource).toContain("async function completeOnboarding");
    expect(onboardingSource).toContain("onboarding_completed: true");
    expect(onboardingSource).toContain('.from("business_workspace_preferences")');
    expect(onboardingSource).toContain('.from("accounts").insert({');
    expect(onboardingSource).toContain("if (profileResult.error || preferenceResult.error)");
    expect(onboardingSource.indexOf("if (profileResult.error || preferenceResult.error)")).toBeLessThan(
      onboardingSource.indexOf("router.replace(safeNext)"),
    );
  });

  it("retains the secure recovery machinery and complete presentation state set", () => {
    for (const helper of [
      "classifyAuthFailure",
      "classifyRecoveryLinkError",
      "createRecoveryMarker",
      "getOrCreateKeyedRecoveryAttempt",
      "getRecoveryRetryOperation",
      "isConfirmedRecoveryAuthEvent",
      "parseValidRecoveryMarker",
      "shouldClearRecoveryMarkerAfterPasswordUpdate",
      "exchangeCodeForSession",
      "hashRecoverySession",
      "removeRecoveryParameters",
    ]) {
      expect(resetPasswordSource, helper).toContain(helper);
    }

    expect(resetPasswordSource.match(/\.exchangeCodeForSession\(/g) ?? []).toHaveLength(1);
    expect(resetPasswordSource).toContain('const RECOVERY_MARKER = "jamals-finance:password-recovery"');
    expect(resetPasswordSource).toContain('router.replace("/dashboard")');
    expect(resetPasswordSource).toContain('router.replace("/login?mode=forgot")');

    for (const state of [
      "checking",
      "ready",
      "invalid",
      "temporarily_unavailable",
      "updating",
      "success",
    ]) {
      expect(resetPasswordSource, state).toContain(`"${state}"`);
    }
  });

  it("keeps labels, stable names, autocomplete, and accessible error wiring", () => {
    expect(authControlsSource).toContain("<label htmlFor={id}");
    expect(authControlsSource).toContain("id={id}");
    expect(authControlsSource).toContain("name={name}");
    expect(authControlsSource).toContain("aria-invalid={error ? true : undefined}");
    expect(authControlsSource).toContain("aria-describedby={describedBy}");
    expect(authControlsSource).toContain('aria-live="polite"');
    expect(authControlsSource).toContain("inputRef?: RefObject<HTMLInputElement | null>");
    expect(authControlsSource).toContain("Show ${props.label.toLowerCase()}");
    expect(authControlsSource).toContain("Hide ${props.label.toLowerCase()}");
    expect(authControlsSource).toContain('getModifierState("CapsLock")');
    expect(authControlsSource).toContain("AuthPasswordRequirements");

    for (const source of authRouteSources) {
      expect(source).toContain("name=");
      expect(source).toContain("autoComplete=");
    }
    expect(loginSource).toContain('inputMode="email"');
    expect(onboardingSource).toContain('inputMode="numeric"');
    expect(loginSource).toContain('autoComplete="current-password"');
    expect(loginSource).toContain('autoComplete="new-password"');
    expect(resetPasswordSource.match(/autoComplete="new-password"/g) ?? []).toHaveLength(2);
  });

  it("uses independent recovery password controls and field-specific focus", () => {
    expect(resetPasswordSource.match(/<AuthPasswordField/g) ?? []).toHaveLength(2);
    expect(resetPasswordSource).toContain("passwordInputRef.current?.focus()");
    expect(resetPasswordSource).toContain("confirmInputRef.current?.focus()");
    expect(resetPasswordSource).toContain("validatePasswordPolicy(password)");
    expect(resetPasswordSource).toContain("passwordPolicy.error");
    expect(resetPasswordSource).toContain('setFieldErrors({ confirm: "The passwords do not match." })');
  });

  it("prevents duplicate actions and catches rejected client auth promises", () => {
    expect(loginSource).toContain("const actionInFlight = useRef(false)");
    expect(loginSource.match(/catch \{/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(onboardingSource).toContain("const saveInFlight = useRef(false)");
    expect(onboardingSource.match(/catch \{/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(resetPasswordSource).toContain('if (recoveryState !== "ready") return');
    expect(productRealmAuthSource).toContain(
      "const passwordSubmitInFlight = useRef(false)",
    );
    expect(productRealmAuthSource).toContain(
      "if (passwordSubmitInFlight.current || isBusy) return",
    );
    expect(productRealmAuthSource).toContain(
      "passwordSubmitInFlight.current = false",
    );
  });

  it("uses AuthShell for all three routes without adding a theme control", () => {
    for (const source of authRouteSources) {
      expect(source).toContain('import AuthShell from "@/components/auth/AuthShell"');
      expect(source).toContain("<AuthShell");
      expect(source).not.toMatch(/ThemeSelector|theme selector|jamal-theme|setTheme/i);
    }
    expect(authShellSource).toContain('import { APP_NAME, brand } from "@/lib/brand"');
    expect(authShellSource).toContain("<span>{APP_NAME}</span>");
    expect(authShellSource).toContain("src={brand.assets.logoMark}");
    expect(authShellSource).not.toContain("Jamal&apos;s Finance");
    expect(authShellSource).toContain("data-auth-root");
    expect(loginSource).toContain("minimal");
    expect(resetPasswordSource).toContain("minimal");
  });

  it("keeps auth styling semantic, scoped, and autofill-safe", () => {
    expect(globalsCssSource).toContain(".jf-auth-root {");
    expect(globalsCssSource).toContain(".jf-auth-root .auth-input:-webkit-autofill");
    expect(globalsCssSource).toContain("-webkit-text-fill-color: var(--text-primary) !important;");
    expect(globalsCssSource).toContain("var(--surface-inset)");
    expect(globalsCssSource).toContain('.jf-auth-root[data-auth-minimal]');
    expect(globalsCssSource).toContain(".auth-password-requirements");
    expect(globalsCssSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalsCssSource).not.toContain(".chat-auth-");
    expect(globalsCssSource).not.toContain(".jf-login-polish");
  });

  it("does not log credentials, tokens, or private recovery parameters", () => {
    const combinedSource = authRouteSources.join("\n");
    expect(combinedSource).not.toMatch(/console\.(log|debug|info|warn|error)\s*\(/);
    expect(combinedSource).not.toMatch(/console[^\n]*(password|token|code|hash|metadata)/i);
  });
});
