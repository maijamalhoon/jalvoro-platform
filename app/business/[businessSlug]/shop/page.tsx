import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  BarChart3,
  CircleDollarSign,
  ContactRound,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import InventoryCatalogForms from "@/components/business/InventoryCatalogForms";
import InventoryOperationsForms from "@/components/business/InventoryOperationsForms";
import SimpleShopQuickActions from "@/components/business/SimpleShopQuickActions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Simple Shop",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  timezone: string;
  workspace_mode: "advanced_company" | "simple_shop";
  status: string;
};

type ShopSettings = {
  default_customer_id: string;
  default_supplier_id: string;
  default_warehouse_id: string;
  default_cash_account_id: string;
  default_expense_account_id: string;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sales_price: number | string;
  purchase_cost_hint: number | string;
  reorder_level: number | string;
  revenue_account_id: string;
  inventory_account_id: string;
  quantity_on_hand: number | string;
  inventory_value: number | string;
};

type PartyOption = { id: string; name: string; currency: string; terms: number };
type AccountOption = { id: string; code: string; name: string; system_key: string | null };
type Metrics = {
  gross_sales: number | string;
  sales_returns: number | string;
  purchases: number | string;
  purchase_returns: number | string;
  cash_received: number | string;
  supplier_paid: number | string;
  expenses: number | string;
  cash_balance: number | string;
  receivables: number | string;
  payables: number | string;
  profit: number | string;
  low_stock_count: number | string;
};

type RecentSale = {
  id: string;
  code: string;
  date: string;
  total: number | string;
  paid: number | string;
  returned: number | string;
  status: string;
  customer_id: string;
  created_at: string;
};

type RecentPurchase = {
  id: string;
  code: string;
  date: string;
  total: number | string;
  paid: number | string;
  returned: number | string;
  status: string;
  supplier_id: string;
  created_at: string;
};

type RecentExpense = {
  id: string;
  code: string;
  date: string;
  description: string;
  amount: number | string;
  created_at: string;
};

type Snapshot = {
  settings: ShopSettings;
  products: ProductRow[];
  customers: PartyOption[];
  suppliers: PartyOption[];
  payment_accounts: AccountOption[];
  expense_accounts: AccountOption[];
  metrics: Metrics;
  recent_sales: RecentSale[];
  recent_purchases: RecentPurchase[];
  recent_expenses: RecentExpense[];
};

type BalanceRow = {
  id: string;
  name: string;
  currency: string;
  balance_base: number | string;
  overdue_base: number | string;
  invoice_count?: number | string;
  bill_count?: number | string;
};

type PartyBalances = { customers: BalanceRow[]; suppliers: BalanceRow[] };

type ActivityRow = {
  id: string;
  code: string;
  date: string;
  createdAt: string;
  label: string;
  detail: string;
  amount: number;
  direction: "in" | "out";
  icon: typeof ReceiptText;
};

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric(value));
}

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(numeric(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function SimpleShopPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/shop`)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, timezone, workspace_mode, status")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;
  if (business.workspace_mode !== "simple_shop" || business.status !== "active") {
    redirect(`/business/${business.slug}`);
  }

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const wildcard = permissions.includes("*");
  const canSell =
    ["owner", "admin", "manager", "sales", "cashier"].includes(role) ||
    wildcard ||
    permissions.includes("shop.sell");
  const canPurchase =
    ["owner", "admin", "manager", "inventory"].includes(role) ||
    wildcard ||
    permissions.includes("shop.purchase");
  const canExpense =
    ["owner", "admin", "manager", "cashier"].includes(role) ||
    wildcard ||
    permissions.includes("shop.expense");
  const canManageInventory =
    ["owner", "admin", "manager", "inventory"].includes(role) ||
    wildcard ||
    permissions.includes("inventory.manage");
  const canReturnSales =
    ["owner", "admin", "manager", "sales"].includes(role) ||
    wildcard ||
    permissions.includes("sales.return") ||
    permissions.includes("sales.manage");
  const canReturnPurchases =
    ["owner", "admin", "accountant", "manager"].includes(role) ||
    wildcard ||
    permissions.includes("purchases.return") ||
    permissions.includes("purchases.manage");

  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: business.timezone,
  }).format(new Date());

  const [snapshotResult, balancesResult] = await Promise.all([
    supabase.rpc("get_business_simple_shop_snapshot", {
      p_business_id: business.id,
      p_date: today,
    }),
    supabase.rpc("get_business_simple_shop_party_balances", {
      p_business_id: business.id,
    }),
  ]);

  if (snapshotResult.error || balancesResult.error || !snapshotResult.data) {
    console.error("Simple shop workspace load failed", {
      snapshotCode: snapshotResult.error?.code,
      balancesCode: balancesResult.error?.code,
    });
  }

  const snapshot = (snapshotResult.data ?? {
    settings: null,
    products: [],
    customers: [],
    suppliers: [],
    payment_accounts: [],
    expense_accounts: [],
    metrics: {},
    recent_sales: [],
    recent_purchases: [],
    recent_expenses: [],
  }) as Snapshot;
  const balances = (balancesResult.data ?? { customers: [], suppliers: [] }) as PartyBalances;

  if (!snapshot.settings) {
    return (
      <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto max-w-xl rounded-[var(--radius-card)] bg-danger-soft px-5 py-6 text-danger">
          Simple Shop setup is incomplete. No sale, purchase, stock, cash, or accounting record was changed.
        </section>
      </main>
    );
  }

  const metrics = snapshot.metrics;
  const customerNames = new Map(snapshot.customers.map((customer) => [customer.id, customer.name]));
  const supplierNames = new Map(snapshot.suppliers.map((supplier) => [supplier.id, supplier.name]));
  const activities: ActivityRow[] = [
    ...snapshot.recent_sales.map((sale) => ({
      id: sale.id,
      code: sale.code,
      date: sale.date,
      createdAt: sale.created_at,
      label: "Sale",
      detail: `${customerNames.get(sale.customer_id) ?? "Customer"} · ${sale.status}`,
      amount: numeric(sale.total) - numeric(sale.returned),
      direction: "in" as const,
      icon: ReceiptText,
    })),
    ...snapshot.recent_purchases.map((purchase) => ({
      id: purchase.id,
      code: purchase.code,
      date: purchase.date,
      createdAt: purchase.created_at,
      label: "Purchase",
      detail: `${supplierNames.get(purchase.supplier_id) ?? "Supplier"} · ${purchase.status}`,
      amount: numeric(purchase.total) - numeric(purchase.returned),
      direction: "out" as const,
      icon: ShoppingCart,
    })),
    ...snapshot.recent_expenses.map((expense) => ({
      id: expense.id,
      code: expense.code,
      date: expense.date,
      createdAt: expense.created_at,
      label: "Expense",
      detail: expense.description,
      amount: numeric(expense.amount),
      direction: "out" as const,
      icon: WalletCards,
    })),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 20);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/business"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Business workspaces
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/business/${business.slug}/reports`}
              className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-3 text-sm font-black text-primary transition-colors hover:bg-primary-soft"
            >
              <BarChart3 className="size-4" aria-hidden="true" /> Reports
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
              <ShieldCheck className="size-4" aria-hidden="true" /> Secure shop ledger
            </span>
          </div>
        </div>

        <header className="mt-7 flex flex-col gap-5 rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)] sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Store className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Simple Shop</p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                {business.name}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {role.replace(/_/g, " ")} access · {formatDate(today)}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="finance-focus inline-flex min-h-10 w-fit items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-4 text-sm font-black text-text-secondary hover:text-text-primary"
          >
            Personal finance <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </header>

        {snapshotResult.error || balancesResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Some shop information could not be loaded. No sale, stock, cash, or accounting entry was changed.
          </section>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={CircleDollarSign} label="Today sales" value={formatMoney(numeric(metrics.gross_sales) - numeric(metrics.sales_returns), business.base_currency)} tone="primary" />
          <MetricCard icon={Banknote} label="Cash balance" value={formatMoney(metrics.cash_balance, business.base_currency)} tone={numeric(metrics.cash_balance) < 0 ? "warning" : "success"} />
          <MetricCard icon={TrendingUp} label="Today profit" value={formatMoney(metrics.profit, business.base_currency)} tone={numeric(metrics.profit) < 0 ? "danger" : "success"} />
          <MetricCard icon={WalletCards} label="Today expenses" value={formatMoney(metrics.expenses, business.base_currency)} tone="warning" />
          <MetricCard icon={ContactRound} label="To receive" value={formatMoney(metrics.receivables, business.base_currency)} tone="primary" />
          <MetricCard icon={AlertTriangle} label="Low stock" value={String(numeric(metrics.low_stock_count))} tone={numeric(metrics.low_stock_count) > 0 ? "warning" : "success"} />
        </section>

        {snapshot.products.length === 0 ? (
          <section className="mt-7 rounded-[var(--radius-card)] bg-warning-soft px-5 py-5 text-sm text-warning">
            Add the first product below. Quick sale and purchase will activate after a product exists.
          </section>
        ) : null}

        {canSell || canPurchase || canExpense ? (
          <div className="mt-8">
            <SimpleShopQuickActions
              businessId={business.id}
              baseCurrency={business.base_currency}
              settings={snapshot.settings}
              products={snapshot.products}
              customers={snapshot.customers}
              suppliers={snapshot.suppliers}
              paymentAccounts={snapshot.payment_accounts}
              expenseAccounts={snapshot.expense_accounts}
              canSell={canSell}
              canPurchase={canPurchase}
              canExpense={canExpense}
            />
          </div>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5 text-sm text-text-secondary">
            Your role has read-only shop access.
          </section>
        )}

        <section className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Stock</p>
                <h2 className="mt-1 text-lg font-black text-text-primary">Products ready to sell</h2>
              </div>
              <span className="text-sm font-black tabular-nums text-text-secondary">{snapshot.products.length}</span>
            </div>
            {snapshot.products.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {snapshot.products.map((product) => {
                  const isLow = numeric(product.reorder_level) > 0 && numeric(product.quantity_on_hand) <= numeric(product.reorder_level);
                  return (
                    <article key={product.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-black text-text-primary">{product.name}</h3>
                          <p className="mt-1 text-xs text-text-tertiary">{product.sku} · {product.unit}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isLow ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
                          {isLow ? "Low" : "Ready"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <span><span className="block text-xs text-text-tertiary">In stock</span><strong className="mt-1 block text-text-primary">{formatNumber(product.quantity_on_hand)}</strong></span>
                        <span><span className="block text-xs text-text-tertiary">Sale price</span><strong className="mt-1 block truncate text-text-primary">{formatMoney(product.sales_price, business.base_currency)}</strong></span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
                No products yet.
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
            <div className="flex items-start gap-3">
              <PackageSearch className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-black text-text-primary">Today movement</h2>
                <p className="mt-1 text-sm text-text-secondary">Cash received and paid.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <SummaryRow label="Cash received" value={formatMoney(metrics.cash_received, business.base_currency)} positive />
              <SummaryRow label="Supplier paid" value={formatMoney(metrics.supplier_paid, business.base_currency)} />
              <SummaryRow label="Shop expenses" value={formatMoney(metrics.expenses, business.base_currency)} />
              <SummaryRow label="Purchases" value={formatMoney(numeric(metrics.purchases) - numeric(metrics.purchase_returns), business.base_currency)} />
              <SummaryRow label="Supplier payable" value={formatMoney(metrics.payables, business.base_currency)} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <PartyBalanceCard title="Customer balances" empty="No customer balance is due." rows={balances.customers} currency={business.base_currency} kind="customer" />
          <PartyBalanceCard title="Supplier balances" empty="No supplier balance is due." rows={balances.suppliers} currency={business.base_currency} kind="supplier" />
        </section>

        {canReturnSales || canReturnPurchases ? (
          <div className="mt-8">
            <InventoryOperationsForms
              businessId={business.id}
              baseCurrency={business.base_currency}
              canTransfer={false}
              canAdjust={false}
              canReturnSales={canReturnSales}
              canReturnPurchases={canReturnPurchases}
            />
          </div>
        ) : null}

        {canManageInventory ? (
          <div className="mt-8">
            <InventoryCatalogForms businessId={business.id} baseCurrency={business.base_currency} />
          </div>
        ) : null}

        <section className="mt-8 rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Activity</p>
              <h2 className="mt-1 text-lg font-black text-text-primary">Recent shop entries</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">{activities.length}</span>
          </div>
          {activities.length > 0 ? (
            <div className="mt-4 divide-y divide-border/60">
              {activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <article key={`${activity.label}-${activity.id}`} className="flex items-center gap-3 py-4">
                    <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] ${activity.direction === "in" ? "bg-success-soft text-success" : "bg-surface-secondary text-text-secondary"}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="truncate text-sm text-text-primary">{activity.label}</strong>
                        <span className="text-xs text-text-tertiary">{activity.code}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-text-secondary">{activity.detail} · {formatDate(activity.date)}</p>
                    </div>
                    <strong className={`shrink-0 text-sm tabular-nums ${activity.direction === "in" ? "text-success" : "text-text-primary"}`}>
                      {activity.direction === "in" ? "+" : "-"}{formatMoney(activity.amount, business.base_currency)}
                    </strong>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
              First sale, purchase, or expense will appear here.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Store; label: string; value: string; tone: "primary" | "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-primary";
  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)]">
      <Icon className={`size-5 ${toneClass}`} aria-hidden="true" />
      <p className="mt-3 text-xs font-bold text-text-secondary">{label}</p>
      <strong className="mt-1 block truncate text-base font-black tabular-nums text-text-primary">{value}</strong>
    </article>
  );
}

function SummaryRow({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      <strong className={positive ? "text-success" : "text-text-primary"}>{value}</strong>
    </div>
  );
}

function PartyBalanceCard({ title, empty, rows, currency, kind }: { title: string; empty: string; rows: BalanceRow[]; currency: string; kind: "customer" | "supplier" }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
      <div className="flex items-center gap-3">
        <ContactRound className={`size-5 ${kind === "customer" ? "text-primary" : "text-warning"}`} aria-hidden="true" />
        <h2 className="font-black text-text-primary">{title}</h2>
      </div>
      {rows.length > 0 ? (
        <div className="mt-4 space-y-3">
          {rows.slice(0, 12).map((row) => (
            <article key={row.id} className="flex items-center justify-between gap-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-text-primary">{row.name}</h3>
                <p className="mt-1 text-xs text-text-tertiary">{kind === "customer" ? `${numeric(row.invoice_count)} invoices` : `${numeric(row.bill_count)} bills`}{numeric(row.overdue_base) > 0 ? ` · Overdue ${formatMoney(row.overdue_base, currency)}` : ""}</p>
              </div>
              <strong className="shrink-0 text-sm tabular-nums text-text-primary">{formatMoney(row.balance_base, currency)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-7 text-center text-sm text-text-secondary">{empty}</div>
      )}
    </section>
  );
}
