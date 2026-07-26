"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createCommandCenterBrowserClient } from "@/lib/command-center/client";
import { parseCommandCenterAccess } from "@/lib/command-center/config";
import { createClient } from "@/lib/supabase/client";

type CommandCenterLoginProps = {
  signedInEmail?: string | null;
  accessDenied?: boolean;
  syncRequired?: boolean;
};

type BridgeResponse = {
  tokenHash?: unknown;
};

const SIGN_IN_ERROR = "The email or password is incorrect.";
const ACCESS_ERROR =
  "This account is not authorized for the JALVORO Command Center.";
const BRIDGE_ERROR =
  "Your secure website session could not be opened. Retry without signing in again.";

export default function CommandCenterLogin({
  signedInEmail = null,
  accessDenied = false,
  syncRequired = false,
}: CommandCenterLoginProps) {
  const router = useRouter();
  const commandCenter = useMemo(() => createCommandCenterBrowserClient(), []);
  const website = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(syncRequired);
  const [error, setError] = useState(accessDenied ? ACCESS_ERROR : "");

  const openWebsiteSession = useCallback(
    async (accessToken: string, expectedEmail: string) => {
      const bridgeResult = await website.functions.invoke(
        "command-center-session-bridge",
        {
          body: {},
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const bridge = bridgeResult.data as BridgeResponse | null;
      const tokenHash =
        typeof bridge?.tokenHash === "string" ? bridge.tokenHash.trim() : "";

      if (bridgeResult.error || !tokenHash) {
        throw new Error("command_center_bridge_failed");
      }

      const verification = await website.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });
      const websiteEmail =
        verification.data.user?.email?.trim().toLowerCase() ?? "";

      if (
        verification.error ||
        !websiteEmail ||
        websiteEmail !== expectedEmail
      ) {
        await website.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw new Error("command_center_identity_mismatch");
      }
    },
    [website],
  );

  const finishOpening = useCallback(() => {
    router.replace("/commandcenter");
    router.refresh();
  }, [router]);

  const syncExistingSession = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const sessionResult = await commandCenter.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token ?? "";
      const [userResult, accessResult] = await Promise.all([
        commandCenter.auth.getUser(),
        commandCenter.rpc("get_my_command_center_access"),
      ]);
      const commandEmail =
        userResult.data.user?.email?.trim().toLowerCase() ?? "";
      const access = parseCommandCenterAccess(accessResult.data);

      if (
        sessionResult.error ||
        userResult.error ||
        accessResult.error ||
        !accessToken ||
        !commandEmail ||
        !access?.isOwner
      ) {
        throw new Error("command_center_session_invalid");
      }

      await openWebsiteSession(accessToken, commandEmail);
      finishOpening();
    } catch {
      setError(BRIDGE_ERROR);
    } finally {
      setBusy(false);
    }
  }, [commandCenter, finishOpening, openWebsiteSession]);

  useEffect(() => {
    if (!syncRequired) return;
    void syncExistingSession();
  }, [syncExistingSession, syncRequired]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        setError("Enter the Command Center email and password.");
        return;
      }

      await Promise.all([
        commandCenter.auth.signOut({ scope: "local" }).catch(() => undefined),
        website.auth.signOut({ scope: "local" }).catch(() => undefined),
      ]);

      const signInResult = await commandCenter.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      const commandEmail =
        signInResult.data.user?.email?.trim().toLowerCase() ?? "";
      const accessToken = signInResult.data.session?.access_token ?? "";

      if (
        signInResult.error ||
        !signInResult.data.user ||
        !accessToken ||
        commandEmail !== normalizedEmail
      ) {
        setError(SIGN_IN_ERROR);
        return;
      }

      const accessResult = await commandCenter.rpc(
        "get_my_command_center_access",
      );
      const access = parseCommandCenterAccess(accessResult.data);
      if (accessResult.error || !access?.isOwner) {
        await commandCenter.auth
          .signOut({ scope: "local" })
          .catch(() => undefined);
        setError(ACCESS_ERROR);
        return;
      }

      await openWebsiteSession(accessToken, commandEmail);
      finishOpening();
    } catch {
      setError(BRIDGE_ERROR);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function changeAccount() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await Promise.all([
        commandCenter.auth.signOut({ scope: "local" }),
        website.auth.signOut({ scope: "local" }),
      ]);
      setEmail("");
      setPassword("");
      router.replace("/commandcenter");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#07101d] px-4 py-8 text-white sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(48,108,244,0.23),transparent_34rem),radial-gradient(circle_at_90%_18%,rgba(24,190,163,0.14),transparent_30rem)]"
      />

      <section className="relative w-full max-w-md rounded-[1.8rem] border border-white/10 bg-[#0d1a2d]/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 text-xl font-black shadow-lg shadow-blue-950/40">
            J
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-[0.12em]">JALVORO</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Command Center
            </p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            Private access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Open Command Center
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            One email and password. Successful authentication opens the complete
            JALVORO Command Center directly.
          </p>
        </div>

        {signedInEmail ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
              {syncRequired
                ? "Securing website session"
                : "Different account required"}
            </p>
            <p className="mt-2 break-all text-sm text-slate-200">
              {signedInEmail}
            </p>
            {syncRequired && busy ? (
              <p
                role="status"
                className="mt-3 text-sm leading-6 text-slate-300"
              >
                Opening Command Center…
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-3 text-sm leading-6 text-red-100">
                {error}
              </p>
            ) : null}
            {syncRequired && error ? (
              <button
                type="button"
                onClick={() => void syncExistingSession()}
                disabled={busy}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Retry secure session
              </button>
            ) : null}
            <button
              type="button"
              onClick={changeAccount}
              disabled={busy}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out and use another Command Center account
            </button>
          </div>
        ) : (
          <form className="mt-7 grid gap-5" onSubmit={signIn}>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                inputMode="email"
                required
                disabled={busy}
                className="min-h-[3.25rem] w-full rounded-xl border border-white/15 bg-[#07111f] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60"
                placeholder="name@example.com"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={busy}
                className="min-h-[3.25rem] w-full rounded-xl border border-white/15 bg-[#07111f] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60"
                placeholder="Enter your password"
              />
            </label>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl bg-blue-600 px-5 text-base font-bold text-white shadow-lg shadow-blue-950/35 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Opening Command Center…" : "Open Command Center"}
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          Return to JALVORO website
        </Link>
      </section>
    </main>
  );
}
