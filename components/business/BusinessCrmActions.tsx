"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

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

export function ConvertLeadButton({
  businessId,
  leadId,
  createOpportunity = true,
}: {
  businessId: string;
  leadId: string;
  createOpportunity?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);

  async function convertLead() {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.rpc("convert_business_crm_lead_to_customer", {
      p_business_id: businessId,
      p_lead_id: leadId,
      p_create_opportunity: createOpportunity,
    });
    setSaving(false);

    if (error) {
      console.error("CRM lead conversion failed", { code: error.code });
      toast.error("Lead was not converted. No customer or opportunity was partially created.");
      return;
    }

    toast.success(createOpportunity ? "Customer and opportunity created." : "Customer created.");
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={convertLead} loading={saving} loadingLabel="Converting..." className="w-full">
      <UserRoundCheck aria-hidden="true" />
      Convert lead
    </Button>
  );
}

export type CrmActionStage = {
  id: string;
  name: string;
  probability: number | string;
  category: "open" | "won" | "lost";
};

export function OpportunityActions({
  businessId,
  opportunityId,
  currentStageId,
  stages,
  invoiceId,
  lineCount,
  currency,
  baseCurrency,
  canInvoice,
}: {
  businessId: string;
  opportunityId: string;
  currentStageId: string;
  stages: CrmActionStage[];
  invoiceId: string | null;
  lineCount: number;
  currency: string;
  baseCurrency: string;
  canInvoice: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => localDateString(), []);
  const [selectedStageId, setSelectedStageId] = useState(currentStageId);
  const [lostReason, setLostReason] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, 7));
  const [exchangeRate, setExchangeRate] = useState(currency === baseCurrency ? "1" : "");
  const [moving, setMoving] = useState(false);
  const [invoicing, setInvoicing] = useState(false);

  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? null;
  const locked = Boolean(invoiceId);

  async function moveStage() {
    if (moving || locked || selectedStageId === currentStageId) return;
    if (selectedStage?.category === "lost" && lostReason.trim().length < 2) {
      toast.error("Add a brief reason before marking the opportunity lost.");
      return;
    }

    setMoving(true);
    const { error } = await supabase.rpc("move_business_crm_opportunity_stage", {
      p_business_id: businessId,
      p_opportunity_id: opportunityId,
      p_stage_id: selectedStageId,
      p_lost_reason: selectedStage?.category === "lost" ? lostReason.trim() : null,
    });
    setMoving(false);

    if (error) {
      console.error("CRM opportunity stage move failed", { code: error.code });
      toast.error("Opportunity stage was not changed.");
      return;
    }

    toast.success(`Opportunity moved to ${selectedStage?.name ?? "the selected stage"}.`);
    router.refresh();
  }

  async function createInvoice() {
    if (invoicing || locked) return;
    if (lineCount < 1) {
      toast.error("Add at least one opportunity line before invoicing.");
      return;
    }
    if (!invoiceDate || !dueDate || dueDate < invoiceDate) {
      toast.error("Due date cannot be before invoice date.");
      return;
    }
    const parsedRate = Number(exchangeRate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("Enter a valid exchange rate greater than zero.");
      return;
    }
    if (currency === baseCurrency && parsedRate !== 1) {
      toast.error(`${baseCurrency} invoices must use an exchange rate of 1.`);
      return;
    }

    setInvoicing(true);
    const { error } = await supabase.rpc("convert_business_crm_opportunity_to_invoice", {
      p_business_id: businessId,
      p_opportunity_id: opportunityId,
      p_invoice_date: invoiceDate,
      p_due_date: dueDate,
      p_exchange_rate: parsedRate,
      p_notes: null,
    });
    setInvoicing(false);

    if (error) {
      console.error("CRM opportunity invoice conversion failed", { code: error.code });
      toast.error("Invoice was not issued. Check customer conversion, stock, dates, and line details.");
      return;
    }

    toast.success("Invoice issued. Revenue, stock, and COGS were posted where applicable.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-[var(--radius-button)] bg-background/60 px-3 py-3">
        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-text-tertiary">Pipeline stage</span>
          <select
            value={selectedStageId}
            onChange={(event) => setSelectedStageId(event.target.value)}
            className="field-input min-h-10 w-full text-sm"
            disabled={moving || locked}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name} · {Number(stage.probability)}%
              </option>
            ))}
          </select>
        </label>
        {selectedStage?.category === "lost" && !locked ? (
          <Input
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="Reason lost"
            maxLength={500}
            className="mt-2"
            disabled={moving}
          />
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={moveStage}
          loading={moving}
          loadingLabel="Moving..."
          disabled={locked || selectedStageId === currentStageId}
          className="mt-2 w-full"
        >
          <ArrowRight aria-hidden="true" />
          Move stage
        </Button>
      </div>

      {invoiceId ? (
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-success-soft px-3 py-2.5 text-xs font-black text-success">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Invoice issued
        </span>
      ) : canInvoice ? (
        <details className="rounded-[var(--radius-button)] bg-primary-soft px-3 py-3 text-primary">
          <summary className="finance-focus cursor-pointer list-none text-sm font-black">Convert to invoice</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold opacity-80">Invoice date</span>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(event) => {
                  setInvoiceDate(event.target.value);
                  setDueDate(addDays(event.target.value, 7));
                }}
                disabled={invoicing}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold opacity-80">Due date</span>
              <Input type="date" min={invoiceDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={invoicing} />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold opacity-80">Exchange rate to {baseCurrency}</span>
              <Input value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} inputMode="decimal" disabled={invoicing || currency === baseCurrency} />
            </label>
          </div>
          <Button type="button" onClick={createInvoice} loading={invoicing} loadingLabel="Issuing invoice..." className="mt-3 w-full">
            <FileText aria-hidden="true" />
            Issue invoice
          </Button>
        </details>
      ) : null}
    </div>
  );
}

export function CompleteActivityButton({
  businessId,
  activityId,
  leadId,
  opportunityId,
  contactId,
  activityType,
  subject,
  details,
  dueAt,
  assignedTo,
}: {
  businessId: string;
  activityId: string;
  leadId: string | null;
  opportunityId: string | null;
  contactId: string | null;
  activityType: string;
  subject: string;
  details: string | null;
  dueAt: string | null;
  assignedTo: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);

  async function complete() {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.rpc("upsert_business_crm_activity", {
      p_business_id: businessId,
      p_activity_id: activityId,
      p_lead_id: leadId,
      p_opportunity_id: opportunityId,
      p_contact_id: contactId,
      p_activity_type: activityType,
      p_subject: subject,
      p_details: details,
      p_due_at: dueAt,
      p_assigned_to: assignedTo,
      p_status: "completed",
    });
    setSaving(false);

    if (error) {
      console.error("CRM activity completion failed", { code: error.code });
      toast.error("Follow-up could not be completed.");
      return;
    }

    toast.success("Follow-up completed.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={complete}
      disabled={saving}
      className="finance-focus inline-flex min-h-9 items-center gap-2 rounded-full bg-success-soft px-3 text-xs font-black text-success transition-opacity disabled:opacity-60"
    >
      <CheckCircle2 className="size-4" aria-hidden="true" />
      {saving ? "Completing..." : "Complete"}
    </button>
  );
}
