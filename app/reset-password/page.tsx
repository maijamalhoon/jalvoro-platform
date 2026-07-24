"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  AuthFeedback,
  AuthPasswordField,
  AuthSubmitAction,
} from "@/components/auth/AuthControls";
import AuthShell from "@/components/auth/AuthShell";
import { AuthFormSkeleton } from "@/components/loading/LoadingPrimitives";
import { Button } from "@/components/ui/button";
import { checkPasswordProtection } from "@/lib/auth/password-protection";
import {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/client";
import {
  classifyAuthFailure,
  classifyRecoveryLinkError,
  classifyUserLookupFailure,
  createRecoveryMarker,
  getOrCreateKeyedRecoveryAttempt,
  getPasswordUpdateExceptionMessage,
  getRecoveryRetryOperation,
  isConfirmedRecoveryAuthEvent,
  parseValidRecoveryMarker,
  shouldClearRecoveryMarkerAfterPasswordUpdate,
  type PasswordUpdateOutcome,
  type RecoveryRetryIntent,
} from "@/lib/supabase/session";

type RecoveryState =
  | "checking"
  | "ready"
  | "invalid"
  | "temporarily_unavailable"
  | "updating"
  | "success";
type RecoveryField = "password" | "confirm";

type RecoveryOutcome = "ready" | "invalid" | "temporarily_unavailable";
type RecoveryExchangeOutcome =
  | "confirmed_recovery"
  | "non_recovery"
  | "invalid"
  | "temporarily_unavailable";
type UserLookupOutcome =
  | "authenticated"
  | "signed_out"
  | "temporarily_unavailable";
type RecoverySignal = {
  resolve: () => void;
  wait: (timeoutMs: number) => Promise<boolean>;
};
type MarkerRetryKind = "binding" | "verification";
type MarkerRetryOperation = () => Promise<RecoveryOutcome>;

const RECOVERY_MARKER = "jamals-finance:password-recovery";
const RECOVERY_EVENT_WAIT_MS = 2_000;
const recoveryExchangeAttempts = new Map<
  string,
  Promise<RecoveryExchangeOutcome>
>();
const recoverySignals = new Map<string, RecoverySignal>();

function removeRecoveryParameters() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function hashRecoverySession(sessionId: string) {
  const bytes = new TextEncoder().encode(sessionId);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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
    sessionStorage.removeItem(RECOVERY_MARKER);
    return true;
  } catch {
    return false;
  }
}

function readRecoveryMarker() {
  try {
    return { marker: sessionStorage.getItem(RECOVERY_MARKER), failed: false };
  } catch {
    return { marker: null, failed: true };
  }
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

async function createBoundRecoveryMarker(
  supabase: ReturnType<typeof createClient>,
): Promise<RecoveryOutcome> {
  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;

  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return "temporarily_unavailable";
  }

  const { data, error } = claimsResult;
  if (error) {
    return classifyAuthFailure(error, true) === "transient_failure"
      ? "temporarily_unavailable"
      : "invalid";
  }

  const sessionId = data?.claims?.session_id;
  if (typeof sessionId !== "string" || !sessionId) return "invalid";

  try {
    const sessionHash = await hashRecoverySession(sessionId);
    sessionStorage.setItem(
      RECOVERY_MARKER,
      JSON.stringify(createRecoveryMarker(sessionHash)),
    );
  } catch {
    return "temporarily_unavailable";
  }

  return "ready";
}

async function verifyBoundRecoveryMarker(
  supabase: ReturnType<typeof createClient>,
  rawMarker: string,
): Promise<RecoveryOutcome> {
  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;

  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return "temporarily_unavailable";
  }

  const { data, error } = claimsResult;
  if (error) {
    return classifyAuthFailure(error, true) === "transient_failure"
      ? "temporarily_unavailable"
      : "invalid";
  }

  const sessionId = data?.claims?.session_id;
  if (typeof sessionId !== "string" || !sessionId) return "invalid";

  try {
    const sessionHash = await hashRecoverySession(sessionId);
    return parseValidRecoveryMarker(rawMarker, sessionHash) ? "ready" : "invalid";
  } catch {
    return "temporarily_unavailable";
  }
}

async function getUserLookupOutcome(
  supabase: ReturnType<typeof createClient>,
): Promise<UserLookupOutcome> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return classifyUserLookupFailure(error);
    }

    return data.user ? "authenticated" : "signed_out";
  } catch (error) {
    return classifyUserLookupFailure(error);
  }
}

function getResetPasswordError(message?: string) {
  const lower = message?.toLowerCase() ?? "";

  if (lower.includes("expired") || lower.includes("invalid")) {
    return "Your reset link may be expired. Request a new password reset link and try again.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset attempts. Please wait a moment and try again.";
  }

  if (lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection failed. Check your internet and try again.";
  }

  return "We could not update your password. Please try again.";
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RecoveryField, string>>
  >({});
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const recoverySignalRef = useRef<RecoverySignal | null>(null);
  const recoveryEventConfirmedRef = useRef(false);
  const retryIntentRef = useRef<RecoveryRetryIntent>("none");
  const retryExchangeRef = useRef<
    (() => Promise<RecoveryExchangeOutcome>) | null
  >(null);
  const retryMarkerOperationRef = useRef<MarkerRetryOperation | null>(null);
  const retryMarkerKindRef = useRef<MarkerRetryKind | null>(null);
  const retryInFlight = useRef(false);

  const loading = recoveryState === "checking" || recoveryState === "updating";

  const clearRecoveryRetry = useCallback(() => {
    retryIntentRef.current = "none";
    retryExchangeRef.current = null;
    retryMarkerOperationRef.current = null;
    retryMarkerKindRef.current = null;
  }, []);

  const prepareMarkerRetry = useCallback(
    (kind: MarkerRetryKind, operation: MarkerRetryOperation) => {
      retryIntentRef.current = "retry_marker_binding";
      retryExchangeRef.current = null;
      retryMarkerOperationRef.current = operation;
      retryMarkerKindRef.current = kind;
    },
    [],
  );

  const applyMarkerOutcome = useCallback(
    (
      outcome: RecoveryOutcome,
      retryKind: MarkerRetryKind,
      retryOperation: MarkerRetryOperation,
    ) => {
      if (outcome === "ready") {
        clearRecoveryRetry();
        setRecoveryState("ready");
        return;
      }

      if (outcome === "temporarily_unavailable") {
        prepareMarkerRetry(retryKind, retryOperation);
        setRecoveryState("temporarily_unavailable");
        return;
      }

      clearRecoveryRetry();
      clearRecoveryMarker();
      setRecoveryState("invalid");
    },
    [clearRecoveryRetry, prepareMarkerRetry],
  );

  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const hasSensitiveHash = hasSensitiveRecoveryHash(hash);
    const initialSignal = code ? getOrCreateRecoverySignal(code) : null;

    recoverySignalRef.current = initialSignal;
    recoveryEventConfirmedRef.current = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!isConfirmedRecoveryAuthEvent(event)) return;
      recoveryEventConfirmedRef.current = true;
      recoverySignalRef.current?.resolve();
    });

    function startRecoveryExchange(recoveryCode: string) {
      const signal = getOrCreateRecoverySignal(recoveryCode);
      recoverySignalRef.current = signal;
      recoveryEventConfirmedRef.current = false;

      const attempt = getOrCreateKeyedRecoveryAttempt(
        recoveryExchangeAttempts,
        recoveryCode,
        async (): Promise<RecoveryExchangeOutcome> => {
          try {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(recoveryCode);
            if (exchangeError) {
              return classifyAuthFailure(exchangeError, true) ===
                "transient_failure"
                ? "temporarily_unavailable"
                : "invalid";
            }

            return (await signal.wait(RECOVERY_EVENT_WAIT_MS))
              ? "confirmed_recovery"
              : "non_recovery";
          } catch (exchangeError) {
            return classifyAuthFailure(exchangeError, true) ===
              "transient_failure"
              ? "temporarily_unavailable"
              : "invalid";
          }
        },
      );

      const release = () => releaseRecoverySignal(recoveryCode, signal);
      void attempt.then(release, release);
      return attempt;
    }

    async function finishNonRecoveryCode() {
      clearRecoveryRetry();
      clearRecoveryMarker();
      const userOutcome = await getUserLookupOutcome(supabase);
      if (cancelled) return;

      if (userOutcome === "authenticated") {
        router.replace("/dashboard");
      } else if (userOutcome === "temporarily_unavailable") {
        setRecoveryState("temporarily_unavailable");
      } else {
        setRecoveryState("invalid");
      }
    }

    async function bindConfirmedRecovery() {
      const bindOperation = () => createBoundRecoveryMarker(supabase);
      const markerOutcome = await bindOperation();
      if (cancelled) return;
      applyMarkerOutcome(markerOutcome, "binding", bindOperation);
    }

    async function guardResetRoute() {
      const recoveryLinkFailure = classifyRecoveryLinkError({
        error: search.get("error") ?? hash.get("error"),
        errorCode: search.get("error_code") ?? hash.get("error_code"),
        errorDescription:
          search.get("error_description") ?? hash.get("error_description"),
      });

      if (recoveryLinkFailure) {
        clearRecoveryRetry();
        clearRecoveryMarker();
        if (code && initialSignal) {
          releaseRecoverySignal(code, initialSignal);
          recoverySignalRef.current = null;
        }
        removeRecoveryParameters();
        if (!cancelled) setRecoveryState(recoveryLinkFailure);
        return;
      }

      if (hasSensitiveHash) {
        clearRecoveryRetry();
        clearRecoveryMarker();
        removeRecoveryParameters();
        if (!cancelled) setRecoveryState("invalid");
        return;
      }

      const markerResult = readRecoveryMarker();
      if (markerResult.failed) {
        clearRecoveryRetry();
        setRecoveryState("temporarily_unavailable");
        return;
      }

      if (markerResult.marker) {
        const rawMarker = markerResult.marker;
        const verifyOperation = () =>
          verifyBoundRecoveryMarker(supabase, rawMarker);
        const markerOutcome = await verifyOperation();
        if (cancelled) return;

        if (markerOutcome !== "invalid" || !code) {
          applyMarkerOutcome(markerOutcome, "verification", verifyOperation);
          return;
        }

        clearRecoveryRetry();
        clearRecoveryMarker();
      }

      if (code) {
        retryIntentRef.current = "retry_exchange";
        retryExchangeRef.current = () => startRecoveryExchange(code);
        retryMarkerOperationRef.current = null;
        retryMarkerKindRef.current = null;
        let outcome: RecoveryExchangeOutcome;
        try {
          outcome = await startRecoveryExchange(code);
        } finally {
          removeRecoveryParameters();
        }
        if (cancelled) return;

        if (outcome === "confirmed_recovery") {
          await bindConfirmedRecovery();
          return;
        }

        if (outcome === "temporarily_unavailable") {
          setRecoveryState("temporarily_unavailable");
          return;
        }

        if (outcome === "non_recovery") {
          await finishNonRecoveryCode();
          return;
        }

        clearRecoveryRetry();
        clearRecoveryMarker();
        setRecoveryState("invalid");
        return;
      }

      const userOutcome = await getUserLookupOutcome(supabase);
      if (cancelled) return;

      if (userOutcome === "authenticated") {
        router.replace("/dashboard");
      } else if (userOutcome === "temporarily_unavailable") {
        setRecoveryState("temporarily_unavailable");
      } else {
        router.replace("/login");
      }
    }

    void guardResetRoute();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      recoverySignalRef.current = null;
      clearRecoveryRetry();
      if (
        code &&
        initialSignal &&
        !recoveryExchangeAttempts.has(code)
      ) {
        releaseRecoverySignal(code, initialSignal);
      }
    };
  }, [
    applyMarkerOutcome,
    clearRecoveryRetry,
    router,
    supabase,
  ]);

  async function retryRecoveryCheck() {
    if (retryInFlight.current) return;

    const operation = getRecoveryRetryOperation(retryIntentRef.current);
    if (!operation) {
      window.location.reload();
      return;
    }

    retryInFlight.current = true;
    setRetrying(true);
    setRecoveryState("checking");

    try {
      if (operation === "exchange") {
        const retryExchange = retryExchangeRef.current;
        if (!retryExchange) {
          clearRecoveryRetry();
          setRecoveryState("invalid");
          return;
        }

        const exchangeOutcome = await retryExchange();
        if (exchangeOutcome === "confirmed_recovery") {
          const bindOperation = () => createBoundRecoveryMarker(supabase);
          const markerOutcome = await bindOperation();
          applyMarkerOutcome(markerOutcome, "binding", bindOperation);
        } else if (exchangeOutcome === "temporarily_unavailable") {
          setRecoveryState("temporarily_unavailable");
        } else if (exchangeOutcome === "non_recovery") {
          clearRecoveryRetry();
          clearRecoveryMarker();
          const userOutcome = await getUserLookupOutcome(supabase);
          if (userOutcome === "authenticated") {
            router.replace("/dashboard");
          } else if (userOutcome === "temporarily_unavailable") {
            setRecoveryState("temporarily_unavailable");
          } else {
            setRecoveryState("invalid");
          }
        } else {
          clearRecoveryRetry();
          clearRecoveryMarker();
          setRecoveryState("invalid");
        }
        return;
      }

      const retryMarkerOperation = retryMarkerOperationRef.current;
      const retryMarkerKind = retryMarkerKindRef.current;
      if (!retryMarkerOperation || !retryMarkerKind) {
        clearRecoveryRetry();
        setRecoveryState("invalid");
        return;
      }

      applyMarkerOutcome(
        await retryMarkerOperation(),
        retryMarkerKind,
        retryMarkerOperation,
      );
    } catch {
      setRecoveryState("temporarily_unavailable");
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
    }
  }

  function clearRecoveryFieldError(field: RecoveryField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (recoveryState !== "ready") return;

    setFieldErrors({});
    setFormError("");

    const passwordPolicy = validatePasswordPolicy(password);
    if (!passwordPolicy.ok) {
      setFieldErrors({ password: passwordPolicy.error });
      passwordInputRef.current?.focus();
      return;
    }

    if (!confirm) {
      setFieldErrors({ confirm: "Enter the new password again." });
      confirmInputRef.current?.focus();
      return;
    }

    if (password !== confirm) {
      setFieldErrors({ confirm: "The passwords do not match." });
      confirmInputRef.current?.focus();
      return;
    }

    setRecoveryState("updating");
    setMessage("");

    const passwordProtection = await checkPasswordProtection(password);
    if (!passwordProtection.ok) {
      setRecoveryState("ready");
      setFieldErrors({ password: passwordProtection.error });
      passwordInputRef.current?.focus();
      return;
    }

    let updateOutcome: PasswordUpdateOutcome = "thrown_error";
    let updateError: Awaited<
      ReturnType<typeof supabase.auth.updateUser>
    >["error"] = null;

    try {
      const result = await supabase.auth.updateUser({ password });
      updateError = result.error;
      updateOutcome = updateError ? "returned_error" : "success";
    } catch (updateException) {
      setRecoveryState("ready");
      setFormError(getPasswordUpdateExceptionMessage(updateException));
      return;
    }

    if (updateError) {
      setRecoveryState("ready");
      setFormError(getResetPasswordError(updateError.message));
      return;
    }

    setPassword("");
    setConfirm("");
    if (shouldClearRecoveryMarkerAfterPasswordUpdate(updateOutcome)) {
      clearRecoveryMarker();
    }
    setRecoveryState("success");
    setMessage("Password updated. Taking you to your dashboard…");
    router.replace("/dashboard");
    router.refresh();
  }

  const recoveryPresentation =
    recoveryState === "checking"
      ? {
          eyebrow: "Checking link",
          title: "Verifying your recovery link",
          description:
            "Please wait while the existing recovery checks confirm this request.",
          icon: LoaderCircle,
        }
      : recoveryState === "invalid"
        ? {
            eyebrow: "Link unavailable",
            title: "Request a new recovery link",
            description:
              "This link is invalid, expired, or no longer eligible for password recovery.",
            icon: XCircle,
          }
        : recoveryState === "temporarily_unavailable"
          ? {
              eyebrow: "Temporary interruption",
              title: "Recovery could not be verified",
              description:
                "Authentication is temporarily unavailable. Your link has not been treated as valid or invalid.",
              icon: AlertTriangle,
            }
          : recoveryState === "success"
            ? {
                eyebrow: "Password updated",
                title: "Your new password is ready",
                description:
                  "Continue to your dashboard with the updated account password.",
                icon: CheckCircle2,
              }
            : {
                eyebrow:
                  recoveryState === "updating"
                    ? "Saving securely"
                    : "Password recovery",
                title:
                  recoveryState === "updating"
                    ? "Updating your password"
                    : "Choose a new password",
                description: `Use at least ${PASSWORD_MIN_LENGTH} characters. Known breached passwords are rejected before the update.`,
                icon: LockKeyhole,
              };

  return (
    <AuthShell
      compact
      minimal
      eyebrow={recoveryPresentation.eyebrow}
      title={recoveryPresentation.title}
      description={recoveryPresentation.description}
      icon={recoveryPresentation.icon}
    >
      {recoveryState === "checking" ? (
        <div aria-busy="true">
          <AuthFeedback tone="info">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle
                className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Verifying your recovery link…
            </span>
          </AuthFeedback>
          <AuthFormSkeleton fields={2} />
        </div>
      ) : null}

      {recoveryState === "invalid" ? (
        <div className="space-y-4">
          <AuthFeedback tone="danger">
            This reset link is expired, invalid, or has already been used.
            Request a new link to continue.
          </AuthFeedback>
          <Button
            type="button"
            size="lg"
            onClick={() => router.replace("/login?mode=forgot")}
            className="w-full"
          >
            Request a new link <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {recoveryState === "temporarily_unavailable" ? (
        <div className="space-y-4">
          <AuthFeedback tone="warning" role="alert">
            Authentication is temporarily unavailable. This interruption does
            not mean the link is invalid.
          </AuthFeedback>
          <Button
            type="button"
            onClick={retryRecoveryCheck}
            loading={retrying}
            loadingLabel="Trying again…"
            size="lg"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </div>
      ) : null}

      {recoveryState === "success" ? (
        <div className="space-y-4">
          <AuthFeedback tone="success">
            {message || "Password updated successfully."}
          </AuthFeedback>
          <Button
            type="button"
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="w-full"
          >
            Continue to dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {recoveryState === "ready" || recoveryState === "updating" ? (
        <form
          onSubmit={handleReset}
          noValidate
          className="space-y-1"
          aria-busy={loading}
        >
          <AuthPasswordField
            id="new-password"
            name="new_password"
            label="New password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearRecoveryFieldError("password");
            }}
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            autoComplete="new-password"
            disabled={loading}
            error={fieldErrors.password}
            helper={`Use at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number or symbol.`}
            inputRef={passwordInputRef}
            icon={<LockKeyhole className="h-4 w-4" />}
          />

          <AuthPasswordField
            id="confirm-password"
            name="confirm_password"
            label="Confirm password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              clearRecoveryFieldError("confirm");
            }}
            placeholder="Repeat the new password"
            autoComplete="new-password"
            disabled={loading}
            error={fieldErrors.confirm}
            inputRef={confirmInputRef}
            icon={<LockKeyhole className="h-4 w-4" />}
          />

          <div className="auth-feedback-slot">
            {formError ? (
              <AuthFeedback tone="danger">{formError}</AuthFeedback>
            ) : null}
          </div>

          <AuthSubmitAction
            type="submit"
            loading={loading}
            loadingLabel="Updating password…"
            disabled={loading}
          >
            Update password <ArrowRight className="h-4 w-4" />
          </AuthSubmitAction>
        </form>
      ) : null}

      <p className="mt-5 text-center text-xs leading-5 text-text-tertiary">
        Recovery access is confirmed before a password update is allowed.
      </p>
    </AuthShell>
  );
}
