"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Plus, ReceiptText, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const SUPPORTED_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"] as const;

type CustomerOption = {
  id: string;
  name: string;
  currency: string;
  paymentTermsDays: number;
};

type RevenueAccountOption = {
  id: string;
  code: string;
  name: string;
};

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  sales_price: number | string;
  revenue_account_id: string;
};

type WarehouseOption = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
};

type InvoiceLine = {
  key: string;
  productId: string;
  warehouseId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
  revenueAccountId: string;
};

type CreateSalesInvoiceFormProps = {
  businessId: string;
  baseCurrency: string;
  customers: CustomerOption[];
  revenueAccounts: RevenueAccountOption[];
};

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function requestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function newLine(defaultRevenueAccountId: string): InvoiceLine {
  return {
    key: requestKey(),
    productId: "",
    warehouseId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discountPercent: "0",
    taxRate: "0",
    revenueAccountId: defaultRevenueAccountId,
  };
}

export default function CreateSalesInvoiceForm({
  businessId,
  baseCurrency,
  customers,
  revenueAccounts,
}: CreateSalesInvoiceFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => localDateString(), []);
  const firstCustomer = customers[0] ?? null;
  const defaultRevenueAccountId = revenueAccounts[0]?.id ?? "";
  const idempotencyKey = useRef(requestKey());

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [customerId, setCustomerId] = useState(firstCustomer?.id ?? "");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, firstCustomer?.paymentTermsDays ?? 0));
  const [currency, setCurrency] = useState(firstCustomer?.currency ?? baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(
    (firstCustomer?.currency ?? baseCurrency) === baseCurrency ? "1" : "",
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([newLine(defaultRevenueAccountId)]);
  const [saving, setSaving] = useState(false);

  const defaultWarehouseId = warehouses.find((warehouse) => warehouse.is_default)?.id ?? warehouses[0]?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      const [productsResult, warehousesResult] = await Promise.all([
        supabase
          .from("business_products")
          .select("id, sku, name, sales_price, revenue_account_id")
          .eq("business_id", businessId)
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("business_warehouses")
          .select("id, code, name, is_default")
          .eq("business_id", businessId)
          .eq("status", "active")
          .order("is_default", { ascending: false })
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;
      if (productsResult.error || warehousesResult.error) {
        console.error("Invoice inventory catalog load failed", {
          productCode: productsResult.error?.code,
          warehouseCode: warehousesResult.error?.code,
        });
        toast.error("Inventory catalog could not be loaded. Service invoices are still available.");
      }
      setProducts((productsResult.data ?? []) as ProductOption[]);
      setWarehouses((warehousesResult.data ?? []) as WarehouseOption[]);
      setCatalogLoading(false);
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [businessId, supabase]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (result, line) => {
          const gross = numeric(line.quantity) * numeric(line.unitPrice);
          const discount = gross * (numeric(line.discountPercent) / 100);
          const net = gross - discount;
          const tax = net * (numeric(line.taxRate) / 100);
          return {
            gross: result.gross + gross,
            discount: result.discount + discount,
            tax: result.tax + tax,
            total: result.total + net + tax,
          };
        },
        { gross: 0, discount: 0, tax: 0, total: 0 },
      ),
    [lines],
  );

  function updateLine(key: string, changes: Partial<InvoiceLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  }

  function selectProduct(key: string, productId: string) {
    if (!productId) {
      updateLine(key, { productId: "", warehouseId: "" });
      return;
    }
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    updateLine(key, {
      productId,
      warehouseId: defaultWarehouseId,
      description: product.name,
      unitPrice: String(product.sales_price ?? ""),
      revenueAccountId: product.revenue_account_id,
    });
  }

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const customer = customers.find((item) => item.id === nextCustomerId);
    if (!customer) return;
    setCurrency(customer.currency);
    setExchangeRate(customer.currency === baseCurrency ? "1" : "");
    setDueDate(addDays(invoiceDate, customer.paymentTermsDays));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!customerId) {
      toast.error("Select a customer.");
      return;
    }
    if (!invoiceDate || !dueDate || dueDate < invoiceDate) {
      toast.error("Due date cannot be before the invoice date.");
      return;
    }

    const parsedExchangeRate = Number(exchangeRate);
    if (!Number.isFinite(parsedExchangeRate) || parsedExchangeRate <= 0) {
      toast.error("Enter a valid exchange rate greater than zero.");
      return;
    }
    if (currency === baseCurrency && parsedExchangeRate !== 1) {
      toast.error(`${baseCurrency} invoices must use an exchange rate of 1.`);
      return;
    }

    const preparedLines = lines.map((line) => ({
      description: line.description.trim(),
      quantity: numeric(line.quantity),
      unit_price: numeric(line.unitPrice),
      discount_percent: numeric(line.discountPercent),
      tax_rate: numeric(line.taxRate),
      revenue_account_id: line.revenueAccountId,
      product_id: line.productId || null,
      warehouse_id: line.productId ? line.warehouseId || defaultWarehouseId || null : null,
    }));

    const invalidLine = preparedLines.some(
      (line) =>
        line.description.length < 2 ||
        line.quantity <= 0 ||
        line.unit_price < 0 ||
        line.discount_percent < 0 ||
        line.discount_percent > 100 ||
        line.tax_rate < 0 ||
        line.tax_rate > 100 ||
        !line.revenue_account_id ||
        (line.product_id !== null && line.warehouse_id === null),
    );
    if (invalidLine || totals.total <= 0) {
      toast.error("Complete every line with valid product, warehouse, quantity, price, discount, and tax.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_business_stock_sales_invoice", {
      p_business_id: businessId,
      p_customer_id: customerId,
      p_invoice_date: invoiceDate,
      p_due_date: dueDate,
      p_currency: currency,
      p_exchange_rate: parsedExchangeRate,
      p_notes: notes.trim() || null,
      p_lines: preparedLines,
      p_idempotency_key: idempotencyKey.current,
    });
    setSaving(false);

    if (error) {
      console.error("Stock-aware sales invoice creation failed", { code: error.code });
      toast.error("Invoice was not issued. Check stock availability and line details; nothing partial was saved.");
      return;
    }

    idempotencyKey.current = requestKey();
    setNotes("");
    setLines([newLine(defaultRevenueAccountId)]);
    toast.success("Invoice issued. Revenue, stock, and COGS were posted where applicable.");
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <ReceiptText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black text-text-primary sm:text-lg">Create and issue invoice</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Service lines post revenue only. Inventory products also lock stock, issue units, and post weighted-average Cost of Goods Sold atomically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Customer</span>
            <select value={customerId} onChange={(event) => handleCustomerChange(event.target.value)} className="field-input min-h-11 w-full" disabled={saving} required>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Invoice date</span>
            <Input type="date" value={invoiceDate} onChange={(event) => {
              const nextDate = event.target.value;
              setInvoiceDate(nextDate);
              const customer = customers.find((item) => item.id === customerId);
              setDueDate(addDays(nextDate, customer?.paymentTermsDays ?? 0));
            }} disabled={saving} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Due date</span>
            <Input type="date" value={dueDate} min={invoiceDate} onChange={(event) => setDueDate(event.target.value)} disabled={saving} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Invoice currency</span>
            <select value={currency} onChange={(event) => {
              const nextCurrency = event.target.value;
              setCurrency(nextCurrency);
              setExchangeRate(nextCurrency === baseCurrency ? "1" : "");
            }} className="field-input min-h-11 w-full" disabled={saving}>
              {SUPPORTED_CURRENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-sm font-bold text-text-primary">Exchange rate to {baseCurrency}</span>
            <Input value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} inputMode="decimal" placeholder={currency === baseCurrency ? "1" : `1 ${currency} in ${baseCurrency}`} disabled={saving || currency === baseCurrency} required />
          </label>
          <label className="space-y-2 md:col-span-2 xl:col-span-1">
            <span className="text-sm font-bold text-text-primary">Invoice notes</span>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional reference or terms" maxLength={1000} disabled={saving} />
          </label>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Line items</p>
              <h3 className="mt-1 font-black text-text-primary">Products and services</h3>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLines((current) => [...current, newLine(defaultRevenueAccountId)])} disabled={saving || lines.length >= 100}>
              <Plus aria-hidden="true" /> Add line
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {lines.map((line, index) => (
              <div key={line.key} className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-4 sm:px-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-text-secondary">Line {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove invoice line ${index + 1}`} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} disabled={saving || lines.length === 1}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <label className="space-y-2 md:col-span-2 xl:col-span-3">
                    <span className="text-xs font-bold text-text-secondary">Inventory product · optional</span>
                    <select value={line.productId} onChange={(event) => selectProduct(line.key, event.target.value)} className="field-input min-h-11 w-full" disabled={saving || catalogLoading}>
                      <option value="">Service or non-stock line</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 md:col-span-2 xl:col-span-3">
                    <span className="text-xs font-bold text-text-secondary">Warehouse</span>
                    <select value={line.warehouseId} onChange={(event) => updateLine(line.key, { warehouseId: event.target.value })} className="field-input min-h-11 w-full" disabled={saving || !line.productId}>
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}{warehouse.is_default ? " · Default" : ""}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 md:col-span-2 xl:col-span-2">
                    <span className="text-xs font-bold text-text-secondary">Description</span>
                    <Input value={line.description} onChange={(event) => updateLine(line.key, { description: event.target.value })} placeholder="Product or service" maxLength={300} disabled={saving} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-text-secondary">Quantity</span>
                    <Input value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} inputMode="decimal" placeholder="1" disabled={saving} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-text-secondary">Unit price</span>
                    <Input value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} inputMode="decimal" placeholder="0" disabled={saving} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-text-secondary">Discount %</span>
                    <Input value={line.discountPercent} onChange={(event) => updateLine(line.key, { discountPercent: event.target.value })} inputMode="decimal" placeholder="0" disabled={saving} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-text-secondary">Tax %</span>
                    <Input value={line.taxRate} onChange={(event) => updateLine(line.key, { taxRate: event.target.value })} inputMode="decimal" placeholder="0" disabled={saving} />
                  </label>
                  <label className="space-y-2 md:col-span-2 xl:col-span-6">
                    <span className="text-xs font-bold text-text-secondary">Revenue account</span>
                    <select value={line.revenueAccountId} onChange={(event) => updateLine(line.key, { revenueAccountId: event.target.value })} className="field-input min-h-11 w-full" disabled={saving || Boolean(line.productId)}>
                      {revenueAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex items-start gap-2 text-sm text-text-secondary">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>PostgreSQL recalculates totals and atomically validates stock, revenue, tax, inventory value, and COGS before saving.</span>
          </div>
          <dl className="grid min-w-[18rem] grid-cols-2 gap-x-5 gap-y-2 text-sm">
            <dt className="text-text-secondary">Gross</dt><dd className="text-right font-black tabular-nums text-text-primary">{currency} {totals.gross.toFixed(2)}</dd>
            <dt className="text-text-secondary">Discount</dt><dd className="text-right font-black tabular-nums text-text-primary">{currency} {totals.discount.toFixed(2)}</dd>
            <dt className="text-text-secondary">Tax</dt><dd className="text-right font-black tabular-nums text-text-primary">{currency} {totals.tax.toFixed(2)}</dd>
            <dt className="font-black text-text-primary">Invoice total</dt><dd className="text-right text-base font-black tabular-nums text-primary">{currency} {totals.total.toFixed(2)}</dd>
          </dl>
        </div>

        <Button type="submit" size="lg" loading={saving} loadingLabel="Issuing invoice..." className="w-full sm:w-auto">
          <FilePlus2 aria-hidden="true" /> Issue invoice and post journal
        </Button>
      </form>
    </section>
  );
}
