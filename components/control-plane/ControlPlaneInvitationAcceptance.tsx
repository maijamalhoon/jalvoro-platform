"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";

import styles from "@/components/control-plane/control-plane-invitation.module.css";
import { createControlPlaneBrowserClient } from "@/lib/control-plane/client";

const TOKEN_KEY = "jalvoro-control-plane-invitation";
const AUTH_TOKEN_KEY = "jalvoro-control-plane-auth-invite";

type Mode =
  | "checking"
  | "credentials"
  | "password"
  | "mfa-intro"
  | "mfa-enroll"
  | "mfa-challenge"
  | "accepting"
  | "denied";

type Enrollment = { factorId: string; qrCode: string; secret: string };
type Factor = { id: string; friendly_name?: string | null; status?: string | null };

function validPassword(value: string) {
  return (
    value.length >= 14 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default function ControlPlaneInvitationAcceptance() {
  const router = useRouter();
  const supabase = useMemo(() => createControlPlaneBrowserClient(), []);
  const [mode, setMode] = useState<Mode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permanentPassword, setPermanentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function getInvitationToken() {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? "";
  }

  function getAuthToken() {
    return window.sessionStorage.getItem(AUTH_TOKEN_KEY) ?? "";
  }

  async function deny() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    setMode("denied");
    setError(
      "This invitation could not be verified. Ask the Root Owner for a new invitation.",
    );
  }

  async function acceptInvitation() {
    const token = getInvitationToken();
    if (!token) return deny();
    setMode("accepting");
    const tokenHash = await sha256Hex(token);
    const result = await supabase.rpc("accept_control_plane_invitation", {
      p_token_sha256: tokenHash,
    });
    if (result.error || !result.data) return deny();

    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    router.replace("/control");
    router.refresh();
  }

  async function resolveMfa() {
    setError("");
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || !assurance.data) return deny();
    if (assurance.data.currentLevel === "aal2") return acceptInvitation();

    const factorResult = await supabase.auth.mfa.listFactors();
    if (factorResult.error) return deny();
    const verified = factorResult.data.totp.filter(
      (factor) => factor.status === "verified",
    );
    if (verified.length) {
      setFactors(verified);
      setFactorId(verified[0]?.id ?? "");
      setMode("mfa-challenge");
      return;
    }
    setMode("mfa-intro");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const incomingToken = params.get("invite");
    const incomingAuthToken = params.get("auth");
    if (incomingToken) window.sessionStorage.setItem(TOKEN_KEY, incomingToken);
    if (incomingAuthToken) {
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, incomingAuthToken);
    }
    window.history.replaceState({}, "", "/control-invite");

    void (async () => {
      if (!getInvitationToken()) return deny();
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

      const authToken = getAuthToken();
      if (!authToken) {
        setMode("credentials");
        return;
      }

      const verification = await supabase.auth.verifyOtp({
        token_hash: authToken,
        type: "invite",
      });
      const invitedEmail = verification.data.user?.email ?? "";
      if (verification.error || !invitedEmail) return deny();
      setEmail(invitedEmail);
      setMode("password");
    })();
    // Stable client for this component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setPassword("");
    if (result.error) {
      setError("The invitation credentials were not accepted.");
      setBusy(false);
      return;
    }
    await resolveMfa();
    setBusy(false);
  }

  async function replacePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!validPassword(permanentPassword) || permanentPassword !== confirmPassword) {
      setError(
        "Use at least 14 characters with upper, lower, number and symbol, and make both passwords match.",
      );
      return;
    }

    setBusy(true);
    setError("");
    const userResult = await supabase.auth.getUser();
    const invitedEmail = userResult.data.user?.email ?? email;
    if (userResult.error || !invitedEmail) {
      await deny();
      setBusy(false);
      return;
    }

    const nextPassword = permanentPassword;
    const updateResult = await supabase.auth.updateUser({ password: nextPassword });
    if (updateResult.error) {
      setError(
        "The permanent password could not be saved. Use a different strong password.",
      );
      setBusy(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    const passwordSession = await supabase.auth.signInWithPassword({
      email: invitedEmail,
      password: nextPassword,
    });
    setPermanentPassword("");
    setConfirmPassword("");
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    if (passwordSession.error) {
      setMode("credentials");
      setEmail(invitedEmail);
      setError("Password saved. Sign in once with the new password to continue.");
      setBusy(false);
      return;
    }

    setEmail(invitedEmail);
    await resolveMfa();
    setBusy(false);
  }

  async function startEnrollment() {
    if (busy) return;
    setBusy(true);
    setError("");
    const existing = await supabase.auth.mfa.listFactors();
    if (existing.error) {
      setError("Authenticator setup is temporarily unavailable.");
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
      setError("Authenticator setup is temporarily unavailable.");
      setBusy(false);
      return;
    }
    setEnrollment({
      factorId: result.data.id,
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
    });
    setFactorId(result.data.id);
    setMode("mfa-enroll");
    setBusy(false);
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedCode = code.replace(/\D/g, "");
    if (!factorId || normalizedCode.length !== 6) {
      setError("Enter the current 6-digit authenticator code.");
      return;
    }
    setBusy(true);
    setError("");
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError("The authenticator challenge could not start.");
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
      setError("The code was not accepted. Use the latest code from the app.");
      setBusy(false);
      return;
    }
    setCode("");
    await acceptInvitation();
    setBusy(false);
  }

  return (
    <main className={styles.root}>
      <section className={styles.card} aria-live="polite">
        <div className={styles.brand}>
          <ShieldCheck size={24} />
          <span>JALVORO Control Plane</span>
        </div>
        <div className={styles.header}>
          <p>Private operator onboarding</p>
          <h1>
            {mode === "password"
              ? "Create permanent password"
              : mode.startsWith("mfa")
                ? "Enable strong authentication"
                : mode === "denied"
                  ? "Invitation unavailable"
                  : "Accept secure invitation"}
          </h1>
          <span>
            Invitation access requires the intended identity, a permanent password
            login and fresh authenticator verification.
          </span>
        </div>
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {mode === "checking" || mode === "accepting" ? (
          <p className={styles.status}>
            {mode === "accepting"
              ? "Activating scoped operator access…"
              : "Checking invitation…"}
          </p>
        ) : null}

        {mode === "credentials" ? (
          <form className={styles.form} onSubmit={signIn}>
            <Field label="Control Plane email">
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Control Plane password">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
            <button disabled={busy} type="submit">
              <KeyRound size={17} />
              {busy ? "Verifying…" : "Continue securely"}
            </button>
          </form>
        ) : null}

        {mode === "password" ? (
          <form className={styles.form} onSubmit={replacePassword}>
            <p className={styles.notice}>
              Create a permanent password. A fresh password sign-in is enforced
              before the invitation can be accepted.
            </p>
            <Field label="New permanent password">
              <input
                type="password"
                autoComplete="new-password"
                value={permanentPassword}
                onChange={(event) => setPermanentPassword(event.target.value)}
                required
              />
            </Field>
            <Field label="Confirm permanent password">
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </Field>
            <p className={styles.help}>
              Minimum 14 characters with uppercase, lowercase, number and symbol.
            </p>
            <button disabled={busy} type="submit">
              <LockKeyhole size={17} />
              {busy ? "Saving…" : "Create password and continue"}
            </button>
          </form>
        ) : null}

        {mode === "mfa-intro" ? (
          <div className={styles.form}>
            <p className={styles.notice}>
              No verified authenticator exists. Operator access remains locked until
              setup is complete.
            </p>
            <button
              disabled={busy}
              type="button"
              onClick={() => void startEnrollment()}
            >
              <Smartphone size={17} />
              {busy ? "Preparing…" : "Set up authenticator"}
            </button>
          </div>
        ) : null}

        {mode === "mfa-enroll" && enrollment ? (
          <form className={styles.form} onSubmit={verifyMfa}>
            <div className={styles.qr}>
              <Image
                src={enrollment.qrCode}
                alt="QR code for JALVORO Control Plane authenticator"
                width={210}
                height={210}
                unoptimized
                priority
              />
            </div>
            <p className={styles.help}>
              Scan with an authenticator app. Manual secret:
              <code>{enrollment.secret}</code>
            </p>
            <CodeField code={code} setCode={setCode} />
            <button disabled={busy} type="submit">
              <ShieldCheck size={17} />
              {busy ? "Verifying…" : "Enable and accept invitation"}
            </button>
          </form>
        ) : null}

        {mode === "mfa-challenge" ? (
          <form className={styles.form} onSubmit={verifyMfa}>
            {factors.length > 1 ? (
              <Field label="Authenticator">
                <select
                  value={factorId}
                  onChange={(event) => setFactorId(event.target.value)}
                >
                  {factors.map((factor, index) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || `Authenticator ${index + 1}`}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <CodeField code={code} setCode={setCode} />
            <button disabled={busy} type="submit">
              <ShieldCheck size={17} />
              {busy ? "Verifying…" : "Verify and accept invitation"}
            </button>
          </form>
        ) : null}

        {mode === "denied" ? (
          <p className={styles.help}>No account or access details were disclosed.</p>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CodeField({
  code,
  setCode,
}: {
  code: string;
  setCode: (value: string) => void;
}) {
  return (
    <Field label="6-digit authenticator code">
      <input
        className={styles.code}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) =>
          setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        required
        autoFocus
      />
    </Field>
  );
}
