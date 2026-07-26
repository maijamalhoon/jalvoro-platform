import { NextResponse } from "next/server";

import { getReleaseVersion } from "@/lib/health/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      version: getReleaseVersion(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
