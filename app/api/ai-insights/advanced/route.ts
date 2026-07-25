import type { NextRequest } from "next/server";

import { POST as postExactFinanceQuestion } from "../exact/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return postExactFinanceQuestion(request);
}
