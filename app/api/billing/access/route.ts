import { NextResponse } from "next/server";

import { getBillingAccess } from "@/lib/billing/server-access";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId");
  const enterpriseGroupId = url.searchParams.get("enterpriseGroupId");

  if (businessId && enterpriseGroupId) {
    return NextResponse.json(
      { error: "Choose either a business or enterprise billing scope." },
      { status: 400 },
    );
  }

  if (businessId && !UUID_PATTERN.test(businessId)) {
    return NextResponse.json({ error: "Invalid business ID." }, { status: 400 });
  }

  if (enterpriseGroupId && !UUID_PATTERN.test(enterpriseGroupId)) {
    return NextResponse.json(
      { error: "Invalid enterprise group ID." },
      { status: 400 },
    );
  }

  const access = await getBillingAccess(
    businessId
      ? { kind: "business", businessId }
      : enterpriseGroupId
        ? { kind: "enterprise", enterpriseGroupId }
        : { kind: "personal" },
  );

  if (access.state === "unauthenticated") {
    return NextResponse.json(access, { status: 401 });
  }

  if (access.state === "unavailable") {
    return NextResponse.json(access, { status: 503 });
  }

  return NextResponse.json(access, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
