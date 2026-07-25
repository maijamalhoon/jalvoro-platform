import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Landmark,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { APP_NAME } from "@/lib/brand";
import {
  listProductExperiences,
  type ProductExperienceSlug,
} from "@/lib/product-experiences";

export const metadata: Metadata = {
  title: `Choose your workspace | ${APP_NAME}`,
  description:
    "Choose the JALVORO experience that fits you today. One account can securely access multiple isolated workspaces over time.",
  alternates: { canonical: "/start" },
};

const experienceIcons: Record<ProductExperienceSlug, LucideIcon> = {
  personal: UserRound,
  freelancer: BriefcaseBusiness,
  "small-business": Building2,
  "retail-pos": ShoppingCart,
  enterprise: Landmark,
};

export default function StartPage() {
  const experiences = listProductExperiences();

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-black text-text-primary"
          >
            <span className="grid size-9 place-items-center rounded-[var(--radius-button)] bg-primary text-sm font-black text-white">
              J
            </span>
            {APP_NAME}
          </Link>

          <Link
            href="/login"
            className="finance-focus inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-surface px-4 text-sm font-black text-text-primary shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5"
          >
            General account access
          </Link>
        </header>

        <section className="mx-auto mt-12 max-w-4xl text-center sm:mt-16">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Choose your JALVORO experience
          </p>
          <h1 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] text-text-primary sm:text-5xl lg:text-6xl">
            Start with the workspace that fits today.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
            Personal finance, independent work, retail, small business, and enterprise operations use one secure identity while keeping every workspace and dataset separate.
          </p>
        </section>

        <section
          className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-[var(--radius-card)] bg-primary-soft p-4 sm:grid-cols-3 sm:p-5"
          aria-label="JALVORO identity rules"
        >
          {[
            "One email creates one identity",
            "Each workspace keeps isolated data",
            "Switching is always an explicit action",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2 text-sm font-bold leading-6 text-text-primary">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                <Check className="size-3" aria-hidden="true" />
              </span>
              {rule}
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Available JALVORO experiences">
          {experiences.map((experience) => {
            const Icon = experienceIcons[experience.slug];

            return (
              <article
                key={experience.slug}
                className="flex min-h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <span className="grid size-12 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                  <Icon className="size-6" aria-hidden="true" />
                </span>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-primary">
                  {experience.label}
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-text-primary">
                  {experience.productName}
                </h2>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {experience.summary}
                </p>

                <div className="mt-auto pt-6">
                  <Link
                    href={experience.previewPath}
                    className="finance-focus inline-flex min-h-11 w-full items-center justify-between rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
                  >
                    Explore this workspace
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link
                      href={experience.loginPath}
                      className="finance-focus inline-flex min-h-10 items-center justify-center rounded-[var(--radius-button)] bg-surface-secondary px-3 text-xs font-black text-text-primary"
                    >
                      Sign in
                    </Link>
                    <Link
                      href={experience.signupPath}
                      className="finance-focus inline-flex min-h-10 items-center justify-center rounded-[var(--radius-button)] bg-surface-secondary px-3 text-xs font-black text-text-primary"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-10 flex max-w-4xl items-start gap-3 rounded-[var(--radius-card)] bg-surface-secondary p-5 text-sm leading-6 text-text-secondary sm:p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Choosing an experience does not create a second account. In the future, the same verified email can add another JALVORO workspace or accept an organization invitation without merging the underlying records.
          </p>
        </section>
      </div>
    </main>
  );
}
