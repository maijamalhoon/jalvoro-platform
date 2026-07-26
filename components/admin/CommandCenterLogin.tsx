"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function CommandCenterLogin({
  signedInEmail = null,
  accessDenied = false,
}: {
  signedInEmail?: string | null;
  accessDenied?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    accessDenied
      ? "This signed-in account is not authorized for the JALVORO Command Center."
      : "",
  );

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

      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      const signInResult = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInResult.error || !signInResult.data.user) {
        setError("The email or password is incorrect.");
        return;
      }

      const accessResult = await supabase.rpc("get_platform_admin_snapshot");
      if (accessResult.error?.code === "42501") {
        await supabase.auth.signOut({ scope: "local" });
        setPassword("");
        setError("This account is not authorized for the JALVORO Command Center.");
        return;
      }
      if (accessResult.error) {
        await supabase.auth.signOut({ scope: "local" });
        setPassword("");
        setError("Command Center authorization is temporarily unavailable.");
        return;
      }

      router.replace("/commandcenter");
      router.refresh();
    } catch {
      setError("Command Center sign-in could not be completed. Try again.");
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
      await supabase.auth.signOut({ scope: "local" });
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
            One email and password. Successful authentication opens the complete JALVORO Command Center directly.
          </p>
        </div>

        {signedInEmail ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
              Different account required
            </p>
            <p className="mt-2 break-all text-sm text-slate-200">{signedInEmail}</p>
            {error ? (
              <p role="alert" className="mt-3 text-sm leading-6 text-red-100">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={changeAccount}
              disabled={busy}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out and use Command Center account
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
              <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
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
