"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  CircleDollarSign,
  Copy,
  FileCheck2,
  Gauge,
  LockKeyhole,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Scenario = {
  id: string;
  name: string;
  scenario_type: "budget" | "forecast";
  version_number: number;
  starts_on: string;
  ends_on: string;
  actuals_through: string | null;
  status: "draft" | "submitted" | "approved" | "locked" | "archived";
  assumptions: Record<string, unknown>;
  notes: string | null;
  source_scenario_id: string | null;
  adjustment_percent: number | string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  locked_at: string | null;
};

type MonthCell = {
  month_start: string;
  budget_base: number | string;
  actual_base: number | string;
  projected_base: number | string;
  comparison_base: number | string;
  notes: string | null;
};

type AccountPlan = {
  account_id: string;
  code: string;
  name: string;
  account_type: "revenue" | "expense";
  normal_balance: "debit" | "credit";
  budget_base: number | string;
  actual_base: number | string;
  projected_base: number | string;
  comparison_base: number | string;
  favourable_variance_base: number | string;
  months: MonthCell[];
};

type MonthPlan = {
  month_start: string;
  budget_revenue: number | string;
  budget_expense: number | string;
  budget_net: number | string;
  actual_revenue: number | string;
  actual_expense: number | string;
  actual_net: number | string;
  projected_revenue: number | string;
  projected_expense: number | string;
  projected_net: number | string;
  comparison_revenue: number | string;
  comparison_expense: number | string;
  comparison_net: number | string;
};

type BudgetSummary = {
  budget_revenue?: number | string;
  budget_expense?: number | string;
  budget_net?: number | string;
  actual_revenue?: number | string;
  actual_expense?: number | string;
  actual_net?: number | string;
  projected_revenue?: number | string;
  projected_expense?: number | string;
  projected_net?: number | string;
  liquid_cash_base?: number | string;
  projected_expense_runway_months?: number | string | null;
};

export type BusinessBudgetingSnapshot = {
  base_currency?: string;
  can_manage?: boolean;
  can_approve?: boolean;
  selected_scenario_id?: string | null;
  comparison_scenario_id?: string | null;
  scenarios?: Scenario[];
  months?: MonthPlan[];
  accounts?: AccountPlan[];
  summary?: BudgetSummary;
};

type Props = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  baseCurrency: string;
  defaultStartsOn: string;
  defaultEndsOn: string;
  today: string;
  snapshot: BusinessBudgetingSnapshot;
};

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function title(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayMonth(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}

function keyFor(accountId: string, monthStart: string) {
  return `${accountId}:${monthStart}`;
}

export default function BusinessBudgetingWorkspace({
  businessId,
  businessName,
  businessSlug,
  baseCurrency,
  defaultStartsOn,
  defaultEndsOn,
  today,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const scenarios = snapshot.scenarios ?? [];
  const accounts = useMemo(() => snapshot.accounts ?? [], [snapshot.accounts]);
  const months = snapshot.months ?? [];
  const summary = snapshot.summary ?? {};
  const selectedId = snapshot.selected_scenario_id ?? "";
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedId) ?? null;
  const canManage = snapshot.can_manage === true;
  const canApprove = snapshot.can_approve === true;
  const editable = canManage && selectedScenario?.status === "draft";

  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        accounts.flatMap((account) =>
          account.months.map((month) => [keyFor(account.account_id, month.month_start), String(numeric(month.budget_base) || "")]),
        ),
      ),
    [accounts],
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "Annual operating plan",
    type: "budget" as "budget" | "forecast",
    startsOn: defaultStartsOn,
    endsOn: defaultEndsOn,
    actualsThrough: today,
    revenueGrowth: "0",
    expenseInflation: "0",
    notes: "",
  });
  const [copyForm, setCopyForm] = useState({
    name: selectedScenario ? `${selectedScenario.name} Copy` : "",
    type: selectedScenario?.scenario_type ?? ("forecast" as "budget" | "forecast"),
    adjustment: "0",
    actualsThrough: selectedScenario?.actuals_through ?? today,
  });

  function money(value: unknown) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: baseCurrency,
      maximumFractionDigits: 0,
    }).format(numeric(value));
  }

  function navigate(scenarioId: string, comparisonId = snapshot.comparison_scenario_id ?? "") {
    const query = new URLSearchParams();
    if (scenarioId) query.set("scenario", scenarioId);
    if (comparisonId && comparisonId !== scenarioId) query.set("compare", comparisonId);
    router.push(`/business/${businessSlug}/budgeting?${query.toString()}`);
  }

  function refresh() {
    router.refresh();
  }

  async function createScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy) return;
    setBusy("create");
    const { data, error } = await supabase.rpc("create_business_budget_scenario", {
      p_business_id: businessId,
      p_name: createForm.name.trim(),
      p_scenario_type: createForm.type,
      p_starts_on: createForm.startsOn,
      p_ends_on: createForm.endsOn,
      p_actuals_through: createForm.type === "forecast" ? createForm.actualsThrough : null,
      p_assumptions: {
        revenue_growth_percent: numeric(createForm.revenueGrowth),
        expense_inflation_percent: numeric(createForm.expenseInflation),
      },
      p_notes: createForm.notes.trim() || null,
    });
    setBusy(null);
    if (error) {
      console.error("Budget scenario creation failed", { code: error.code });
      toast.error(error.message || "Budget scenario could not be created.");
      return;
    }
    const scenarioId = String((data as Record<string, unknown> | null)?.scenario_id ?? "");
    toast.success("Draft planning scenario created.");
    navigate(scenarioId);
  }

  async function savePlan() {
    if (!editable || !selectedScenario || busy) return;
    const payload = accounts.flatMap((account) =>
      account.months.map((month) => ({
        account_id: account.account_id,
        month_start: month.month_start,
        amount_base: numeric(values[keyFor(account.account_id, month.month_start)]),
        notes: month.notes,
      })),
    );
    if (!payload.length) return toast.error("No budget accounts are available.");
    setBusy("save");
    const { error } = await supabase.rpc("upsert_business_budget_lines", {
      p_business_id: businessId,
      p_scenario_id: selectedScenario.id,
      p_lines: payload,
    });
    setBusy(null);
    if (error) {
      console.error("Budget line save failed", { code: error.code });
      toast.error(error.message || "Budget plan could not be saved.");
      return;
    }
    toast.success("Monthly plan saved.");
    refresh();
  }

  async function copyScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedScenario || busy) return;
    setBusy("copy");
    const { data, error } = await supabase.rpc("copy_business_budget_scenario", {
      p_business_id: businessId,
      p_source_scenario_id: selectedScenario.id,
      p_name: copyForm.name.trim() || null,
      p_adjustment_percent: numeric(copyForm.adjustment),
      p_scenario_type: copyForm.type,
      p_actuals_through: copyForm.type === "forecast" ? copyForm.actualsThrough : null,
    });
    setBusy(null);
    if (error) {
      console.error("Budget scenario copy failed", { code: error.code });
      toast.error(error.message || "Scenario copy could not be created.");
      return;
    }
    const scenarioId = String((data as Record<string, unknown> | null)?.scenario_id ?? "");
    toast.success("Adjusted draft scenario created.");
    navigate(scenarioId, selectedScenario.id);
  }

  async function transition(action: "submit" | "return_to_draft" | "approve" | "lock" | "archive") {
    if (!selectedScenario || busy) return;
    setBusy(action);
    const { error } = await supabase.rpc("transition_business_budget_scenario", {
      p_business_id: businessId,
      p_scenario_id: selectedScenario.id,
      p_action: action,
      p_notes: actionNote.trim() || null,
    });
    setBusy(null);
    if (error) {
      console.error("Budget transition failed", { action, code: error.code });
      toast.error(error.message || "Scenario status could not be changed.");
      return;
    }
    toast.success(`Scenario ${title(action)} completed.`);
    setActionNote("");
    refresh();
  }

  const maxMonthly = Math.max(
    1,
    ...months.map((month) => Math.max(Math.abs(numeric(month.budget_net)), Math.abs(numeric(month.actual_net)), Math.abs(numeric(month.projected_net)))),
  );

  return (
    <main className="min-h-dvh bg-background px-4 pb-12 pt-5 text-foreground sm:px-6 sm:pt-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Planning control</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Budgeting & forecasting</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
              {businessName} monthly operating plans, rolling forecasts, posted actuals, variance, and approved baselines share the verified ledger.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Locked baselines protected
          </span>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={CircleDollarSign} label="Budget net" value={money(summary.budget_net)} />
          <SummaryCard icon={FileCheck2} label="Posted actual net" value={money(summary.actual_net)} tone={numeric(summary.actual_net) >= 0 ? "success" : "danger"} />
          <SummaryCard icon={ChartNoAxesCombined} label="Projected net" value={money(summary.projected_net)} tone={numeric(summary.projected_net) >= 0 ? "success" : "danger"} />
          <SummaryCard icon={Gauge} label="Expense runway" value={summary.projected_expense_runway_months == null ? "Not available" : `${numeric(summary.projected_expense_runway_months).toFixed(2)} months`} tone="warning" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Field label="Planning scenario">
            <select value={selectedId} onChange={(event) => navigate(event.target.value)} className="field-input min-h-11 w-full">
              <option value="">No scenario selected</option>
              {scenarios.filter((scenario) => scenario.status !== "archived").map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.name} v{scenario.version_number} · {title(scenario.scenario_type)} · {title(scenario.status)}</option>
              ))}
            </select>
          </Field>
          <Field label="Compare with">
            <select
              value={snapshot.comparison_scenario_id ?? ""}
              onChange={(event) => navigate(selectedId, event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={!selectedScenario}
            >
              <option value="">No comparison</option>
              {scenarios.filter((scenario) => scenario.id !== selectedId && scenario.status !== "archived").map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.name} v{scenario.version_number}</option>
              ))}
            </select>
          </Field>
        </section>

        {selectedScenario ? (
          <section className="mt-5 rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-text-primary">{selectedScenario.name} v{selectedScenario.version_number}</h2>
                  <StatusPill status={selectedScenario.status} />
                  <StatusPill status={selectedScenario.scenario_type} />
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {displayDate(selectedScenario.starts_on)} – {displayDate(selectedScenario.ends_on)}
                  {selectedScenario.actuals_through ? ` · actuals through ${displayDate(selectedScenario.actuals_through)}` : ""}
                </p>
                {selectedScenario.notes ? <p className="mt-2 text-sm leading-6 text-text-secondary">{selectedScenario.notes}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Metric label="Budget revenue" value={money(summary.budget_revenue)} />
                <Metric label="Budget expense" value={money(summary.budget_expense)} />
                <Metric label="Liquid cash" value={money(summary.liquid_cash_base)} />
                <Metric label="Actual cutoff" value={selectedScenario.actuals_through ? displayDate(selectedScenario.actuals_through) : "Budget only"} />
              </div>
            </div>

            {(canManage || canApprove) && selectedScenario.status !== "archived" ? (
              <div className="mt-5 border-t border-border/60 pt-4">
                <Input value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Optional approval or audit note" maxLength={2000} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {canManage && selectedScenario.status === "draft" ? <Button size="sm" loading={busy === "submit"} loadingLabel="Submitting…" onClick={() => void transition("submit")}><Send aria-hidden="true" /> Submit</Button> : null}
                  {canManage && selectedScenario.status === "submitted" ? <Button size="sm" variant="warning" loading={busy === "return_to_draft"} loadingLabel="Returning…" onClick={() => void transition("return_to_draft")}><RotateCcw aria-hidden="true" /> Return to draft</Button> : null}
                  {canApprove && selectedScenario.status === "submitted" ? <Button size="sm" variant="success" loading={busy === "approve"} loadingLabel="Approving…" onClick={() => void transition("approve")}><BadgeCheck aria-hidden="true" /> Approve</Button> : null}
                  {canApprove && selectedScenario.status === "approved" ? <Button size="sm" variant="warning" loading={busy === "return_to_draft"} loadingLabel="Reopening…" onClick={() => void transition("return_to_draft")}><RotateCcw aria-hidden="true" /> Reopen draft</Button> : null}
                  {canApprove && selectedScenario.status === "approved" ? <Button size="sm" loading={busy === "lock"} loadingLabel="Locking…" onClick={() => void transition("lock")}><LockKeyhole aria-hidden="true" /> Lock baseline</Button> : null}
                  {canApprove && selectedScenario.status !== "draft" ? <Button size="sm" variant="ghost" loading={busy === "archive"} loadingLabel="Archiving…" onClick={() => void transition("archive")}>Archive</Button> : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {canManage ? (
          <section className="mt-7 grid gap-5 xl:grid-cols-2">
            <details className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6" open={!selectedScenario}>
              <summary className="finance-focus flex cursor-pointer items-center gap-3 font-black text-text-primary"><Plus className="size-5 text-primary" aria-hidden="true" /> New planning scenario</summary>
              <form onSubmit={createScenario} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Scenario name"><Input value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} maxLength={120} /></Field>
                  <Field label="Type"><select value={createForm.type} onChange={(event) => setCreateForm({ ...createForm, type: event.target.value as "budget" | "forecast" })} className="field-input min-h-11 w-full"><option value="budget">Budget</option><option value="forecast">Rolling forecast</option></select></Field>
                  <Field label="Starts on"><Input type="date" value={createForm.startsOn} onChange={(event) => setCreateForm({ ...createForm, startsOn: event.target.value })} /></Field>
                  <Field label="Ends on"><Input type="date" value={createForm.endsOn} onChange={(event) => setCreateForm({ ...createForm, endsOn: event.target.value })} /></Field>
                  {createForm.type === "forecast" ? <Field label="Actuals through"><Input type="date" value={createForm.actualsThrough} onChange={(event) => setCreateForm({ ...createForm, actualsThrough: event.target.value })} /></Field> : null}
                  <Field label="Revenue growth assumption %"><Input inputMode="decimal" value={createForm.revenueGrowth} onChange={(event) => setCreateForm({ ...createForm, revenueGrowth: event.target.value })} /></Field>
                  <Field label="Expense inflation assumption %"><Input inputMode="decimal" value={createForm.expenseInflation} onChange={(event) => setCreateForm({ ...createForm, expenseInflation: event.target.value })} /></Field>
                </div>
                <Field label="Planning note"><Input value={createForm.notes} onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })} maxLength={2000} /></Field>
                <Button type="submit" loading={busy === "create"} loadingLabel="Creating…"><Plus aria-hidden="true" /> Create draft</Button>
              </form>
            </details>

            <details className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
              <summary className="finance-focus flex cursor-pointer items-center gap-3 font-black text-text-primary"><Copy className="size-5 text-primary" aria-hidden="true" /> Copy & adjust scenario</summary>
              {selectedScenario ? (
                <form onSubmit={copyScenario} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="New name"><Input value={copyForm.name} onChange={(event) => setCopyForm({ ...copyForm, name: event.target.value })} maxLength={120} /></Field>
                    <Field label="Apply percentage"><Input inputMode="decimal" value={copyForm.adjustment} onChange={(event) => setCopyForm({ ...copyForm, adjustment: event.target.value })} /></Field>
                    <Field label="New type"><select value={copyForm.type} onChange={(event) => setCopyForm({ ...copyForm, type: event.target.value as "budget" | "forecast" })} className="field-input min-h-11 w-full"><option value="budget">Budget</option><option value="forecast">Rolling forecast</option></select></Field>
                    {copyForm.type === "forecast" ? <Field label="Actuals through"><Input type="date" value={copyForm.actualsThrough} onChange={(event) => setCopyForm({ ...copyForm, actualsThrough: event.target.value })} /></Field> : null}
                  </div>
                  <Button type="submit" variant="secondary" loading={busy === "copy"} loadingLabel="Copying…"><Copy aria-hidden="true" /> Create adjusted copy</Button>
                </form>
              ) : <p className="mt-4 text-sm text-text-secondary">Select a scenario before creating a comparison copy.</p>}
            </details>
          </section>
        ) : null}

        {selectedScenario ? (
          <>
            <section className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Monthly direction</p><h2 className="mt-1 text-xl font-black text-text-primary">Plan, actual & projected net</h2></div>
                <Button size="sm" variant="ghost" onClick={refresh}><RefreshCcw aria-hidden="true" /> Refresh actuals</Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {months.map((month) => {
                  const projected = numeric(month.projected_net);
                  const actual = numeric(month.actual_net);
                  const budget = numeric(month.budget_net);
                  return (
                    <article key={month.month_start} className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)]">
                      <div className="flex items-center justify-between gap-3"><strong className="text-sm text-text-primary">{displayMonth(month.month_start)}</strong>{projected >= 0 ? <TrendingUp className="size-4 text-success" aria-hidden="true" /> : <TrendingDown className="size-4 text-danger" aria-hidden="true" />}</div>
                      <strong className={`mt-3 block text-xl font-black tabular-nums ${projected >= 0 ? "text-success" : "text-danger"}`}>{money(projected)}</strong>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (Math.abs(projected) / maxMonthly) * 100)}%` }} /></div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-text-secondary"><span>Budget <strong className="block text-text-primary">{money(budget)}</strong></span><span>Actual <strong className="block text-text-primary">{money(actual)}</strong></span></div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Account plan</p><h2 className="mt-1 text-xl font-black text-text-primary">Monthly revenue & expense matrix</h2></div>
                {editable ? <Button loading={busy === "save"} loadingLabel="Saving…" onClick={() => void savePlan()}><Save aria-hidden="true" /> Save monthly plan</Button> : <span className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-1.5 text-xs font-black text-text-secondary"><LockKeyhole className="size-4" aria-hidden="true" /> Read-only baseline</span>}
              </div>
              <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]">
                <table className="min-w-[1180px] w-full border-collapse text-sm">
                  <thead><tr className="border-b border-border/70 text-left text-xs text-text-secondary"><th className="sticky left-0 z-10 min-w-56 bg-surface px-4 py-3">Account</th>{months.map((month) => <th key={month.month_start} className="min-w-28 px-2 py-3 text-right">{displayMonth(month.month_start)}</th>)}<th className="min-w-32 px-4 py-3 text-right">Budget</th><th className="min-w-32 px-4 py-3 text-right">Actual</th><th className="min-w-32 px-4 py-3 text-right">Favourable var.</th></tr></thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.account_id} className="border-b border-border/50 last:border-0">
                        <td className="sticky left-0 z-10 bg-surface px-4 py-3"><span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${account.account_type === "revenue" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{title(account.account_type)}</span><strong className="text-text-primary">{account.code} · {account.name}</strong></td>
                        {account.months.map((month) => {
                          const cellKey = keyFor(account.account_id, month.month_start);
                          return <td key={month.month_start} className="px-2 py-2 text-right">{editable ? <Input className="h-9 min-h-9 text-right tabular-nums" inputMode="decimal" value={values[cellKey] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [cellKey]: event.target.value }))} aria-label={`${account.name} ${displayMonth(month.month_start)} budget`} /> : <span className="tabular-nums text-text-primary">{money(month.budget_base)}</span>}</td>;
                        })}
                        <td className="px-4 py-3 text-right font-black tabular-nums text-primary">{money(account.budget_base)}</td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-text-primary">{money(account.actual_base)}</td>
                        <td className={`px-4 py-3 text-right font-black tabular-nums ${numeric(account.favourable_variance_base) >= 0 ? "text-success" : "text-danger"}`}>{money(account.favourable_variance_base)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-12 text-center text-sm text-text-secondary">
            Create or select a planning scenario to build the monthly budget.
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "primary" }: { icon: typeof Gauge; label: string; value: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  const style = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-primary";
  return <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"><Icon className={`size-5 ${style}`} aria-hidden="true" /><p className="mt-4 text-xs font-bold text-text-secondary">{label}</p><strong className={`mt-1 block truncate text-xl font-black tabular-nums ${style}`}>{value}</strong></article>;
}

function StatusPill({ status }: { status: string }) {
  const style = status === "approved" || status === "forecast"
    ? "bg-success-soft text-success"
    : status === "locked"
      ? "bg-primary-soft text-primary"
      : status === "submitted"
        ? "bg-warning-soft text-warning"
        : status === "archived"
          ? "bg-danger-soft text-danger"
          : "bg-surface-secondary text-text-secondary";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${style}`}>{title(status)}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3"><span className="text-[11px] font-bold text-text-tertiary">{label}</span><strong className="mt-1 block truncate text-sm font-black tabular-nums text-text-primary">{value}</strong></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-2"><span className="text-sm font-bold text-text-primary">{label}</span>{children}</label>;
}
