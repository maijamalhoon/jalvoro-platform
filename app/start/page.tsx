import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Choose your product | ${APP_NAME}`,
  description: "Choose an Individual account or register and access a Business organization.",
  alternates: { canonical: "/start" },
};

type StartPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function StartPage({ searchParams }: StartPageProps) {
  const mode = (await searchParams).mode === "login" ? "login" : "signup";
  const individualHref =
    mode === "login" ? "/individual/login" : "/individual/signup";

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="finance-focus text-sm font-black tracking-[0.16em] text-text-primary"
          >
            {APP_NAME}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Separate account paths
          </span>
        </header>

        <section className="mx-auto mt-12 max-w-3xl text-center sm:mt-16">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            {mode === "login" ? "Choose sign-in" : "Choose how to start"}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-5xl">
            Individual and Business stay separate.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
            Individual is for personal finance. Business is for an organization registered by
            its owner or authorized administrator, with managers and employees provisioned from
            inside that organization.
          </p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Product choices">
          <article className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <UserRound className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-primary">
              Individual
            </p>
            <h2 className="mt-2 text-2xl font-black text-text-primary">
              Personal finance account
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Accounts, income, expenses, goals, investments, payables, analytics, and personal
              reports owned by one individual.
            </p>
            <Link
              href={individualHref}
              className="finance-focus mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
            >
              {mode === "login" ? "Sign in to Individual" : "Create Individual account"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Building2 className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-primary">
              Business
            </p>
            <h2 className="mt-2 text-2xl font-black text-text-primary">
              Organization-controlled access
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Solo Business, Retail & POS, Growing Business, and Enterprise Operations. The first
              account is the organization owner; staff access is created or invited internally.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {mode === "login" ? (
                <Link
                  href="/business/login"
                  className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
                >
                  Business sign in <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  href="/business/register"
                  className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
                >
                  Register organization <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
              <Link
                href={mode === "login" ? "/business/register" : "/business/login"}
                className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-4 text-sm font-black text-text-primary"
              >
                <UsersRound className="size-4" aria-hidden="true" />
                {mode === "login" ? "Register a new organization" : "Employee or admin sign in"}
              </Link>
            </div>
          </article>
        </section>

        <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-text-tertiary">
          A Business administrator cannot view employee passwords. Staff receive a secure
          invitation or approved temporary credential and set their own permanent password.
        </p>
      </div>
    </main>
  );
}
