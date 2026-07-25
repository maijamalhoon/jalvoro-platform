"use client";

import { BrainCircuit, ShieldCheck } from "lucide-react";

import AIInsightsExplainablePanel from "@/components/ai-insights/AIInsightsExplainablePanel";
import AIInsightsGlobalTrustCenter from "@/components/ai-insights/AIInsightsGlobalTrustCenter";
import AISettingsPanel from "@/components/ai-insights/AISettingsPanel";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";

export default function AIInsightsGlobalExperience() {
  const { language, option } = useLanguage();
  const copy = getAIInsightsCopy(language);

  return (
    <div dir={option.direction}>
      <section
        data-ai-insights-toolbar
        className="mb-5 flex min-w-0 flex-col gap-4 rounded-[24px] bg-surface px-4 py-4 shadow-[var(--shadow-card)] sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-active/10 text-active">
            <BrainCircuit size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-text-primary">
              {copy.toolbar.title}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-text-secondary">
              {copy.toolbar.description}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-info">
              <ShieldCheck size={13} aria-hidden="true" />
              {copy.toolbar.readOnly}
            </p>
          </div>
        </div>
        <AISettingsPanel />
      </section>

      <AIInsightsGlobalTrustCenter />

      <div data-ai-insights-experience>
        <AIInsightsExplainablePanel />
      </div>
    </div>
  );
}
