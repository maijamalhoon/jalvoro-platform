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
