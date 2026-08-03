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
    touch-action: pan-y;
  }
  .jv-usecase-viewport::after {
    position: absolute;
    inset: 0 0 0 auto;
    width: clamp(2rem, 8vw, 6rem);
    pointer-events: none;
    background: linear-gradient(90deg, transparent, var(--background));
    content: "";
    opacity: .72;
  }
  .jv-active-card-wrap > .jv-usecase-card {
    animation: jv-card-enter .46s cubic-bezier(.22,1,.36,1) both;
  }
  .jv-next-card-wrap {
    pointer-events: none;
    opacity: .42;
    filter: blur(3px) saturate(.78);
    transform: scale(.93);
    transform-origin: left center;
  }
  .jv-usecase-card {
    box-shadow: var(--shadow-lg), var(--surface-highlight);
    transition:
      transform var(--motion-duration-base) var(--motion-ease),
      border-color var(--motion-duration-base) var(--motion-ease),
      box-shadow var(--motion-duration-base) var(--motion-ease);
  }
  .jv-usecase-card-preview {
    box-shadow: var(--shadow-md), var(--surface-highlight);
  }
  .jv-card-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }
  .jv-card-scroll::-webkit-scrollbar { display: none; }
  .jv-usecase-card-preview .jv-card-scroll { overflow: hidden; }
  .jv-progress-fill {
    width: var(--jv-progress);
    transform-origin: left center;
    animation: jv-progress-fill 1.25s cubic-bezier(.22,1,.36,1) both;
  }
  .jv-spark-line {
    stroke-dasharray: 340;
    stroke-dashoffset: 340;
    animation: jv-line-draw 1.65s .18s cubic-bezier(.22,1,.36,1) forwards;
  }
  .jv-live-dot { animation: jv-live 1.9s ease-in-out infinite; }

  .jv-inverse-panel {
    color: #f5f8fc;
  }
  .jv-inverse-panel :is(h1, h2, h3, h4, strong, b) {
    color: #f5f8fc !important;
  }
  .jv-inverse-muted {
    color: #c7d1df !important;
  }
  .jv-inverse-action {
    background: #f5f8fc !important;
    color: #12211b !important;
  }
  .jv-inverse-action:hover {
    background: #e9f8f1 !important;
  }

  @media (hover: hover) and (pointer: fine) {
    .jv-usecase-card:not(.jv-usecase-card-preview):hover {
      transform: translateY(-3px);
      border-color: var(--border-strong);
      box-shadow: var(--shadow-overlay), var(--surface-highlight);
    }
  }
  @keyframes jv-enter {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes jv-card-enter {
    from { opacity: .45; transform: translateX(22px) scale(.985); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes jv-progress-fill {
    from { transform: scaleX(.18); opacity: .55; }
    to { transform: scaleX(1); opacity: 1; }
  }
  @keyframes jv-line-draw {
    to { stroke-dashoffset: 0; }
  }
  @keyframes jv-live {
    0%, 100% { opacity: .55; transform: scale(.78); }
    50% { opacity: 1; transform: scale(1); }
  }

  @media (min-width: 900px) and (max-width: 1279px) and (max-height: 900px) {
    .jv-hero-grid {
      grid-template-columns: minmax(0, .72fr) minmax(0, 1.28fr) !important;
      gap: clamp(1.75rem, 3vw, 3rem) !important;
      padding-block: .9rem !important;
    }
    .jv-hero-grid > div:first-child {
      margin-inline: 0 !important;
      text-align: left !important;
    }
    .jv-hero-badge,
    .jv-hero-copy,
    .jv-hero-proof {
      margin-left: 0 !important;
    }
    .jv-hero-actions,
    .jv-hero-proof {
      justify-content: flex-start !important;
    }
    .jv-hero-title {
      font-size: clamp(2.35rem, 5vw, 4.25rem) !important;
    }
  }

  @media (max-width: 639px) {
    .jv-hero-badge { display: none !important; }
    .jv-hero-grid { padding-block: .55rem !important; gap: .55rem !important; }
    .jv-hero-title {
      margin-top: 0 !important;
      font-size: clamp(1.82rem, 8.7vw, 2.35rem) !important;
      line-height: 1 !important;
    }
    .jv-hero-copy {
      margin-top: .5rem !important;
      font-size: .86rem !important;
      line-height: 1.4 !important;
    }
    .jv-hero-actions { margin-top: .62rem !important; }
    .jv-usecase-card {
      height: min(42svh, 360px) !important;
      min-height: 278px;
      padding: .9rem !important;
      border-radius: 1.35rem !important;
    }
    .jv-usecase-card h3 {
      margin-top: .7rem !important;
      font-size: 1.02rem !important;
      line-height: 1.12 !important;
    }
    .jv-card-description {
      margin-top: .4rem !important;
      font-size: .72rem !important;
      line-height: 1.2rem !important;
    }
    .jv-card-scroll { margin-top: .7rem !important; }
    .jv-usecase-viewport::after { width: 2.4rem; }
  }

  @media (max-height: 820px) {
    .jv-landing-header { padding-top: .5rem !important; }
    .jv-hero-grid { padding-block: .65rem !important; gap: .65rem !important; }
    .jv-hero-title {
      margin-top: .55rem !important;
      font-size: clamp(2rem, 5.5vw, 4rem) !important;
    }
    .jv-hero-copy { margin-top: .55rem !important; line-height: 1.4 !important; }
    .jv-hero-actions { margin-top: .7rem !important; }
    .jv-hero-proof { margin-top: .55rem !important; }
    .jv-usecase-card { height: min(44svh, 350px) !important; }
  }

  @media (max-width: 639px) and (max-height: 820px) {
    .jv-hero-grid { padding-block: .32rem !important; gap: .38rem !important; }
    .jv-hero-title {
      margin-top: 0 !important;
      font-size: clamp(1.72rem, 8.2vw, 2.15rem) !important;
    }
    .jv-hero-copy { margin-top: .35rem !important; }
    .jv-hero-actions { margin-top: .45rem !important; }
    .jv-usecase-card { height: min(39svh, 305px) !important; min-height: 248px; }
  }

  @media (max-height: 660px) {
    .jv-hero-badge,
    .jv-hero-proof { display: none !important; }
    .jv-hero-grid { padding-block: .25rem !important; }
    .jv-hero-title { margin-top: 0 !important; }
    .jv-usecase-card { height: min(40svh, 275px) !important; min-height: 230px; }
    .jv-card-description { display: none !important; }
  }

  @media (max-width: 639px) and (max-height: 660px) {
    .jv-usecase-card { height: min(37svh, 248px) !important; min-height: 214px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .jv-atomic *, .jv-atomic *::before, .jv-atomic *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
    .jv-next-card-wrap { filter: none; opacity: .55; }
  }
`;