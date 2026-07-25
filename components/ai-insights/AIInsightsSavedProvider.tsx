"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { buildSavedInsightKey } from "@/lib/ai-insights/saved-key";
import { getAIInsightsWorkspaceCopy } from "@/lib/ai-insights/workspace-copy";
import type {
  SavedInsightRecord,
  WorkspaceInsight,
} from "@/lib/ai-insights/workspace";

export type TrackableAIInsight = WorkspaceInsight & {
  generatedAt?: string | null;
};

type SavedContextValue = {
  records: SavedInsightRecord[];
  available: boolean;
  loading: boolean;
  error: string;
  pendingKey: string | null;
  getRecord: (insight: WorkspaceInsight) => SavedInsightRecord | null;
  save: (insight: TrackableAIInsight) => Promise<void>;
  resolve: (insight: TrackableAIInsight) => Promise<void>;
  restore: (insight: TrackableAIInsight) => Promise<void>;
  remove: (insight: WorkspaceInsight) => Promise<void>;
};

const SavedContext = createContext<SavedContextValue | null>(null);

export function AIInsightsSavedProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const copy = getAIInsightsWorkspaceCopy(language).saved;
  const [records, setRecords] = useState<SavedInsightRecord[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai-insights/saved", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        available?: boolean;
        insights?: SavedInsightRecord[];
        message?: string;
      };
      if (!response.ok) throw new Error(body.message ?? copy.unavailable);
      setAvailable(body.available !== false);
      setRecords(Array.isArray(body.insights) ? body.insights : []);
    } catch (loadError) {
      setAvailable(false);
      setError(
        loadError instanceof Error ? loadError.message : copy.unavailable,
      );
    } finally {
      setLoading(false);
    }
  }, [copy.unavailable]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (
      action: "save" | "resolve" | "restore",
      insight: TrackableAIInsight,
    ) => {
      const insightKey = buildSavedInsightKey(insight);
      setPendingKey(insightKey);
      setError("");
      try {
        const response = await fetch("/api/ai-insights/saved", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            insight,
            generatedAt: insight.generatedAt ?? null,
          }),
        });
        const body = (await response.json()) as {
          insight?: SavedInsightRecord;
          message?: string;
        };
        const savedInsight = body.insight;
        if (!response.ok || !savedInsight) {
          throw new Error(body.message ?? copy.unavailable);
        }
        setAvailable(true);
        setRecords((current) => [
          savedInsight,
          ...current.filter(
            (record) => record.insightKey !== savedInsight.insightKey,
          ),
        ]);
      } catch (updateError) {
        setError(
          updateError instanceof Error ? updateError.message : copy.unavailable,
        );
      } finally {
        setPendingKey(null);
      }
    },
    [copy.unavailable],
  );

  const remove = useCallback(
    async (insight: WorkspaceInsight) => {
      const insightKey = buildSavedInsightKey(insight);
      setPendingKey(insightKey);
      setError("");
      try {
        const response = await fetch(
          `/api/ai-insights/saved?insightKey=${encodeURIComponent(insightKey)}`,
          { method: "DELETE" },
        );
        const body = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(body.message ?? copy.unavailable);
        setRecords((current) =>
          current.filter((record) => record.insightKey !== insightKey),
        );
      } catch (removeError) {
        setError(
          removeError instanceof Error ? removeError.message : copy.unavailable,
        );
      } finally {
        setPendingKey(null);
      }
    },
    [copy.unavailable],
  );

  const byKey = useMemo(
    () => new Map(records.map((record) => [record.insightKey, record])),
    [records],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      records,
      available,
      loading,
      error,
      pendingKey,
      getRecord: (insight) =>
        byKey.get(buildSavedInsightKey(insight)) ?? null,
      save: (insight) => update("save", insight),
      resolve: (insight) => update("resolve", insight),
      restore: (insight) => update("restore", insight),
      remove,
    }),
    [available, byKey, error, loading, pendingKey, records, remove, update],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSavedAIInsights() {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error(
      "useSavedAIInsights must be used inside AIInsightsSavedProvider",
    );
  }
  return context;
}

export function AIInsightStateControls({
  insight,
}: {
  insight: TrackableAIInsight;
}) {
  const { language } = useLanguage();
  const copy = getAIInsightsWorkspaceCopy(language).saved;
  const { getRecord, save, resolve, restore, remove, pendingKey, available } =
    useSavedAIInsights();
  const record = getRecord(insight);
  const insightKey = buildSavedInsightKey(insight);
  const pending = pendingKey === insightKey;

  return (
    <div
      data-ai-insight-state-controls
      className="flex min-w-0 flex-wrap items-center gap-1.5"
    >
      {record ? (
        <button
          type="button"
          onClick={() => remove(insight)}
          disabled={pending || !available}
          className="finance-focus inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/65 bg-background/55 px-2.5 text-[10px] font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
          aria-label={copy.remove}
        >
          <Trash2 size={12} aria-hidden="true" />
          {copy.remove}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => save(insight)}
          disabled={pending || !available}
          className="finance-focus inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/65 bg-background/55 px-2.5 text-[10px] font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
          aria-label={copy.save}
        >
          {pending ? (
            <BookmarkCheck size={12} aria-hidden="true" />
          ) : (
            <Bookmark size={12} aria-hidden="true" />
          )}
          {pending ? copy.saving : copy.save}
        </button>
      )}

      {record?.status === "resolved" ? (
        <button
          type="button"
          onClick={() => restore(insight)}
          disabled={pending || !available}
          className="finance-focus inline-flex min-h-8 items-center gap-1.5 rounded-full bg-info/10 px-2.5 text-[10px] font-semibold text-info transition-colors hover:bg-info/15 disabled:opacity-50"
        >
          <RotateCcw size={12} aria-hidden="true" />
          {copy.restore}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => resolve(insight)}
          disabled={pending || !available}
          className="finance-focus inline-flex min-h-8 items-center gap-1.5 rounded-full bg-success/10 px-2.5 text-[10px] font-semibold text-success transition-colors hover:bg-success/15 disabled:opacity-50"
        >
          <CheckCircle2 size={12} aria-hidden="true" />
          {copy.resolve}
        </button>
      )}
    </div>
  );
}
