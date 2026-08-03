import {
  CircleDollarSign,
  Handshake,
  Landmark,
  ShoppingCart,
  type LucideIcon,
  WalletCards,
  Building2,
  BrainCircuit,
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
  "mx-auto w-[calc(100%-1.75rem)] max-w-[1480px] 2xl:w-[calc(100%-8rem)]";
export const focus =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20";
export const sectionSpace = "py-[clamp(5rem,7vw,7.5rem)]";
export const sectionTitle =
  "mt-3 text-balance text-[clamp(2.2rem,3.7vw,4.2rem)] font-[710] leading-[1.04] tracking-[-0.05em] text-[#12211b]";

export const landingStyles = String.raw`
  .jv-atomic ~ .landing-math-field { display: none !important; }
  .jv-enter { animation: jv-enter .72s cubic-bezier(.22,1,.36,1) both; }
  .jv-enter-late { animation: jv-enter .82s .08s cubic-bezier(.22,1,.36,1) both; }
  .jv-chart-line { stroke-dasharray: 900; stroke-dashoffset: 900; animation: jv-draw 1.5s .45s ease forwards; }
  .jv-preview-shell { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease; }
  @media (hover: hover) and (pointer: fine) {
    .jv-preview-shell:hover { transform: translateY(-3px); box-shadow: 0 28px 78px rgba(28,55,43,.14); }
  }
  @keyframes jv-enter {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes jv-draw { to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .jv-atomic *, .jv-atomic *::before, .jv-atomic *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
  }
`;
