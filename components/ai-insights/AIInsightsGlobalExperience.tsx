"use client";

import {
  ArrowDown,
  BrainCircuit,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import AIInsightsExplainablePanel from "@/components/ai-insights/AIInsightsExplainablePanel";
import AIInsightsGlobalTrustCenter from "@/components/ai-insights/AIInsightsGlobalTrustCenter";
import AIInsightsIntelligenceWorkspace from "@/components/ai-insights/AIInsightsIntelligenceWorkspace";
import { AIInsightsSavedProvider } from "@/components/ai-insights/AIInsightsSavedProvider";
import AISettingsPanel from "@/components/ai-insights/AISettingsPanel";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";

export default function AIInsightsGlobalExperience() {
  const { language, option } = useLanguage();
  const copy = getAIInsightsCopy(language);

  return (
    <div dir={option.direction} data-ai-command-world>
      <section
        data-ai-insights-command-hero
        aria-labelledby="jalvoro-ai-command-title"
      >
        <div data-ai-command-copy className="min-w-0">
          <p
            data-ai-command-brand
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-active"
          >
            <span className="grid size-7 place-items-center rounded-full bg-active/12">
              <Sparkles size={13} aria-hidden="true" />
            </span>
            JALVORO AI
          </p>

          <h1
            id="jalvoro-ai-command-title"
            className="mt-4 max-w-4xl text-balance font-semibold tracking-[-0.05em] text-text-primary"
          >
            {copy.toolbar.title}
          </h1>

          <p data-ai-command-description className="mt-4 max-w-3xl text-text-secondary">
            {copy.toolbar.description}
          </p>

          <div data-ai-command-status className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 text-success">
              <ShieldCheck size={13} aria-hidden="true" />
              {copy.toolbar.readOnly}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 text-text-secondary">
              <Globe2 size={13} className="text-info" aria-hidden="true" />
              {option.locale}
            </span>
          </div>
        </div>

        <div data-ai-command-controls className="min-w-0">
          <div data-ai-command-settings>
            <AISettingsPanel />
          </div>

          <nav data-ai-command-actions aria-label={copy.toolbar.title}>
            <a href="#ai-insights-intelligence" className="finance-focus group">
              <BrainCircuit size={15} aria-hidden="true" />
              <span>{copy.panel.briefing}</span>
              <ArrowDown size={14} aria-hidden="true" />
            </a>
            <a href="#ai-insights-trust" className="finance-focus">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{copy.trust.title}</span>
            </a>
          </nav>
        </div>
      </section>

      <section
        id="ai-insights-intelligence"
        data-ai-insights-experience
        aria-label={copy.panel.briefing}
        tabIndex={-1}
      >
        <AIInsightsSavedProvider>
          <AIInsightsIntelligenceWorkspace />
          <AIInsightsExplainablePanel />
        </AIInsightsSavedProvider>
      </section>

      <section id="ai-insights-trust" data-ai-trust-zone>
        <AIInsightsGlobalTrustCenter />
      </section>
    </div>
  );
}
