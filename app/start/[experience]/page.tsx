import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Landmark,
  Layers3,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { APP_NAME } from "@/lib/brand";
import {
  getProductExperience,
  listProductExperiences,
  type ProductExperienceSlug,
} from "@/lib/product-experiences";

const experienceIcons: Record<ProductExperienceSlug, LucideIcon> = {
  personal: UserRound,
  freelancer: BriefcaseBusiness,
  "small-business": Building2,
  "retail-pos": ShoppingCart,
  enterprise: Landmark,
};

export function generateStaticParams() {
  return listProductExperiences().map(({ slug }) => ({ experience: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experience: string }>;
}): Promise<Metadata> {
  const { experience: slug } = await params;
  const experience = getProductExperience(slug);
  if (!experience) return {};

  return {
    title: { absolute: `${experience.productName} | ${APP_NAME}` },
    description: experience.summary,
    alternates: { canonical: experience.previewPath },
  };
}

export default async function ExperiencePreviewPage({
  params,
}: {
  params: Promise<{ experience: string }>;
}) {
  const { experience: slug } = await params;
  const experience = getProductExperience(slug);
  if (!experience) notFound();

  const Icon = experienceIcons[experience.slug];

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/start"
            className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-black text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All experiences
          </Link>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-primary-soft px-3 text-xs font-black text-primary">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Isolated workspace entry
          </span>
        </header>

        <section className="mt-10 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <span className="grid size-14 place-items-center rounded-[var(--radius-card)] bg-primary-soft text-primary">
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-primary">
              {experience.label}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-black tracking-[-0.04em] text-text-primary sm:text-5xl lg:text-6xl">
              {experience.previewTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
              {experience.summary}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={experience.signupPath}
                className="finance-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-5 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
              >
                Create {experience.productName} account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={experience.loginPath}
                className="finance-focus inline-flex min-h-12 items-center justify-center rounded-[var(--radius-button)] bg-surface px-5 text-sm font-black text-text-primary shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5"
              >
                Sign in to this workspace
              </Link>
            </div>

            <p className="mt-4 text-sm leading-6 text-text-tertiary">
              Already use another JALVORO module? Sign in with the same email. A second identity will not be created.
            </p>
          </div>

          <aside className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-md)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  Workspace preview
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
                  {experience.productName}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{experience.audience}</p>
              </div>
              <span className="grid size-11 place-items-center rounded-[var(--radius-button)] bg-surface-secondary text-primary">
                <Layers3 className="size-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {experience.capabilities.map((capability) => (
                <div
                  key={capability}
                  className="flex min-h-24 items-start gap-3 rounded-[var(--radius-button)] bg-surface-secondary p-4"
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-sm font-black leading-6 text-text-primary">{capability}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[var(--radius-button)] bg-primary-soft p-4">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-primary">Setup path</p>
              <p className="mt-2 text-sm leading-6 text-text-primary">{experience.setupNote}</p>
            </div>
          </aside>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["One identity", "Your normalized email belongs to one JALVORO identity."],
            ["Separate records", "Personal and organization data never merge automatically."],
            ["Explicit switching", "Another module opens only when you deliberately choose it."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-[var(--radius-card)] bg-surface-secondary p-5">
              <h2 className="text-base font-black text-text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{copy}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
