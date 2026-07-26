import { NextRequest, NextResponse } from "next/server";

import {
  buildInsightKey,
  buildSnapshotKey,
  compareWorkspaceSnapshots,
  type WorkspaceInsight,
  type WorkspaceSnapshot,
  type WorkspaceSnapshotInsight,
} from "@/lib/ai-insights/workspace";
import type {
  InsightAttention,
  InsightTopic,
} from "@/lib/ai-insights/actionable";
import { aiServiceFailure } from "@/lib/ai-insights/failure";
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

type SnapshotRow = {
  snapshot_key?: unknown;
  generated_at?: unknown;
  data_through?: unknown;
  quality_score?: unknown;
  insights?: unknown;
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
  if (typeof value !== "string") return new Date().toISOString();
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date().toISOString();
}

function cleanScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : 0;
}

function parseInsight(value: unknown): WorkspaceSnapshotInsight | null {
  if (!isRecord(value)) return null;
  const topic = value.topic;
  const attention = value.attention;
  const title = cleanText(value.title, 160);
  const message = cleanText(value.message, 600);
  const confidence = value.confidence;
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

  const stateKey =
    cleanText(value.stateKey, 180) || `${topic}:${attention}`;
  const insight: WorkspaceInsight = {
    topic: topic as InsightTopic,
    attention: attention as InsightAttention,
    title,
    message,
    confidence:
      confidence === "high" || confidence === "medium" || confidence === "low"
        ? confidence
        : undefined,
    dataThrough,
    stateKey,
  };

  return {
    ...insight,
    insightKey: buildInsightKey(insight),
    stateKey,
  };
}

function parseSnapshot(value: SnapshotRow | null): WorkspaceSnapshot | null {
  if (!value || !Array.isArray(value.insights)) return null;
  const insights = value.insights
    .map(parseInsight)
    .filter((insight): insight is WorkspaceSnapshotInsight => Boolean(insight));

  if (!insights.length) return null;

  return {
    generatedAt: cleanDateTime(value.generated_at),
    dataThrough: cleanDate(value.data_through),
    qualityScore: cleanScore(value.quality_score),
    insights,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body) || !Array.isArray(body.insights)) {
    return json(
      {
        error: "invalid_workspace_snapshot",
        message: "The AI Insights workspace snapshot is invalid.",
      },
      400,
    );
  }

  const insights = body.insights
    .slice(0, 8)
    .map(parseInsight)
    .filter((insight): insight is WorkspaceSnapshotInsight => Boolean(insight));

  if (!insights.length) {
    return json(
      {
        error: "invalid_workspace_snapshot",
        message: "No valid insight signals were provided.",
      },
      400,
    );
  }

  const current: WorkspaceSnapshot = {
    generatedAt: cleanDateTime(body.generatedAt),
    dataThrough: cleanDate(body.dataThrough),
    qualityScore: cleanScore(body.qualityScore),
    insights,
  };
  const snapshotKey = buildSnapshotKey(current);

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before using AI Insights history.",
      },
      401,
    );
  }

  const { data: latestRow, error: latestError } = await supabase
    .from("ai_insight_snapshots")
    .select("snapshot_key, generated_at, data_through, quality_score, insights")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error("AI Insights history read failed", {
      code: latestError.code,
      message: latestError.message,
    });
    return json(aiServiceFailure("ai_history_unavailable"), 503);
  }

  const previous = parseSnapshot(latestRow as SnapshotRow | null);
  const events = compareWorkspaceSnapshots(previous, current);
  const latestKey =
    latestRow && typeof latestRow.snapshot_key === "string"
      ? latestRow.snapshot_key
      : null;

  if (latestKey !== snapshotKey) {
    const { error: insertError } = await supabase
      .from("ai_insight_snapshots")
      .insert({
        user_id: user.id,
        snapshot_key: snapshotKey,
        generated_at: current.generatedAt,
        data_through: current.dataThrough,
        quality_score: current.qualityScore,
        insights: current.insights,
      });

    if (insertError && insertError.code !== "23505") {
      console.error("AI Insights history save failed", {
        code: insertError.code,
        message: insertError.message,
      });
      return json(aiServiceFailure("ai_history_unavailable"), 503);
    }

    const { data: oldRows } = await supabase
      .from("ai_insight_snapshots")
      .select("id")
      .order("created_at", { ascending: false })
      .range(20, 99);
    const oldIds = (oldRows ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => Boolean(id));

    if (oldIds.length) {
      const { error: pruneError } = await supabase
        .from("ai_insight_snapshots")
        .delete()
        .in("id", oldIds);
      if (pruneError) {
        console.error("AI Insights history retention cleanup failed", {
          code: pruneError.code,
        });
      }
    }
  }

  return json({
    available: true,
    snapshotKey,
    events,
    previousGeneratedAt: previous?.generatedAt ?? null,
    generatedAt: current.generatedAt,
  });
}
