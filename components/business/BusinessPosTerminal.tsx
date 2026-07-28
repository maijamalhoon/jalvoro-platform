"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  KeyRound,
  LoaderCircle,
  LogOut,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type TerminalMode = "sale" | "purchase" | "expense" | "refund" | "void" | "cash_adjustment";
type ApprovalOperation = "high_discount" | "refund" | "void" | "cash_adjustment";

type Product = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sales_price: number | string;
  purchase_cost_hint: number | string;
  quantity_on_hand: number | string;
};

type Party = { id: string; name: string };
type InvoiceLine = {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number | string;
  total: number | string;
  returned_quantity: number | string;
};
type Invoice = {
  id: string;
  code: string;
  date: string;
  total: number | string;
  paid: number | string;
  returned: number | string;
  status: string;
  customer_id: string;
  created_at: string;
  lines: InvoiceLine[];
};
type TerminalSnapshot = {
  session: {
    id: string;
    business_id: string;
    branch_id: string;
    device_id: string;
    user_id: string;
    expires_at: string;
  };
  business: { id: string; slug: string; name: string; base_currency: string; timezone: string };
  branch: { id: string; code: string; name: string; timezone: string; current_date: string };
  settings: {
    warehouse_id: string;
    cash_account_id: string;
    high_discount_threshold: number | string;
    allow_credit_sales: boolean;
    allow_purchases: boolean;
    allow_expenses: boolean;
  };
  capabilities: {
    sale: boolean;
    purchase: boolean;
    expense: boolean;
    refund: boolean;
    void: boolean;
    cash_adjustment: boolean;
  };
  products: Product[];
  customers: Party[];
  suppliers: Party[];
  recent_invoices: Invoice[];
  recent_operations: Array<{
    id: string;
    operation_type: string;
    status: string;
    amount: number | string | null;
    result: Record<string, unknown> | null;
    created_at: string;
  }>;
};

type CartLine = {
  key: string;
  productId: string;
  quantity: string;
  discountPercent: string;
  taxRate: string;
};

type PendingApproval = {
  approvalId: string;
  operationType: ApprovalOperation;
  requestKey: string;
  payload: Record<string, unknown>;
  amount: number | null;
};

type InvokeResult = Record<string, unknown> & { error?: string; ok?: boolean };

type BusinessPosTerminalProps = { businessSlug: string };

const MODES: Array<{ value: TerminalMode; label: string; icon: typeof Store }> = [
  { value: "sale", label: "Sale", icon: ShoppingCart },
  { value: "purchase", label: "Purchase", icon: PackagePlus },
  { value: "expense", label: "Expense", icon: WalletCards },
  { value: "refund", label: "Refund", icon: RotateCcw },
  { value: "void", label: "Void", icon: XCircle },
  { value: "cash_adjustment", label: "Cash", icon: Banknote },
];

function requestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  throw new Error("secure_request_key_unavailable");
}

function numeric(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric(value));
}

function newCartLine(product?: Product): CartLine {
  return {
    key: requestKey(),
    productId: product?.id ?? "",
    quantity: "1",
    discountPercent: "0",
    taxRate: "0",
  };
}

function availableQuantity(line: InvoiceLine) {
  return Math.max(numeric(line.quantity) - numeric(line.returned_quantity), 0);
}

export default function BusinessPosTerminal({ businessSlug }: BusinessPosTerminalProps) {
  const supabase = useMemo(() => createClient(), []);
  const storageKey = `jalvoro.pos.session.${businessSlug}`;
  const [sessionToken, setSessionToken] = useState("");
  const [snapshot, setSnapshot] = useState<TerminalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<TerminalMode>("sale");
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  const [deviceCode, setDeviceCode] = useState("");
  const [deviceSecret, setDeviceSecret] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [pin, setPin] = useState("");
  const [mustChangePin, setMustChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");

  const [saleCustomerId, setSaleCustomerId] = useState("");
  const [salePaidNow, setSalePaidNow] = useState(true);
  const [saleNotes, setSaleNotes] = useState("");
  const [saleLines, setSaleLines] = useState<CartLine[]>([]);
  const saleRequestKey = useRef("");

  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [purchasePaidNow, setPurchasePaidNow] = useState(true);
  const [purchaseDocument, setPurchaseDocument] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseLinesState, setPurchaseLinesState] = useState<CartLine[]>([]);
  const purchaseRequestKey = useRef("");

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReference, setExpenseReference] = useState("");
  const expenseRequestKey = useRef("");

  const [refundInvoiceId, setRefundInvoiceId] = useState("");
  const [refundQuantities, setRefundQuantities] = useState<Record<string, string>>({});
  const [refundNotes, setRefundNotes] = useState("");
  const [refundCash, setRefundCash] = useState(true);
  const refundRequestKey = useRef("");

  const [voidInvoiceId, setVoidInvoiceId] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const voidRequestKey = useRef("");

  const [adjustmentDirection, setAdjustmentDirection] = useState<"increase" | "decrease">("increase");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const adjustmentRequestKey = useRef("");

  const invoke = useCallback(async (body: Record<string, unknown>): Promise<InvokeResult> => {
    const { data, error } = await supabase.functions.invoke("business-pos-security", { body });
    if (!error) return (data ?? {}) as InvokeResult;
    const context = (error as { context?: unknown }).context ?? null;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null);
      if (payload && typeof payload === "object") return payload as InvokeResult;
    }
    return { error: error.message || "pos_request_failed" };
  }, [supabase]);

  const initializeForms = useCallback((next: TerminalSnapshot) => {
    setSaleCustomerId(next.customers[0]?.id ?? "");
    setPurchaseSupplierId(next.suppliers[0]?.id ?? "");
    setSaleLines((current) => current.length ? current : [newCartLine(next.products[0])]);
    setPurchaseLinesState((current) => current.length ? current : [newCartLine(next.products[0])]);
    setRefundInvoiceId((current) => current || next.recent_invoices[0]?.id || "");
    setVoidInvoiceId((current) => current || next.recent_invoices[0]?.id || "");
    setMode((current) => next.capabilities[current]
      ? current
      : MODES.find((item) => next.capabilities[item.value])?.value ?? "sale");
  }, []);

  const loadSnapshot = useCallback(async (token: string) => {
    const result = await invoke({ action: "terminal_snapshot", sessionToken: token });
    if (result.ok !== true || !result.snapshot) {
      sessionStorage.removeItem(storageKey);
      setSessionToken("");
      setSnapshot(null);
      setMustChangePin(false);
      return false;
    }
    const next = result.snapshot as TerminalSnapshot;
    setSnapshot(next);
    initializeForms(next);
    return true;
  }, [initializeForms, invoke, storageKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey) ?? "";
    if (!stored) {
      setLoading(false);
      return;
    }
    setSessionToken(stored);
    void loadSnapshot(stored).finally(() => setLoading(false));
  }, [loadSnapshot, storageKey]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await invoke({
      action: "start_session",
      businessSlug,
      deviceCode,
      deviceSecret,
      staffCode,
      pin,
    });
    setBusy(false);
    if (result.ok !== true || typeof result.sessionToken !== "string") {
      toast.error("POS sign-in failed. Check the registered device, staff code, and PIN.");
      return;
    }
    const token = result.sessionToken;
    const session = (result.session ?? {}) as Record<string, unknown>;
    sessionStorage.setItem(storageKey, token);
    setSessionToken(token);
    setDeviceSecret("");
    setPin("");
    setMustChangePin(session.must_change_pin === true);
    if (session.must_change_pin !== true) {
      await loadSnapshot(token);
    }
    toast.success(session.must_change_pin === true ? "Set a private PIN to continue." : "POS session started.");
  }

  async function changePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !sessionToken) return;
    setBusy(true);
    const result = await invoke({ action: "change_pin", sessionToken, currentPin, newPin });
    setBusy(false);
    if (result.ok !== true) {
      toast.error("PIN was not changed. Check the current PIN and six-digit policy.");
      return;
    }
    setCurrentPin("");
    setNewPin("");
    setMustChangePin(false);
    await loadSnapshot(sessionToken);
    toast.success("Private POS PIN saved.");
  }

  function clearSession() {
    sessionStorage.removeItem(storageKey);
    setSessionToken("");
    setSnapshot(null);
    setPendingApproval(null);
    setMustChangePin(false);
  }

  async function endShift() {
    const token = sessionToken;
    clearSession();
    if (token) await invoke({ action: "end_session", sessionToken: token });
  }

  function updateCartLine(
    target: "sale" | "purchase",
    key: string,
    changes: Partial<CartLine>,
  ) {
    const setter = target === "sale" ? setSaleLines : setPurchaseLinesState;
    setter((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line));
  }

  function removeCartLine(target: "sale" | "purchase", key: string) {
    const setter = target === "sale" ? setSaleLines : setPurchaseLinesState;
    setter((current) => current.length === 1 ? current : current.filter((line) => line.key !== key));
  }

  function normalizedCart(lines: CartLine[]) {
    return lines.map((line) => ({
      productId: line.productId,
      quantity: numeric(line.quantity),
      discountPercent: numeric(line.discountPercent),
      taxRate: numeric(line.taxRate),
    }));
  }

  async function requestApproval(
    operationType: ApprovalOperation,
    requestKeyValue: string,
    payload: Record<string, unknown>,
    approvalResult: InvokeResult,
    reason: string,
  ) {
    const payloadHash = typeof approvalResult.payloadHash === "string" ? approvalResult.payloadHash : "";
    if (!payloadHash) {
      toast.error("The approval request could not be prepared.");
      return;
    }
    const approval = await invoke({
      action: "request_approval",
      sessionToken,
      operationType,
      payloadHash,
      reason,
      amount: typeof approvalResult.amount === "number" ? approvalResult.amount : null,
      discountPercent: operationType === "high_discount" ? maxDiscount(saleLines) : null,
    });
    const approvalData = (approval.approval ?? {}) as Record<string, unknown>;
    if (approval.ok !== true || typeof approvalData.approval_id !== "string") {
      toast.error("Manager approval could not be requested.");
      return;
    }
    setPendingApproval({
      approvalId: approvalData.approval_id,
      operationType,
      requestKey: requestKeyValue,
      payload,
      amount: typeof approvalResult.amount === "number" ? approvalResult.amount : null,
    });
    toast.success("Approval requested. A manager can approve it in POS Security.");
  }

  async function postSale(
    payload: Record<string, unknown>,
    key: string,
    approvalId?: string,
  ) {
    const result = await invoke({ action: "post_sale", sessionToken, requestKey: key, approvalId, ...payload });
    if (result.approvalRequired === true) {
      await requestApproval(
        "high_discount",
        key,
        payload,
        result,
        saleNotes.trim() || "High discount requested at POS",
      );
      return false;
    }
    if (result.ok !== true) {
      toast.error(errorMessage(result.error));
      return false;
    }
    setPendingApproval(null);
    saleRequestKey.current = requestKey();
    setSaleNotes("");
    setSaleLines([newCartLine(snapshot?.products[0])]);
    toast.success("Sale, stock, payment, and accounting posted.");
    await loadSnapshot(sessionToken);
    return true;
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || busy) return;
    const lines = normalizedCart(saleLines);
    if (lines.some((line) => !line.productId || line.quantity <= 0)) {
      toast.error("Add valid products and quantities.");
      return;
    }
    if (!saleRequestKey.current) saleRequestKey.current = requestKey();
    setBusy(true);
    await postSale({
      saleDate: snapshot.branch.current_date,
      customerId: saleCustomerId || null,
      lines,
      paidNow: salePaidNow,
      notes: saleNotes.trim() || null,
    }, saleRequestKey.current);
    setBusy(false);
  }

  async function postOperation(
    operationType: Exclude<TerminalMode, "sale">,
    payload: Record<string, unknown>,
    key: string,
    approvalId?: string,
  ) {
    const result = await invoke({
      action: "post_operation",
      sessionToken,
      operationType,
      payload,
      requestKey: key,
      approvalId,
    });
    if (result.approvalRequired === true) {
      await requestApproval(
        operationType as ApprovalOperation,
        key,
        payload,
        result,
        approvalReason(operationType, payload),
      );
      return false;
    }
    if (result.ok !== true) {
      toast.error(errorMessage(result.error));
      return false;
    }
    setPendingApproval(null);
    toast.success(`${modeLabel(operationType)} posted.`);
    await loadSnapshot(sessionToken);
    return true;
  }

  async function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || busy) return;
    const lines = normalizedCart(purchaseLinesState);
    if (lines.some((line) => !line.productId || line.quantity <= 0)) {
      toast.error("Add valid purchase products and quantities.");
      return;
    }
    if (!purchaseRequestKey.current) purchaseRequestKey.current = requestKey();
    setBusy(true);
    const posted = await postOperation("purchase", {
      purchaseDate: snapshot.branch.current_date,
      supplierId: purchaseSupplierId || null,
      supplierDocumentNumber: purchaseDocument.trim() || null,
      paidNow: purchasePaidNow,
      notes: purchaseNotes.trim() || null,
      lines,
    }, purchaseRequestKey.current);
    setBusy(false);
    if (posted) {
      purchaseRequestKey.current = requestKey();
      setPurchaseDocument("");
      setPurchaseNotes("");
      setPurchaseLinesState([newCartLine(snapshot.products[0])]);
    }
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || busy) return;
    if (!expenseRequestKey.current) expenseRequestKey.current = requestKey();
    setBusy(true);
    const posted = await postOperation("expense", {
      expenseDate: snapshot.branch.current_date,
      description: expenseDescription,
      amount: numeric(expenseAmount),
      reference: expenseReference.trim() || null,
    }, expenseRequestKey.current);
    setBusy(false);
    if (posted) {
      expenseRequestKey.current = requestKey();
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseReference("");
    }
  }

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || busy || !refundInvoiceId) return;
    const invoice = snapshot.recent_invoices.find((item) => item.id === refundInvoiceId);
    const lines = invoice?.lines.flatMap((line) => {
      const quantity = numeric(refundQuantities[line.id]);
      return quantity > 0 ? [{ invoiceLineId: line.id, quantity }] : [];
    }) ?? [];
    if (!lines.length) {
      toast.error("Enter at least one return quantity.");
      return;
    }
    if (!refundRequestKey.current) refundRequestKey.current = requestKey();
    const payload = {
      returnDate: snapshot.branch.current_date,
      invoiceId: refundInvoiceId,
      lines,
      notes: refundNotes.trim() || null,
      refundCash,
    };
    setBusy(true);
    const posted = await postOperation("refund", payload, refundRequestKey.current);
    setBusy(false);
    if (posted) {
      refundRequestKey.current = requestKey();
      setRefundQuantities({});
      setRefundNotes("");
    }
  }

  async function submitVoid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || busy || !voidInvoiceId) return;
    if (!voidRequestKey.current) voidRequestKey.current = requestKey();
    const payload = {
      voidDate: snapshot.branch.current_date,
      invoiceId: voidInvoiceId,
      reason: voidReason,
    };
    setBusy(true);
    const posted = await postOperation("void", payload, voidRequestKey.current);
    setBusy(false);
    if (posted) {
      voidRequestKey.current = requestKey();
      setVoidReason("");
    }
  }

  async function submitCashAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || busy) return;
    if (!adjustmentRequestKey.current) adjustmentRequestKey.current = requestKey();
    const payload = {
      adjustmentDate: snapshot.branch.current_date,
      direction: adjustmentDirection,
      amount: numeric(adjustmentAmount),
      reason: adjustmentReason,
    };
    setBusy(true);
    const posted = await postOperation("cash_adjustment", payload, adjustmentRequestKey.current);
    setBusy(false);
    if (posted) {
      adjustmentRequestKey.current = requestKey();
      setAdjustmentAmount("");
      setAdjustmentReason("");
    }
  }

  async function retryApprovedOperation() {
    if (!pendingApproval || busy) return;
    setBusy(true);
    if (pendingApproval.operationType === "high_discount") {
      await postSale(pendingApproval.payload, pendingApproval.requestKey, pendingApproval.approvalId);
    } else {
      await postOperation(
        pendingApproval.operationType,
        pendingApproval.payload,
        pendingApproval.requestKey,
        pendingApproval.approvalId,
      );
    }
    setBusy(false);
  }

  function dismissPendingApproval() {
    if (pendingApproval?.operationType === "high_discount") saleRequestKey.current = requestKey();
    if (pendingApproval?.operationType === "refund") refundRequestKey.current = requestKey();
    if (pendingApproval?.operationType === "void") voidRequestKey.current = requestKey();
    if (pendingApproval?.operationType === "cash_adjustment") adjustmentRequestKey.current = requestKey();
    setPendingApproval(null);
  }

  if (loading) {
    return <TerminalShell><StatusCard text="Restoring secure POS session…" /></TerminalShell>;
  }

  if (!sessionToken) {
    return (
      <TerminalShell>
        <section className="mx-auto max-w-md rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-md)] sm:p-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Registered terminal</p>
              <h1 className="text-xl font-black text-text-primary">Start cashier session</h1>
            </div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <Field label="Device code"><Input value={deviceCode} onChange={(event) => setDeviceCode(event.target.value.toUpperCase())} autoComplete="off" required /></Field>
            <Field label="Device secret"><Input value={deviceSecret} onChange={(event) => setDeviceSecret(event.target.value)} type="password" autoComplete="off" required /></Field>
            <Field label="Staff code"><Input value={staffCode} onChange={(event) => setStaffCode(event.target.value.toUpperCase())} autoComplete="username" required /></Field>
            <Field label="Six-digit PIN"><Input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/gu, "").slice(0, 6))} type="password" inputMode="numeric" autoComplete="current-password" required /></Field>
            <Button className="w-full" disabled={busy} type="submit">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Start secure shift</Button>
          </form>
          <p className="mt-5 text-xs leading-5 text-text-tertiary">The device secret is used only for this sign-in and is not saved by the terminal. Session access expires automatically.</p>
        </section>
      </TerminalShell>
    );
  }

  if (mustChangePin) {
    return (
      <TerminalShell>
        <section className="mx-auto max-w-md rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-md)] sm:p-7">
          <h1 className="text-xl font-black text-text-primary">Create your private PIN</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">The temporary PIN must be replaced before any sale or cash operation.</p>
          <form className="mt-6 space-y-4" onSubmit={changePin}>
            <Field label="Temporary PIN"><Input value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/gu, "").slice(0, 6))} type="password" inputMode="numeric" required /></Field>
            <Field label="New six-digit PIN"><Input value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/gu, "").slice(0, 6))} type="password" inputMode="numeric" required /></Field>
            <Button className="w-full" disabled={busy} type="submit">Save PIN</Button>
          </form>
          <Button className="mt-3 w-full" variant="outline" onClick={() => void endShift()}>Cancel session</Button>
        </section>
      </TerminalShell>
    );
  }

  if (!snapshot) {
    return <TerminalShell><StatusCard text="POS session is unavailable. Sign in again." action={clearSession} /></TerminalShell>;
  }

  const selectedRefundInvoice = snapshot.recent_invoices.find((invoice) => invoice.id === refundInvoiceId);

  return (
    <TerminalShell>
      <header className="rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><Store className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-text-primary">{snapshot.business.name}</p>
              <p className="truncate text-xs font-bold text-text-secondary">{snapshot.branch.name} · {snapshot.branch.current_date}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadSnapshot(sessionToken)}><RefreshCw className="size-4" /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={() => void endShift()}><LogOut className="size-4" /> End shift</Button>
          </div>
        </div>
      </header>

      {pendingApproval ? (
        <section className="mt-4 rounded-[var(--radius-card)] bg-warning-soft p-4 text-warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black">Manager approval pending</p>
              <p className="mt-1 text-sm">Approval {pendingApproval.approvalId.slice(0, 8)} is bound to this exact request. After approval, retry without editing the form.</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void retryApprovedOperation()}><ClipboardCheck className="size-4" /> Retry approved request</Button>
              <Button variant="outline" onClick={dismissPendingApproval}>Dismiss</Button>
            </div>
          </div>
        </section>
      ) : null}

      <nav className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="POS operations">
        {MODES.map((item) => {
          const Icon = item.icon;
          const disabled = snapshot.capabilities[item.value] !== true;
          return <button key={item.value} type="button" disabled={disabled} onClick={() => setMode(item.value)} className={`finance-focus flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-button)] px-2 text-xs font-black transition ${mode === item.value ? "bg-primary text-primary-foreground" : "bg-surface text-text-secondary hover:text-text-primary"} disabled:cursor-not-allowed disabled:opacity-40`}><Icon className="size-4" aria-hidden="true" />{item.label}</button>;
        })}
      </nav>

      <section className="mt-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-6">
        {mode === "sale" ? <SaleForm snapshot={snapshot} lines={saleLines} customerId={saleCustomerId} paidNow={salePaidNow} notes={saleNotes} busy={busy} onCustomer={setSaleCustomerId} onPaid={setSalePaidNow} onNotes={setSaleNotes} onUpdate={(key, changes) => updateCartLine("sale", key, changes)} onAdd={() => setSaleLines((current) => [...current, newCartLine(snapshot.products[0])])} onRemove={(key) => removeCartLine("sale", key)} onSubmit={submitSale} /> : null}
        {mode === "purchase" ? <PurchaseForm snapshot={snapshot} lines={purchaseLinesState} supplierId={purchaseSupplierId} paidNow={purchasePaidNow} document={purchaseDocument} notes={purchaseNotes} busy={busy} onSupplier={setPurchaseSupplierId} onPaid={setPurchasePaidNow} onDocument={setPurchaseDocument} onNotes={setPurchaseNotes} onUpdate={(key, changes) => updateCartLine("purchase", key, changes)} onAdd={() => setPurchaseLinesState((current) => [...current, newCartLine(snapshot.products[0])])} onRemove={(key) => removeCartLine("purchase", key)} onSubmit={submitPurchase} /> : null}
        {mode === "expense" ? <SimpleForm title="Cash expense" icon={WalletCards} onSubmit={submitExpense} busy={busy}><Field label="Description"><Input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} required /></Field><Field label={`Amount (${snapshot.business.base_currency})`}><Input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} type="number" min="0.01" step="0.01" required /></Field><Field label="Reference (optional)"><Input value={expenseReference} onChange={(event) => setExpenseReference(event.target.value)} /></Field></SimpleForm> : null}
        {mode === "refund" ? <SimpleForm title="Approved customer refund" icon={RotateCcw} onSubmit={submitRefund} busy={busy}><Field label="POS invoice"><Select value={refundInvoiceId} onChange={setRefundInvoiceId} options={snapshot.recent_invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.code} · ${money(numeric(invoice.total) - numeric(invoice.returned), snapshot.business.base_currency)}` }))} /></Field>{selectedRefundInvoice?.lines.map((line) => <Field key={line.id} label={`${line.description} · available ${availableQuantity(line)}`}><Input value={refundQuantities[line.id] ?? ""} onChange={(event) => setRefundQuantities((current) => ({ ...current, [line.id]: event.target.value }))} type="number" min="0" max={availableQuantity(line)} step="0.001" /></Field>)}<Field label="Reason / notes"><Input value={refundNotes} onChange={(event) => setRefundNotes(event.target.value)} /></Field><label className="flex items-center gap-2 text-sm font-bold text-text-secondary"><input type="checkbox" checked={refundCash} onChange={(event) => setRefundCash(event.target.checked)} /> Pay eligible customer credit from cash</label></SimpleForm> : null}
        {mode === "void" ? <SimpleForm title="Approved same-day full void" icon={XCircle} onSubmit={submitVoid} busy={busy}><Field label="POS invoice"><Select value={voidInvoiceId} onChange={setVoidInvoiceId} options={snapshot.recent_invoices.filter((invoice) => invoice.date === snapshot.branch.current_date).map((invoice) => ({ value: invoice.id, label: `${invoice.code} · ${money(numeric(invoice.total) - numeric(invoice.returned), snapshot.business.base_currency)}` }))} /></Field><Field label="Void reason"><Input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} minLength={5} required /></Field></SimpleForm> : null}
        {mode === "cash_adjustment" ? <SimpleForm title="Approved cash adjustment" icon={Banknote} onSubmit={submitCashAdjustment} busy={busy}><Field label="Direction"><Select value={adjustmentDirection} onChange={(value) => setAdjustmentDirection(value as "increase" | "decrease")} options={[{ value: "increase", label: "Cash overage / increase" }, { value: "decrease", label: "Cash shortage / decrease" }]} /></Field><Field label={`Amount (${snapshot.business.base_currency})`}><Input value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} type="number" min="0.01" step="0.01" required /></Field><Field label="Reason"><Input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} minLength={5} required /></Field></SimpleForm> : null}
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <h2 className="font-black text-text-primary">This shift’s recent operations</h2>
        <div className="mt-3 divide-y divide-border/60">
          {snapshot.recent_operations.length ? snapshot.recent_operations.map((operation) => <div key={operation.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-bold text-text-primary">{modeLabel(operation.operation_type)}</span><span className="text-text-secondary">{operation.status}{operation.amount != null ? ` · ${money(operation.amount, snapshot.business.base_currency)}` : ""}</span></div>) : <p className="py-5 text-sm text-text-secondary">No operations in this session yet.</p>}
        </div>
      </section>
    </TerminalShell>
  );
}

function TerminalShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh bg-background px-3 py-4 text-foreground sm:px-5 sm:py-6"><div className="mx-auto w-full max-w-6xl">{children}</div></main>;
}

function StatusCard({ text, action }: { text: string; action?: () => void }) {
  return <section className="mx-auto mt-20 max-w-md rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-[var(--shadow-sm)]"><LoaderCircle className="mx-auto size-6 animate-spin text-primary" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-text-secondary">{text}</p>{action ? <Button className="mt-4" onClick={action}>Sign in again</Button> : null}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black text-text-secondary">{label}</span>{children}</label>;
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <select className="finance-focus min-h-10 w-full rounded-[var(--radius-button)] border border-border bg-background px-3 text-sm text-text-primary" value={value} onChange={(event) => onChange(event.target.value)}>{options.length ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value="">No available records</option>}</select>;
}

function SimpleForm({ title, icon: Icon, onSubmit, busy, children }: { title: string; icon: typeof Store; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean; children: React.ReactNode }) {
  return <form onSubmit={onSubmit}><div className="flex items-center gap-3"><Icon className="size-5 text-primary" aria-hidden="true" /><h2 className="text-lg font-black text-text-primary">{title}</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div><Button className="mt-5" disabled={busy} type="submit">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <CircleDollarSign className="size-4" />} Submit operation</Button></form>;
}

function CartEditor({ snapshot, lines, target, onUpdate, onAdd, onRemove }: { snapshot: TerminalSnapshot; lines: CartLine[]; target: "sale" | "purchase"; onUpdate: (key: string, changes: Partial<CartLine>) => void; onAdd: () => void; onRemove: (key: string) => void }) {
  return <div className="space-y-3">{lines.map((line) => <div key={line.key} className="grid gap-2 rounded-[var(--radius-button)] bg-surface-secondary p-3 sm:grid-cols-[2fr_0.7fr_0.7fr_0.7fr_auto]"><Select value={line.productId} onChange={(productId) => onUpdate(line.key, { productId })} options={snapshot.products.map((product) => ({ value: product.id, label: `${product.sku} · ${product.name}${target === "sale" ? ` · stock ${numeric(product.quantity_on_hand)}` : ""}` }))} /><Input value={line.quantity} onChange={(event) => onUpdate(line.key, { quantity: event.target.value })} type="number" min="0.001" step="0.001" aria-label="Quantity" /><Input value={line.discountPercent} onChange={(event) => onUpdate(line.key, { discountPercent: event.target.value })} type="number" min="0" max="100" step="0.01" aria-label="Discount percent" /><Input value={line.taxRate} onChange={(event) => onUpdate(line.key, { taxRate: event.target.value })} type="number" min="0" max="100" step="0.01" aria-label="Tax rate" /><Button type="button" variant="outline" size="icon" onClick={() => onRemove(line.key)} aria-label="Remove line"><Trash2 className="size-4" /></Button></div>)}<Button type="button" variant="outline" onClick={onAdd}><Plus className="size-4" /> Add line</Button></div>;
}

function SaleForm(props: { snapshot: TerminalSnapshot; lines: CartLine[]; customerId: string; paidNow: boolean; notes: string; busy: boolean; onCustomer: (value: string) => void; onPaid: (value: boolean) => void; onNotes: (value: string) => void; onUpdate: (key: string, changes: Partial<CartLine>) => void; onAdd: () => void; onRemove: (key: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={props.onSubmit}><div className="flex items-center gap-3"><ShoppingCart className="size-5 text-primary" /><h2 className="text-lg font-black text-text-primary">New sale</h2></div><div className="mt-5"><CartEditor snapshot={props.snapshot} lines={props.lines} target="sale" onUpdate={props.onUpdate} onAdd={props.onAdd} onRemove={props.onRemove} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Customer"><Select value={props.customerId} onChange={props.onCustomer} options={props.snapshot.customers.map((party) => ({ value: party.id, label: party.name }))} /></Field><Field label="Notes (optional)"><Input value={props.notes} onChange={(event) => props.onNotes(event.target.value)} /></Field></div><label className="mt-4 flex items-center gap-2 text-sm font-bold text-text-secondary"><input type="checkbox" checked={props.paidNow} disabled={!props.snapshot.settings.allow_credit_sales} onChange={(event) => props.onPaid(event.target.checked)} /> Receive payment now</label><Button className="mt-5" disabled={props.busy} type="submit"><ReceiptText className="size-4" /> Post sale</Button></form>;
}

function PurchaseForm(props: { snapshot: TerminalSnapshot; lines: CartLine[]; supplierId: string; paidNow: boolean; document: string; notes: string; busy: boolean; onSupplier: (value: string) => void; onPaid: (value: boolean) => void; onDocument: (value: string) => void; onNotes: (value: string) => void; onUpdate: (key: string, changes: Partial<CartLine>) => void; onAdd: () => void; onRemove: (key: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={props.onSubmit}><div className="flex items-center gap-3"><PackagePlus className="size-5 text-primary" /><h2 className="text-lg font-black text-text-primary">Stock purchase</h2></div><div className="mt-5"><CartEditor snapshot={props.snapshot} lines={props.lines} target="purchase" onUpdate={props.onUpdate} onAdd={props.onAdd} onRemove={props.onRemove} /></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Supplier"><Select value={props.supplierId} onChange={props.onSupplier} options={props.snapshot.suppliers.map((party) => ({ value: party.id, label: party.name }))} /></Field><Field label="Supplier document"><Input value={props.document} onChange={(event) => props.onDocument(event.target.value)} /></Field><Field label="Notes"><Input value={props.notes} onChange={(event) => props.onNotes(event.target.value)} /></Field></div><label className="mt-4 flex items-center gap-2 text-sm font-bold text-text-secondary"><input type="checkbox" checked={props.paidNow} onChange={(event) => props.onPaid(event.target.checked)} /> Pay supplier now</label><Button className="mt-5" disabled={props.busy} type="submit"><PackagePlus className="size-4" /> Post purchase</Button></form>;
}

function maxDiscount(lines: CartLine[]) {
  return lines.reduce((maximum, line) => Math.max(maximum, numeric(line.discountPercent)), 0);
}

function modeLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}

function approvalReason(type: string, payload: Record<string, unknown>) {
  if (type === "refund") return String(payload.notes || "Customer refund requested at POS");
  if (type === "void") return String(payload.reason || "Same-day sale void requested at POS");
  return String(payload.reason || "Cash adjustment requested at POS");
}

function errorMessage(value: unknown) {
  const code = typeof value === "string" ? value : "pos_operation_failed";
  const messages: Record<string, string> = {
    approval_unavailable: "Manager approval is still pending, expired, or does not match this request.",
    idempotency_conflict: "This request key was already used for different information.",
    retry_limit_reached: "This operation reached its secure retry limit.",
    purchases_disabled: "Purchases are disabled for this register.",
    expenses_disabled: "Expenses are disabled for this register.",
    pos_session_unavailable: "The POS session expired or was revoked. Sign in again.",
    invalid_request: "The operation contains invalid or unavailable records.",
  };
  return messages[code] ?? "The operation was not posted. Stock, cash, and accounting remain unchanged.";
}
