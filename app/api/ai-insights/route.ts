import type { NextRequest } from "next/server";

import { POST as postAdvancedFinanceQuestion } from "./advanced/route";
import { GET as getFinanceOverview } from "./overview/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getFinanceOverview(request);
}

export async function POST(request: NextRequest) {
  return postAdvancedFinanceQuestion(request);
}
