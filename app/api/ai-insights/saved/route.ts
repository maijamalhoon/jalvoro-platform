import { NextRequest, NextResponse } from "next/server";

import { buildSavedInsightKey } from "@/lib/ai-insights/saved-key";
import type { WorkspaceInsight } from "@/lib/ai-insights/workspace";
import type {
  InsightAttention,
  InsightTopic,
} from "@/lib/ai-insights/actionable";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TOPICS = new Set<InsightTopic>([
  "cash-flow",
  "spending",
  "goals",
  "payables",
  "overview",
]);
const ATTENTIONS = new Set<InsightAttention>([
  "act-now",
  "watch-closely",
  "doing-well",
]);
const ACTIONS = new Set(["save", "resolve", "restore"] as const);

type SavedAction = "save" | "resolve" | "restore";

type SavedRow = {
  insight_key?: unknown;
  topic?: unknown;
  title?: unknown;
  message?: unknown;
  status?: unknown;
  source_generated_at?: unknown;
  data_through?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function cleanDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function cleanDateTime(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function parseInsight(value: unknown): WorkspaceInsight | null {
  if (!isRecord(value)) return null;
  const topic = value.topic;
  const attention = value.attention;
  const title = cleanText(value.title, 160);
  const message = cleanText(value.message, 600);
  const dataThrough = cleanDate(value.dataThrough);

  if (
    typeof topic !== "string" ||
    !TOPICS.has(topic as InsightTopic) ||
    typeof attention !== "string" ||
    !ATTENTIONS.has(attention as InsightAttention) ||
    !title ||
    !message
  ) {
    return null;
  }

  return {
    topic: topic as InsightTopic,
    attention: attention as InsightAttention,
    title,
    message,
    confidence:
      value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low"
        ? value.confidence
        : undefined,
    dataThrough,
    stateKey:
      cleanText(value.stateKey, 180) || `${topic}:${attention}`,
  };
}

function mapRow(row: SavedRow) {
  return {
    insightKey: typeof row.insight_key === "string" ? row.insight_key : "",
    topic: typeof row.topic === "string" ? row.topic : "overview",
    title: typeof row.title === "string" ? row.title : "",
    message: typeof row.message === "string" ? row.message : "",
    status: row.status === "resolved" ? "resolved" : "saved",
    sourceGeneratedAt:
      typeof row.source_generated_at === "string"
        ? row.source_generated_at
        : null,
    dataThrough:
      typeof row.data_through === "string" ? row.data_through : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before loading saved AI insights.",
      },
      401,
    );
  }

  const { data, error } = await supabase
    .from("ai_saved_insights")
    .select(
      "insight_key, topic, title, message, status, source_generated_at, data_through, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Saved AI Insights read failed", {
      code: error.code,
      message: error.message,
    });
    return json({ available: false, insights: [] });
  }

  return json({
    available: true,
    insights: (data ?? []).map((row) => mapRow(row as SavedRow)),
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return json(
      {
        error: "invalid_saved_insight",
        message: "The saved insight is invalid.",
      },
      400,
    );
  }

  const action = body.action;
  const insight = parseInsight(body.insight);
  if (
    typeof action !== "string" ||
    !ACTIONS.has(action as SavedAction) ||
    !insight
  ) {
    return json(
      {
        error: "invalid_saved_insight",
        message: "The saved insight is invalid.",
      },
      400,
    );
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before saving AI insights.",
      },
      401,
    );
  }

  const insightKey = buildSavedInsightKey(insight);
  const status = action === "resolve" ? "resolved" : "saved";
  const { data, error } = await supabase
    .from("ai_saved_insights")
    .upsert(
      {
        user_id: user.id,
        insight_key: insightKey,
        topic: insight.topic,
        title: insight.title,
        message: insight.message,
        status,
        source_generated_at: cleanDateTime(body.generatedAt),
        data_through: insight.dataThrough ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,insight_key" },
    )
    .select(
      "insight_key, topic, title, message, status, source_generated_at, data_through, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("Saved AI Insights write failed", {
      code: error.code,
      message: error.message,
    });
    return json(
      {
        error: "saved_insights_unavailable",
        message: "This insight could not be saved. Please try again.",
      },
      503,
    );
  }

  return json({ saved: true, insight: mapRow(data as SavedRow) });
}

export async function DELETE(request: NextRequest) {
  const insightKey = cleanText(
    request.nextUrl.searchParams.get("insightKey"),
    120,
  );
  if (!insightKey) {
    return json(
      {
        error: "invalid_saved_insight",
        message: "The saved insight key is missing.",
      },
      400,
    );
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before removing saved AI insights.",
      },
      401,
    );
  }

  const { error } = await supabase
    .from("ai_saved_insights")
    .delete()
    .eq("user_id", user.id)
    .eq("insight_key", insightKey);

  if (error) {
    console.error("Saved AI Insights delete failed", {
      code: error.code,
      message: error.message,
    });
    return json(
      {
        error: "saved_insights_unavailable",
        message: "This saved insight could not be removed.",
      },
      503,
    );
  }

  return json({ removed: true, insightKey });
}
