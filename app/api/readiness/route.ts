import { NextResponse } from "next/server";

import {
  checkDataLayerReadiness,
  getReleaseVersion,
} from "@/lib/health/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const dataLayerReady = await checkDataLayerReadiness();

  return NextResponse.json(
    {
      checks: {
        application: "ok",
        dataLayer: dataLayerReady ? "ok" : "unavailable",
      },
      status: dataLayerReady ? "ready" : "unavailable",
      version: getReleaseVersion(),
    },
    {
      status: dataLayerReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
