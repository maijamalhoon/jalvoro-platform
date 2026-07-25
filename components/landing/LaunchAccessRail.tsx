import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const personalSignupHref = "/login?mode=signup&next=/dashboard";
const businessSignupHref = "/login?mode=signup&next=/business";

export function LaunchAccessRail() {
  return (
    <aside
      className="relative z-50 border-b border-border/70 bg-surface-secondary text-text-primary"
      aria-label="Current access and workspace options"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <p className="flex min-h-9 items-center gap-2 text-xs font-semibold sm:text-sm">
          <CircleDollarSign aria-hidden="true" className="size-4 shrink-0 text-success" />
          <span>
            <strong className="text-text-primary">Free access.</strong>{" "}
            <span className="text-text-secondary">No payment required.</span>
          </span>
        </p>

        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Choose a workspace"
        >
          <Link
            href={personalSignupHref}
            className="finance-focus inline-flex min-h-9 items-center gap-2 rounded-full bg-background px-3 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:bg-hover sm:text-sm"
          >
            <UserRound aria-hidden="true" className="size-4 text-primary" />
            Personal workspace
          </Link>
          <Link
            href={businessSignupHref}
            className="finance-focus inline-flex min-h-9 items-center gap-2 rounded-full bg-active px-3 text-xs font-semibold text-text-inverse transition-opacity hover:opacity-90 sm:text-sm"
          >
            <Building2 aria-hidden="true" className="size-4" />
            Business workspace
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </nav>
      </div>
    </aside>
  );
}

export function LaunchLegalRail() {
  return (
    <footer className="border-t border-border/70 bg-background text-text-secondary">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="flex items-start gap-2 text-xs leading-5 sm:text-sm">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          Free access is the only active public plan. Paid pricing and payment collection are not advertised.
        </p>

        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold sm:text-sm"
          aria-label="Legal, disclosure, and support links"
        >
          <Link className="finance-focus hover:text-text-primary" href="/privacy">
            Privacy
          </Link>
          <Link className="finance-focus hover:text-text-primary" href="/terms">
            Terms
          </Link>
          <Link className="finance-focus hover:text-text-primary" href="/disclosures">
            Disclosures
          </Link>
          <Link className="finance-focus hover:text-text-primary" href="/support">
            Support
          </Link>
        </nav>
      </div>
    </footer>
  );
}
