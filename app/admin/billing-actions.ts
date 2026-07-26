"use server";

import { redirect } from "next/navigation";

export async function saveBillingPlan(formData: FormData) {
  void formData;
  redirect("/admin?billingAction=out-of-scope#admin-release");
}
