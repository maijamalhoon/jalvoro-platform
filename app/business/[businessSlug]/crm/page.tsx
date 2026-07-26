import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  ContactRound,
  Handshake,
  Mail,
  Phone,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";

import BusinessCrmForms, {
  type CrmContactOption,
  type CrmLeadOption,
  type CrmMemberOption,
  type CrmOpportunityOption,
  type CrmPipelineOption,
  type CrmProductOption,
  type CrmRevenueAccountOption,
  type CrmStageOption,
  type CrmWarehouseOption,
} from "@/components/business/BusinessCrmForms";
import {
  CompleteActivityButton,
  ConvertLeadButton,
  OpportunityActions,
} from "@/components/business/BusinessCrmActions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business CRM",
  robots: { index: false, follow: false },
};

type NumberValue = number | string;

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  business_type: string;
  workspace_mode: "advanced_company" | "simple_shop";
  timezone: string;
  module_config: Record<string, boolean> | null;
};

type PipelineRow = {
  id: string;
  name: string;
  is_default: boolean;
  status: string;
};

type StageRow = {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  probability: NumberValue;
  category: "open" | "won" | "lost";
};

type LeadRow = {
  id: string;
  lead_code: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "disqualified";
  currency: string;
  estimated_value: NumberValue;
  owner_user_id: string | null;
  converted_contact_id: string | null;
  converted_opportunity_id: string | null;
  notes: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

type OpportunityRow = {
  id: string;
  opportunity_code: string;
  pipeline_id: string;
  stage_id: string;
  lead_id: string | null;
  contact_id: string | null;
  title: string;
  amount: NumberValue;
  currency: string;
  probability: NumberValue;
  expected_close_date: string | null;
  owner_user_id: string | null;
  status: "open" | "won" | "lost";
  lost_reason: string | null;
  notes: string | null;
  next_follow_up_at: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

type OpportunityLineRow = {
  id: string;
  opportunity_id: string;
  line_number: number;
  product_id: string | null;
  warehouse_id: string | null;
  description: string;
  quantity: NumberValue;
  unit_price: NumberValue;
  discount_percent: NumberValue;
  tax_rate: NumberValue;
  revenue_account_id: string | null;
};

type ActivityRow = {
  id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  contact_id: string | null;
  activity_type: "note" | "call" | "email" | "meeting" | "task";
  subject: string;
  details: string | null;
  status: "open" | "completed" | "cancelled";
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
};

type ContactRow = {
  id: string;
  display_name: string;
  currency: string;
  payment_terms_days: number;
};

type MemberRow = {
  user_id: string;
  display_name: string;
  role: string;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  sales_price: NumberValue;
  revenue_account_id: string;
};

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
};

type RevenueAccountRow = {
  id: string;
  code: string;
  name: string;
};

function numeric(value: NumberValue | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: NumberValue, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric(value));
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string | null, timezone: string) {
  if (!value) return "No follow-up";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["converted", "won", "completed"].includes(status)) return "bg-success-soft text-success";
  if (["disqualified", "lost", "cancelled"].includes(status)) return "bg-danger-soft text-danger";
  if (["qualified", "contacted"].includes(status)) return "bg-warning-soft text-warning";
  return "bg-primary-soft text-primary";
}

function activityIcon(type: ActivityRow["activity_type"]) {
  if (type === "email") return Mail;
  if (type === "call") return Phone;
  if (type === "meeting") return Handshake;
  if (type === "task") return CalendarClock;
  return ContactRound;
}

async function getRequestTimestamp() {
  await connection();
  return Date.now();
}

export default async function BusinessCrmPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/crm`)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, business_type, workspace_mode, timezone, module_config")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;
  if (business.workspace_mode !== "advanced_company" || business.module_config?.crm !== true) notFound();

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const canViewCrm =
    ["owner", "admin", "accountant", "manager", "sales", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("crm.view") ||
    permissions.includes("crm.manage");
  if (!canViewCrm) notFound();

  const canManageCrm =
    ["owner", "admin", "manager", "sales"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("crm.manage");
  const canConvertSales =
    ["owner", "admin", "accountant", "manager", "sales"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("sales.manage");

  const [
    pipelinesResult,
    stagesResult,
    leadsResult,
    opportunitiesResult,
    linesResult,
    activitiesResult,
    contactsResult,
    membersResult,
    productsResult,
    warehousesResult,
    revenueAccountsResult,
  ] = await Promise.all([
    supabase
      .from("business_crm_pipelines")
      .select("id, name, is_default, status")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("business_crm_stages")
      .select("id, pipeline_id, name, position, probability, category")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase
      .from("business_crm_leads")
      .select("id, lead_code, display_name, company_name, email, phone, source, status, currency, estimated_value, owner_user_id, converted_contact_id, converted_opportunity_id, notes, next_follow_up_at, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("business_crm_opportunities")
      .select("id, opportunity_code, pipeline_id, stage_id, lead_id, contact_id, title, amount, currency, probability, expected_close_date, owner_user_id, status, lost_reason, notes, next_follow_up_at, invoice_id, created_at, updated_at")
      .eq("business_id", business.id)
      .order("updated_at", { ascending: false })
      .limit(250),
    supabase
      .from("business_crm_opportunity_lines")
      .select("id, opportunity_id, line_number, product_id, warehouse_id, description, quantity, unit_price, discount_percent, tax_rate, revenue_account_id")
      .eq("business_id", business.id)
      .order("line_number", { ascending: true }),
    supabase
      .from("business_crm_activities")
      .select("id, lead_id, opportunity_id, contact_id, activity_type, subject, details, status, due_at, completed_at, assigned_to, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("business_contacts")
      .select("id, display_name, currency, payment_terms_days")
      .eq("business_id", business.id)
      .eq("status", "active")
      .in("contact_type", ["customer", "both"])
      .order("display_name", { ascending: true }),
    supabase.rpc("get_business_crm_members", { p_business_id: business.id }),
    supabase
      .from("business_products")
      .select("id, sku, name, sales_price, revenue_account_id")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("business_warehouses")
      .select("id, code, name, is_default")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("business_chart_of_accounts")
      .select("id, code, name")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .eq("account_type", "revenue")
      .in("system_key", ["sales_revenue", "service_revenue"])
      .order("code", { ascending: true }),
  ]);

  const loadError = [
    pipelinesResult.error,
    stagesResult.error,
    leadsResult.error,
    opportunitiesResult.error,
    linesResult.error,
    activitiesResult.error,
    contactsResult.error,
    membersResult.error,
    productsResult.error,
    warehousesResult.error,
    revenueAccountsResult.error,
  ].find(Boolean);

  if (loadError) console.error("Business CRM workspace load failed", { code: loadError.code });

  const pipelines = (pipelinesResult.data ?? []) as PipelineRow[];
  const stages = (stagesResult.data ?? []) as StageRow[];
  const leads = (leadsResult.data ?? []) as LeadRow[];
  const opportunities = (opportunitiesResult.data ?? []) as OpportunityRow[];
  const lines = (linesResult.data ?? []) as OpportunityLineRow[];
  const activities = (activitiesResult.data ?? []) as ActivityRow[];
  const contacts = (contactsResult.data ?? []) as ContactRow[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const products = (productsResult.data ?? []) as ProductRow[];
  const warehouses = (warehousesResult.data ?? []) as WarehouseRow[];
  const revenueAccounts = (revenueAccountsResult.data ?? []) as RevenueAccountRow[];

  const memberNames = new Map(members.map((member) => [member.user_id, member.display_name]));
  const leadNames = new Map(leads.map((lead) => [lead.id, lead.company_name ?? lead.display_name]));
  const leadContacts = new Map(leads.map((lead) => [lead.id, lead.converted_contact_id]));
  const contactNames = new Map(contacts.map((contact) => [contact.id, contact.display_name]));
  const opportunityNames = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.title]));
  const lineCounts = new Map<string, number>();
  for (const line of lines) lineCounts.set(line.opportunity_id, (lineCounts.get(line.opportunity_id) ?? 0) + 1);

  const activeLeads = leads.filter((lead) => !["converted", "disqualified"].includes(lead.status));
  const openOpportunities = opportunities.filter((opportunity) => opportunity.status === "open");
  const basePipelineValue = openOpportunities
    .filter((opportunity) => opportunity.currency === business.base_currency)
    .reduce((sum, opportunity) => sum + numeric(opportunity.amount), 0);
  const weightedForecast = openOpportunities
    .filter((opportunity) => opportunity.currency === business.base_currency)
    .reduce((sum, opportunity) => sum + numeric(opportunity.amount) * (numeric(opportunity.probability) / 100), 0);
  const nowTime = await getRequestTimestamp();
  const dueFollowUps = activities.filter(
    (activity) => activity.status === "open" && activity.due_at && new Date(activity.due_at).getTime() <= nowTime,
  );
  const wonCount = opportunities.filter((opportunity) => opportunity.status === "won").length;

  const memberOptions: CrmMemberOption[] = members.map((member) => ({
    userId: member.user_id,
    name: member.display_name,
    role: formatLabel(member.role),
  }));
  if (!memberOptions.some((member) => member.userId === user.id)) {
    memberOptions.unshift({ userId: user.id, name: "You", role: formatLabel(role) });
  }
  const leadOptions: CrmLeadOption[] = leads.map((lead) => ({
    id: lead.id,
    code: lead.lead_code,
    name: lead.display_name,
    companyName: lead.company_name,
    status: lead.status,
    currency: lead.currency,
    estimatedValue: lead.estimated_value,
    convertedContactId: lead.converted_contact_id,
  }));
  const contactOptions: CrmContactOption[] = contacts.map((contact) => ({
    id: contact.id,
    name: contact.display_name,
    currency: contact.currency,
    paymentTermsDays: contact.payment_terms_days,
  }));
  const opportunityOptions: CrmOpportunityOption[] = opportunities.map((opportunity) => ({
    id: opportunity.id,
    code: opportunity.opportunity_code,
    title: opportunity.title,
    contactId: opportunity.contact_id,
    leadId: opportunity.lead_id,
  }));
  const pipelineOptions: CrmPipelineOption[] = pipelines.map((pipeline) => ({ id: pipeline.id, name: pipeline.name }));
  const stageOptions: CrmStageOption[] = stages.map((stage) => ({
    id: stage.id,
    pipelineId: stage.pipeline_id,
    name: stage.name,
    position: stage.position,
    probability: stage.probability,
    category: stage.category,
  }));
  const productOptions: CrmProductOption[] = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    salesPrice: product.sales_price,
    revenueAccountId: product.revenue_account_id,
  }));
  const warehouseOptions: CrmWarehouseOption[] = warehouses.map((warehouse) => ({
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    isDefault: warehouse.is_default,
  }));
  const revenueAccountOptions: CrmRevenueAccountOption[] = revenueAccounts.map((account) => ({
    id: account.id,
    code: account.code,
    name: account.name,
  }));

  const sortedActivities = [...activities].sort((left, right) => {
    if (left.status === "open" && right.status !== "open") return -1;
    if (left.status !== "open" && right.status === "open") return 1;
    const leftTime = left.due_at ? new Date(left.due_at).getTime() : new Date(left.created_at).getTime();
    const rightTime = right.due_at ? new Date(right.due_at).getTime() : new Date(right.created_at).getTime();
    return left.status === "open" ? leftTime - rightTime : rightTime - leftTime;
  });

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/business/${business.slug}`} className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {business.name}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Tenant-isolated CRM
          </span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{formatLabel(business.business_type)} growth engine</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Leads and sales pipeline</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-text-secondary sm:text-base">
            Qualify leads, assign ownership, schedule follow-ups, price opportunities, and convert won work into the same verified Sales and Inventory ledger.
          </p>
        </header>

        {loadError ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Some CRM information could not be loaded. No lead, activity, opportunity, customer, invoice, or stock record was changed.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <ContactRound className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Active leads</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">{activeLeads.length}</strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Target className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Open opportunities</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">{openOpportunities.length}</strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Base pipeline</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">{formatMoney(basePipelineValue, business.base_currency)}</strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <TrendingUp className="size-5 text-success" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Weighted forecast</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">{formatMoney(weightedForecast, business.base_currency)}</strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CalendarClock className={`size-5 ${dueFollowUps.length > 0 ? "text-danger" : "text-success"}`} aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Due follow-ups</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">{dueFollowUps.length}</strong>
            <span className="mt-1 block text-xs text-text-tertiary">Won opportunities {wonCount}</span>
          </article>
        </section>

        {canManageCrm ? (
          <div className="mt-8">
            <BusinessCrmForms
              businessId={business.id}
              baseCurrency={business.base_currency}
              currentUserId={user.id}
              members={memberOptions}
              leads={leadOptions}
              contacts={contactOptions}
              opportunities={opportunityOptions}
              pipelines={pipelineOptions}
              stages={stageOptions}
              products={productOptions}
              warehouses={warehouseOptions}
              revenueAccounts={revenueAccountOptions}
            />
          </div>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5 text-sm text-text-secondary">
            Your role has read-only CRM access. Pipeline, leads, and follow-up history remain visible.
          </section>
        )}

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Sales pipeline</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Opportunity stages</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">{opportunities.length} opportunities</span>
          </div>

          {stages.length > 0 ? (
            <div className="mt-4 overflow-x-auto pb-3">
              <div className="grid min-w-[1320px] grid-cols-6 gap-4">
                {stages.map((stage) => {
                  const stageOpportunities = opportunities.filter((opportunity) => opportunity.stage_id === stage.id);
                  const stageTone = stage.category === "won" ? "bg-success-soft text-success" : stage.category === "lost" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary";
                  return (
                    <section key={stage.id} className="rounded-[var(--radius-card)] bg-surface px-3 py-4 shadow-[var(--shadow-sm)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-text-primary">{stage.name}</h3>
                          <span className="mt-1 block text-xs text-text-tertiary">{numeric(stage.probability)}% probability</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${stageTone}`}>{stageOpportunities.length}</span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {stageOpportunities.map((opportunity) => {
                          const partyName = opportunity.contact_id
                            ? contactNames.get(opportunity.contact_id)
                            : opportunity.lead_id
                              ? leadNames.get(opportunity.lead_id)
                              : null;
                          const hasCustomer = Boolean(opportunity.contact_id || (opportunity.lead_id && leadContacts.get(opportunity.lead_id)));
                          const opportunityStages = stages
                            .filter((item) => item.pipeline_id === opportunity.pipeline_id)
                            .map((item) => ({ id: item.id, name: item.name, probability: item.probability, category: item.category }));
                          return (
                            <article key={opportunity.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[11px] font-black text-primary">{opportunity.opportunity_code}</span>
                                  <h4 className="mt-1 line-clamp-2 text-sm font-black text-text-primary">{opportunity.title}</h4>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(opportunity.status)}`}>{formatLabel(opportunity.status)}</span>
                              </div>
                              <p className="mt-2 truncate text-xs text-text-secondary">{partyName ?? "Unlinked CRM party"}</p>
                              <strong className="mt-3 block truncate text-sm tabular-nums text-text-primary">{formatMoney(opportunity.amount, opportunity.currency)}</strong>
                              <div className="mt-2 space-y-1 text-[11px] text-text-tertiary">
                                <p>{numeric(opportunity.probability)}% · {lineCounts.get(opportunity.id) ?? 0} lines</p>
                                <p>Close {formatDate(opportunity.expected_close_date)}</p>
                                <p>Owner {opportunity.owner_user_id ? memberNames.get(opportunity.owner_user_id) ?? "Team member" : "Unassigned"}</p>
                                <p>Next {formatDateTime(opportunity.next_follow_up_at, business.timezone)}</p>
                              </div>
                              {opportunity.lost_reason ? <p className="mt-2 text-xs leading-5 text-danger">{opportunity.lost_reason}</p> : null}
                              {canManageCrm ? (
                                <OpportunityActions
                                  businessId={business.id}
                                  opportunityId={opportunity.id}
                                  currentStageId={opportunity.stage_id}
                                  stages={opportunityStages}
                                  invoiceId={opportunity.invoice_id}
                                  lineCount={lineCounts.get(opportunity.id) ?? 0}
                                  currency={opportunity.currency}
                                  baseCurrency={business.base_currency}
                                  canInvoice={canConvertSales && hasCustomer}
                                />
                              ) : null}
                            </article>
                          );
                        })}
                        {stageOpportunities.length === 0 ? (
                          <div className="rounded-[var(--radius-button)] bg-background/60 px-3 py-6 text-center text-xs text-text-tertiary">No opportunity</div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">CRM stages are not initialized.</div>
          )}
        </section>

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Lead directory</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Prospects and qualification</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">{leads.length} leads</span>
          </div>

          {leads.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead) => (
                <article key={lead.id} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClass(lead.status)}`}>{formatLabel(lead.status)}</span>
                  </div>
                  <span className="mt-4 block text-[11px] font-black text-primary">{lead.lead_code}</span>
                  <h3 className="mt-1 truncate font-black text-text-primary">{lead.company_name ?? lead.display_name}</h3>
                  {lead.company_name ? <p className="mt-1 truncate text-xs text-text-tertiary">Contact: {lead.display_name}</p> : null}
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <p className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" /><span className="truncate">{lead.email ?? "No email"}</span></p>
                    <p className="flex min-w-0 items-center gap-2"><Phone className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" /><span className="truncate">{lead.phone ?? "No phone"}</span></p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3"><span className="block text-text-tertiary">Source</span><strong className="mt-1 block text-text-primary">{formatLabel(lead.source)}</strong></span>
                    <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3"><span className="block text-text-tertiary">Value</span><strong className="mt-1 block truncate text-text-primary">{formatMoney(lead.estimated_value, lead.currency)}</strong></span>
                  </div>
                  <div className="mt-4 text-xs leading-5 text-text-secondary">
                    <p>Owner: {lead.owner_user_id ? memberNames.get(lead.owner_user_id) ?? "Team member" : "Unassigned"}</p>
                    <p>Next: {formatDateTime(lead.next_follow_up_at, business.timezone)}</p>
                  </div>
                  {lead.notes ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-text-secondary">{lead.notes}</p> : null}
                  {canManageCrm && !["converted", "disqualified"].includes(lead.status) ? (
                    <div className="mt-4"><ConvertLeadButton businessId={business.id} leadId={lead.id} /></div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-8 text-center">
              <ContactRound className="mx-auto size-7 text-text-tertiary" aria-hidden="true" />
              <h3 className="mt-3 font-black text-text-primary">No leads yet</h3>
              <p className="mt-1 text-sm text-text-secondary">Add the first prospect from the CRM command center.</p>
            </div>
          )}
        </section>

        <section className="mt-9 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Activity timeline</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Follow-ups and customer actions</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">{activities.length} activities</span>
          </div>

          {sortedActivities.length > 0 ? (
            <div className="mt-4 space-y-3">
              {sortedActivities.map((activity) => {
                const Icon = activityIcon(activity.activity_type);
                const target = activity.opportunity_id
                  ? opportunityNames.get(activity.opportunity_id)
                  : activity.lead_id
                    ? leadNames.get(activity.lead_id)
                    : activity.contact_id
                      ? contactNames.get(activity.contact_id)
                      : null;
                return (
                  <article key={activity.id} className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-text-primary">{activity.subject}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(activity.status)}`}>{formatLabel(activity.status)}</span>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">{target ?? "CRM record"} · {formatLabel(activity.activity_type)} · {activity.assigned_to ? memberNames.get(activity.assigned_to) ?? "Team member" : "Unassigned"}</p>
                        <p className={`mt-1 text-xs ${activity.status === "open" && activity.due_at && new Date(activity.due_at).getTime() <= nowTime ? "font-black text-danger" : "text-text-tertiary"}`}>Due {formatDateTime(activity.due_at, business.timezone)}</p>
                        {activity.details ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{activity.details}</p> : null}
                      </div>
                    </div>
                    {canManageCrm && activity.status === "open" ? (
                      <CompleteActivityButton
                        businessId={business.id}
                        activityId={activity.id}
                        leadId={activity.lead_id}
                        opportunityId={activity.opportunity_id}
                        contactId={activity.contact_id}
                        activityType={activity.activity_type}
                        subject={activity.subject}
                        details={activity.details}
                        dueAt={activity.due_at}
                        assignedTo={activity.assigned_to}
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">No CRM activity has been recorded.</div>
          )}
        </section>
      </div>
    </main>
  );
}
