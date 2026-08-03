import {
  BrainCircuit,
  Building2,
  CircleDollarSign,
  Handshake,
  Landmark,
  ShoppingCart,
  type LucideIcon,
  WalletCards,
} from "lucide-react";

import { APP_NAME, brand } from "@/lib/brand";

export type Workspace = {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  features: readonly string[];
};

export const navigation = [
  ["Overview", "#overview"],
  ["Workspaces", "#workspaces"],
  ["How it works", "#how-it-works"],
  ["Security", "#security"],
] as const;

export const workspaces: readonly Workspace[] = [
  {
    name: brand.productFamily.personal,
    label: "For personal money",
    description:
      "Track accounts, income, spending, goals, investments, and liabilities in one private personal workspace.",
    icon: WalletCards,
    features: [
      "Accounts and transactions",
      "Goals, investments, and liabilities",
      "Personal analytics and reports",
    ],
  },
  {
    name: brand.productFamily.pos,
    label: "For retail and counters",
    description:
      "Connect checkout, purchases, returns, stock movement, and the daily cash view in one focused operating flow.",
    icon: ShoppingCart,
    features: [
      "Sales, purchases, and returns",
      "Inventory and stock movement",
      "Daily cash and profit view",
    ],
  },
  {
    name: brand.productFamily.business,
    label: "For growing businesses",
    description:
      "Bring accounting, customers, suppliers, teams, approvals, branches, payroll, and assets into one controlled workspace.",
    icon: Building2,
    features: [
      "ERP and accounting",
      "CRM and team workflows",
      "Payroll, assets, and controls",
    ],
  },
  {
    name: `${APP_NAME} Personal Insights`,
    label: "For personal finance clarity",
    description:
      "Turn verified personal activity into readable reporting and AI-assisted guidance without inventing financial data.",
    icon: BrainCircuit,
    features: [
      "Personal finance dashboards",
      "Financial reporting",
      "AI-assisted personal insights",
    ],
  },
];

export const capabilityGroups = [
  [
    CircleDollarSign,
    "Money",
    [
      "Income and expenses",
      "Accounts and banking",
      "Goals and investments",
      "Liabilities and cash flow",
    ],
  ],
  [
    ShoppingCart,
    "Commerce",
    [
      "POS and sales",
      "Purchases and returns",
      "Products and pricing",
      "Stock and warehouses",
    ],
  ],
  [
    Handshake,
    "Relationships",
    [
      "Customers and suppliers",
      "Leads and opportunities",
      "Follow-ups and ownership",
      "Teams and permissions",
    ],
  ],
  [
    Landmark,
    "Operations",
    [
      "Accounting and reporting",
      "Payroll and assets",
      "Branches and approvals",
      "Tax and business controls",
    ],
  ],
] as const;

export const container =
  "mx-auto w-[calc(100%-1.5rem)] max-w-[1480px] sm:w-[calc(100%-2.5rem)] 2xl:w-[calc(100%-8rem)]";
export const focus =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus-ring/25";
export const sectionSpace = "py-[clamp(5rem,7vw,7.5rem)]";
export const sectionTitle =
  "mt-3 text-balance text-[clamp(2.2rem,3.7vw,4.2rem)] font-[710] leading-[1.04] tracking-[-0.05em] text-text-primary";

export const landingStyles = String.raw`
  .jv-atomic ~ .landing-math-field { display: none !important; }
  .jv-hero-viewport {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100svh;
    min-height: 0;
  }
  .jv-hero-grid { overflow: hidden; }
  .jv-enter { animation: jv-enter .68s cubic-bezier(.22,1,.36,1) both; }
  .jv-enter-late { animation: jv-enter .76s .08s cubic-bezier(.22,1,.36,1) both; }
  .jv-usecase-viewport {
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent);
  }
  .jv-usecase-track {
    display: flex;
    width: max-content;
    animation: jv-usecase-loop 48s linear infinite;
    will-change: transform;
  }
  .jv-usecase-viewport:hover .jv-usecase-track,
  .jv-usecase-viewport:focus-visible .jv-usecase-track,
  .jv-usecase-viewport:focus-within .jv-usecase-track {
    animation-play-state: paused;
  }
  .jv-usecase-card {
    box-shadow: var(--shadow-md), var(--surface-highlight);
    transition:
      transform var(--motion-duration-base) var(--motion-ease),
      border-color var(--motion-duration-base) var(--motion-ease),
      box-shadow var(--motion-duration-base) var(--motion-ease);
  }
  @media (hover: hover) and (pointer: fine) {
    .jv-usecase-card:hover {
      transform: translateY(-4px);
      border-color: var(--border-strong);
      box-shadow: var(--shadow-lg), var(--surface-highlight);
    }
  }
  .jv-mini-bar > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    transform-origin: left center;
    animation: jv-bar-fill 2.8s cubic-bezier(.22,1,.36,1) infinite alternate;
  }
  .jv-mini-bar:nth-child(2) > span { animation-delay: .18s; }
  .jv-mini-bar:nth-child(3) > span { animation-delay: .34s; }
  .jv-spark-line {
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: jv-line-draw 3.8s .25s cubic-bezier(.22,1,.36,1) infinite;
  }
  .jv-live-dot { animation: jv-live 1.9s ease-in-out infinite; }
  @keyframes jv-enter {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes jv-usecase-loop {
    to { transform: translateX(-50%); }
  }
  @keyframes jv-bar-fill {
    from { transform: scaleX(.58); opacity: .72; }
    to { transform: scaleX(1); opacity: 1; }
  }
  @keyframes jv-line-draw {
    0%, 12% { stroke-dashoffset: 220; opacity: .55; }
    55%, 88% { stroke-dashoffset: 0; opacity: 1; }
    100% { stroke-dashoffset: 0; opacity: .55; }
  }
  @keyframes jv-live {
    0%, 100% { opacity: .55; transform: scale(.78); }
    50% { opacity: 1; transform: scale(1); }
  }
  @media (max-width: 639px) {
    .jv-hero-badge { display: none !important; }
    .jv-hero-grid { padding-block: .6rem !important; gap: .6rem !important; }
    .jv-hero-title {
      margin-top: 0 !important;
      font-size: clamp(1.9rem, 9.4vw, 2.5rem) !important;
      line-height: 1 !important;
    }
    .jv-hero-copy { margin-top: .6rem !important; font-size: .9rem !important; line-height: 1.42 !important; }
    .jv-hero-actions { margin-top: .7rem !important; }
    .jv-usecase-viewport {
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent);
      mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent);
    }
    .jv-usecase-track { animation-duration: 42s; }
    .jv-usecase-card {
      height: 188px !important;
      padding: .8rem !important;
    }
    .jv-usecase-card h3 {
      margin-top: .55rem !important;
      font-size: .92rem !important;
      line-height: 1.12 !important;
    }
    .jv-usecase-card .jv-card-description { display: none !important; }
    .jv-usecase-card > .mt-auto { padding-top: .45rem !important; }
    .jv-usecase-card > .mt-auto > div { padding: .65rem !important; }
    .jv-usecase-card svg.mt-3,
    .jv-usecase-card .jv-mini-bar,
    .jv-usecase-card .grid-cols-2,
    .jv-usecase-card .grid-cols-3 { display: none !important; }
  }
  @media (max-height: 760px) {
    .jv-landing-header { padding-top: .5rem !important; }
    .jv-hero-grid { padding-block: .75rem !important; gap: .75rem !important; }
    .jv-hero-title { margin-top: .65rem !important; font-size: clamp(2rem, 5.8vw, 4.25rem) !important; }
    .jv-hero-copy { margin-top: .65rem !important; line-height: 1.45 !important; }
    .jv-hero-actions { margin-top: .8rem !important; }
    .jv-hero-proof { margin-top: .65rem !important; }
    .jv-usecase-card { height: 220px !important; }
    .jv-card-description { display: none; }
  }
  @media (max-width: 639px) and (max-height: 760px) {
    .jv-hero-grid { padding-block: .4rem !important; gap: .45rem !important; }
    .jv-hero-title { margin-top: 0 !important; font-size: clamp(1.82rem, 8.8vw, 2.3rem) !important; }
    .jv-hero-copy { margin-top: .45rem !important; }
    .jv-hero-actions { margin-top: .55rem !important; }
    .jv-usecase-card { height: 178px !important; }
  }
  @media (max-height: 660px) {
    .jv-hero-badge,
    .jv-hero-proof { display: none !important; }
    .jv-hero-grid { padding-block: .35rem !important; }
    .jv-hero-title { margin-top: 0 !important; }
    .jv-usecase-card { height: 190px !important; }
    .jv-card-compact-hide { display: none !important; }
  }
  @media (max-width: 639px) and (max-height: 660px) {
    .jv-usecase-card { height: 166px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .jv-atomic *, .jv-atomic *::before, .jv-atomic *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
    .jv-usecase-viewport {
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-mask-image: none;
      mask-image: none;
      scrollbar-width: none;
    }
    .jv-usecase-viewport::-webkit-scrollbar { display: none; }
    .jv-usecase-track { width: max-content; transform: none !important; }
    .jv-usecase-copy { display: none !important; }
    .jv-usecase-card { scroll-snap-align: center; }
  }
`;
