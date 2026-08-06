import {
  Building2,
  CircleDollarSign,
  Handshake,
  Landmark,
  ShoppingCart,
  type LucideIcon,
  WalletCards,
} from "lucide-react";

import { brand } from "@/lib/brand";

export type Workspace = {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  features: readonly string[];
  href: string;
  cta: string;
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
      "Track accounts, income, spending, goals, investments, liabilities, reports, and AI-assisted insights in one private Individual workspace.",
    icon: WalletCards,
    features: [
      "Accounts and transactions",
      "Goals, investments, and liabilities",
      "Personal reports and assisted insights",
    ],
    href: "/individual/signup?source=landing-personal",
    cta: "Start with Personal",
  },
  {
    name: brand.productFamily.pos,
    label: "For retail and counters",
    description:
      "Connect checkout, purchases, returns, stock movement, registers, shifts, and the daily cash view in one focused operating flow.",
    icon: ShoppingCart,
    features: [
      "Sales, purchases, and returns",
      "Inventory and stock movement",
      "Registers, shifts, and daily cash",
    ],
    href: "/business/register?product=retail_pos&source=landing-pos",
    cta: "Set up Retail POS",
  },
  {
    name: brand.productFamily.business,
    label: "For growing businesses",
    description:
      "Bring accounting, customers, suppliers, teams, approvals, branches, payroll, assets, and reporting into one controlled workspace.",
    icon: Building2,
    features: [
      "Accounting, CRM, and inventory",
      "Payroll, branches, and assets",
      "Teams, approvals, and controls",
    ],
    href: "/business/register?product=growing_business&source=landing-business",
    cta: "Explore Business",
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
  .jv-hero-viewport {
    display: grid;
    min-height: calc(100svh - 5.5rem);
    width: 100%;
  }
  .jv-enter {
    animation: jv-enter .68s cubic-bezier(.22,1,.36,1) both;
  }
  .jv-enter-late {
    animation: jv-enter .76s .08s cubic-bezier(.22,1,.36,1) both;
  }
  .jv-preview-enter {
    animation: jv-preview-enter .4s cubic-bezier(.22,1,.36,1) both;
  }
  .jv-product-preview {
    box-shadow: var(--shadow-lg), var(--surface-highlight);
  }

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

  @keyframes jv-enter {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes jv-preview-enter {
    from { opacity: .55; transform: translateY(8px) scale(.992); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 1279px) {
    .jv-hero-viewport {
      min-height: auto;
    }
  }

  @media (max-width: 639px) {
    .jv-hero-title {
      font-size: clamp(2.15rem, 10.8vw, 3.25rem) !important;
      line-height: .98 !important;
    }
    .jv-hero-copy {
      font-size: .92rem !important;
      line-height: 1.55 !important;
    }
    .jv-hero-proof {
      font-size: .7rem !important;
    }
  }

  @media (min-width: 1280px) and (max-height: 760px) {
    .jv-hero-grid {
      padding-block: 1.25rem !important;
    }
    .jv-hero-title {
      font-size: clamp(2.5rem, 4vw, 4.2rem) !important;
    }
    .jv-hero-copy,
    .jv-hero-proof {
      margin-top: .75rem !important;
    }
    .jv-hero-actions {
      margin-top: 1rem !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .jv-atomic *, .jv-atomic *::before, .jv-atomic *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
  }
`;
