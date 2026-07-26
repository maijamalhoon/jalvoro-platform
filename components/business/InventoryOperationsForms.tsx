"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "transfer" | "adjustment" | "sales-return" | "purchase-return";
type Product = {
  id: string;
  sku: string;
  name: string;
  purchase_cost_hint: number | string;
};
type Warehouse = { id: string; code: string; name: string; is_default: boolean };
type Balance = { product_id: string; warehouse_id: string; quantity_on_hand: number | string };
type Invoice = {
  id: string;
  invoice_code: string;
  invoice_date: string;
  currency: string;
  total_transaction: number | string;
  paid_transaction: number | string;
  returned_transaction: number | string;
};
type InvoiceLine = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number | string;
  product_id: string | null;
  warehouse_id: string | null;
};
type Bill = {
  id: string;
  bill_code: string;
  bill_date: string;
  currency: string;
  total_transaction: number | string;
  paid_transaction: number | string;
  returned_transaction: number | string;
};
type BillLine = {
  id: string;
  bill_id: string;
  description: string;
  quantity: number | string;
  product_id: string | null;
  warehouse_id: string | null;
};
type ReturnedLine = { quantity: number | string } & (
  | { invoice_line_id: string }
  | { bill_line_id: string }
);
type OperationLine = { key: string; productId: string; quantity: string };
type AdjustmentLine = {
  key: string;
  productId: string;
  countedQuantity: string;
  unitCost: string;
};
type ReturnEntry = { quantity: string; restock: boolean; warehouseId: string };
type CatalogData = {
  products: Product[];
  warehouses: Warehouse[];
  balances: Balance[];
  invoices: Invoice[];
  invoiceLines: InvoiceLine[];
  salesReturnLines: ReturnedLine[];
  bills: Bill[];
  billLines: BillLine[];
  purchaseReturnLines: ReturnedLine[];
};

type InventoryOperationsFormsProps = {
  businessId: string;
  baseCurrency: string;
  canTransfer: boolean;
  canAdjust: boolean;
  canReturnSales: boolean;
  canReturnPurchases: boolean;
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

function newTransferLine(productId = ""): OperationLine {
  return { key: requestKey(), productId, quantity: "" };
}

function newAdjustmentLine(productId = ""): AdjustmentLine {
  return { key: requestKey(), productId, countedQuantity: "", unitCost: "" };
}

const EMPTY_DATA: CatalogData = {
  products: [],
  warehouses: [],
  balances: [],
  invoices: [],
  invoiceLines: [],
  salesReturnLines: [],
  bills: [],
  billLines: [],
  purchaseReturnLines: [],
};

export default function InventoryOperationsForms({
  businessId,
  baseCurrency,
  canTransfer,
  canAdjust,
  canReturnSales,
  canReturnPurchases,
}: InventoryOperationsFormsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => localDateString(), []);
  const availableModes = useMemo(
    () =>
      [
        canTransfer ? "transfer" : null,
        canAdjust ? "adjustment" : null,
        canReturnSales ? "sales-return" : null,
        canReturnPurchases ? "purchase-return" : null,
      ].filter(Boolean) as Mode[],
    [canAdjust, canReturnPurchases, canReturnSales, canTransfer],
  );
  const [mode, setMode] = useState<Mode>(availableModes[0] ?? "transfer");
  const [data, setData] = useState<CatalogData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Mode | null>(null);

  const [transferDate, setTransferDate] = useState(today);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferLines, setTransferLines] = useState<OperationLine[]>([newTransferLine()]);
  const transferKey = useRef(requestKey());

  const [adjustmentDate, setAdjustmentDate] = useState(today);
  const [adjustmentWarehouseId, setAdjustmentWarehouseId] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentLines, setAdjustmentLines] = useState<AdjustmentLine[]>([
    newAdjustmentLine(),
  ]);
  const adjustmentKey = useRef(requestKey());

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [salesReturnDate, setSalesReturnDate] = useState(today);
  const [salesReturnNotes, setSalesReturnNotes] = useState("");
  const [salesEntries, setSalesEntries] = useState<Record<string, ReturnEntry>>({});
  const salesReturnKey = useRef(requestKey());

  const [selectedBillId, setSelectedBillId] = useState("");
  const [purchaseReturnDate, setPurchaseReturnDate] = useState(today);
  const [purchaseReturnNotes, setPurchaseReturnNotes] = useState("");
  const [purchaseEntries, setPurchaseEntries] = useState<Record<string, ReturnEntry>>({});
  const purchaseReturnKey = useRef(requestKey());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      productsResult,
      warehousesResult,
      balancesResult,
      invoicesResult,
      invoiceLinesResult,
      salesReturnLinesResult,
      billsResult,
      billLinesResult,
      purchaseReturnLinesResult,
    ] = await Promise.all([
      supabase
        .from("business_products")
        .select("id, sku, name, purchase_cost_hint")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("business_warehouses")
        .select("id, code, name, is_default")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .order("name"),
      supabase
        .from("business_inventory_balances")
        .select("product_id, warehouse_id, quantity_on_hand")
        .eq("business_id", businessId),
      supabase
        .from("business_sales_invoices")
        .select(
          "id, invoice_code, invoice_date, currency, total_transaction, paid_transaction, returned_transaction",
        )
        .eq("business_id", businessId)
        .in("status", ["issued", "partially_paid", "paid"])
        .order("invoice_date", { ascending: false })
        .order("invoice_number", { ascending: false })
        .limit(100),
      supabase
        .from("business_sales_invoice_lines")
        .select("id, invoice_id, description, quantity, product_id, warehouse_id")
        .eq("business_id", businessId),
      supabase
        .from("business_sales_return_lines")
        .select("invoice_line_id, quantity")
        .eq("business_id", businessId),
      supabase
        .from("business_supplier_bills")
        .select(
          "id, bill_code, bill_date, currency, total_transaction, paid_transaction, returned_transaction",
        )
        .eq("business_id", businessId)
        .in("status", ["issued", "partially_paid", "paid"])
        .order("bill_date", { ascending: false })
        .order("bill_number", { ascending: false })
        .limit(100),
      supabase
        .from("business_supplier_bill_lines")
        .select("id, bill_id, description, quantity, product_id, warehouse_id")
        .eq("business_id", businessId),
      supabase
        .from("business_purchase_return_lines")
        .select("bill_line_id, quantity")
        .eq("business_id", businessId),
    ]);

    const firstError = [
      productsResult.error,
      warehousesResult.error,
      balancesResult.error,
      invoicesResult.error,
      invoiceLinesResult.error,
      salesReturnLinesResult.error,
      billsResult.error,
      billLinesResult.error,
      purchaseReturnLinesResult.error,
    ].find(Boolean);

    if (firstError) {
      console.error("Inventory operations catalog load failed", { code: firstError.code });
      toast.error("Inventory operations could not be loaded. No data was changed.");
      setLoading(false);
      return;
    }

    const nextData: CatalogData = {
      products: (productsResult.data ?? []) as Product[],
      warehouses: (warehousesResult.data ?? []) as Warehouse[],
      balances: (balancesResult.data ?? []) as Balance[],
      invoices: (invoicesResult.data ?? []) as Invoice[],
      invoiceLines: (invoiceLinesResult.data ?? []) as InvoiceLine[],
      salesReturnLines: (salesReturnLinesResult.data ?? []) as ReturnedLine[],
      bills: (billsResult.data ?? []) as Bill[],
      billLines: (billLinesResult.data ?? []) as BillLine[],
      purchaseReturnLines: (purchaseReturnLinesResult.data ?? []) as ReturnedLine[],
    };
    setData(nextData);

    const defaultWarehouse = nextData.warehouses.find((warehouse) => warehouse.is_default);
    const firstWarehouse = defaultWarehouse?.id ?? nextData.warehouses[0]?.id ?? "";
    const secondWarehouse =
      nextData.warehouses.find((warehouse) => warehouse.id !== firstWarehouse)?.id ?? "";
    const firstProduct = nextData.products[0]?.id ?? "";

    setFromWarehouseId((current) => current || firstWarehouse);
    setToWarehouseId((current) => current || secondWarehouse);
    setAdjustmentWarehouseId((current) => current || firstWarehouse);
    setTransferLines((current) =>
      current.map((line, index) =>
        index === 0 && !line.productId ? { ...line, productId: firstProduct } : line,
      ),
    );
    setAdjustmentLines((current) =>
      current.map((line, index) =>
        index === 0 && !line.productId ? { ...line, productId: firstProduct } : line,
      ),
    );
    setSelectedInvoiceId((current) => current || nextData.invoices[0]?.id || "");
    setSelectedBillId((current) => current || nextData.bills[0]?.id || "");
    setLoading(false);
  }, [businessId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productMap = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );
  const balanceMap = useMemo(
    () =>
      new Map(
        data.balances.map((balance) => [
          `${balance.product_id}:${balance.warehouse_id}`,
          numeric(balance.quantity_on_hand),
        ]),
      ),
    [data.balances],
  );
  const salesReturnedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data.salesReturnLines) {
      if (!("invoice_line_id" in row)) continue;
      map.set(row.invoice_line_id, (map.get(row.invoice_line_id) ?? 0) + numeric(row.quantity));
    }
    return map;
  }, [data.salesReturnLines]);
  const purchaseReturnedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data.purchaseReturnLines) {
      if (!("bill_line_id" in row)) continue;
      map.set(row.bill_line_id, (map.get(row.bill_line_id) ?? 0) + numeric(row.quantity));
    }
    return map;
  }, [data.purchaseReturnLines]);

  const selectedInvoice = data.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  const selectedInvoiceLines = useMemo(
    () =>
      data.invoiceLines.filter(
        (line) =>
          line.invoice_id === selectedInvoiceId &&
          numeric(line.quantity) - (salesReturnedMap.get(line.id) ?? 0) > 0,
      ),
    [data.invoiceLines, salesReturnedMap, selectedInvoiceId],
  );
  const selectedBill = data.bills.find((bill) => bill.id === selectedBillId) ?? null;
  const selectedBillLines = useMemo(
    () =>
      data.billLines.filter(
        (line) =>
          line.bill_id === selectedBillId &&
          numeric(line.quantity) - (purchaseReturnedMap.get(line.id) ?? 0) > 0,
      ),
    [data.billLines, purchaseReturnedMap, selectedBillId],
  );

  useEffect(() => {
    const defaultWarehouse = data.warehouses.find((warehouse) => warehouse.is_default)?.id ?? "";
    const entries: Record<string, ReturnEntry> = {};
    for (const line of selectedInvoiceLines) {
      entries[line.id] = {
        quantity: "",
        restock: Boolean(line.product_id),
        warehouseId: line.warehouse_id ?? defaultWarehouse,
      };
    }
    setSalesEntries(entries);
  }, [data.warehouses, selectedInvoiceLines]);

  useEffect(() => {
    const defaultWarehouse = data.warehouses.find((warehouse) => warehouse.is_default)?.id ?? "";
    const entries: Record<string, ReturnEntry> = {};
    for (const line of selectedBillLines) {
      entries[line.id] = {
        quantity: "",
        restock: false,
        warehouseId: line.warehouse_id ?? defaultWarehouse,
      };
    }
    setPurchaseEntries(entries);
  }, [data.warehouses, selectedBillLines]);

  function updateTransferLine(key: string, changes: Partial<OperationLine>) {
    setTransferLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  }

  function updateAdjustmentLine(key: string, changes: Partial<AdjustmentLine>) {
    setAdjustmentLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const lines = transferLines.map((line) => ({
      product_id: line.productId,
      quantity: numeric(line.quantity),
    }));
    if (!transferDate || !fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) {
      toast.error("Choose different source and destination warehouses.");
      return;
    }
    if (lines.some((line) => !line.product_id || line.quantity <= 0)) {
      toast.error("Complete every transfer line with a product and positive quantity.");
      return;
    }
    setSaving("transfer");
    const { error } = await supabase.rpc("create_business_warehouse_transfer", {
      p_business_id: businessId,
      p_transfer_date: transferDate,
      p_from_warehouse_id: fromWarehouseId,
      p_to_warehouse_id: toWarehouseId,
      p_lines: lines,
      p_notes: transferNotes.trim() || null,
      p_idempotency_key: transferKey.current,
    });
    setSaving(null);
    if (error) {
      toast.error(error.message || "Warehouse transfer was not posted.");
      return;
    }
    transferKey.current = requestKey();
    setTransferNotes("");
    setTransferLines([newTransferLine(data.products[0]?.id ?? "")]);
    toast.success("Warehouse transfer posted with two immutable stock movements.");
    await loadData();
    router.refresh();
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const lines = adjustmentLines.map((line) => ({
      product_id: line.productId,
      counted_quantity: numeric(line.countedQuantity),
      unit_cost_base: line.unitCost ? numeric(line.unitCost) : null,
    }));
    if (!adjustmentDate || !adjustmentWarehouseId || adjustmentReason.trim().length < 2) {
      toast.error("Choose a warehouse and enter a stock-count reason.");
      return;
    }
    if (lines.some((line) => !line.product_id || line.counted_quantity < 0)) {
      toast.error("Complete every counted product with a non-negative quantity.");
      return;
    }
    setSaving("adjustment");
    const { error } = await supabase.rpc("create_business_stock_adjustment", {
      p_business_id: businessId,
      p_adjustment_date: adjustmentDate,
      p_warehouse_id: adjustmentWarehouseId,
      p_reason: adjustmentReason.trim(),
      p_lines: lines,
      p_notes: adjustmentNotes.trim() || null,
      p_idempotency_key: adjustmentKey.current,
    });
    setSaving(null);
    if (error) {
      toast.error(error.message || "Stock adjustment was not posted.");
      return;
    }
    adjustmentKey.current = requestKey();
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setAdjustmentLines([newAdjustmentLine(data.products[0]?.id ?? "")]);
    toast.success("Stock count posted with a balanced gain or loss journal.");
    await loadData();
    router.refresh();
  }

  async function submitSalesReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selectedInvoice) return;
    const lines = selectedInvoiceLines
      .map((line) => {
        const entry = salesEntries[line.id];
        return {
          invoice_line_id: line.id,
          quantity: numeric(entry?.quantity ?? ""),
          restock: line.product_id ? Boolean(entry?.restock) : false,
          warehouse_id:
            line.product_id && entry?.restock ? entry.warehouseId || line.warehouse_id : null,
        };
      })
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      toast.error("Enter a return quantity on at least one invoice line.");
      return;
    }
    const invalid = lines.some((prepared) => {
      const source = selectedInvoiceLines.find((line) => line.id === prepared.invoice_line_id);
      const remaining = source
        ? numeric(source.quantity) - (salesReturnedMap.get(source.id) ?? 0)
        : 0;
      return prepared.quantity > remaining || (prepared.restock && !prepared.warehouse_id);
    });
    if (invalid) {
      toast.error("A return exceeds the remaining quantity or needs a restock warehouse.");
      return;
    }
    setSaving("sales-return");
    const { error } = await supabase.rpc("create_business_sales_return", {
      p_business_id: businessId,
      p_invoice_id: selectedInvoice.id,
      p_return_date: salesReturnDate,
      p_lines: lines,
      p_notes: salesReturnNotes.trim() || null,
      p_idempotency_key: salesReturnKey.current,
    });
    setSaving(null);
    if (error) {
      toast.error(error.message || "Sales return was not posted.");
      return;
    }
    salesReturnKey.current = requestKey();
    setSalesReturnNotes("");
    toast.success("Credit note, customer balance, stock, and COGS reversal posted.");
    await loadData();
    router.refresh();
  }

  async function submitPurchaseReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selectedBill) return;
    const lines = selectedBillLines
      .map((line) => {
        const entry = purchaseEntries[line.id];
        return {
          bill_line_id: line.id,
          quantity: numeric(entry?.quantity ?? ""),
          warehouse_id: line.product_id ? entry?.warehouseId || line.warehouse_id : null,
        };
      })
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      toast.error("Enter a return quantity on at least one supplier bill line.");
      return;
    }
    const invalid = lines.some((prepared) => {
      const source = selectedBillLines.find((line) => line.id === prepared.bill_line_id);
      const remaining = source
        ? numeric(source.quantity) - (purchaseReturnedMap.get(source.id) ?? 0)
        : 0;
      const stock = source?.product_id && prepared.warehouse_id
        ? balanceMap.get(`${source.product_id}:${prepared.warehouse_id}`) ?? 0
        : Number.POSITIVE_INFINITY;
      return prepared.quantity > remaining || prepared.quantity > stock || (source?.product_id && !prepared.warehouse_id);
    });
    if (invalid) {
      toast.error("A return exceeds the remaining bill quantity or available warehouse stock.");
      return;
    }
    setSaving("purchase-return");
    const { error } = await supabase.rpc("create_business_purchase_return", {
      p_business_id: businessId,
      p_bill_id: selectedBill.id,
      p_return_date: purchaseReturnDate,
      p_lines: lines,
      p_notes: purchaseReturnNotes.trim() || null,
      p_idempotency_key: purchaseReturnKey.current,
    });
    setSaving(null);
    if (error) {
      toast.error(error.message || "Purchase return was not posted.");
      return;
    }
    purchaseReturnKey.current = requestKey();
    setPurchaseReturnNotes("");
    toast.success("Supplier debit note, payable/refund balance, stock, and valuation journal posted.");
    await loadData();
    router.refresh();
  }

  if (availableModes.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <RefreshCcw className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-black text-text-primary sm:text-lg">Inventory operations</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
              Transfers, physical counts, customer returns, and supplier returns post through one atomic
              stock and accounting engine.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Immutable after posting
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {availableModes.map((item) => {
          const labels: Record<Mode, string> = {
            transfer: "Warehouse transfer",
            adjustment: "Stock count",
            "sales-return": "Sales return",
            "purchase-return": "Purchase return",
          };
          const icons: Record<Mode, typeof ArrowLeftRight> = {
            transfer: ArrowLeftRight,
            adjustment: ClipboardCheck,
            "sales-return": RotateCcw,
            "purchase-return": Undo2,
          };
          const Icon = icons[item];
          return (
            <Button
              key={item}
              type="button"
              variant={mode === item ? "default" : "secondary"}
              onClick={() => setMode(item)}
              className="justify-start"
            >
              <Icon aria-hidden="true" />
              {labels[item]}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
          Loading tenant-scoped products, warehouses, invoices, and supplier bills…
        </div>
      ) : null}

      {!loading && data.products.length === 0 && (mode === "transfer" || mode === "adjustment") ? (
        <div className="mt-6 rounded-[var(--radius-button)] bg-warning-soft px-5 py-5 text-sm text-warning">
          Add an inventory product before posting a transfer or stock count.
        </div>
      ) : null}

      {!loading && mode === "transfer" && data.products.length > 0 ? (
        <form onSubmit={submitTransfer} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Transfer date</span>
              <Input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} disabled={saving !== null} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">From warehouse</span>
              <select value={fromWarehouseId} onChange={(event) => setFromWarehouseId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving !== null} required>
                {data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">To warehouse</span>
              <select value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving !== null} required>
                {data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {transferLines.map((line, index) => (
              <div key={line.key} className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 md:grid-cols-[1fr_0.45fr_auto] md:items-end">
                <label className="space-y-2">
                  <span className="text-xs font-bold text-text-secondary">Product {index + 1}</span>
                  <select value={line.productId} onChange={(event) => updateTransferLine(line.key, { productId: event.target.value })} className="field-input min-h-11 w-full" disabled={saving !== null}>
                    {data.products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
                  </select>
                  <span className="block text-xs text-text-secondary">Available: {balanceMap.get(`${line.productId}:${fromWarehouseId}`) ?? 0}</span>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold text-text-secondary">Quantity</span>
                  <Input type="number" min="0" step="any" value={line.quantity} onChange={(event) => updateTransferLine(line.key, { quantity: event.target.value })} disabled={saving !== null} required />
                </label>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove transfer line ${index + 1}`} onClick={() => setTransferLines((current) => current.filter((item) => item.key !== line.key))} disabled={saving !== null || transferLines.length === 1}><Trash2 aria-hidden="true" /></Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setTransferLines((current) => [...current, newTransferLine(data.products[0]?.id ?? "")])} disabled={saving !== null || transferLines.length >= 100}><Plus aria-hidden="true" />Add product</Button>
            <Input value={transferNotes} onChange={(event) => setTransferNotes(event.target.value)} placeholder="Optional transfer note" maxLength={2000} disabled={saving !== null} className="min-w-[15rem] flex-1" />
          </div>
          <Button type="submit" size="lg" loading={saving === "transfer"} loadingLabel="Posting transfer…"><ArrowLeftRight aria-hidden="true" />Post warehouse transfer</Button>
        </form>
      ) : null}

      {!loading && mode === "adjustment" && data.products.length > 0 ? (
        <form onSubmit={submitAdjustment} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Count date</span><Input type="date" value={adjustmentDate} onChange={(event) => setAdjustmentDate(event.target.value)} disabled={saving !== null} required /></label>
            <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Warehouse</span><select value={adjustmentWarehouseId} onChange={(event) => setAdjustmentWarehouseId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving !== null} required>{data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</select></label>
            <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Reason</span><Input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} placeholder="Cycle count, damage, opening count…" maxLength={300} disabled={saving !== null} required /></label>
          </div>
          <div className="space-y-3">
            {adjustmentLines.map((line, index) => (
              <div key={line.key} className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 md:grid-cols-[1fr_0.45fr_0.55fr_auto] md:items-end">
                <label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Product {index + 1}</span><select value={line.productId} onChange={(event) => updateAdjustmentLine(line.key, { productId: event.target.value })} className="field-input min-h-11 w-full" disabled={saving !== null}>{data.products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}</select><span className="block text-xs text-text-secondary">System: {balanceMap.get(`${line.productId}:${adjustmentWarehouseId}`) ?? 0}</span></label>
                <label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Counted quantity</span><Input type="number" min="0" step="any" value={line.countedQuantity} onChange={(event) => updateAdjustmentLine(line.key, { countedQuantity: event.target.value })} disabled={saving !== null} required /></label>
                <label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Unit cost for opening stock</span><Input type="number" min="0" step="any" value={line.unitCost} onChange={(event) => updateAdjustmentLine(line.key, { unitCost: event.target.value })} placeholder={`${baseCurrency} optional`} disabled={saving !== null} /></label>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove adjustment line ${index + 1}`} onClick={() => setAdjustmentLines((current) => current.filter((item) => item.key !== line.key))} disabled={saving !== null || adjustmentLines.length === 1}><Trash2 aria-hidden="true" /></Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={() => setAdjustmentLines((current) => [...current, newAdjustmentLine(data.products[0]?.id ?? "")])} disabled={saving !== null || adjustmentLines.length >= 100}><Plus aria-hidden="true" />Add counted product</Button><Input value={adjustmentNotes} onChange={(event) => setAdjustmentNotes(event.target.value)} placeholder="Optional stock-count note" maxLength={2000} disabled={saving !== null} className="min-w-[15rem] flex-1" /></div>
          <Button type="submit" size="lg" loading={saving === "adjustment"} loadingLabel="Posting stock count…"><ClipboardCheck aria-hidden="true" />Post stock count and journal</Button>
        </form>
      ) : null}

      {!loading && mode === "sales-return" ? (
        data.invoices.length === 0 ? <div className="mt-6 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">No issued customer invoice is available for return.</div> :
        <form onSubmit={submitSalesReturn} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-bold text-text-primary">Customer invoice</span><select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving !== null}>{data.invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_code} · {invoice.currency} {Math.max(0, numeric(invoice.total_transaction)-numeric(invoice.paid_transaction)-numeric(invoice.returned_transaction)).toFixed(2)} collectible</option>)}</select></label>
            <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Return date</span><Input type="date" min={selectedInvoice?.invoice_date} value={salesReturnDate} onChange={(event) => setSalesReturnDate(event.target.value)} disabled={saving !== null} required /></label>
          </div>
          <div className="space-y-3">{selectedInvoiceLines.map((line) => { const remaining=numeric(line.quantity)-(salesReturnedMap.get(line.id)??0);const entry=salesEntries[line.id];return <div key={line.id} className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 lg:grid-cols-[1fr_0.35fr_0.35fr_0.7fr] lg:items-end"><div><strong className="text-sm text-text-primary">{line.description}</strong><span className="mt-1 block text-xs text-text-secondary">Remaining returnable: {remaining}{line.product_id ? ` · ${productMap.get(line.product_id)?.sku ?? "Product"}` : " · Service/non-stock"}</span></div><label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Return quantity</span><Input type="number" min="0" max={remaining} step="any" value={entry?.quantity ?? ""} onChange={(event) => setSalesEntries((current) => ({...current,[line.id]:{...(current[line.id] ?? {restock:Boolean(line.product_id),warehouseId:line.warehouse_id ?? ""}),quantity:event.target.value}}))} disabled={saving !== null} /></label>{line.product_id ? <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-background px-3 text-sm font-bold text-text-primary"><input type="checkbox" checked={entry?.restock ?? true} onChange={(event) => setSalesEntries((current) => ({...current,[line.id]:{...(current[line.id] ?? {quantity:"",warehouseId:line.warehouse_id ?? ""}),restock:event.target.checked}}))} disabled={saving !== null} />Restock</label> : <span className="text-xs text-text-secondary">No stock movement</span>}{line.product_id && entry?.restock ? <label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Restock warehouse</span><select value={entry?.warehouseId ?? ""} onChange={(event) => setSalesEntries((current) => ({...current,[line.id]:{...(current[line.id] ?? {quantity:"",restock:true}),warehouseId:event.target.value}}))} className="field-input min-h-11 w-full" disabled={saving !== null}>{data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</select></label> : <span />}</div>;})}</div>
          <Input value={salesReturnNotes} onChange={(event) => setSalesReturnNotes(event.target.value)} placeholder="Return reason or credit-note reference" maxLength={2000} disabled={saving !== null} />
          <Button type="submit" size="lg" loading={saving === "sales-return"} loadingLabel="Posting sales return…"><RotateCcw aria-hidden="true" />Post sales return and credit note</Button>
        </form>
      ) : null}

      {!loading && mode === "purchase-return" ? (
        data.bills.length === 0 ? <div className="mt-6 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">No issued supplier bill is available for return.</div> :
        <form onSubmit={submitPurchaseReturn} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-bold text-text-primary">Supplier bill</span><select value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving !== null}>{data.bills.map((bill) => <option key={bill.id} value={bill.id}>{bill.bill_code} · {bill.currency} {Math.max(0,numeric(bill.total_transaction)-numeric(bill.paid_transaction)-numeric(bill.returned_transaction)).toFixed(2)} payable</option>)}</select></label>
            <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Return date</span><Input type="date" min={selectedBill?.bill_date} value={purchaseReturnDate} onChange={(event) => setPurchaseReturnDate(event.target.value)} disabled={saving !== null} required /></label>
          </div>
          <div className="space-y-3">{selectedBillLines.map((line) => {const remaining=numeric(line.quantity)-(purchaseReturnedMap.get(line.id)??0);const entry=purchaseEntries[line.id];const available=line.product_id && entry?.warehouseId ? balanceMap.get(`${line.product_id}:${entry.warehouseId}`)??0 : null;return <div key={line.id} className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 lg:grid-cols-[1fr_0.4fr_0.75fr] lg:items-end"><div><strong className="text-sm text-text-primary">{line.description}</strong><span className="mt-1 block text-xs text-text-secondary">Remaining returnable: {remaining}{available !== null ? ` · Available stock: ${available}` : " · Non-stock allocation"}</span></div><label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Return quantity</span><Input type="number" min="0" max={remaining} step="any" value={entry?.quantity ?? ""} onChange={(event) => setPurchaseEntries((current) => ({...current,[line.id]:{...(current[line.id] ?? {restock:false,warehouseId:line.warehouse_id ?? ""}),quantity:event.target.value}}))} disabled={saving !== null} /></label>{line.product_id ? <label className="space-y-2"><span className="text-xs font-bold text-text-secondary">Issue from warehouse</span><select value={entry?.warehouseId ?? ""} onChange={(event) => setPurchaseEntries((current) => ({...current,[line.id]:{...(current[line.id] ?? {quantity:"",restock:false}),warehouseId:event.target.value}}))} className="field-input min-h-11 w-full" disabled={saving !== null}>{data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</select></label> : <span className="text-xs text-text-secondary">Original expense/asset account will be reversed.</span>}</div>;})}</div>
          <Input value={purchaseReturnNotes} onChange={(event) => setPurchaseReturnNotes(event.target.value)} placeholder="Supplier return reason or debit-note reference" maxLength={2000} disabled={saving !== null} />
          <Button type="submit" size="lg" loading={saving === "purchase-return"} loadingLabel="Posting purchase return…"><Undo2 aria-hidden="true" />Post purchase return and debit note</Button>
        </form>
      ) : null}
    </section>
  );
}
