import {
  Banknote,
  Briefcase,
  BriefcaseBusiness,
  Car,
  CreditCard,
  Home,
  Landmark,
  LucideIcon,
  Package,
  ReceiptText,
  Smartphone,
  Wallet,
} from "lucide-react";
import { getAppDateKey } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";

export const INCOME_SOURCE_SUGGESTIONS = [
  "inDrive rides",
  "Toyota commission",
  "Website project payments",
  "Salary",
  "Bonus",
  "Freelance income",
  "Other income",
];

export const ACCOUNT_TYPES: {
  value: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { value: "cash", label: "Cash", icon: Wallet, tone: "text-income bg-income-soft" },
  { value: "bank", label: "Bank Account", icon: Landmark, tone: "text-transfer bg-transfer-soft" },
  { value: "jazzcash", label: "JazzCash", icon: Smartphone, tone: "text-payables bg-payables-soft" },
  { value: "easypaisa", label: "Easypaisa", icon: Smartphone, tone: "text-secondary-brand bg-primary-soft" },
  { value: "sadapay", label: "SadaPay", icon: CreditCard, tone: "text-primary bg-primary-soft" },
  { value: "nayapay", label: "NayaPay", icon: CreditCard, tone: "text-info bg-info-soft" },
  { value: "wallet", label: "Other Wallet", icon: Banknote, tone: "text-investment bg-investment-soft" },
  { value: "freelance", label: "Freelance", icon: Briefcase, tone: "text-primary bg-primary-soft" },
  { value: "investment", label: "Investment", icon: BriefcaseBusiness, tone: "text-investment bg-investment-soft" },
  { value: "other", label: "Other", icon: Package, tone: "text-text-muted bg-surface-tinted" },
];

export const EXPENSE_CATEGORY_HINTS = [
  "Grocery",
  "Household items",
  "Fuel",
  "Bills",
  "Rent",
  "Food",
  "Shopping",
  "Family",
  "Car maintenance",
  "Mobile load",
  "Internet",
  "Medical",
  "Debt repayment",
  "Other expenses",
];

export const PAYABLE_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-payables-soft text-payables ring-payables/20",
  },
  partial: {
    label: "Partially paid",
    className: "bg-transfer-soft text-transfer ring-transfer/20",
  },
  completed: {
    label: "Completed",
    className: "bg-success-soft text-success ring-success/20",
  },
  overdue: {
    label: "Overdue",
    className: "bg-danger-soft text-danger ring-danger/20",
  },
};

export function formatPKR(value: number | string | null | undefined) {
  return formatMoney(Number(value ?? 0));
}

export function getPayableStatus(payable: {
  status: string;
  remaining_amount: number | string;
  due_date: string | null;
  today?: string;
}) {
  const remaining = Number(payable.remaining_amount);
  if (remaining <= 0) return "completed";
  if (payable.due_date && payable.due_date < (payable.today ?? getAppDateKey())) {
    return "overdue";
  }
  return payable.status === "completed" ? "partial" : payable.status;
}

export function getAccountType(value: string) {
  return ACCOUNT_TYPES.find((type) => type.value === value) ?? ACCOUNT_TYPES[0];
}

export const PAYABLE_QUICK_REASONS = [
  { label: "Borrowed cash", icon: Banknote },
  { label: "Borrowed item", icon: ReceiptText },
  { label: "Car / fuel help", icon: Car },
  { label: "Family payment", icon: Home },
];
