"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type OpenBillOption = {
  id: string;
  code: string;
  supplierName: string;
  currency: string;
  outstanding: number;
  billDate: string;
};

type PaymentAccountOption = {
  id: string;
  code: string;
  name: string;
};

type RecordSupplierPaymentFormProps = {
  businessId: string;
  bills: OpenBillOption[];
  paymentAccounts: PaymentAccountOption[];
};

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function requestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function RecordSupplierPaymentForm({
  businessId,
  bills,
  paymentAccounts,
}: RecordSupplierPaymentFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => localDateString(), []);
  const firstBill = bills[0] ?? null;
  const idempotencyKey = useRef(requestKey());

  const [billId, setBillId] = useState(firstBill?.id ?? "");
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState(firstBill ? String(firstBill.outstanding) : "");
  const [paymentAccountId, setPaymentAccountId] = useState(paymentAccounts[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedBill = bills.find((bill) => bill.id === billId) ?? firstBill;

  function handleBillChange(nextBillId: string) {
    setBillId(nextBillId);
    const bill = bills.find((item) => item.id === nextBillId);
    setAmount(bill ? String(bill.outstanding) : "");
    if (bill && paymentDate < bill.billDate) setPaymentDate(bill.billDate);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!selectedBill || !paymentAccountId) {
      toast.error("Select an open supplier bill and payment account.");
      return;
    }

    const parsedAmount = Number(amount);
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > selectedBill.outstanding
    ) {
      toast.error("Payment must be positive and cannot exceed the outstanding payable.");
      return;
    }

    if (!paymentDate || paymentDate < selectedBill.billDate) {
      toast.error("Payment date cannot be before the supplier bill date.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("record_business_supplier_payment", {
      p_business_id: businessId,
      p_bill_id: selectedBill.id,
      p_payment_date: paymentDate,
      p_amount: parsedAmount,
      p_payment_account_id: paymentAccountId,
      p_reference: reference.trim() || null,
      p_idempotency_key: idempotencyKey.current,
    });
    setSaving(false);

    if (error) {
      console.error("Supplier payment failed", { code: error.code });
      toast.error("Supplier payment was not posted. No cash, bank, payable, or journal was changed.");
      return;
    }

    idempotencyKey.current = requestKey();
    setReference("");
    toast.success("Supplier payment posted and Accounts Payable updated.");
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-success-soft text-success">
          <Banknote className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black text-text-primary sm:text-lg">Pay supplier bill</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Partial and final settlements debit Accounts Payable and credit the selected cash or bank
            account atomically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Open supplier bill</span>
            <select
              value={billId}
              onChange={(event) => handleBillChange(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
              required
            >
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.code} · {bill.supplierName} · {bill.currency} {bill.outstanding.toFixed(2)} due
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Payment date</span>
            <Input
              type="date"
              value={paymentDate}
              min={selectedBill?.billDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Amount</span>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Pay from</span>
            <select
              value={paymentAccountId}
              onChange={(event) => setPaymentAccountId(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
              required
            >
              {paymentAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Payment reference</span>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Bank transfer, cheque, or receipt reference"
              maxLength={240}
              disabled={saving}
            />
          </label>
        </div>

        {selectedBill ? (
          <div className="flex items-start gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Outstanding balance: <strong className="text-text-primary">{selectedBill.currency} {selectedBill.outstanding.toFixed(2)}</strong>. Final payment automatically closes the payable using the exact remaining base-currency amount.
            </span>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          loading={saving}
          loadingLabel="Posting supplier payment..."
          className="w-full sm:w-auto"
        >
          <Banknote aria-hidden="true" />
          Post supplier payment
        </Button>
      </form>
    </section>
  );
}
