"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProductExperience,
  type ProductExperienceSlug,
} from "@/lib/product-experiences";
import { createClient } from "@/lib/supabase/client";
import {
  getBusinessSetupDefaults,
  isBusinessExperience,
} from "@/lib/workspaces/domain";

const BUSINESS_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "construction", label: "Construction" },
  { value: "professional_services", label: "Professional services" },
  { value: "other", label: "Other" },
] as const;

const BASE_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATION_REQUEST_STORAGE_PREFIX = "jalvoro-workspace-creation-request";

type BusinessExperience = Exclude<ProductExperienceSlug, "personal">;

type CreateBusinessWorkspaceFormProps = {
  initialExperience?: ProductExperienceSlug | null;
  onboardingSessionId?: string | null;
};

function createRequestId() {
  try {
    if (typeof window.crypto?.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    if (typeof window.crypto?.getRandomValues !== "function") return null;

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

function creationRequestStorageKey(experience: BusinessExperience) {
  return `${CREATION_REQUEST_STORAGE_PREFIX}:${experience}`;
}

function readPersistedCreationRequest(experience: BusinessExperience) {
  const key = creationRequestStorageKey(experience);

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const stored = storage.getItem(key);
      if (stored && UUID_PATTERN.test(stored)) return stored;
    } catch {
      // Continue to the next browser-owned persistence option.
    }
  }

  return null;
}

function persistCreationRequest(experience: BusinessExperience, requestId: string) {
  const key = creationRequestStorageKey(experience);

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      storage.setItem(key, requestId);
      return true;
    } catch {
      // Continue to the next browser-owned persistence option.
    }
  }

  return false;
}

function clearPersistedCreationRequest(experience: BusinessExperience) {
  const key = creationRequestStorageKey(experience);

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      storage.removeItem(key);
    } catch {
      // A server-side idempotency record still prevents duplicate creation.
    }
  }
}

export default function CreateBusinessWorkspaceForm({
  initialExperience,
  onboardingSessionId,
}: CreateBusinessWorkspaceFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const submissionLockRef = useRef(false);
  const businessExperience: BusinessExperience = isBusinessExperience(initialExperience)
    ? initialExperience
    : "small-business";
  const experience = getProductExperience(businessExperience);
  const setupDefaults = getBusinessSetupDefaults(businessExperience);
  const workspaceMode = setupDefaults.workspaceMode;
  const validSessionId =
    onboardingSessionId && UUID_PATTERN.test(onboardingSessionId)
      ? onboardingSessionId
      : null;

  const [creationRequestId, setCreationRequestId] = useState<string | null>(null);
  const [requestPersistenceError, setRequestPersistenceError] = useState(false);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState(setupDefaults.businessType);
  const [countryCode, setCountryCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
  }, []);

  useEffect(() => {
    setBusinessType(setupDefaults.businessType);
  }, [businessExperience, setupDefaults.businessType]);

  useEffect(() => {
    const stored = readPersistedCreationRequest(businessExperience);
    const requestId = stored ?? createRequestId();

    if (!requestId || !persistCreationRequest(businessExperience, requestId)) {
      setCreationRequestId(null);
      setRequestPersistenceError(true);
      return;
    }

    setRequestPersistenceError(false);
    setCreationRequestId(requestId);
  }, [businessExperience]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLockRef.current || saving) return;

    if (!creationRequestId) {
      toast.error(
        "Secure retry protection is unavailable in this browser session. Enable browser storage or use another secure browser before creating a workspace.",
      );
      return;
    }

    const cleanName = name.trim();
    const cleanCountry = countryCode.trim().toUpperCase();

    if (cleanName.length < 2 || cleanName.length > 120) {
      toast.error(
        businessExperience === "freelancer"
          ? "Professional name must contain 2 to 120 characters."
          : "Business name must contain 2 to 120 characters.",
      );
      return;
    }

    if (cleanCountry && !/^[A-Z]{2}$/.test(cleanCountry)) {
      toast.error("Use a two-letter country code, for example PK, US, or AE.");
      return;
    }

    submissionLockRef.current = true;
    setSaving(true);

    try {
      const { data: businessId, error } = await supabase.rpc(
        "create_business_workspace_for_experience",
        {
          p_name: cleanName,
          p_business_type: businessType,
          p_experience: businessExperience,
          p_creation_request_id: creationRequestId,
          p_country_code: cleanCountry || null,
          p_base_currency: baseCurrency,
          p_timezone: timezone,
          p_session_id: validSessionId,
        },
      );

      if (error || typeof businessId !== "string") {
        console.error("Atomic business workspace creation failed", { code: error?.code });
        toast.error(
          "Workspace result could not be confirmed. The atomic operation does not retain partial setup; refresh the workspace list before retrying.",
        );
        return;
      }

      clearPersistedCreationRequest(businessExperience);

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("slug, workspace_mode")
        .eq("id", businessId)
        .single();

      if (businessError || !business?.slug) {
        console.error("Created business could not be resolved", {
          code: businessError?.code,
        });
        toast.success("Business workspace created with tailored setup ready.");
        router.replace("/business");
        router.refresh();
        return;
      }

      setName("");
      toast.success(
        `${experience?.productName ?? "Business workspace"} created with isolated data and modules ready.`,
      );
      router.replace(
        business.workspace_mode === "simple_shop"
          ? `/business/${business.slug}/shop`
          : `/business/${business.slug}`,
      );
      router.refresh();
    } catch {
      toast.error(
        "Workspace result could not be confirmed. Refresh the workspace list before retrying; the same secure request cannot create a duplicate.",
      );
    } finally {
      submissionLockRef.current = false;
      setSaving(false);
    }
  }

  const WorkspaceIcon = workspaceMode === "simple_shop" ? Store : Building2;
  const workspaceStyleLabel =
    workspaceMode === "simple_shop" ? "Simple Shop" : "Advanced Company";
  const workspaceStyleDescription =
    workspaceMode === "simple_shop"
      ? "Fast counter sales, purchases, stock, returns, daily cash, and profit."
      : "Connected accounting, contacts, sales, purchasing, inventory, CRM, reports, and team controls.";

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <WorkspaceIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {experience?.label ?? "For Small Businesses"}
          </p>
          <h2 className="mt-1 text-base font-black tracking-tight text-text-primary sm:text-lg">
            {businessExperience === "freelancer"
              ? "Set up your independent work"
              : `Create ${experience?.productName ?? "a business workspace"}`}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            Your selected experience sets a compatible starting workflow and module foundation.
            Creation is atomic and retry-safe: tailored setup must succeed before a workspace is
            kept, and the same request cannot create a duplicate.
          </p>
        </div>
      </div>

      {requestPersistenceError ? (
        <div
          className="mt-5 rounded-[var(--radius-button)] bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          role="alert"
        >
          Workspace creation is paused because this browser cannot persist a secure retry token.
          Enable browser storage or use another secure browser; existing workspaces are unaffected.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <section
          className="rounded-[var(--radius-button)] bg-primary-soft px-4 py-4"
          aria-labelledby="starting-workflow-heading"
        >
          <div className="flex items-start gap-3">
            <WorkspaceIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p
                id="starting-workflow-heading"
                className="text-sm font-black text-text-primary"
              >
                Starting workflow: {workspaceStyleLabel}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {workspaceStyleDescription} Choose a different experience from the selector when a
                different operating model is required.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">
              {businessExperience === "freelancer" ? "Professional name" : "Business name"}
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                businessExperience === "freelancer"
                  ? "Example: Ali Design Studio"
                  : workspaceMode === "simple_shop"
                    ? "Example: Jamal General Store"
                    : "Example: Jamal Traders"
              }
              autoComplete="organization"
              maxLength={120}
              disabled={saving || requestPersistenceError}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Nature of business</span>
            <select
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value as typeof businessType)}
              className="field-input min-h-11 w-full"
              disabled={saving || requestPersistenceError}
            >
              {BUSINESS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Base currency</span>
            <select
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving || requestPersistenceError}
            >
              {BASE_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Country code</span>
            <Input
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              placeholder="PK"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={2}
              disabled={saving || requestPersistenceError}
            />
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-bold text-text-primary">Timezone</span>
            <Input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Karachi"
              autoComplete="off"
              maxLength={80}
              disabled={saving || requestPersistenceError}
              required
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            Tenant-isolated data and membership
          </span>
          <span className="flex items-center gap-2">
            <Globe2 aria-hidden="true" className="size-4 text-primary" />
            Atomic, idempotent workspace setup
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          loadingLabel="Creating workspace..."
          disabled={!creationRequestId || requestPersistenceError}
          className="w-full sm:w-auto"
        >
          <WorkspaceIcon aria-hidden="true" />
          {creationRequestId
            ? `Create ${experience?.productName ?? "Business workspace"}`
            : "Preparing secure request..."}
        </Button>
      </form>
    </section>
  );
}
