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
import { createControlPlaneBrowserClient } from "@/lib/control-plane/client";
import { sanitizeControlDestination } from "@/lib/control-plane/config";

type LoginMode =
  | "checking"
  | "credentials"
  | "enroll-intro"
  | "enroll"
  | "challenge"
  | "denied";

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status?: string | null;
};

type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
};

const reasonMessages = {
  authentication_required: "Authenticate with the dedicated Command Center account.",
  mfa_required: "Complete authenticator verification before continuing.",
  access_denied: "Command Center access could not be verified.",
} as const;

function genericError() {
  return "The Command Center request could not be completed. Check the details and try again.";
}

function getSignInError(error?: AuthFailure) {
  const details = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();

  if (details.includes("rate") || details.includes("too many")) {
    return "Too many sign-in attempts. Wait a moment before trying again.";
  }

  if (
    (error?.status ?? 0) >= 500 ||
    details.includes("network") ||
    details.includes("fetch") ||
    details.includes("timeout")
  ) {
    return "The isolated authentication service is temporarily unavailable. Check your connection and try again.";
  }

  return "The Command Center email or password is incorrect. Use the credentials created in the isolated Command Center project, not your normal JALVORO account.";
}

export default function ControlPlaneLogin() {
  const router = useRouter();
  const supabase = useMemo(() => createControlPlaneBrowserClient(), []);
  const [mode, setMode] = useState<LoginMode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
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
    setError("This identity is not authorized for the JALVORO Command Center.");
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
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Enter the Command Center email and password.");
      setBusy(false);
      return;
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setPassword("");

    if (signIn.error) {
      setError(getSignInError(signIn.error));
      setBusy(false);
      return;
    }

    await resolveAssurance();
    setBusy(false);
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
      friendlyName: "JALVORO Command Center",
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
    setEnrollment(null);
    setFactors([]);
    setSelectedFactorId("");
    setCode("");
    setError("");
    setNotice("");
    setMode("credentials");
  }

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
            <p className={styles.eyebrow}>Private Command Center</p>
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
              <span>Authenticator verification is mandatory before every Command Center session.</span>
            </div>
            <div className={styles.trustItem}>
              <UserRoundCheck className={styles.trustIcon} size={19} />
              <span>Only active operators recorded in the private command registry pass.</span>
            </div>
            <div className={styles.trustItem}>
              <CheckCircle2 className={styles.trustIcon} size={19} />
              <span>Admin routes require both Command Center authority and app authorization.</span>
            </div>
          </div>
        </section>

        <section className={styles.authPanel} aria-live="polite">
          <div className={styles.authHeader}>
            <p className={styles.eyebrow}>Restricted access</p>
            <h2 className={styles.authTitle}>
              {mode === "challenge"
                ? "Verify authenticator"
                : mode === "enroll" || mode === "enroll-intro"
                  ? "Secure the Command Center account"
                  : mode === "denied"
                    ? "Access unavailable"
                    : "Command Center sign in"}
            </h2>
            <p className={styles.authCopy}>
              {mode === "challenge"
                ? "Enter a current code from the enrolled authenticator."
                : mode === "enroll" || mode === "enroll-intro"
                  ? "MFA enrollment is required before the Command Center can open."
                  : "Use the dedicated Command Center credentials created in the isolated project."}
            </p>
          </div>

          {notice ? <div className={styles.notice}>{notice}</div> : null}
          {error ? <div className={styles.alert} role="alert">{error}</div> : null}

          {mode === "checking" ? (
            <p className={styles.statusText}>Checking the isolated security session…</p>
          ) : null}

          {mode === "credentials" ? (
            <form className={styles.form} onSubmit={handleLogin}>
              <label className={styles.field}>
                <span className={styles.label}>Command Center email</span>
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
                <span className={styles.label}>Command Center password</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className={styles.button} type="submit" disabled={busy}>
                <KeyRound size={17} />
                {busy ? "Verifying…" : "Continue securely"}
                {!busy ? <ArrowRight size={17} /> : null}
              </button>
            </form>
          ) : null}

          {mode === "enroll-intro" ? (
            <div className={styles.mfaSetup}>
              <div className={styles.notice}>
                No verified authenticator exists. The Command Center remains locked until one is enrolled.
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
                  alt="QR code for JALVORO Command Center authenticator enrollment"
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
