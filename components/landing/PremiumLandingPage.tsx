import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  BrainCircuit,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Database,
  FileBarChart,
  Goal,
  Handshake,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { APP_NAME, APP_TAGLINE, brand } from "@/lib/brand";

type Workspace = {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  features: readonly string[];
  tone: "green" | "blue" | "amber" | "violet";
};

const navigation = [
  ["Overview", "#overview"],
  ["Workspaces", "#workspaces"],
  ["How it works", "#how-it-works"],
  ["Security", "#security"],
] as const;

const workspaces: readonly Workspace[] = [
  {
    name: brand.productFamily.personal,
    label: "For everyday money",
    description:
      "Know what you own, owe, earn, spend, save, and invest without stitching together multiple apps.",
    icon: WalletCards,
    features: ["Accounts and transactions", "Goals, investments, and liabilities", "Analytics and reports"],
    tone: "green",
  },
  {
    name: brand.productFamily.pos,
    label: "For shops and counters",
    description:
      "Move from checkout to stock and daily cash with one simple operating flow built for speed.",
    icon: ShoppingCart,
    features: ["Sales, purchases, and returns", "Inventory and stock movement", "Daily cash and profit view"],
    tone: "blue",
  },
  {
    name: brand.productFamily.business,
    label: "For growing operations",
    description:
      "Connect finance, customers, suppliers, people, approvals, branches, and assets as the business expands.",
    icon: Building2,
    features: ["ERP and accounting", "CRM and team workflows", "Payroll, assets, and controls"],
    tone: "amber",
  },
  {
    name: `${APP_NAME} Intelligence`,
    label: "For clearer decisions",
    description:
      "Turn verified activity into readable reporting, practical prompts, and decision support without invented data.",
    icon: BrainCircuit,
    features: ["Connected dashboards", "Operational reporting", "AI-assisted insights"],
    tone: "violet",
  },
];

const tones = {
  green: {
    icon: "bg-emerald-50 text-emerald-700",
    glow: "bg-emerald-100",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600",
    glow: "bg-blue-100",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    glow: "bg-amber-100",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    glow: "bg-violet-100",
  },
} as const;

const capabilityGroups = [
  [CircleDollarSign, "Money", ["Income and expenses", "Accounts and banking", "Goals and investments", "Liabilities and cash flow"]],
  [ShoppingCart, "Commerce", ["POS and sales", "Purchases and returns", "Products and pricing", "Stock and warehouses"]],
  [Handshake, "Relationships", ["Customers and suppliers", "Leads and opportunities", "Follow-ups and ownership", "Teams and permissions"]],
  [Landmark, "Operations", ["Accounting and reporting", "Payroll and assets", "Branches and approvals", "Tax and business controls"]],
] as const;

const landingStyles = String.raw`
  .jv-atomic ~ .landing-math-field { display: none !important; }
  .jv-enter { animation: jv-enter .72s cubic-bezier(.22,1,.36,1) both; }
  .jv-enter-late { animation: jv-enter .82s .08s cubic-bezier(.22,1,.36,1) both; }
  .jv-float { animation: jv-float 8s 1s ease-in-out infinite; }
  .jv-chart-line { stroke-dasharray: 900; stroke-dashoffset: 900; animation: jv-draw 1.5s .45s ease forwards; }
  @keyframes jv-enter { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes jv-float { 0%,100% { transform: translateY(0) rotate(-.35deg); } 50% { transform: translateY(-7px) rotate(.1deg); } }
  @keyframes jv-draw { to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .jv-atomic *, .jv-atomic *::before, .jv-atomic *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  }
`;

const container = "mx-auto w-[calc(100%-1.75rem)] max-w-[1480px] 2xl:w-[calc(100%-6rem)] 2xl:max-w-[1640px]";
const focus = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20";
const sectionTitle = "mt-3 text-balance text-[clamp(2.35rem,4vw,4.5rem)] font-[710] leading-[1.02] tracking-[-0.055em] text-[#12211b]";

function BrandMark() {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 font-bold tracking-[0.08em] text-[#12211b] ${focus}`} aria-label={`${APP_NAME} home`}>
      <span className="grid size-10 place-items-center rounded-xl bg-emerald-50">
        <Image src={brand.assets.logoMark} alt="" width={31} height={31} priority />
      </span>
      <span>{APP_NAME}</span>
    </Link>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_18px_36px_rgba(5,150,105,.3)] ${focus}`}
    >
      {children}<ArrowRight className="size-[18px]" aria-hidden="true" />
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">{children}</p>;
}

function ProductPreview() {
  const previewIcons = [LayoutDashboard, WalletCards, ShoppingCart, PackageSearch, Users, FileBarChart];

  return (
    <figure className="jv-enter-late relative m-0 min-w-0">
      <div className="absolute -inset-10 -z-10 rounded-full bg-emerald-200/35 blur-3xl" aria-hidden="true" />
      <div className="jv-float grid min-h-[610px] grid-cols-[70px_minmax(0,1fr)] overflow-hidden rounded-[28px] border border-[#12211b]/10 bg-white shadow-[0_30px_90px_rgba(28,55,43,.14)] max-sm:min-h-[490px] max-sm:grid-cols-[46px_minmax(0,1fr)] max-sm:rounded-[22px]">
        <aside className="flex flex-col items-center gap-3 border-r border-[#12211b]/[0.07] bg-[#fbfcfb] px-3 py-5 max-sm:gap-2 max-sm:px-1.5 max-sm:py-3" aria-hidden="true">
          <span className="mb-3 grid size-10 place-items-center max-sm:mb-1 max-sm:size-8">
            <Image src={brand.assets.logoMark} alt="" width={26} height={26} />
          </span>
          {previewIcons.map((Icon, index) => (
            <span key={index} className={`grid size-10 place-items-center rounded-xl max-sm:size-8 ${index === 0 ? "bg-emerald-50 text-emerald-700" : "text-slate-400"}`}>
              <Icon className="size-[18px] max-sm:size-4" />
            </span>
          ))}
        </aside>

        <div className="min-w-0 bg-gradient-to-b from-white to-[#fbfcfb] p-7 max-xl:p-5 max-sm:px-3 max-sm:py-4">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="m-0 text-[11px] font-semibold text-slate-400">Unified workspace</p>
              <strong className="mt-1 block text-lg tracking-tight max-sm:text-sm">Your unified workspace</strong>
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 max-sm:hidden"><i className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.1)]" /> Demo workspace</span>
          </div>

          <div className="mt-6 flex w-max max-w-full gap-1 rounded-xl border border-[#12211b]/[0.07] bg-slate-100 p-1 text-[11px] font-semibold text-slate-500 max-sm:mt-4">
            <span className="rounded-lg bg-white px-3 py-2 text-[#12211b] shadow-sm max-sm:px-2">Personal</span>
            <span className="px-3 py-2 max-sm:px-2">POS</span>
            <span className="px-3 py-2 max-sm:px-2">Business</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 max-sm:grid-cols-2 max-sm:gap-2">
            {[
              [WalletCards, "Available balance", "USD 248,500", "8.4% this month", "bg-emerald-50 text-emerald-700"],
              [ShoppingCart, "Sales today", "USD 18,240", "126 completed orders", "bg-blue-50 text-blue-600"],
              [Boxes, "Stock attention", "12 items", "Reorder review needed", "bg-amber-50 text-amber-700"],
            ].map(([Icon, label, value, detail, tone], index) => {
              const MetricIcon = Icon as LucideIcon;
              return (
                <article key={label as string} className={`min-w-0 rounded-2xl border border-[#12211b]/[0.07] bg-white p-4 max-sm:p-3 ${index === 2 ? "max-sm:hidden" : ""}`}>
                  <span className={`mb-4 grid size-8 place-items-center rounded-[10px] max-sm:mb-2 ${tone as string}`}><MetricIcon className="size-4" /></span>
                  <p className="m-0 text-[11px] font-semibold text-slate-400">{label as string}</p>
                  <strong className="mt-1.5 block truncate text-[clamp(.86rem,1.1vw,1.1rem)] tracking-tight">{value as string}</strong>
                  <small className="mt-2 block truncate text-[10px] text-slate-400">{detail as string}</small>
                </article>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-[1.4fr_.8fr] gap-3 max-xl:grid-cols-1">
            <article className="min-w-0 rounded-2xl border border-[#12211b]/[0.07] bg-white p-5 max-sm:p-3.5">
              <div className="flex items-center justify-between gap-4">
                <div><p className="m-0 text-[11px] font-semibold text-slate-400">Connected performance</p><strong className="mt-1 block text-sm">Money and operations</strong></div>
                <BarChart3 className="size-[18px] text-slate-400" aria-hidden="true" />
              </div>
              <div className="relative mt-3 h-[215px] overflow-hidden max-sm:h-[170px]" role="img" aria-label="Illustrative seven period performance chart">
                <span className="absolute inset-x-0 bottom-6 top-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_49px,rgba(18,33,27,.055)_50px_51px)]" />
                <svg className="absolute inset-x-0 bottom-6 top-3 h-[calc(100%-36px)] w-full overflow-visible text-emerald-600" viewBox="0 0 620 220" preserveAspectRatio="none" aria-hidden="true">
                  <defs><linearGradient id="jv-area-atomic" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.22" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
                  <path fill="url(#jv-area-atomic)" d="M0 181 C58 173 78 136 132 143 C189 151 212 103 270 108 C326 113 351 61 410 76 C468 91 505 45 559 57 C590 64 606 45 620 31 L620 220 L0 220 Z" />
                  <path className="jv-chart-line" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.2" vectorEffect="non-scaling-stroke" d="M0 181 C58 173 78 136 132 143 C189 151 212 103 270 108 C326 113 351 61 410 76 C468 91 505 45 559 57 C590 64 606 45 620 31" />
                </svg>
                <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] font-semibold text-slate-400"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
              </div>
            </article>

            <article className="rounded-2xl border border-[#12211b]/[0.07] bg-white p-5 max-xl:hidden">
              <div className="flex items-center justify-between"><div><p className="m-0 text-[11px] font-semibold text-slate-400">What needs attention</p><strong className="mt-1 block text-sm">Today&apos;s control list</strong></div><ShieldCheck className="size-[18px] text-slate-400" /></div>
              <div className="mt-5 grid gap-3">
                {[
                  [ReceiptText, "3 invoices to review", "Finance", "bg-blue-50 text-blue-600"],
                  [PackageSearch, "12 low-stock items", "Inventory", "bg-amber-50 text-amber-700"],
                  [Goal, "Goal is 72% funded", "Personal", "bg-emerald-50 text-emerald-700"],
                ].map(([Icon, label, area, tone]) => {
                  const ItemIcon = Icon as LucideIcon;
                  return <span key={label as string} className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-x-2.5 rounded-xl bg-slate-50 p-2.5"><i className={`row-span-2 grid size-[34px] place-items-center rounded-[10px] ${tone as string}`}><ItemIcon className="size-4" /></i><b className="truncate text-[11px]">{label as string}</b><small className="text-[9px] text-slate-400">{area as string}</small></span>;
                })}
              </div>
            </article>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">An illustrative Jalvoro workspace using demonstration values, not live customer data.</figcaption>
    </figure>
  );
}

export default function PremiumLandingPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <main className="jv-atomic relative isolate min-h-screen overflow-x-clip bg-[#f7faf8] font-sans text-[#12211b]">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[940px] bg-[radial-gradient(circle_at_79%_13%,rgba(85,196,155,.2),transparent_30%),radial-gradient(circle_at_11%_22%,rgba(57,120,230,.08),transparent_26%),linear-gradient(180deg,#fbfdfc_0%,rgba(247,250,248,0)_100%)]" />

        <header className="relative z-20 pt-3 sm:pt-5">
          <div className={`${container} grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] border border-[#12211b]/[0.08] bg-white/85 px-3 py-2 shadow-[0_12px_42px_rgba(24,52,40,.06)] backdrop-blur-xl lg:min-h-[72px] lg:grid-cols-[auto_1fr_auto] lg:gap-8 lg:rounded-3xl lg:px-4`}>
            <BrandMark />
            <nav className="hidden items-center justify-center gap-[clamp(1.25rem,2.3vw,2.4rem)] lg:flex" aria-label="Landing page navigation">
              {navigation.map(([label, href]) => <a key={href} href={href} className={`text-sm font-semibold text-slate-600 transition hover:text-[#12211b] ${focus}`}>{label}</a>)}
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/start?mode=login" prefetch={false} className={`hidden text-sm font-semibold text-slate-600 transition hover:text-[#12211b] sm:block ${focus}`}>Sign in</Link>
              <Link href="/start" prefetch={false} className={`inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#12211b] px-4 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1a3328] sm:text-sm ${focus}`}>Get started<ArrowRight className="hidden size-4 sm:block" /></Link>
            </div>
          </div>
        </header>

        <section id="overview" className={`${container} grid min-h-[760px] items-center gap-14 py-16 lg:grid-cols-[minmax(0,.84fr)_minmax(580px,1.16fr)] lg:gap-[clamp(3.5rem,6vw,6.75rem)] lg:py-[clamp(5rem,8vw,8.25rem)]`}>
          <div className="jv-enter mx-auto max-w-[760px] text-center lg:mx-0 lg:text-left">
            <p className="mx-auto inline-flex w-max max-w-full items-center gap-2 rounded-full border border-emerald-600/15 bg-emerald-50/80 px-3.5 py-2 text-[11px] font-bold text-emerald-700 lg:mx-0"><Sparkles className="size-4" /> Personal finance to business operations</p>
            <h1 className="mt-6 text-balance text-[clamp(2.8rem,5.15vw,6.15rem)] font-[735] leading-[.97] tracking-[-0.065em]">Run your money, shop, team, and business <span className="text-emerald-600">without the app chaos.</span></h1>
            <p className="mx-auto mt-6 max-w-[690px] text-[clamp(1rem,1.35vw,1.24rem)] leading-7 text-slate-600 lg:mx-0 lg:leading-8">{APP_NAME} connects the tools you use today with the operations you will need tomorrow—inside one clear, private, and responsive platform.</p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center lg:justify-start">
              <PrimaryLink href="/start">Start with Jalvoro</PrimaryLink>
              <Link href="#workspaces" className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-[#12211b]/10 bg-white/75 px-6 text-sm font-bold transition hover:-translate-y-0.5 hover:border-[#12211b]/20 hover:bg-white ${focus}`}>Explore the platform<ChevronRight className="size-[18px]" /></Link>
            </div>
            <div className="mx-auto mt-7 grid w-max max-w-full justify-start gap-3 text-left text-xs font-semibold text-slate-600 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-5 lg:mx-0 lg:justify-start">
              {["Personal and business workspaces", "POS, inventory, CRM, and ERP", "Privacy-first architecture"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="size-4 rounded-full bg-emerald-50 p-[3px] text-emerald-700" />{item}</span>)}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[840px]"><ProductPreview /></div>
        </section>

        <section className="border-y border-[#12211b]/[0.07] bg-white/55">
          <div className={`${container} grid lg:grid-cols-3`}>
            {[
              [Database, "Record once", "Keep connected activity in one source of truth."],
              [LayoutDashboard, "See clearly", "Turn complex work into readable next actions."],
              [TrendingUp, "Scale naturally", "Add products and controls without restarting."],
            ].map(([Icon, title, copy], index) => {
              const RailIcon = Icon as LucideIcon;
              return <article key={title as string} className={`flex items-center gap-4 border-b border-[#12211b]/[0.07] py-5 lg:min-h-32 lg:border-b-0 lg:px-10 ${index < 2 ? "lg:border-r" : ""} ${index === 0 ? "lg:pl-0" : ""}`}><RailIcon className="size-6 shrink-0 text-emerald-700" /><span className="grid gap-1"><strong className="text-sm">{title as string}</strong><small className="text-xs leading-5 text-slate-500">{copy as string}</small></span></article>;
            })}
          </div>
        </section>

        <section id="workspaces" className={`${container} py-[clamp(5.75rem,9vw,9.5rem)]`}>
          <div className="grid items-end gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,.65fr)] lg:gap-[clamp(3rem,7vw,7rem)]">
            <div><Eyebrow>One platform, four layers</Eyebrow><h2 className={sectionTitle}>Start with the problem you have today.</h2></div>
            <p className="m-0 max-w-3xl text-base leading-7 text-slate-600">You do not need an enterprise system on day one. Choose a focused workspace now and keep a connected foundation for what comes next.</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workspaces.map((workspace, index) => {
              const Icon = workspace.icon;
              const tone = tones[workspace.tone];
              return (
                <article key={workspace.name} className="group relative flex min-h-[450px] flex-col overflow-hidden rounded-3xl border border-[#12211b]/[0.07] bg-white/90 p-7 transition duration-300 hover:-translate-y-1.5 hover:border-[#12211b]/15 hover:shadow-[0_24px_55px_rgba(28,55,43,.1)]">
                  <span className={`absolute -right-20 -top-20 size-52 rounded-full opacity-70 transition duration-500 group-hover:scale-110 ${tone.glow}`} />
                  <span className="absolute right-6 top-6 z-10 text-[11px] font-bold text-[#12211b]/25">0{index + 1}</span>
                  <span className={`relative z-10 grid size-12 place-items-center rounded-[14px] ${tone.icon}`}><Icon className="size-[22px]" /></span>
                  <p className="mt-12 text-xs font-semibold text-slate-500">{workspace.label}</p>
                  <h3 className="mt-2 text-[1.4rem] font-bold tracking-[-0.035em]">{workspace.name}</h3>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{workspace.description}</p>
                  <ul className="mt-auto grid list-none gap-3 border-t border-[#12211b]/[0.07] pt-6 text-xs font-medium text-slate-600">
                    {workspace.features.map((feature) => <li key={feature} className="flex items-center gap-2.5"><Check className="size-3.5 shrink-0 text-emerald-600" />{feature}</li>)}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-[#12211b]/[0.07] bg-white py-[clamp(5.75rem,9vw,9.5rem)]">
          <div className={`${container} grid items-center gap-14 lg:grid-cols-[minmax(0,.82fr)_minmax(500px,1.18fr)] lg:gap-[clamp(4rem,9vw,9rem)]`}>
            <div>
              <Eyebrow>Built around the work</Eyebrow>
              <h2 className={sectionTitle}>Not another dashboard that only looks busy.</h2>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">Jalvoro is structured around real actions: record money, sell products, move stock, follow customers, approve work, and understand results.</p>
              <div className="mt-8 grid gap-5">
                {[
                  [ReceiptText, "Fewer duplicate entries", "Connected records reduce repeated manual work."],
                  [FileBarChart, "Reports with context", "Every summary stays tied to the activity behind it."],
                  [ShieldCheck, "Honest system states", "Unavailable or partial data is labelled instead of fabricated."],
                ].map(([Icon, title, copy]) => {
                  const PointIcon = Icon as LucideIcon;
                  return <span key={title as string} className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-x-3.5"><PointIcon className="row-span-2 size-[42px] rounded-xl bg-emerald-50 p-3 text-emerald-700" /><b className="text-sm">{title as string}</b><small className="mt-0.5 text-xs leading-5 text-slate-500">{copy as string}</small></span>;
                })}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-[#12211b]/[0.07] bg-[radial-gradient(circle_at_50%_42%,rgba(15,159,110,.1),transparent_34%),#f8fbf9] p-[clamp(1.5rem,4vw,3.4rem)]">
              <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
                <span className="flex min-h-[72px] items-center justify-center gap-2.5 rounded-2xl border border-[#12211b]/[0.07] bg-white p-4 text-center text-xs font-bold shadow-sm"><ShoppingCart className="size-5 text-emerald-700" /> Sale recorded</span>
                <ArrowRight className="mx-auto size-5 rotate-90 text-emerald-600 md:rotate-0" />
                <span className="flex min-h-[72px] items-center justify-center gap-2.5 rounded-2xl border border-[#12211b]/[0.07] bg-white p-4 text-center text-xs font-bold shadow-sm"><Boxes className="size-5 text-emerald-700" /> Stock updated</span>
              </div>
              <div className="my-5 grid gap-2.5 md:grid-cols-3">
                {[[CircleDollarSign, "Cash reflected"], [Users, "Customer history"], [BarChart3, "Report refreshed"]].map(([Icon, label]) => {
                  const FlowIcon = Icon as LucideIcon;
                  return <span key={label as string} className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-[#12211b]/[0.07] bg-white p-3 text-center text-xs font-bold"><FlowIcon className="size-5 text-emerald-700" />{label as string}</span>;
                })}
              </div>
              <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-[#12211b] p-4 text-white shadow-[0_18px_40px_rgba(18,33,27,.18)]"><BrainCircuit className="size-7 shrink-0 text-emerald-300" /><div className="grid gap-1"><small className="text-[10px] text-slate-300">Decision support</small><strong className="text-xs leading-5">One action. Every relevant view stays connected.</strong></div></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={`${container} py-[clamp(5.75rem,9vw,9.5rem)]`}>
          <div className="mx-auto max-w-4xl text-center"><Eyebrow>How it works</Eyebrow><h2 className={sectionTitle}>A simple path from scattered work to one system.</h2><p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-600">Jalvoro grows in layers, so setup stays understandable and the platform never becomes heavier than the work requires.</p></div>
          <div className="mt-14 grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:border-y xl:border-[#12211b]/10">
            {[
              ["01", "Choose a workspace", "Begin with Personal, POS, or Business based on the job you need to solve first."],
              ["02", "Bring the essentials", "Add the accounts, products, customers, or operational records that matter now."],
              ["03", "Run daily work", "Use focused workflows instead of jumping between disconnected tools and spreadsheets."],
              ["04", "Add the next layer", "Expand into inventory, CRM, ERP, reporting, and controls when the need becomes real."],
            ].map(([number, title, copy], index) => <article key={number} className={`min-h-[240px] rounded-2xl border border-[#12211b]/10 p-7 xl:min-h-[280px] xl:rounded-none xl:border-y-0 xl:border-l-0 xl:p-8 ${index < 3 ? "xl:border-r" : "xl:border-r-0"}`}><span className="text-xs font-bold text-emerald-600">{number}</span><h3 className="mt-12 text-lg font-bold tracking-tight xl:mt-16">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p></article>)}
          </div>
        </section>

        <section className="bg-[#12211b] py-[clamp(5.75rem,9vw,9.5rem)] text-white">
          <div className={container}>
            <div className="grid items-end gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,.65fr)] lg:gap-[clamp(3rem,7vw,7rem)]">
              <div><p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">Platform coverage</p><h2 className="mt-3 text-balance text-[clamp(2.35rem,4vw,4.5rem)] font-[710] leading-[1.02] tracking-[-0.055em]">More than finance. More than business software.</h2></div>
              <p className="m-0 text-base leading-7 text-slate-300">Jalvoro brings personal clarity and operational control into the same product family while keeping their data and permissions properly separated.</p>
            </div>
            <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {capabilityGroups.map(([Icon, title, items]) => {
                const GroupIcon = Icon as LucideIcon;
                return <article key={title} className="min-h-[320px] rounded-3xl border border-white/10 bg-white/[0.045] p-7"><span className="grid size-11 place-items-center rounded-[13px] bg-emerald-300/10 text-emerald-300"><GroupIcon className="size-5" /></span><h3 className="mt-12 text-xl font-bold">{title}</h3><ul className="mt-5 grid list-none gap-3 text-sm text-slate-300">{items.map((item) => <li key={item} className="before:mr-2.5 before:text-emerald-300 before:content-['•']">{item}</li>)}</ul></article>;
              })}
            </div>
          </div>
        </section>

        <section id="security" className={`${container} py-[clamp(5.75rem,9vw,9.5rem)]`}>
          <div className="grid items-center gap-7 rounded-[30px] border border-[#12211b]/[0.07] bg-white p-[clamp(2rem,5vw,4.4rem)] shadow-[0_24px_70px_rgba(28,55,43,.07)] lg:grid-cols-[auto_minmax(0,1fr)_minmax(250px,.45fr)] lg:gap-[clamp(2rem,4vw,4rem)]">
            <span className="grid size-20 place-items-center rounded-3xl bg-emerald-50 text-emerald-700"><LockKeyhole className="size-8" /></span>
            <div><Eyebrow>Privacy by design</Eyebrow><h2 className="mt-3 max-w-4xl text-balance text-[clamp(2.1rem,3vw,3.35rem)] font-[710] leading-[1.04] tracking-[-0.05em]">Your personal life and business operations are connected by product—not mixed by default.</h2><p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Verified access, separated workspaces, clear permissions, and honest data states are part of the platform structure, not an afterthought.</p></div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{[[ShieldCheck, "Separated workspaces"], [Users, "Role-based access"], [Database, "Verified source data"]].map(([Icon, label]) => { const SecurityIcon = Icon as LucideIcon; return <span key={label as string} className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#f7faf8] px-4 text-xs font-bold text-slate-600"><SecurityIcon className="size-[18px] text-emerald-700" />{label as string}</span>; })}</div>
          </div>
        </section>

        <section className={`${container} mb-[clamp(3.5rem,7vw,6.25rem)] grid items-center gap-10 overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_82%_30%,rgba(110,231,183,.18),transparent_24%),#12211b] p-[clamp(2.5rem,6vw,4.8rem)] text-white lg:grid-cols-[minmax(0,1fr)_auto]`}>
          <div><p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-emerald-300">{APP_TAGLINE}</p><h2 className="mt-3 max-w-4xl text-balance text-[clamp(2.2rem,3.6vw,4rem)] font-[710] leading-[1.02] tracking-[-0.055em]">Stop building your system from disconnected apps.</h2><span className="mt-5 block max-w-3xl text-base leading-7 text-slate-300">Choose the Jalvoro workspace that solves today&apos;s problem and keep room for tomorrow&apos;s growth.</span></div>
          <Link href="/start" prefetch={false} className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 text-sm font-bold text-[#12211b] transition hover:-translate-y-0.5 hover:bg-emerald-50 ${focus}`}>Choose your workspace<ArrowRight className="size-[18px]" /></Link>
        </section>

        <footer className="border-t border-[#12211b]/10 bg-[#f1f5f2]">
          <div className={`${container} grid min-h-[180px] items-center gap-8 py-10 md:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_auto] xl:gap-12`}>
            <div><BrandMark /><p className="mt-2.5 text-xs text-slate-500">{APP_TAGLINE}</p></div>
            <nav className="flex flex-wrap gap-6 text-xs font-medium text-slate-500" aria-label="Footer navigation"><Link href="/support" className={focus}>Support</Link><Link href="/privacy" className={focus}>Privacy</Link><Link href="/terms" className={focus}>Terms</Link></nav>
            <small className="text-xs text-slate-500 md:col-span-2 xl:col-span-1">© {year} {APP_NAME}. All rights reserved.</small>
          </div>
        </footer>
      </main>
    </>
  );
}
