"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  CalendarRange,
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  Link2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Unlink,
  Upload,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type BankAccount = {
  id: string;
  ledger_account_id: string;
  ledger_code: string;
  ledger_name: string;
  name: string;
  institution_name: string | null;
  account_kind: string;
  account_number_masked: string | null;
  currency: string;
  reconciliation_start_date: string;
  opening_balance_transaction: number | string;
  opening_balance_base: number | string;
  ledger_balance_base: number | string;
  latest_statement_balance_base: number | string | null;
  unreconciled_lines: number;
  is_active: boolean;
};

type LedgerOption = {
  id: string;
  code: string;
  name: string;
  system_key: string | null;
  account_subtype?: string | null;
};

type StatementMatch = {
  id: string;
  journal_line_id: string;
  amount_base: number | string;
  entry_date: string;
  reference: string | null;
  description: string;
  source_type: string;
};

type StatementLine = {
  id: string;
  import_id: string;
  transaction_date: string;
  posted_date: string | null;
  description: string;
  reference: string | null;
  external_id: string | null;
  amount_transaction: number | string;
  amount_base: number | string;
  running_balance_transaction: number | string | null;
  excluded: boolean;
  exclusion_reason: string | null;
  matched_base: number | string;
  remaining_base: number | string;
  match_status: "unmatched" | "partial" | "matched" | "excluded";
  matches: StatementMatch[];
};

type StatementImport = {
  id: string;
  bank_account_id: string;
  file_name: string;
  period_start: string;
  period_end: string;
  currency: string;
  opening_balance_transaction: number | string;
  closing_balance_transaction: number | string;
  opening_balance_base: number | string;
  closing_balance_base: number | string;
  line_count: number;
  matched_lines: number;
  excluded_lines: number;
  status: "draft" | "reconciled" | "void";
  reconciliation_id: string;
  reconciliation_status: "draft" | "completed" | "locked";
  created_at: string;
};

type Reconciliation = {
  id: string;
  statement_import_id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "completed" | "locked";
  statement_opening_base: number | string;
  statement_closing_base: number | string;
  ledger_balance_base: number | string | null;
  outstanding_debits_base: number | string | null;
  outstanding_credits_base: number | string | null;
  adjusted_statement_balance_base: number | string | null;
  difference_base: number | string | null;
  notes: string | null;
  completed_at: string | null;
  locked_at: string | null;
  reopened_at: string | null;
};

type MatchCandidate = {
  journal_line_id: string;
  journal_entry_id: string;
  entry_date: string;
  reference: string | null;
  description: string;
  source_type: string;
  amount_base: number | string;
  amount_difference_base: number | string;
  date_difference_days: number;
  exact_amount: boolean;
};

type BankingSummary = {
  ledger_balance_base?: number | string;
  latest_statement_balance_base?: number | string | null;
  unmatched_statement_lines?: number;
  draft_imports?: number;
};

export type BusinessBankingSnapshot = {
  base_currency?: string;
  can_manage?: boolean;
  selected_bank_account_id?: string | null;
  accounts?: BankAccount[];
  available_ledger_accounts?: LedgerOption[];
  imports?: StatementImport[];
  statement_lines?: StatementLine[];
  reconciliations?: Reconciliation[];
  summary?: BankingSummary;
};

type Props = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  baseCurrency: string;
  initialStart: string;
  initialEnd: string;
  snapshot: BusinessBankingSnapshot;
};

type CsvLine = {
  transaction_date: string;
  posted_date?: string | null;
  description: string;
  reference?: string | null;
  external_id?: string | null;
  amount: number;
  exchange_rate?: number;
  running_balance?: number | null;
  raw_data?: Record<string, string>;
};

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}

function title(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/^\uFEFF/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseStatementCsv(text: string): CsvLine[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSV needs a header and at least one transaction.");
  const headers = rows[0].map(normalizeHeader);
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const dateIndex = indexOf("transaction_date", "date", "transactiondate");
  const postedIndex = indexOf("posted_date", "posting_date", "value_date");
  const descriptionIndex = indexOf("description", "details", "narration", "memo");
  const referenceIndex = indexOf("reference", "ref", "transaction_reference");
  const externalIndex = indexOf("external_id", "transaction_id", "bank_id", "id");
  const amountIndex = indexOf("amount", "transaction_amount", "signed_amount");
  const debitIndex = indexOf("debit", "withdrawal", "money_out");
  const creditIndex = indexOf("credit", "deposit", "money_in");
  const rateIndex = indexOf("exchange_rate", "fx_rate", "rate");
  const balanceIndex = indexOf("running_balance", "balance", "closing_balance");

  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
    throw new Error("CSV requires transaction_date, description, and amount or debit/credit columns.");
  }

  return rows.slice(1).map((cells, rowIndex) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]));
    const signedAmount = amountIndex >= 0
      ? Number((cells[amountIndex] ?? "").replace(/,/g, ""))
      : numeric((cells[creditIndex] ?? "").replace(/,/g, "")) - numeric((cells[debitIndex] ?? "").replace(/,/g, ""));
    const date = cells[dateIndex]?.trim();
    const description = cells[descriptionIndex]?.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !description || !Number.isFinite(signedAmount) || signedAmount === 0) {
      throw new Error(`CSV row ${rowIndex + 2} has an invalid date, description, or amount.`);
    }
    const rate = rateIndex >= 0 && cells[rateIndex]?.trim() ? Number(cells[rateIndex]) : undefined;
    const runningBalance = balanceIndex >= 0 && cells[balanceIndex]?.trim()
      ? Number((cells[balanceIndex] ?? "").replace(/,/g, ""))
      : null;
    if (rate !== undefined && (!Number.isFinite(rate) || rate <= 0)) throw new Error(`CSV row ${rowIndex + 2} has an invalid exchange rate.`);
    if (runningBalance !== null && !Number.isFinite(runningBalance)) throw new Error(`CSV row ${rowIndex + 2} has an invalid running balance.`);
    return {
      transaction_date: date,
      posted_date: postedIndex >= 0 ? cells[postedIndex]?.trim() || null : null,
      description,
      reference: referenceIndex >= 0 ? cells[referenceIndex]?.trim() || null : null,
      external_id: externalIndex >= 0 ? cells[externalIndex]?.trim() || null : null,
      amount: signedAmount,
      exchange_rate: rate,
      running_balance: runningBalance,
      raw_data: raw,
    };
  });
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function BusinessBankingWorkspace({
  businessId,
  businessName,
  businessSlug,
  baseCurrency,
  initialStart,
  initialEnd,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const accounts = snapshot.accounts ?? [];
  const imports = snapshot.imports ?? [];
  const lines = snapshot.statement_lines ?? [];
  const reconciliations = snapshot.reconciliations ?? [];
  const ledgers = snapshot.available_ledger_accounts ?? [];
  const summary = snapshot.summary ?? {};
  const canManage = snapshot.can_manage === true;
  const selectedId = snapshot.selected_bank_account_id ?? accounts[0]?.id ?? "";
  const selectedAccount = accounts.find((account) => account.id === selectedId) ?? null;

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [candidateLineId, setCandidateLineId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [exclusionReason, setExclusionReason] = useState("");
  const [accountForm, setAccountForm] = useState({
    ledgerId: ledgers[0]?.id ?? "",
    name: "",
    institution: "",
    kind: "bank",
    masked: "",
    currency: baseCurrency,
    startDate: initialStart,
    opening: "0",
  });
  const [statementForm, setStatementForm] = useState({
    file: null as File | null,
    periodStart: initialStart,
    periodEnd: initialEnd,
    opening: "0",
    closing: "0",
    rate: "1",
  });

  function money(value: unknown, currency = baseCurrency) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(numeric(value));
  }

  function refresh() {
    router.refresh();
  }

  function navigate(accountId = selectedId) {
    const query = new URLSearchParams({ start, end });
    if (accountId) query.set("account", accountId);
    router.push(`/business/${businessSlug}/banking?${query.toString()}`);
  }

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!start || !end || end < start) return toast.error("Choose a valid banking date range.");
    navigate();
  }

  async function saveBankAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy) return;
    if (!accountForm.ledgerId || accountForm.name.trim().length < 2) return toast.error("Choose a bank ledger and enter an account name.");
    setBusy("account");
    const { error } = await supabase.rpc("upsert_business_bank_account", {
      p_business_id: businessId,
      p_bank_account_id: null,
      p_ledger_account_id: accountForm.ledgerId,
      p_name: accountForm.name.trim(),
      p_institution_name: accountForm.institution.trim() || null,
      p_account_kind: accountForm.kind,
      p_account_number_masked: accountForm.masked.trim() || null,
      p_currency: accountForm.currency,
      p_reconciliation_start_date: accountForm.startDate,
      p_opening_balance_transaction: numeric(accountForm.opening),
      p_opening_exchange_rate: 1,
      p_is_active: true,
    });
    setBusy(null);
    if (error) {
      console.error("Bank account save failed", { code: error.code });
      toast.error("Bank account could not be saved.");
      return;
    }
    toast.success("Bank account connected to the ledger.");
    setAccountForm((current) => ({ ...current, name: "", institution: "", masked: "", opening: "0" }));
    refresh();
  }

  async function importStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy || !selectedAccount || !statementForm.file) return;
    if (statementForm.file.size > 2_500_000) return toast.error("CSV must be smaller than 2.5 MB.");
    setBusy("import");
    try {
      const text = await statementForm.file.text();
      const parsed = parseStatementCsv(text);
      const fileHash = await sha256(statementForm.file);
      const { error } = await supabase.rpc("import_business_bank_statement", {
        p_business_id: businessId,
        p_bank_account_id: selectedAccount.id,
        p_file_name: statementForm.file.name,
        p_file_hash: fileHash,
        p_period_start: statementForm.periodStart,
        p_period_end: statementForm.periodEnd,
        p_opening_balance_transaction: numeric(statementForm.opening),
        p_closing_balance_transaction: numeric(statementForm.closing),
        p_opening_exchange_rate: numeric(statementForm.rate) || 1,
        p_closing_exchange_rate: numeric(statementForm.rate) || 1,
        p_default_exchange_rate: numeric(statementForm.rate) || 1,
        p_lines: parsed,
      });
      if (error) throw error;
      toast.success(`${parsed.length} statement transactions imported.`);
      setStatementForm((current) => ({ ...current, file: null }));
      refresh();
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      console.error("Bank statement import failed", { code });
      toast.error(error instanceof Error ? error.message : code === "23505" ? "This statement was already imported." : "Statement import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function autoMatch(statementImport: StatementImport) {
    if (!canManage || busy) return;
    setBusy(`auto-${statementImport.id}`);
    const { data, error } = await supabase.rpc("auto_match_business_bank_statement", {
      p_business_id: businessId,
      p_statement_import_id: statementImport.id,
      p_date_tolerance_days: 7,
    });
    setBusy(null);
    if (error) {
      console.error("Bank auto-match failed", { code: error.code });
      toast.error("Automatic matching could not be completed.");
      return;
    }
    const count = numeric((data as Record<string, unknown> | null)?.matched_count);
    toast.success(count ? `${count} exact ledger matches found.` : "No unique exact matches found.");
    refresh();
  }

  async function findCandidates(line: StatementLine) {
    if (busy) return;
    setBusy(`candidate-${line.id}`);
    const { data, error } = await supabase.rpc("get_business_bank_match_candidates", {
      p_business_id: businessId,
      p_statement_line_id: line.id,
      p_limit: 8,
    });
    setBusy(null);
    if (error) {
      console.error("Bank match candidates failed", { code: error.code });
      toast.error("Ledger candidates could not be loaded.");
      return;
    }
    setCandidateLineId(line.id);
    setCandidates((data ?? []) as MatchCandidate[]);
    setExclusionReason(line.exclusion_reason ?? "");
  }

  async function matchLine(lineId: string, journalLineId: string) {
    if (!canManage || busy) return;
    setBusy(`match-${journalLineId}`);
    const { error } = await supabase.rpc("match_business_bank_statement_line", {
      p_business_id: businessId,
      p_statement_line_id: lineId,
      p_journal_line_id: journalLineId,
    });
    setBusy(null);
    if (error) {
      console.error("Bank statement match failed", { code: error.code });
      toast.error("That ledger line could not be matched.");
      return;
    }
    toast.success("Statement line matched.");
    setCandidateLineId(null);
    setCandidates([]);
    refresh();
  }

  async function unmatch(matchId: string) {
    if (!canManage || busy) return;
    setBusy(`unmatch-${matchId}`);
    const { error } = await supabase.rpc("unmatch_business_bank_statement_line", {
      p_business_id: businessId,
      p_match_id: matchId,
    });
    setBusy(null);
    if (error) return toast.error("Completed or locked matches cannot be removed.");
    toast.success("Ledger match removed.");
    refresh();
  }

  async function setExcluded(line: StatementLine, excluded: boolean) {
    if (!canManage || busy) return;
    if (excluded && exclusionReason.trim().length < 2) return toast.error("Enter a short exclusion reason.");
    setBusy(`exclude-${line.id}`);
    const { error } = await supabase.rpc("set_business_bank_statement_line_excluded", {
      p_business_id: businessId,
      p_statement_line_id: line.id,
      p_excluded: excluded,
      p_reason: excluded ? exclusionReason.trim() : null,
    });
    setBusy(null);
    if (error) return toast.error("Statement line status could not be changed.");
    toast.success(excluded ? "Statement line excluded with reason." : "Statement line restored.");
    setCandidateLineId(null);
    refresh();
  }

  async function runReconciliationAction(
    statementImport: StatementImport,
    action: "complete" | "reopen" | "lock" | "void",
  ) {
    if (!canManage || busy) return;
    const key = `${action}-${statementImport.id}`;
    if (pendingAction !== key) {
      setPendingAction(key);
      setActionNote("");
      toast.message(`Review the note and press ${title(action)} again to confirm.`);
      return;
    }
    if (action === "void" && actionNote.trim().length < 2) return toast.error("A void reason is required.");
    setBusy(key);
    const rpcName = action === "complete"
      ? "complete_business_bank_reconciliation"
      : action === "reopen"
        ? "reopen_business_bank_reconciliation"
        : action === "lock"
          ? "lock_business_bank_reconciliation"
          : "void_business_bank_statement_import";
    const args = action === "void"
      ? { p_business_id: businessId, p_statement_import_id: statementImport.id, p_reason: actionNote.trim() }
      : { p_business_id: businessId, p_reconciliation_id: statementImport.reconciliation_id, p_notes: actionNote.trim() || null };
    const { error } = await supabase.rpc(rpcName, args);
    setBusy(null);
    if (error) {
      console.error("Bank reconciliation action failed", { action, code: error.code });
      toast.error(error.message || `Reconciliation could not be marked ${action}.`);
      return;
    }
    toast.success(action === "complete" ? "Reconciliation completed with zero difference." : `Reconciliation marked ${action}.`);
    setPendingAction(null);
    setActionNote("");
    refresh();
  }

  const activeLine = lines.find((line) => line.id === candidateLineId) ?? null;
  const ledgerBalance = numeric(summary.ledger_balance_base);
  const statementBalance = summary.latest_statement_balance_base == null ? null : numeric(summary.latest_statement_balance_base);
  const visibleDifference = statementBalance == null ? null : ledgerBalance - statementBalance;

  return (
    <main className="min-h-dvh bg-background px-4 pb-10 pt-5 text-foreground sm:px-6 sm:pt-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Banking control</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Banking & reconciliation</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
              {businessName} bank statements, posted ledger movements, outstanding items, and reconciliation locks use one tenant-isolated source of truth.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Engine writes protected
          </span>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Landmark} label="Ledger balance" value={money(ledgerBalance)} />
          <SummaryCard icon={FileSpreadsheet} label="Latest statement" value={statementBalance == null ? "No statement" : money(statementBalance)} />
          <SummaryCard icon={BadgeCheck} label="Visible difference" value={visibleDifference == null ? "—" : money(visibleDifference)} tone={visibleDifference != null && Math.abs(visibleDifference) > 0.01 ? "danger" : "success"} />
          <SummaryCard icon={Search} label="Unmatched lines" value={String(summary.unmatched_statement_lines ?? 0)} tone={(summary.unmatched_statement_lines ?? 0) > 0 ? "warning" : "success"} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Bank or cash account</span>
            <select value={selectedId} onChange={(event) => navigate(event.target.value)} className="field-input min-h-11 w-full">
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
            </select>
          </label>
          <form onSubmit={applyRange} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} aria-label="Banking start date" />
            <Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} aria-label="Banking end date" />
            <Button type="submit" variant="secondary"><CalendarRange aria-hidden="true" /> Apply</Button>
          </form>
        </section>

        {selectedAccount ? (
          <section className="mt-5 rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><WalletCards className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h2 className="truncate font-black text-text-primary">{selectedAccount.name}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{selectedAccount.institution_name ?? selectedAccount.ledger_name} · Ledger {selectedAccount.ledger_code}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-right text-xs sm:flex sm:gap-6">
                <span><small className="block text-text-tertiary">Start</small><strong className="text-text-primary">{formatDate(selectedAccount.reconciliation_start_date)}</strong></span>
                <span><small className="block text-text-tertiary">Open items</small><strong className="text-text-primary">{selectedAccount.unreconciled_lines}</strong></span>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-[var(--radius-card)] bg-warning-soft px-5 py-5 text-sm text-warning">No active bank or cash ledger is connected yet.</section>
        )}

        {canManage ? (
          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            <details className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
              <summary className="finance-focus flex cursor-pointer items-center gap-3 font-black text-text-primary"><Plus className="size-5 text-primary" aria-hidden="true" /> Connect another bank ledger</summary>
              {ledgers.length ? (
                <form onSubmit={saveBankAccount} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Eligible ledger"><select value={accountForm.ledgerId} onChange={(event) => setAccountForm({ ...accountForm, ledgerId: event.target.value })} className="field-input min-h-11 w-full">{ledgers.map((ledger) => <option key={ledger.id} value={ledger.id}>{ledger.code} · {ledger.name}</option>)}</select></Field>
                    <Field label="Display name"><Input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="Operating bank" maxLength={120} /></Field>
                    <Field label="Institution"><Input value={accountForm.institution} onChange={(event) => setAccountForm({ ...accountForm, institution: event.target.value })} placeholder="Bank or wallet name" maxLength={120} /></Field>
                    <Field label="Account type"><select value={accountForm.kind} onChange={(event) => setAccountForm({ ...accountForm, kind: event.target.value })} className="field-input min-h-11 w-full"><option value="bank">Bank</option><option value="cash">Cash</option><option value="mobile_wallet">Mobile wallet</option><option value="clearing">Clearing</option></select></Field>
                    <Field label="Masked number"><Input value={accountForm.masked} onChange={(event) => setAccountForm({ ...accountForm, masked: event.target.value })} placeholder="•••• 1234" maxLength={40} /></Field>
                    <Field label="Reconcile from"><Input type="date" value={accountForm.startDate} onChange={(event) => setAccountForm({ ...accountForm, startDate: event.target.value })} /></Field>
                    <Field label={`Opening balance (${baseCurrency})`}><Input inputMode="decimal" value={accountForm.opening} onChange={(event) => setAccountForm({ ...accountForm, opening: event.target.value })} /></Field>
                  </div>
                  <Button type="submit" loading={busy === "account"} loadingLabel="Connecting…"><Link2 aria-hidden="true" /> Connect ledger</Button>
                </form>
              ) : <p className="mt-4 text-sm leading-6 text-text-secondary">All eligible bank and cash-equivalent ledger accounts are already connected.</p>}
            </details>

            <details className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6" open={imports.length === 0}>
              <summary className="finance-focus flex cursor-pointer items-center gap-3 font-black text-text-primary"><Upload className="size-5 text-primary" aria-hidden="true" /> Import bank statement CSV</summary>
              <form onSubmit={importStatement} className="mt-5 space-y-4">
                <p className="text-xs leading-5 text-text-secondary">Required columns: <strong>transaction_date</strong>, <strong>description</strong>, and <strong>amount</strong> or debit/credit. Dates use YYYY-MM-DD.</p>
                <Field label="CSV file"><Input type="file" accept=".csv,text/csv" onChange={(event) => setStatementForm({ ...statementForm, file: event.target.files?.[0] ?? null })} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Period start"><Input type="date" value={statementForm.periodStart} onChange={(event) => setStatementForm({ ...statementForm, periodStart: event.target.value })} /></Field>
                  <Field label="Period end"><Input type="date" value={statementForm.periodEnd} onChange={(event) => setStatementForm({ ...statementForm, periodEnd: event.target.value })} /></Field>
                  <Field label="Opening balance"><Input inputMode="decimal" value={statementForm.opening} onChange={(event) => setStatementForm({ ...statementForm, opening: event.target.value })} /></Field>
                  <Field label="Closing balance"><Input inputMode="decimal" value={statementForm.closing} onChange={(event) => setStatementForm({ ...statementForm, closing: event.target.value })} /></Field>
                  {selectedAccount?.currency !== baseCurrency ? <Field label="FX rate to base"><Input inputMode="decimal" value={statementForm.rate} onChange={(event) => setStatementForm({ ...statementForm, rate: event.target.value })} /></Field> : null}
                </div>
                <Button type="submit" disabled={!selectedAccount || !statementForm.file} loading={busy === "import"} loadingLabel="Validating…"><FileSpreadsheet aria-hidden="true" /> Validate and import</Button>
              </form>
            </details>
          </section>
        ) : null}

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Statement control</p><h2 className="mt-1 text-xl font-black text-text-primary">Imports & reconciliation</h2></div>
            <span className="text-sm font-black tabular-nums text-text-secondary">{imports.length} imports</span>
          </div>
          {imports.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-10 text-center text-sm text-text-secondary">No statement has been imported for this account and date range.</div>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {imports.map((statementImport) => {
                const reconciliation = reconciliations.find((item) => item.id === statementImport.reconciliation_id);
                const actionKey = pendingAction?.endsWith(statementImport.id) ? pendingAction : null;
                return (
                  <article key={statementImport.id} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0"><h3 className="truncate font-black text-text-primary">{statementImport.file_name}</h3><p className="mt-1 text-xs text-text-secondary">{formatDate(statementImport.period_start)} – {formatDate(statementImport.period_end)}</p></div>
                      <StatusPill status={statementImport.reconciliation_status} />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="Closing" value={money(statementImport.closing_balance_base)} />
                      <Metric label="Lines" value={String(statementImport.line_count)} />
                      <Metric label="Matched" value={`${statementImport.matched_lines}/${statementImport.line_count - statementImport.excluded_lines}`} />
                      <Metric label="Difference" value={reconciliation?.difference_base == null ? "Pending" : money(reconciliation.difference_base)} />
                    </div>
                    {reconciliation && reconciliation.status !== "draft" ? (
                      <div className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
                        Ledger {money(reconciliation.ledger_balance_base)} · adjusted statement {money(reconciliation.adjusted_statement_balance_base)} · outstanding in {money(reconciliation.outstanding_debits_base)} · out {money(reconciliation.outstanding_credits_base)}
                      </div>
                    ) : null}
                    {actionKey ? <Input className="mt-4" value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder={actionKey.startsWith("void") ? "Required void reason" : "Optional audit note"} maxLength={500} /> : null}
                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {statementImport.reconciliation_status === "draft" ? (
                          <>
                            <Button size="sm" variant="secondary" loading={busy === `auto-${statementImport.id}`} loadingLabel="Matching…" onClick={() => void autoMatch(statementImport)}><Sparkles aria-hidden="true" /> Auto match</Button>
                            <Button size="sm" variant={actionKey === `complete-${statementImport.id}` ? "success" : "default"} loading={busy === `complete-${statementImport.id}`} loadingLabel="Completing…" onClick={() => void runReconciliationAction(statementImport, "complete")}><CheckCircle2 aria-hidden="true" /> {actionKey === `complete-${statementImport.id}` ? "Confirm complete" : "Complete"}</Button>
                            <Button size="sm" variant={actionKey === `void-${statementImport.id}` ? "destructive" : "ghost"} loading={busy === `void-${statementImport.id}`} loadingLabel="Voiding…" onClick={() => void runReconciliationAction(statementImport, "void")}><Ban aria-hidden="true" /> {actionKey === `void-${statementImport.id}` ? "Confirm void" : "Void"}</Button>
                          </>
                        ) : statementImport.reconciliation_status === "completed" ? (
                          <>
                            <Button size="sm" variant={actionKey === `reopen-${statementImport.id}` ? "warning" : "secondary"} loading={busy === `reopen-${statementImport.id}`} loadingLabel="Reopening…" onClick={() => void runReconciliationAction(statementImport, "reopen")}><RotateCcw aria-hidden="true" /> {actionKey === `reopen-${statementImport.id}` ? "Confirm reopen" : "Reopen"}</Button>
                            <Button size="sm" variant={actionKey === `lock-${statementImport.id}` ? "destructive" : "default"} loading={busy === `lock-${statementImport.id}`} loadingLabel="Locking…" onClick={() => void runReconciliationAction(statementImport, "lock")}><LockKeyhole aria-hidden="true" /> {actionKey === `lock-${statementImport.id}` ? "Confirm permanent lock" : "Lock"}</Button>
                          </>
                        ) : <span className="inline-flex items-center gap-2 text-xs font-black text-success"><LockKeyhole className="size-4" aria-hidden="true" /> Matches and balances are permanent</span>}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Match review</p><h2 className="mt-1 text-xl font-black text-text-primary">Statement transactions</h2></div><Button size="sm" variant="ghost" onClick={refresh}><RefreshCcw aria-hidden="true" /> Refresh</Button></div>
          <div className="mt-4 space-y-3">
            {lines.map((line) => {
              const statementImport = imports.find((item) => item.id === line.import_id);
              const editable = canManage && statementImport?.reconciliation_status === "draft";
              const outgoing = numeric(line.amount_base) < 0;
              return (
                <article key={line.id} className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)] sm:px-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] ${outgoing ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{outgoing ? <ArrowUpRight className="size-5" aria-hidden="true" /> : <ArrowDownLeft className="size-5" aria-hidden="true" />}</span>
                      <div className="min-w-0"><h3 className="truncate text-sm font-black text-text-primary">{line.description}</h3><p className="mt-1 text-xs text-text-secondary">{formatDate(line.transaction_date)}{line.reference ? ` · ${line.reference}` : ""}</p></div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                      <div className="text-right"><strong className={`block tabular-nums ${outgoing ? "text-danger" : "text-success"}`}>{money(line.amount_transaction, selectedAccount?.currency ?? baseCurrency)}</strong><span className="text-[11px] text-text-tertiary">Remaining {money(line.remaining_base)}</span></div>
                      <StatusPill status={line.match_status} />
                      {editable && line.match_status !== "excluded" && numeric(line.remaining_base) > 0 ? <Button size="sm" variant="secondary" loading={busy === `candidate-${line.id}`} loadingLabel="Finding…" onClick={() => void findCandidates(line)}><Search aria-hidden="true" /> Review</Button> : null}
                      {editable && line.excluded ? <Button size="sm" variant="ghost" loading={busy === `exclude-${line.id}`} loadingLabel="Restoring…" onClick={() => void setExcluded(line, false)}><RotateCcw aria-hidden="true" /> Restore</Button> : null}
                    </div>
                  </div>
                  {line.matches.length ? <div className="mt-3 space-y-2">{line.matches.map((match) => <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-3 py-2 text-xs"><span className="min-w-0 truncate text-text-secondary"><Link2 className="mr-1 inline size-3.5 text-primary" aria-hidden="true" /> {formatDate(match.entry_date)} · {match.reference ?? title(match.source_type)} · {match.description}</span><span className="flex items-center gap-2"><strong className="tabular-nums text-text-primary">{money(match.amount_base)}</strong>{editable ? <button type="button" className="finance-focus rounded-md p-1 text-text-tertiary hover:text-danger" aria-label="Remove ledger match" onClick={() => void unmatch(match.id)}><Unlink className="size-4" aria-hidden="true" /></button> : null}</span></div>)}</div> : null}
                  {line.excluded && line.exclusion_reason ? <p className="mt-3 text-xs text-warning">Excluded: {line.exclusion_reason}</p> : null}
                </article>
              );
            })}
            {lines.length === 0 ? <div className="rounded-[var(--radius-card)] bg-surface-secondary px-5 py-10 text-center text-sm text-text-secondary">No statement transactions in this date range.</div> : null}
          </div>
        </section>

        {activeLine ? (
          <section className="sticky bottom-3 z-20 mt-5 rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-lg)] ring-1 ring-border/60 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Ledger candidates</p><h3 className="mt-1 font-black text-text-primary">{activeLine.description} · remaining {money(activeLine.remaining_base)}</h3></div><Button size="sm" variant="ghost" onClick={() => { setCandidateLineId(null); setCandidates([]); }}>Close</Button></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">{candidates.map((candidate) => <article key={candidate.journal_line_id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-text-primary">{candidate.description}</strong><span className="mt-1 block text-xs text-text-secondary">{formatDate(candidate.entry_date)} · {candidate.reference ?? title(candidate.source_type)} · {candidate.date_difference_days} day gap</span></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${candidate.exact_amount ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{candidate.exact_amount ? "Exact" : `Δ ${money(candidate.amount_difference_base)}`}</span></div><div className="mt-3 flex items-center justify-between gap-3"><strong className="tabular-nums text-text-primary">{money(candidate.amount_base)}</strong><Button size="sm" loading={busy === `match-${candidate.journal_line_id}`} loadingLabel="Matching…" onClick={() => void matchLine(activeLine.id, candidate.journal_line_id)}><Link2 aria-hidden="true" /> Match</Button></div></article>)}</div>
            {candidates.length === 0 ? <p className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary">No eligible bank-ledger line was found within 45 days and the remaining amount.</p> : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><Input value={exclusionReason} onChange={(event) => setExclusionReason(event.target.value)} placeholder="Reason to exclude a duplicate or non-ledger statement line" maxLength={300} /><Button variant="warning" loading={busy === `exclude-${activeLine.id}`} loadingLabel="Excluding…" onClick={() => void setExcluded(activeLine, true)}><Ban aria-hidden="true" /> Exclude line</Button></div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "primary" }: { icon: typeof Landmark; label: string; value: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  const className = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-primary";
  return <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"><Icon className={`size-5 ${className}`} aria-hidden="true" /><p className="mt-4 text-xs font-bold text-text-secondary">{label}</p><strong className={`mt-1 block truncate text-xl font-black tabular-nums ${className}`}>{value}</strong></article>;
}

function StatusPill({ status }: { status: string }) {
  const style = status === "matched" || status === "completed" || status === "reconciled"
    ? "bg-success-soft text-success"
    : status === "locked"
      ? "bg-primary-soft text-primary"
      : status === "partial" || status === "draft"
        ? "bg-warning-soft text-warning"
        : status === "excluded" || status === "void"
          ? "bg-danger-soft text-danger"
          : "bg-surface-secondary text-text-secondary";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${style}`}>{title(status)}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3"><span className="text-[11px] font-bold text-text-tertiary">{label}</span><strong className="mt-1 block truncate text-sm font-black tabular-nums text-text-primary">{value}</strong></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="text-sm font-bold text-text-primary">{label}</span>{children}</label>;
}
