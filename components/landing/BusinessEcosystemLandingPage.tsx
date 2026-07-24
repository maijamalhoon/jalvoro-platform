import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CircleDollarSign,
  CreditCard,
  Globe2,
  Handshake,
  Landmark,
  LockKeyhole,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UsersRound,
  UtensilsCrossed,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  brand,
} from "@/lib/brand";

type Capability = {
  title: string;
  copy: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "red" | "violet" | "amber" | "cyan";
};

const navigation = [
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Businesses", href: "#businesses" },
  { label: "Global readiness", href: "#global" },
  { label: "Trust", href: "#trust" },
] as const;

const capabilities: Capability[] = [
  {
    title: "Finance and accounting",
    copy: "Connect invoicing, expenses, cash, banking, tax-ready records, approvals, and dependable reporting.",
    icon: CircleDollarSign,
    tone: "green",
  },
  {
    title: "Sales and customer operations",
    copy: "Keep customers, leads, quotations, orders, follow-ups, ownership, and service history connected.",
    icon: Handshake,
    tone: "violet",
  },
  {
    title: "Inventory and warehousing",
    copy: "Control products, purchasing, suppliers, warehouses, stock movement, valuation, and reorder workflows.",
    icon: Warehouse,
    tone: "cyan",
  },
  {
    title: "POS and restaurant systems",
    copy: "Support shops, counters, tables, kitchens, orders, payments, returns, shifts, and branch-level operations.",
    icon: ShoppingCart,
    tone: "blue",
  },
  {
    title: "People and daily operations",
    copy: "Manage teams, departments, attendance, payroll readiness, tasks, responsibilities, and approval chains.",
    icon: UsersRound,
    tone: "red",
  },
  {
    title: "Enterprise control",
    copy: "Coordinate branches, entities, roles, permissions, audit trails, integrations, governance, and executive visibility.",
    icon: Landmark,
    tone: "amber",
  },
];

const businessStructures = [
  [Store, "One-person business", "A complete business workspace for freelancers, consultants, sellers, and sole proprietors."],
  [ShoppingCart, "Small shops and retail", "Simple daily operations with room to grow into inventory, teams, branches, and POS."],
  [UtensilsCrossed, "Restaurants and hospitality", "Connected front-of-house, kitchen, staff, stock, payments, and management workflows."],
  [Building2, "Growing and multi-branch companies", "Centralized control with local accountability across teams, locations, and departments."],
  [Landmark, "Dealerships, franchises, and enterprise", "Advanced permissions, governance, integrations, reporting, and organization-wide control."],
] as const;

const activity = [
  { label: "Branch sales posted", detail: "Lahore flagship", value: "PKR 428,000", tone: "positive" },
  { label: "Supplier payment approved", detail: "Operations", value: "PKR 96,500", tone: "negative" },
  { label: "New business order", detail: "Wholesale channel", value: "PKR 184,000", tone: "positive" },
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="finance-focus jf-brand" aria-label={`${APP_NAME} home`}>
      <span className="jf-brand-mark" aria-hidden="true">
        <Image
          src={brand.assets.logoMark}
          alt=""
          width={40}
          height={40}
          className="size-full"
        />
      </span>
      <span className={compact ? "sr-only sm:not-sr-only" : ""}>{APP_NAME}</span>
    </Link>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="finance-focus jf-button jf-button-primary">
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="finance-focus jf-button jf-button-secondary">
      <span>{children}</span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`jf-section-heading ${align === "center" ? "jf-section-heading-center" : ""}`}>
      <p className="jf-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="jf-section-copy">{copy}</p>
    </div>
  );
}

function BusinessPreview() {
  return (
    <figure className="jf-dashboard-preview" aria-labelledby="business-preview-caption">
      <div className="jf-preview-topbar">
        <div>
          <p>Business command workspace</p>
          <strong>Today across operations</strong>
        </div>
        <span className="jf-live-pill"><span />Illustrative preview</span>
      </div>

      <div className="jf-preview-balance">
        <div>
          <p>Net business position</p>
          <strong>PKR 2,845,000</strong>
          <span><BarChart3 aria-hidden="true" /> Connected operational view</span>
        </div>
        <div className="jf-balance-orbit" aria-hidden="true">
          <Building2 />
        </div>
      </div>

      <div className="jf-preview-metrics">
        <div data-tone="green">
          <span><CircleDollarSign aria-hidden="true" /></span>
          <p>Sales today</p>
          <strong>PKR 612K</strong>
        </div>
        <div data-tone="red">
          <span><ReceiptText aria-hidden="true" /></span>
          <p>Open approvals</p>
          <strong>8</strong>
        </div>
        <div data-tone="cyan">
          <span><PackageSearch aria-hidden="true" /></span>
          <p>Stock alerts</p>
          <strong>14</strong>
        </div>
      </div>

      <div className="jf-preview-grid">
        <div className="jf-chart-panel">
          <div className="jf-panel-heading">
            <div>
              <p>Business performance</p>
              <strong>Sales, costs, and operations together</strong>
            </div>
            <BarChart3 aria-hidden="true" />
          </div>

          <div className="jf-chart" role="img" aria-label="Illustrative seven-period business performance chart">
            <span className="jf-chart-gridline" data-line="1" />
            <span className="jf-chart-gridline" data-line="2" />
            <span className="jf-chart-gridline" data-line="3" />
            <svg viewBox="0 0 640 220" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="jalvoro-business-chart-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="jf-chart-area" d="M0 178 C52 170 80 136 130 142 C188 149 212 102 270 112 C330 123 350 74 414 84 C474 95 506 54 562 64 C598 70 618 48 640 38 L640 220 L0 220 Z" />
              <path className="jf-chart-line" d="M0 178 C52 170 80 136 130 142 C188 149 212 102 270 112 C330 123 350 74 414 84 C474 95 506 54 562 64 C598 70 618 48 640 38" />
            </svg>
            <div className="jf-chart-labels" aria-hidden="true">
              <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span>
            </div>
          </div>
        </div>

        <div className="jf-activity-panel">
          <div className="jf-panel-heading">
            <div>
              <p>Operational activity</p>
              <strong>Latest verified movement</strong>
            </div>
            <ReceiptText aria-hidden="true" />
          </div>

          <div className="jf-activity-list">
            {activity.map((item) => (
              <div key={item.label}>
                <span className={`jf-activity-dot jf-activity-dot-${item.tone}`} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <b className={item.tone === "positive" ? "jf-positive" : "jf-negative"}>{item.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption id="business-preview-caption" className="sr-only">
        An illustrative JALVORO business workspace using demonstration values, not live production data.
      </figcaption>
    </figure>
  );
}

export default function BusinessEcosystemLandingPage() {
  const year = new Date().getFullYear();

  return (
    <main className="jf-node4-landing">
      <div className="jf-landing-ambient" aria-hidden="true" />

      <header className="jf-landing-header">
        <div className="jf-header-inner">
          <BrandMark compact />

          <nav className="jf-desktop-nav" aria-label="Landing page navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="finance-focus">{item.label}</a>
            ))}
          </nav>

          <div className="jf-header-actions">
            <Link href="/login" className="finance-focus jf-header-login">Sign in</Link>
            <Link href="/login?mode=signup" className="finance-focus jf-header-cta">
              <span className="hidden sm:inline">Get started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="jf-hero">
        <div className="jf-hero-copy">
          <p className="jf-hero-badge"><Sparkles aria-hidden="true" /> Complete business operating ecosystem</p>
          <h1>Run every part of business. <span>One connected platform.</span></h1>
          <p className="jf-hero-description">{APP_DESCRIPTION}</p>

          <div className="jf-hero-actions">
            <PrimaryButton href="/login?mode=signup">Create a business workspace</PrimaryButton>
            <SecondaryButton href="#ecosystem">Explore the ecosystem</SecondaryButton>
          </div>

          <div className="jf-hero-proof" aria-label="Platform highlights">
            <span><Check aria-hidden="true" /> One-person business to enterprise</span>
            <span><Check aria-hidden="true" /> Pakistan-first, globally ready</span>
            <span><Check aria-hidden="true" /> Privacy and security by design</span>
          </div>
        </div>

        <BusinessPreview />
      </section>

      <section className="jf-value-rail" aria-label="Product values">
        <div>
          {[
            [ShieldCheck, "No-compromise foundation", "Security, performance, accessibility, reliability, and truthful data are product requirements."],
            [Landmark, "One connected source of truth", "Finance, sales, inventory, people, customers, branches, and reporting stay connected."],
            [Globe2, "Built for worldwide business", "Country-aware architecture supports languages, currencies, taxes, time zones, and regional operations."],
          ].map(([Icon, title, copy]) => {
            const ValueIcon = Icon as LucideIcon;
            return (
              <div key={title as string} className="jf-value-item jf-reveal">
                <ValueIcon aria-hidden="true" />
                <span><strong>{title as string}</strong><small>{copy as string}</small></span>
              </div>
            );
          })}
        </div>
      </section>

      <section id="ecosystem" className="jf-section jf-capabilities">
        <div className="jf-reveal">
          <SectionHeading
            eyebrow="JALVORO business ecosystem"
            title="Not one tool. The connected systems a business needs."
            copy="JALVORO brings serious business capabilities under one identity, one workspace foundation, and one controlled platform experience."
          />
        </div>

        <div className="jf-feature-list">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <article key={capability.title} className="jf-feature jf-reveal" data-tone={capability.tone}>
                <span className="jf-feature-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <h3>{capability.title}</h3>
                  <p>{capability.copy}</p>
                </div>
                <ArrowRight className="jf-feature-arrow" aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </section>

      <section id="businesses" className="jf-workflow-section">
        <div className="jf-section">
          <div className="jf-reveal">
            <SectionHeading
              eyebrow="Different business structures"
              title="A purpose-built system for every stage and industry."
              copy="Each business receives relevant onboarding, modules, roles, workflows, reports, devices, and controls without becoming disconnected from the wider JALVORO ecosystem."
              align="center"
            />
          </div>

          <ol className="jf-workflow-list">
            {businessStructures.map(([Icon, title, copy], index) => {
              const StructureIcon = Icon as LucideIcon;
              return (
                <li key={title as string} className="jf-workflow-step jf-reveal">
                  <span className="jf-step-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="jf-step-icon"><StructureIcon aria-hidden="true" /></span>
                  <h3>{title as string}</h3>
                  <p>{copy as string}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="global" className="jf-section jf-insights-section">
        <div className="jf-insights-copy jf-reveal">
          <SectionHeading
            eyebrow="Pakistan-first. Global by architecture."
            title="Local enough to work. Global enough to scale."
            copy="JALVORO is being designed for Pakistan’s real business environment while keeping every major regional rule configurable instead of hard-coded."
          />

          <div className="jf-insight-points">
            <span><CreditCard aria-hidden="true" /><b>Regional commerce</b><small>PKR, taxes, invoices, local payment methods, and country-aware pricing foundations.</small></span>
            <span><Globe2 aria-hidden="true" /><b>Language and locale</b><small>English, Urdu, RTL/LTR readiness, currencies, dates, addresses, phones, and time zones.</small></span>
            <span><ShieldCheck aria-hidden="true" /><b>Compliance-ready controls</b><small>Privacy, consent, auditability, data boundaries, accessibility, and regional governance readiness.</small></span>
          </div>
        </div>

        <div className="jf-insight-visual jf-reveal" role="img" aria-label="Illustrative global business readiness overview">
          <div className="jf-insight-header">
            <div>
              <p>Country-aware foundation</p>
              <strong>Pakistan launch, worldwide expansion</strong>
            </div>
            <span>Configurable</span>
          </div>
          <div className="jf-insight-content">
            <div className="jf-donut" aria-hidden="true">
              <span><strong>1</strong><small>platform</small></span>
            </div>
            <div className="jf-insight-bars">
              {[
                ["Languages and locale", 88, "blue"],
                ["Currencies and tax", 76, "green"],
                ["Security and governance", 94, "violet"],
              ].map(([label, value, tone]) => (
                <div key={label as string}>
                  <span><strong>{label as string}</strong><small>Foundation</small></span>
                  <i><b data-tone={tone as string} style={{ width: `${value}%` }} /></i>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="jf-section jf-privacy-section">
        <div className="jf-privacy-copy jf-reveal">
          <span className="jf-privacy-icon"><LockKeyhole aria-hidden="true" /></span>
          <SectionHeading
            eyebrow="Trust, privacy, and operational control"
            title="Business power without losing control of business data."
            copy="Public website, authenticated workspaces, internal administration, tenants, branches, roles, and sensitive data must remain separated through verified server-side controls."
          />
        </div>

        <div className="jf-privacy-list">
          {[
            [ShieldCheck, "Tenant isolation", "Every organization and workspace remains protected by explicit membership and authorization boundaries."],
            [UsersRound, "Role-based access", "Owners, administrators, finance, operations, managers, and employees only receive the access they require."],
            [ReceiptText, "Truthful auditability", "Important actions, approvals, system changes, and operational events stay reviewable without exposing private content."],
          ].map(([Icon, title, copy]) => {
            const TrustIcon = Icon as LucideIcon;
            return (
              <div key={title as string} className="jf-privacy-item jf-reveal">
                <TrustIcon aria-hidden="true" />
                <span><strong>{title as string}</strong><small>{copy as string}</small></span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="jf-section jf-cta-section">
        <div className="jf-final-cta jf-reveal">
          <span className="jf-cta-icon"><Building2 aria-hidden="true" /></span>
          <div>
            <p className="jf-eyebrow">Begin the worldwide journey</p>
            <h2>{APP_TAGLINE}</h2>
            <p>Start with the business structure you operate today and expand through the connected systems your organization needs tomorrow.</p>
          </div>
          <PrimaryButton href="/login?mode=signup">Start with JALVORO</PrimaryButton>
        </div>
      </section>

      <footer className="jf-landing-footer">
        <div>
          <div className="jf-footer-brand jf-reveal">
            <BrandMark />
            <p>{APP_DESCRIPTION}</p>
          </div>

          <nav className="jf-footer-nav jf-reveal" aria-label="Footer navigation">
            <div>
              <strong>Ecosystem</strong>
              <a href="#ecosystem">Capabilities</a>
              <a href="#businesses">Business structures</a>
              <a href="#global">Global readiness</a>
            </div>
            <div>
              <strong>Access</strong>
              <Link href="/login">Sign in</Link>
              <Link href="/login?mode=signup">Create business workspace</Link>
              <a href="#trust">Security and trust</a>
            </div>
          </nav>

          <p className="jf-footer-bottom jf-reveal">© {year} {APP_NAME}. {APP_TAGLINE}</p>
        </div>
      </footer>
    </main>
  );
}
