import type { NextRequest } from "next/server";

import { POST as postProviderChat } from "../provider-chat/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  return postProviderChat(request);
}
