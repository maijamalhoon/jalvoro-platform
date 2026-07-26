"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRateLimitedAdminClient } from "@/lib/admin/server-action-security";

const PLAN_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const BILLING_INTERVALS = new Set(["month", "year", "one_time"]);

function readText(formData: FormData, name: string, maximumLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function actionRedirect(result: string): never {
  redirect(`/admin?billingAction=${encodeURIComponent(result)}#admin-billing`);
}

export async function saveBillingPlan(formData: FormData) {
  const code = readText(formData, "code", 40)?.toLowerCase() ?? null;
  const name = readText(formData, "name", 80);
  const billingInterval = readText(formData, "billingInterval", 16);
  const priceText = readText(formData, "priceMajor", 32);
  const currency = readText(formData, "currency", 3)?.toUpperCase() ?? null;
  const currencyExponentText = readText(formData, "currencyExponent", 1);
  const priceMajor = priceText ? Number(priceText) : Number.NaN;
  const currencyExponent = currencyExponentText
    ? Number(currencyExponentText)
    : Number.NaN;

  if (
    !code ||
    code === "free" ||
    !PLAN_CODE_PATTERN.test(code) ||
    !name ||
    /[^\S\r\n]*[\u0000-\u001F\u007F]/.test(name) ||
    !billingInterval ||
    !BILLING_INTERVALS.has(billingInterval) ||
    !Number.isFinite(priceMajor) ||
    priceMajor <= 0 ||
    priceMajor > 1000000000 ||
    !currency ||
    !CURRENCY_PATTERN.test(currency) ||
    !Number.isInteger(currencyExponent) ||
    currencyExponent < 0 ||
    currencyExponent > 3
  ) {
    actionRedirect("invalid");
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "billing",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?billingAction=unavailable#admin-billing",
  });

  const { error } = await supabase.rpc("apply_billing_plan_operation", {
    p_code: code,
    p_name: name,
    p_billing_interval: billingInterval,
    p_price_major: priceMajor,
    p_currency: currency,
    p_currency_exponent: currencyExponent,
    p_is_active: formData.get("isActive") === "on",
  });

  if (error) {
    if (error.code === "42501") actionRedirect("forbidden");
    if (error.code === "22023") actionRedirect("invalid");
    actionRedirect("unavailable");
  }

  revalidatePath("/admin");
  actionRedirect("saved");
}
