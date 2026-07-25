"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Layers3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import MathSymbolField from "@/components/landing/MathSymbolField";
import { APP_NAME, brand } from "@/lib/brand";
import { getProductExperienceFromPathname } from "@/lib/product-experiences";

export default function AuthShell({
  children,
  eyebrow,
  progress,
  title,
  description,
  icon: Icon = ShieldCheck,
  compact = false,
  minimal = false,
}: {
  children: ReactNode;
  eyebrow: string;
  progress?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
  minimal?: boolean;
}) {
  const pathname = usePathname();
  const experience = getProductExperienceFromPathname(pathname);
  const isExperienceAuth =
    Boolean(experience) &&
    (pathname.startsWith("/login/") || pathname.startsWith("/signup/"));
  const backHref = isExperienceAuth && experience ? experience.previewPath : "/";
  const backLabel = isExperienceAuth ? "Workspace preview" : "Home";
  const isEntryStep = progress === "Step 1 of 2";
  const displayTitle =
    isExperienceAuth && experience && isEntryStep
      ? title === "Create your account"
        ? `Create your ${experience.productName} account`
        : `Sign in to ${experience.productName}`
      : title;
  const displayDescription =
    isExperienceAuth && experience && isEntryStep
      ? experience.authContext
      : description;

  return (
    <main
      className="jf-auth-root"
      data-auth-root
      data-auth-minimal={minimal || undefined}
      data-auth-compact={compact || undefined}
      data-auth-experience={isExperienceAuth ? experience?.slug : undefined}
    >
      <MathSymbolField variant="auth" />

      <header className="jf-auth-header">
        <Link
          href="/"
          aria-label={`${APP_NAME} home`}
          className="finance-focus jf-auth-brand"
        >
          <span className="jf-auth-brand-mark">
            <Image
              src={brand.assets.logoMark}
              alt=""
              width={36}
              height={36}
              aria-hidden="true"
            />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <Link
          href={backHref}
          aria-label={
            isExperienceAuth && experience
              ? `Return to the ${experience.productName} preview`
              : `Return to ${APP_NAME} home`
          }
          className="finance-focus jf-auth-home-link"
        >
          <ArrowLeft aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      </header>

      <div className={`jf-auth-layout ${compact ? "jf-auth-layout-compact" : ""}`}>
        <section className="jf-auth-card">
          <div className="jf-auth-card-head">
            {isExperienceAuth && experience ? (
              <div className="mb-5 rounded-[var(--radius-card)] bg-primary-soft p-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-button)] bg-primary text-white">
                    <Layers3 className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.15em] text-primary">
                      {experience.label}
                    </p>
                    <strong className="mt-1 block text-base font-black text-text-primary">
                      {experience.productName}
                    </strong>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {experience.authContext}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="jf-auth-card-meta">
              <div className="jf-auth-card-labels">
                <span className="auth-eyebrow">{eyebrow}</span>
                {progress ? <span className="auth-progress">{progress}</span> : null}
              </div>
              <span className="jf-auth-card-icon">
                <Icon aria-hidden="true" />
              </span>
            </div>

            <h1>{displayTitle}</h1>
            <p>{displayDescription}</p>
          </div>

          <div className="jf-auth-card-body">{children}</div>
        </section>
      </div>

      {minimal ? (
        <footer className="jf-auth-footer">
          <span>
            {isExperienceAuth ? "One account · separate workspaces" : "Secure account access"}
          </span>
          {isExperienceAuth ? (
            <Link href="/start" className="finance-focus">
              Choose workspace
            </Link>
          ) : null}
          <Link href="/privacy" className="finance-focus">
            Privacy
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
