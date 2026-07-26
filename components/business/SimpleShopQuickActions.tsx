"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Plus,
  ReceiptText,
  ShoppingCart,
  Store,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "sale" | "purchase" | "expense";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  sales_price: number | string;
  purchase_cost_hint: number | string;
  quantity_on_hand: number | string;
  revenue_account_id: string;
  inventory_account_id: string;
};

type PartyOption = { id: string; name: string; currency: string; terms: number };
type AccountOption = { id: string; code: string; name: string; system_key: string | null };
type ShopSettings = {
  default_customer_id: string;
  default_supplier_id: string;
  default_warehouse_id: string;
  default_cash_account_id: string;
  default_expense_account_id: string;
};

type CartLine = {
  key: string;
  productId: string;
  quantity: string;
  unitAmount: string;
  discountPercent: string;
  taxRate: string;
};

type SimpleShopQuickActionsProps = {
  businessId: string;
  baseCurrency: string;
  settings: ShopSettings;
  products: ProductOption[];
  customers: PartyOption[];
  suppliers: PartyOption[];
  paymentAccounts: AccountOption[];
  expenseAccounts: AccountOption[];
  canSell: boolean;
  canPurchase: boolean;
  canExpense: boolean;
};

function requestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function numeric(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function newLine(product?: ProductOption, mode: "sale" | "purchase" = "sale"): CartLine {
  return {
    key: requestKey(),
    productId: product?.id ?? "",
    quantity: "1",
    unitAmount: product
      ? String(mode === "sale" ? product.sales_price : product.purchase_cost_hint)
      : "",
    discountPercent: "0",
    taxRate: "0",
  };
}

export default function SimpleShopQuickActions({
  businessId,
  baseCurrency,
  settings,
  products,
  customers,
  suppliers,
  paymentAccounts,
  expenseAccounts,
  canSell,
  canPurchase,
  canExpense,
}: SimpleShopQuickActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => localDateString(), []);
  const availableModes = useMemo(
    () =>
      [canSell ? "sale" : null, canPurchase ? "purchase" : null, canExpense ? "expense" : null].filter(
        Boolean,
      ) as Mode[],
    [canExpense, canPurchase, canSell],
  );
  const [mode, setMode] = useState<Mode>(availableModes[0] ?? "sale");
  const [saving, setSaving] = useState<Mode | null>(null);

  const [saleDate, setSaleDate] = useState(today);
  const [customerId, setCustomerId] = useState(settings.default_customer_id);
  const [salePaidNow, setSalePaidNow] = useState(true);
  const [salePaymentAccountId, setSalePaymentAccountId] = useState(settings.default_cash_account_id);
  const [saleNotes, setSaleNotes] = useState("");
  const [saleLines, setSaleLines] = useState<CartLine[]>([newLine(products[0], "sale")]);
  const saleKey = useRef(requestKey());

  const [purchaseDate, setPurchaseDate] = useState(today);
  const [supplierId, setSupplierId] = useState(settings.default_supplier_id);
  const [supplierDocument, setSupplierDocument] = useState("");
  const [purchasePaidNow, setPurchasePaidNow] = useState(true);
  const [purchasePaymentAccountId, setPurchasePaymentAccountId] = useState(
    settings.default_cash_account_id,
  );
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseLines, setPurchaseLines] = useState<CartLine[]>([
    newLine(products[0], "purchase"),
  ]);
  const purchaseKey = useRef(requestKey());

  const [expenseDate, setExpenseDate] = useState(today);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState(settings.default_expense_account_id);
  const [expensePaymentAccountId, setExpensePaymentAccountId] = useState(
    settings.default_cash_account_id,
  );
  const [expenseReference, setExpenseReference] = useState("");
  const expenseKey = useRef(requestKey());

  const saleTotal = useMemo(
    () =>
      saleLines.reduce((sum, line) => {
        const gross = numeric(line.quantity) * numeric(line.unitAmount);
        const net = gross * (1 - numeric(line.discountPercent) / 100);
        return sum + net * (1 + numeric(line.taxRate) / 100);
      }, 0),
    [saleLines],
  );
  const purchaseTotal = useMemo(
    () =>
      purchaseLines.reduce((sum, line) => {
        const gross = numeric(line.quantity) * numeric(line.unitAmount);
        const net = gross * (1 - numeric(line.discountPercent) / 100);
        return sum + net * (1 + numeric(line.taxRate) / 100);
      }, 0),
    [purchaseLines],
  );

  function updateLine(
    target: "sale" | "purchase",
    key: string,
    changes: Partial<CartLine>,
  ) {
    const setter = target === "sale" ? setSaleLines : setPurchaseLines;
    setter((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));
  }

  function selectProduct(target: "sale" | "purchase", key: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateLine(target, key, {
      productId,
      unitAmount: product
        ? String(target === "sale" ? product.sales_price : product.purchase_cost_hint)
        : "",
    });
  }

  function removeLine(target: "sale" | "purchase", key: string) {
    const setter = target === "sale" ? setSaleLines : setPurchaseLines;
    setter((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));
  }

  function preparedLines(target: "sale" | "purchase") {
    const lines = target === "sale" ? saleLines : purchaseLines;
    return lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return target === "sale"
        ? {
            product_id: line.productId || null,
            warehouse_id: line.productId ? settings.default_warehouse_id : null,
            description: product?.name ?? "",
            quantity: numeric(line.quantity),
            unit_price: numeric(line.unitAmount),
            discount_percent: numeric(line.discountPercent),
            tax_rate: numeric(line.taxRate),
            revenue_account_id: product?.revenue_account_id ?? null,
          }
        : {
            product_id: line.productId || null,
            warehouse_id: line.productId ? settings.default_warehouse_id : null,
            description: product?.name ?? "",
            quantity: numeric(line.quantity),
            unit_cost: numeric(line.unitAmount),
            discount_percent: numeric(line.discountPercent),
            tax_rate: numeric(line.taxRate),
            allocation_account_id: product?.inventory_account_id ?? null,
          };
    });
  }

  function invalidCart(target: "sale" | "purchase") {
    const lines = preparedLines(target);
    return lines.length === 0 || lines.some((line) => {
      const product = products.find((item) => item.id === line.product_id);
      const amount = target === "sale" ? "unit_price" in line && line.unit_price : "unit_cost" in line && line.unit_cost;
      return (
        !product ||
        line.quantity <= 0 ||
        Number(amount) < 0 ||
        line.discount_percent < 0 ||
        line.discount_percent > 100 ||
        line.tax_rate < 0 ||
        line.tax_rate > 100 ||
        (target === "sale" && line.quantity > numeric(product.quantity_on_hand))
      );
    });
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || invalidCart("sale") || saleTotal <= 0) {
      if (!saving) toast.error("Complete the sale with available stock, quantity, price, discount, and tax.");
      return;
    }
    if (!salePaidNow && customerId === settings.default_customer_id) {
      toast.error("Select a named customer for a credit sale.");
      return;
    }
    setSaving("sale");
    const { error } = await supabase.rpc("create_business_simple_shop_sale", {
      p_business_id: businessId,
      p_customer_id: customerId || null,
      p_sale_date: saleDate,
      p_lines: preparedLines("sale"),
      p_paid_now: salePaidNow,
      p_payment_account_id: salePaidNow ? salePaymentAccountId : null,
      p_notes: saleNotes.trim() || null,
      p_idempotency_key: saleKey.current,
    });
    setSaving(null);
    if (error) {
      console.error("Simple shop sale failed", { code: error.code });
      toast.error("Sale was not posted. Stock, cash, invoice, and accounting stayed unchanged.");
      return;
    }
    saleKey.current = requestKey();
    setSaleNotes("");
    setSaleLines([newLine(products[0], "sale")]);
    toast.success(salePaidNow ? "Sale and payment posted." : "Credit sale posted.");
    router.refresh();
  }

  async function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || invalidCart("purchase") || purchaseTotal <= 0) {
      if (!saving) toast.error("Complete the purchase with product, quantity, cost, discount, and tax.");
      return;
    }
    if (!purchasePaidNow && supplierId === settings.default_supplier_id) {
      toast.error("Select a named supplier for a credit purchase.");
      return;
    }
    setSaving("purchase");
    const { error } = await supabase.rpc("create_business_simple_shop_purchase", {
      p_business_id: businessId,
      p_supplier_id: supplierId || null,
      p_purchase_date: purchaseDate,
      p_supplier_document_number: supplierDocument.trim() || null,
      p_lines: preparedLines("purchase"),
      p_paid_now: purchasePaidNow,
      p_payment_account_id: purchasePaidNow ? purchasePaymentAccountId : null,
      p_notes: purchaseNotes.trim() || null,
      p_idempotency_key: purchaseKey.current,
    });
    setSaving(null);
    if (error) {
      console.error("Simple shop purchase failed", { code: error.code });
      toast.error("Purchase was not posted. Stock, cash, payable, and accounting stayed unchanged.");
      return;
    }
    purchaseKey.current = requestKey();
    setSupplierDocument("");
    setPurchaseNotes("");
    setPurchaseLines([newLine(products[0], "purchase")]);
    toast.success(purchasePaidNow ? "Purchase, stock, and payment posted." : "Credit purchase posted.");
    router.refresh();
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (expenseDescription.trim().length < 2 || numeric(expenseAmount) <= 0) {
      toast.error("Enter an expense description and amount greater than zero.");
      return;
    }
    setSaving("expense");
    const { error } = await supabase.rpc("create_business_simple_shop_expense", {
      p_business_id: businessId,
      p_expense_date: expenseDate,
      p_description: expenseDescription.trim(),
      p_amount: numeric(expenseAmount),
      p_expense_account_id: expenseAccountId || null,
      p_payment_account_id: expensePaymentAccountId || null,
      p_reference: expenseReference.trim() || null,
      p_idempotency_key: expenseKey.current,
    });
    setSaving(null);
    if (error) {
      console.error("Simple shop expense failed", { code: error.code });
      toast.error("Expense was not posted. Cash and accounting stayed unchanged.");
      return;
    }
    expenseKey.current = requestKey();
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseReference("");
    toast.success("Expense posted to cash and profit.");
    router.refresh();
  }

  if (availableModes.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-black text-text-primary sm:text-lg">Quick shop actions</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Stock, customer or supplier balance, cash, and accounting post together.
            </p>
          </div>
        </div>
        <div className="flex w-full gap-2 overflow-x-auto sm:w-auto">
          {availableModes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`finance-focus min-h-10 shrink-0 rounded-[var(--radius-button)] px-4 text-sm font-black transition-colors ${
                mode === item ? "bg-primary text-primary-foreground" : "bg-surface-secondary text-text-secondary"
              }`}
            >
              {item === "sale" ? "Sale" : item === "purchase" ? "Purchase" : "Expense"}
            </button>
          ))}
        </div>
      </div>

      {mode === "sale" ? (
        <form onSubmit={submitSale} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">Customer</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving === "sale"}>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Sale date</span>
              <Input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} disabled={saving === "sale"} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Payment</span>
              <select value={salePaidNow ? "paid" : "credit"} onChange={(event) => setSalePaidNow(event.target.value === "paid")} className="field-input min-h-11 w-full" disabled={saving === "sale"}>
                <option value="paid">Paid now</option><option value="credit">Customer balance</option>
              </select>
            </label>
          </div>
          <CartEditor target="sale" lines={saleLines} products={products} disabled={saving === "sale"} onSelectProduct={selectProduct} onUpdate={updateLine} onRemove={removeLine} onAdd={() => setSaleLines((current) => [...current, newLine(undefined, "sale")])} />
          <div className="grid gap-4 md:grid-cols-2">
            {salePaidNow ? <AccountSelect label="Receive into" value={salePaymentAccountId} accounts={paymentAccounts} onChange={setSalePaymentAccountId} disabled={saving === "sale"} /> : null}
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Notes</span>
              <Input value={saleNotes} onChange={(event) => setSaleNotes(event.target.value)} placeholder="Optional sale note" maxLength={500} disabled={saving === "sale"} />
            </label>
          </div>
          <ActionFooter icon={<ReceiptText aria-hidden="true" />} total={saleTotal} currency={baseCurrency} loading={saving === "sale"} loadingLabel="Posting sale..." label={salePaidNow ? "Post paid sale" : "Post credit sale"} />
        </form>
      ) : null}

      {mode === "purchase" ? (
        <form onSubmit={submitPurchase} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">Supplier</span>
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving === "purchase"}>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Purchase date</span>
              <Input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} disabled={saving === "purchase"} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Payment</span>
              <select value={purchasePaidNow ? "paid" : "credit"} onChange={(event) => setPurchasePaidNow(event.target.value === "paid")} className="field-input min-h-11 w-full" disabled={saving === "purchase"}>
                <option value="paid">Paid now</option><option value="credit">Supplier balance</option>
              </select>
            </label>
          </div>
          <CartEditor target="purchase" lines={purchaseLines} products={products} disabled={saving === "purchase"} onSelectProduct={selectProduct} onUpdate={updateLine} onRemove={removeLine} onAdd={() => setPurchaseLines((current) => [...current, newLine(undefined, "purchase")])} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {purchasePaidNow ? <AccountSelect label="Pay from" value={purchasePaymentAccountId} accounts={paymentAccounts} onChange={setPurchasePaymentAccountId} disabled={saving === "purchase"} /> : null}
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Supplier document</span>
              <Input value={supplierDocument} onChange={(event) => setSupplierDocument(event.target.value)} placeholder="Optional bill number" maxLength={100} disabled={saving === "purchase"} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Notes</span>
              <Input value={purchaseNotes} onChange={(event) => setPurchaseNotes(event.target.value)} placeholder="Optional purchase note" maxLength={500} disabled={saving === "purchase"} />
            </label>
          </div>
          <ActionFooter icon={<ShoppingCart aria-hidden="true" />} total={purchaseTotal} currency={baseCurrency} loading={saving === "purchase"} loadingLabel="Posting purchase..." label={purchasePaidNow ? "Post paid purchase" : "Post credit purchase"} />
        </form>
      ) : null}

      {mode === "expense" ? (
        <form onSubmit={submitExpense} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">Expense description</span>
              <Input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} placeholder="Example: Shop cleaning" maxLength={300} disabled={saving === "expense"} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Amount</span>
              <Input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} inputMode="decimal" placeholder="0" disabled={saving === "expense"} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Date</span>
              <Input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} disabled={saving === "expense"} required />
            </label>
            <AccountSelect label="Expense category" value={expenseAccountId} accounts={expenseAccounts} onChange={setExpenseAccountId} disabled={saving === "expense"} />
            <AccountSelect label="Pay from" value={expensePaymentAccountId} accounts={paymentAccounts} onChange={setExpensePaymentAccountId} disabled={saving === "expense"} />
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-text-primary">Reference</span>
              <Input value={expenseReference} onChange={(event) => setExpenseReference(event.target.value)} placeholder="Optional receipt or note" maxLength={120} disabled={saving === "expense"} />
            </label>
          </div>
          <ActionFooter icon={<WalletCards aria-hidden="true" />} total={numeric(expenseAmount)} currency={baseCurrency} loading={saving === "expense"} loadingLabel="Posting expense..." label="Post expense" />
        </form>
      ) : null}
    </section>
  );
}

function AccountSelect({ label, value, accounts, onChange, disabled }: { label: string; value: string; accounts: AccountOption[]; onChange: (value: string) => void; disabled: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold text-text-primary">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field-input min-h-11 w-full" disabled={disabled}>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
      </select>
    </label>
  );
}

function CartEditor({ target, lines, products, disabled, onSelectProduct, onUpdate, onRemove, onAdd }: {
  target: "sale" | "purchase";
  lines: CartLine[];
  products: ProductOption[];
  disabled: boolean;
  onSelectProduct: (target: "sale" | "purchase", key: string, productId: string) => void;
  onUpdate: (target: "sale" | "purchase", key: string, changes: Partial<CartLine>) => void;
  onRemove: (target: "sale" | "purchase", key: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const product = products.find((item) => item.id === line.productId);
        return (
          <div key={line.key} className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-4 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-text-primary">Item {index + 1}</strong>
              <button type="button" onClick={() => onRemove(target, line.key)} disabled={disabled || lines.length === 1} className="finance-focus inline-flex size-9 items-center justify-center rounded-[var(--radius-button)] text-text-tertiary hover:bg-danger-soft hover:text-danger disabled:opacity-30" aria-label={`Remove item ${index + 1}`}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-2 md:col-span-2 xl:col-span-2">
                <span className="text-xs font-bold text-text-secondary">Product</span>
                <select value={line.productId} onChange={(event) => onSelectProduct(target, line.key, event.target.value)} className="field-input min-h-11 w-full" disabled={disabled} required>
                  <option value="">Select product</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
                </select>
                {product ? <span className={`block text-xs ${target === "sale" && numeric(line.quantity) > numeric(product.quantity_on_hand) ? "text-danger" : "text-text-tertiary"}`}>Stock {numeric(product.quantity_on_hand)}</span> : null}
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-text-secondary">Quantity</span>
                <Input value={line.quantity} onChange={(event) => onUpdate(target, line.key, { quantity: event.target.value })} inputMode="decimal" disabled={disabled} required />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-text-secondary">{target === "sale" ? "Price" : "Cost"}</span>
                <Input value={line.unitAmount} onChange={(event) => onUpdate(target, line.key, { unitAmount: event.target.value })} inputMode="decimal" disabled={disabled} required />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-text-secondary">Discount %</span>
                <Input value={line.discountPercent} onChange={(event) => onUpdate(target, line.key, { discountPercent: event.target.value })} inputMode="decimal" disabled={disabled} />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-text-secondary">Tax %</span>
                <Input value={line.taxRate} onChange={(event) => onUpdate(target, line.key, { taxRate: event.target.value })} inputMode="decimal" disabled={disabled} />
              </label>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="secondary" onClick={onAdd} disabled={disabled || products.length === 0}>
        <Plus aria-hidden="true" /> Add item
      </Button>
    </div>
  );
}

function ActionFooter({ icon, total, currency, loading, loadingLabel, label }: { icon: React.ReactNode; total: number; currency: string; loading: boolean; loadingLabel: string; label: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-primary-soft px-4 py-4 text-primary sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-center gap-2 font-black"><Banknote className="size-4" aria-hidden="true" /> Total {formatMoney(total, currency)}</span>
      <Button type="submit" loading={loading} loadingLabel={loadingLabel} className="sm:w-auto">{icon}{label}</Button>
    </div>
  );
}
