"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
} from "lucide-react";

import styles from "@/components/control-plane/control-plane.module.css";
import { checkPasswordProtection } from "@/lib/auth/password-protection";
import {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";
import { createControlPlaneBrowserClient } from "@/lib/control-plane/client";
import {
  CONTROL_PLANE_LOGIN_PATH,
  sanitizeControlDestination,
} from "@/lib/control-plane/config";
import {
  classifyAuthFailure,
  classifyRecoveryLinkError,
  createRecoveryMarker,
  getOrCreateKeyedRecoveryAttempt,
  getPasswordUpdateExceptionMessage,
  isConfirmedRecoveryAuthEvent,
  normalizeRecoveryCode,
  parseValidRecoveryMarker,
} from "@/lib/supabase/session";

type LoginMode =
  | "checking"
  | "credentials"
  | "enroll-intro"
  | "enroll"
  | "challenge"
  | "denied"
  | "recovery-checking"
  | "recovery"
  | "recovery-invalid"
  | "recovery-unavailable"
  | "recovery-success";

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status?: string | null;
};

type RecoveryExchangeOutcome =
  | "confirmed"
  | "invalid"
  | "non-recovery"
  | "temporarily-unavailable";

type RecoverySignal = {
  resolve: () => void;
  wait: (timeoutMs: number) => Promise<boolean>;
};

const reasonMessages = {
  authentication_required: "Authenticate with the dedicated Control Plane account.",
  mfa_required: "Complete authenticator verification before continuing.",
  access_denied: "Control Plane access could not be verified.",
} as const;

const CONTROL_PLANE_RECOVERY_MARKER =
  "jalvoro:control-plane-password-recovery";
const RECOVERY_EVENT_WAIT_MS = 2_000;
const recoveryExchangeAttempts = new Map<
  string,
  Promise<RecoveryExchangeOutcome>
>();
const recoverySignals = new Map<string, RecoverySignal>();

function genericError() {
  return "Credentials or verification could not be accepted. Check the details and try again.";
}

function createRecoverySignal(): RecoverySignal {
  let confirmed = false;
  let resolveConfirmation: (() => void) | null = null;
  const confirmation = new Promise<void>((resolve) => {
    resolveConfirmation = resolve;
  });

  return {
    resolve() {
      if (confirmed) return;
      confirmed = true;
      resolveConfirmation?.();
    },
    wait(timeoutMs) {
      if (confirmed) return Promise.resolve(true);

      return new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => resolve(false), timeoutMs);
        void confirmation.then(() => {
          window.clearTimeout(timeout);
          resolve(true);
        });
      });
    },
  };
}

function getOrCreateRecoverySignal(key: string) {
  const existing = recoverySignals.get(key);
  if (existing) return existing;

  const signal = createRecoverySignal();
  recoverySignals.set(key, signal);
  return signal;
}

function releaseRecoverySignal(key: string, signal: RecoverySignal) {
  if (recoverySignals.get(key) === signal) recoverySignals.delete(key);
}

function clearRecoveryMarker() {
  try {
    window.sessionStorage.removeItem(CONTROL_PLANE_RECOVERY_MARKER);
  } catch {
    // Blocked browser storage leaves recovery closed without exposing details.
  }
}

function readRecoveryMarker() {
  try {
    return window.sessionStorage.getItem(CONTROL_PLANE_RECOVERY_MARKER);
  } catch {
    return null;
  }
}

function removeRecoveryParameters() {
  const url = new URL(window.location.href);
  for (const key of [
    "code",
    "error",
    "error_code",
    "error_description",
  ]) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}`,
  );
}

function hasSensitiveRecoveryHash(hash: URLSearchParams) {
  return [
    "access_token",
    "refresh_token",
    "expires_at",
    "expires_in",
    "token_type",
    "type",
  ].some((key) => hash.has(key));
}

async function hashRecoverySession(sessionId: string) {
  const bytes = new TextEncoder().encode(sessionId);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default function ControlPlaneLogin() {
  const router = useRouter();
  const supabase = useMemo(() => createControlPlaneBrowserClient(), []);
  const [mode, setMode] = useState<LoginMode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [next, setNext] = useState("/control");
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);

  async function denyAccess() {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    setPassword("");
    setCode("");
    setMode("denied");
    setError("This identity is not authorized for the JALVORO Control Plane.");
  }

  async function completeAccess(destination = next) {
    const { data, error: accessError } = await supabase.rpc(
      "get_my_control_plane_access",
    );

    if (accessError || !data) {
      await denyAccess();
      return;
    }

    router.replace(sanitizeControlDestination(destination));
    router.refresh();
  }

  async function resolveAssurance(destination = next) {
    setError("");
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || !assurance.data) {
      await denyAccess();
      return;
    }

    if (assurance.data.currentLevel === "aal2") {
      await completeAccess(destination);
      return;
    }

    const factorResult = await supabase.auth.mfa.listFactors();
    if (factorResult.error) {
      await denyAccess();
      return;
    }

    const verified = factorResult.data.totp.filter(
      (factor) => factor.status === "verified",
    );
    if (verified.length) {
      setFactors(verified);
      setSelectedFactorId(verified[0]?.id ?? "");
      setMode("challenge");
      return;
    }

    setMode("enroll-intro");
  }

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams(window.location.search);
    const destination = sanitizeControlDestination(params.get("next"));
    const reason = params.get("reason") as keyof typeof reasonMessages | null;
    setNext(destination);
    if (reason && reasonMessages[reason]) setNotice(reasonMessages[reason]);

    if (params.get("mode") === "recovery") {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const rawCode = params.get("code");
      const recoveryCode = normalizeRecoveryCode(rawCode);
      const malformedCode = rawCode !== null && recoveryCode === null;
      const initialSignal = recoveryCode
        ? getOrCreateRecoverySignal(recoveryCode)
        : null;

      setMode("recovery-checking");
      setError("");
      setNotice("");

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (!isConfirmedRecoveryAuthEvent(event) || !recoveryCode) return;
        getOrCreateRecoverySignal(recoveryCode).resolve();
      });

      function startRecoveryExchange(recoveryCodeToExchange: string) {
        const signal = getOrCreateRecoverySignal(recoveryCodeToExchange);
        const attempt = getOrCreateKeyedRecoveryAttempt(
          recoveryExchangeAttempts,
          recoveryCodeToExchange,
          async (): Promise<RecoveryExchangeOutcome> => {
            try {
              const { error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(
                  recoveryCodeToExchange,
                );

              if (exchangeError) {
                return classifyAuthFailure(exchangeError, true) ===
                  "transient_failure"
                  ? "temporarily-unavailable"
                  : "invalid";
              }

              return (await signal.wait(RECOVERY_EVENT_WAIT_MS))
                ? "confirmed"
                : "non-recovery";
            } catch (exchangeError) {
              return classifyAuthFailure(exchangeError, true) ===
                "transient_failure"
                ? "temporarily-unavailable"
                : "invalid";
            }
          },
        );

        const release = () =>
          releaseRecoverySignal(recoveryCodeToExchange, signal);
        void attempt.then(release, release);
        return attempt;
      }

      async function bindRecoverySession() {
        try {
          const claimsResult = await supabase.auth.getClaims();
          const sessionId = claimsResult.data?.claims?.session_id;
          if (
            claimsResult.error ||
            typeof sessionId !== "string" ||
            !sessionId
          ) {
            return "invalid" as const;
          }

          const sessionHash = await hashRecoverySession(sessionId);
          window.sessionStorage.setItem(
            CONTROL_PLANE_RECOVERY_MARKER,
            JSON.stringify(createRecoveryMarker(sessionHash)),
          );
          return "ready" as const;
        } catch {
          return "temporarily-unavailable" as const;
        }
      }

      async function verifyStoredRecoverySession() {
        const marker = readRecoveryMarker();
        if (!marker) return "invalid" as const;

        try {
          const claimsResult = await supabase.auth.getClaims();
          const sessionId = claimsResult.data?.claims?.session_id;
          if (
            claimsResult.error ||
            typeof sessionId !== "string" ||
            !sessionId
          ) {
            return classifyAuthFailure(claimsResult.error, true) ===
              "transient_failure"
              ? ("temporarily-unavailable" as const)
              : ("invalid" as const);
          }

          const sessionHash = await hashRecoverySession(sessionId);
          return parseValidRecoveryMarker(marker, sessionHash)
            ? ("ready" as const)
            : ("invalid" as const);
        } catch {
          return "temporarily-unavailable" as const;
        }
      }

      void (async () => {
        const linkFailure = classifyRecoveryLinkError({
          error: params.get("error") ?? hash.get("error"),
          errorCode: params.get("error_code") ?? hash.get("error_code"),
          errorDescription:
            params.get("error_description") ??
            hash.get("error_description"),
        });

        if (
          linkFailure ||
          malformedCode ||
          hasSensitiveRecoveryHash(hash)
        ) {
          removeRecoveryParameters();
          clearRecoveryMarker();
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          if (active) {
            setMode(
              linkFailure === "temporarily_unavailable"
                ? "recovery-unavailable"
                : "recovery-invalid",
            );
          }
          return;
        }

        let outcome:
          | RecoveryExchangeOutcome
          | "ready"
          | "temporarily-unavailable";

        if (recoveryCode) {
          try {
            outcome = await startRecoveryExchange(recoveryCode);
          } finally {
            removeRecoveryParameters();
          }

          if (outcome === "confirmed") {
            outcome = await bindRecoverySession();
          }
        } else {
          outcome = await verifyStoredRecoverySession();
        }

        if (!active) return;

        if (outcome === "ready") {
          setMode("recovery");
          return;
        }

        if (outcome === "temporarily-unavailable") {
          setMode("recovery-unavailable");
          return;
        }

        clearRecoveryMarker();
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        if (active) setMode("recovery-invalid");
      })();

      return () => {
        active = false;
        subscription.unsubscribe();
        if (
          recoveryCode &&
          initialSignal &&
          !recoveryExchangeAttempts.has(recoveryCode)
        ) {
          releaseRecoverySignal(recoveryCode, initialSignal);
        }
      };
    }

    void (async () => {
      const userResult = await supabase.auth.getUser();
      if (!active) return;
      if (userResult.error || !userResult.data.user) {
        setMode("credentials");
        return;
      }
      await resolveAssurance(destination);
    })();

    return () => {
      active = false;
    };
    // The Supabase client is stable for the lifetime of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || sendingRecovery) return;
    setBusy(true);
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Enter the Control Plane email and password.");
      setBusy(false);
      return;
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setPassword("");

    if (signIn.error) {
      setError(genericError());
      setBusy(false);
      return;
    }

    await resolveAssurance();
    setBusy(false);
  }

  async function requestPasswordRecovery() {
    if (busy || sendingRecovery) return;
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter the Control Plane email to request recovery.");
      return;
    }

    setSendingRecovery(true);

    try {
      const { error: recoveryError } =
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}${CONTROL_PLANE_LOGIN_PATH}?mode=recovery`,
        });

      if (recoveryError) {
        setError(
          "Recovery instructions could not be requested right now. Wait a moment and try again.",
        );
        return;
      }

      setPassword("");
      setNotice(
        "If this isolated Control Plane identity is eligible, recovery instructions have been sent.",
      );
    } catch {
      setError(
        "Recovery instructions could not be requested right now. Check the connection and try again.",
      );
    } finally {
      setSendingRecovery(false);
    }
  }

  async function updateRecoveredPassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (busy || mode !== "recovery") return;
    setError("");
    setNotice("");

    const policy = validatePasswordPolicy(recoveryPassword);
    if (!policy.ok) {
      setError(policy.error);
      return;
    }

    if (recoveryPassword !== recoveryConfirm) {
      setError("The new passwords do not match.");
      return;
    }

    setBusy(true);

    const passwordProtection = await checkPasswordProtection(recoveryPassword);
    if (!passwordProtection.ok) {
      setError(passwordProtection.error);
      setBusy(false);
      return;
    }

    try {
      const updateResult = await supabase.auth.updateUser({
        password: recoveryPassword,
      });

      if (updateResult.error) {
        setError(genericError());
        return;
      }

      clearRecoveryMarker();
      setRecoveryPassword("");
      setRecoveryConfirm("");
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setMode("recovery-success");
    } catch (updateError) {
      setError(getPasswordUpdateExceptionMessage(updateError));
    } finally {
      setBusy(false);
    }
  }

  async function startEnrollment() {
    if (busy) return;
    setBusy(true);
    setError("");

    const existing = await supabase.auth.mfa.listFactors();
    if (existing.error) {
      setError(genericError());
      setBusy(false);
      return;
    }

    for (const factor of existing.data.totp) {
      if (factor.status !== "verified") {
        const removal = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removal.error) {
          setError("An unfinished authenticator setup could not be replaced.");
          setBusy(false);
          return;
        }
      }
    }

    const result = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "JALVORO Control Plane",
    });

    if (result.error) {
      setError(genericError());
      setBusy(false);
      return;
    }

    setEnrollment({
      factorId: result.data.id,
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
    });
    setCode("");
    setMode("enroll");
    setBusy(false);
  }

  async function verifyFactor(
    event: FormEvent<HTMLFormElement>,
    factorId: string,
  ) {
    event.preventDefault();
    if (busy) return;
    const normalizedCode = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setBusy(true);
    setError("");

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(genericError());
      setBusy(false);
      return;
    }

    const verification = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: normalizedCode,
    });

    if (verification.error) {
      setCode("");
      setError("The authenticator code was not accepted. Use the latest code.");
      setBusy(false);
      return;
    }

    setCode("");
    await completeAccess();
    setBusy(false);
  }

  async function resetToCredentials() {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    clearRecoveryMarker();
    setEnrollment(null);
    setFactors([]);
    setSelectedFactorId("");
    setCode("");
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setError("");
    setNotice("");
    setMode("credentials");
    router.replace(CONTROL_PLANE_LOGIN_PATH);
  }

  const isRecoveryMode =
    mode === "recovery-checking" ||
    mode === "recovery" ||
    mode === "recovery-invalid" ||
    mode === "recovery-unavailable" ||
    mode === "recovery-success";

  return (
    <main className={`${styles.root} ${styles.loginRoot}`}>
      <div className={styles.loginGrid}>
        <section className={styles.brandPanel} aria-labelledby="control-plane-title">
          <div className={styles.brandLockup}>
            <span className={styles.brandMark} aria-hidden="true">
              <ShieldCheck size={25} />
            </span>
            <span>JALVORO</span>
          </div>

          <div>
            <p className={styles.eyebrow}>Private control plane</p>
            <h1 className={styles.heroTitle} id="control-plane-title">
              Root authority. Zero shortcuts.
            </h1>
            <p className={styles.heroCopy}>
              A separate identity realm protects JALVORO&apos;s global Command Center.
              Normal customer sessions cannot unlock administrative operations.
            </p>
          </div>

          <div className={styles.trustList} aria-label="Security boundaries">
            <div className={styles.trustItem}>
              <LockKeyhole className={styles.trustIcon} size={19} />
              <span>Dedicated email and password, isolated from normal JALVORO Auth.</span>
            </div>
            <div className={styles.trustItem}>
              <Smartphone className={styles.trustIcon} size={19} />
              <span>Authenticator verification is mandatory before every control session.</span>
            </div>
            <div className={styles.trustItem}>
              <UserRoundCheck className={styles.trustIcon} size={19} />
              <span>Only active operators recorded in the private control registry pass.</span>
            </div>
            <div className={styles.trustItem}>
              <CheckCircle2 className={styles.trustIcon} size={19} />
              <span>Admin routes require both Control Plane authority and app authorization.</span>
            </div>
          </div>
        </section>

        <section className={styles.authPanel} aria-live="polite">
          <div className={styles.authHeader}>
            <p className={styles.eyebrow}>Restricted access</p>
            <h2 className={styles.authTitle}>
              {mode === "recovery-success"
                ? "Password updated"
                : isRecoveryMode
                  ? "Recover Control Plane access"
                  : mode === "challenge"
                    ? "Verify authenticator"
                    : mode === "enroll" || mode === "enroll-intro"
                      ? "Secure the Root Owner"
                      : mode === "denied"
                        ? "Access unavailable"
                        : "Control Plane sign in"}
            </h2>
            <p className={styles.authCopy}>
              {mode === "recovery-success"
                ? "Sign in again with the new password, then complete authenticator verification."
                : mode === "recovery"
                  ? "Choose a new password for this isolated identity. The existing authenticator remains required."
                  : isRecoveryMode
                    ? "Recovery must be confirmed by the one-time link sent to the dedicated Control Plane email."
                    : mode === "challenge"
                      ? "Enter a current code from the enrolled authenticator."
                      : mode === "enroll" || mode === "enroll-intro"
                        ? "MFA enrollment is required before the Command Center can open."
                        : "Use the dedicated Control Plane credentials created in the isolated project."}
            </p>
          </div>

          {notice ? <div className={styles.notice}>{notice}</div> : null}
          {error ? <div className={styles.alert} role="alert">{error}</div> : null}

          {mode === "checking" || mode === "recovery-checking" ? (
            <p className={styles.statusText}>Checking the isolated security session…</p>
          ) : null}

          {mode === "credentials" ? (
            <form className={styles.form} onSubmit={handleLogin}>
              <label className={styles.field}>
                <span className={styles.label}>Control Plane email</span>
                <input
                  className={styles.input}
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@example.com"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Control Plane password</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button
                className={styles.button}
                type="submit"
                disabled={busy || sendingRecovery}
              >
                <KeyRound size={17} />
                {busy ? "Verifying…" : "Continue securely"}
                {!busy ? <ArrowRight size={17} /> : null}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={requestPasswordRecovery}
                disabled={busy || sendingRecovery}
              >
                {sendingRecovery
                  ? "Requesting recovery…"
                  : "Recover Control Plane password"}
              </button>
            </form>
          ) : null}

          {mode === "recovery" ? (
            <form className={styles.form} onSubmit={updateRecoveredPassword}>
              <label className={styles.field}>
                <span className={styles.label}>New Control Plane password</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={recoveryPassword}
                  onChange={(event) => setRecoveryPassword(event.target.value)}
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                  autoFocus
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Confirm new password</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={recoveryConfirm}
                  onChange={(event) => setRecoveryConfirm(event.target.value)}
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                />
              </label>
              <p className={styles.helpText}>
                Use at least {PASSWORD_MIN_LENGTH} characters with a letter and
                a number or symbol. Known breached passwords are rejected.
              </p>
              <button className={styles.button} type="submit" disabled={busy}>
                <LockKeyhole size={18} />
                {busy ? "Updating…" : "Update isolated password"}
              </button>
            </form>
          ) : null}

          {mode === "recovery-invalid" ? (
            <div className={styles.form}>
              <div className={styles.alert} role="alert">
                This recovery link is invalid, expired, already used, or does
                not belong to a password-recovery session.
              </div>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={resetToCredentials}
              >
                Request a new recovery link
              </button>
            </div>
          ) : null}

          {mode === "recovery-unavailable" ? (
            <div className={styles.form}>
              <div className={styles.notice}>
                Recovery verification is temporarily unavailable. The link has
                not been treated as valid or invalid.
              </div>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => window.location.reload()}
              >
                Try verification again
              </button>
            </div>
          ) : null}

          {mode === "recovery-success" ? (
            <div className={styles.form}>
              <div className={styles.notice}>
                The isolated password was updated. Authenticator verification
                is still mandatory for the next Control Plane session.
              </div>
              <button
                className={styles.button}
                type="button"
                onClick={resetToCredentials}
              >
                <KeyRound size={17} />
                Return to secure sign in
              </button>
            </div>
          ) : null}

          {mode === "enroll-intro" ? (
            <div className={styles.mfaSetup}>
              <div className={styles.notice}>
                No verified authenticator exists. The Control Plane remains locked until one is enrolled.
              </div>
              <button className={styles.button} type="button" onClick={startEnrollment} disabled={busy}>
                <Smartphone size={18} />
                {busy ? "Preparing…" : "Set up authenticator"}
              </button>
              <button className={styles.secondaryButton} type="button" onClick={resetToCredentials} disabled={busy}>
                Use a different account
              </button>
            </div>
          ) : null}

          {mode === "enroll" && enrollment ? (
            <form className={`${styles.form} ${styles.mfaSetup}`} onSubmit={(event) => verifyFactor(event, enrollment.factorId)}>
              <div className={styles.qrShell}>
                <Image
                  src={enrollment.qrCode}
                  alt="QR code for JALVORO Control Plane authenticator enrollment"
                  width={220}
                  height={220}
                  unoptimized
                  priority
                />
              </div>
              <p className={styles.helpText}>
                Scan the QR code with an authenticator app. Store a second verified factor later for recovery; Supabase does not provide recovery codes.
              </p>
              <div>
                <span className={styles.label}>Manual setup secret</span>
                <div className={styles.secretBox}>{enrollment.secret}</div>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>6-digit authenticator code</span>
                <input
                  className={`${styles.input} ${styles.codeInput}`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </label>
              <button className={styles.button} type="submit" disabled={busy}>
                <ShieldCheck size={18} />
                {busy ? "Enabling…" : "Enable and unlock"}
              </button>
            </form>
          ) : null}

          {mode === "challenge" ? (
            <form className={styles.form} onSubmit={(event) => verifyFactor(event, selectedFactorId)}>
              {factors.length > 1 ? (
                <label className={styles.field}>
                  <span className={styles.label}>Authenticator</span>
                  <select
                    className={styles.select}
                    value={selectedFactorId}
                    onChange={(event) => setSelectedFactorId(event.target.value)}
                  >
                    {factors.map((factor, index) => (
                      <option key={factor.id} value={factor.id}>
                        {factor.friendly_name || `Authenticator ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className={styles.field}>
                <span className={styles.label}>6-digit authenticator code</span>
                <input
                  className={`${styles.input} ${styles.codeInput}`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                />
              </label>
              <button className={styles.button} type="submit" disabled={busy || !selectedFactorId}>
                <ShieldCheck size={18} />
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
              <button className={styles.secondaryButton} type="button" onClick={resetToCredentials} disabled={busy}>
                Sign out of this security session
              </button>
            </form>
          ) : null}

          {mode === "denied" ? (
            <div className={styles.form}>
              <button className={styles.secondaryButton} type="button" onClick={resetToCredentials}>
                Return to secure sign in
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
