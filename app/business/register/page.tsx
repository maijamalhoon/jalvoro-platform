import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  BriefcaseBusiness,
  Network,
  ShieldCheck,
  Store,
} from "lucide-react";

import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Register a Business | ${APP_NAME}`,
  description: "Register a Business organization as its owner or authorized administrator.",
  robots: { index: false, follow: false },
};

type ProductKey =
  | "solo_business"
  | "retail_pos"
  | "growing_business"
  | "enterprise";

const products = [
  {
    key: "solo_business" as const,
    title: "Solo Business",
    audience: "Freelancers, consultants, and owner-operated businesses",
    copy: "A focused operating workspace with finance, customers, invoices, expenses, and room to invite an accountant or assistant later.",
    icon: BriefcaseBusiness,
  },
  {
    key: "retail_pos" as const,
    title: "Retail & POS",
    audience: "Shops, restaurants, counters, and branch-based retail",
    copy: "Sales, purchases, stock, registers, shifts, cash controls, and scoped cashier access with manager approvals for sensitive actions.",
    icon: Store,
  },
  {
    key: "growing_business" as const,
    title: "Growing Business",
    audience: "Small and mid-sized teams with expanding operations",
    copy: "Accounting, CRM, inventory, payroll, branches, approvals, documents, budgeting, and role-based management in one tenant.",
    icon: Building2,
  },
  {
    key: "enterprise" as const,
    title: "Enterprise Operations",
    audience: "Large organizations, departments, controls, and audit needs",
    copy: "Enterprise-ready identity, departments, approval chains, least-privilege access, audit trails, and a future path to SSO and automated provisioning.",
    icon: Network,
  },
] satisfies ReadonlyArray<{
  key: ProductKey;
  title: string;
  audience: string;
  copy: string;
  icon: typeof Building2;
}>;

function registrationHref(product: ProductKey) {
  const next = `/business?setup=1&product=${product}`;
  const params = new URLSearchParams({
    product,
    next,
  });
  return `/business/signup?${params.toString()}`;
}

export default function BusinessRegisterPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/start"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Product selection
          </Link>
          <Link
            href="/business/login"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm font-black text-text-primary"
          >
            Existing organization sign in <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <header className="mx-auto mt-10 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Authorized representative only
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-text-primary sm:text-5xl">
            Choose the Business product your organization needs.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
            Registration creates the Organization Owner account. Managers, administrators, IT,
            HR, finance teams, auditors, and employees are then invited or provisioned from inside
            the organization.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label="Business products">
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <article
                key={product.key}
                className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-black text-text-primary">{product.title}</h2>
                <p className="mt-1 text-sm font-bold text-primary">{product.audience}</p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{product.copy}</p>
                <Link
                  href={registrationHref(product.key)}
                  className="finance-focus mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
                >
                  Register {product.title} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-8 max-w-4xl rounded-[var(--radius-card)] bg-surface-secondary p-5 sm:p-6">
          <h2 className="text-base font-black text-text-primary">Before continuing</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-text-secondary sm:grid-cols-2">
            <li>You must be authorized to register this organization.</li>
            <li>The first account becomes Organization Owner.</li>
            <li>Employees do not create public Business memberships.</li>
            <li>Permanent employee passwords are never visible to administrators.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
