"use client";

import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Globe2,
  ListTodo,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import AIInsightsExplainablePanel from "@/components/ai-insights/AIInsightsExplainablePanel";
import AIInsightsGlobalTrustCenter from "@/components/ai-insights/AIInsightsGlobalTrustCenter";
import AIInsightsIntelligenceWorkspace from "@/components/ai-insights/AIInsightsIntelligenceWorkspace";
import { AIInsightsSavedProvider } from "@/components/ai-insights/AIInsightsSavedProvider";
import AISettingsPanel from "@/components/ai-insights/AISettingsPanel";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsActionableCopy } from "@/lib/ai-insights/actionable-copy";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";

export default function AIInsightsGlobalExperience() {
  const { language, option } = useLanguage();
  const copy = getAIInsightsCopy(language);
  const actionableCopy = getAIInsightsActionableCopy(language);

  const capabilities = [
    {
      key: "briefing",
      icon: BrainCircuit,
      label: copy.panel.briefing,
      description: copy.toolbar.description,
    },
    {
      key: "actions",
      icon: ListTodo,
      label: copy.panel.nextMoves,
      description: actionableCopy.description,
    },
    {
      key: "chat",
      icon: MessageSquareText,
      label: copy.panel.askFinances,
      description: copy.panel.askDescription,
    },
    {
      key: "trust",
      icon: ShieldCheck,
      label: copy.trust.title,
      description: copy.trust.description,
    },
  ] as const;

  const financeSignals = [
    { icon: WalletCards, label: copy.summary.cashBalance("—") },
    { icon: TrendingUp, label: copy.summary.savingsRate(0) },
    { icon: ReceiptText, label: copy.summary.payables },
    { icon: Target, label: copy.trust.goals(null) },
  ] as const;

  return (
    <div dir={option.direction} data-ai-command-world>
      <section
        data-ai-insights-command-hero
        aria-labelledby="jalvoro-ai-command-title"
      >
        <div data-ai-command-orbit aria-hidden="true" />
        <div data-ai-command-orbit-secondary aria-hidden="true" />

        <div data-ai-command-copy className="relative z-[1] min-w-0">
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
            className="mt-5 max-w-4xl text-balance text-[clamp(1.8rem,4.4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-text-primary"
          >
            {copy.toolbar.title}
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-text-secondary sm:text-[15px] sm:leading-7">
            {copy.toolbar.description}
          </p>

          <div data-ai-command-status className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3.5 text-[10px] font-bold uppercase tracking-[0.09em] text-success">
              <ShieldCheck size={13} aria-hidden="true" />
              {copy.toolbar.readOnly}
            </span>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border/70 bg-surface/65 px-3.5 text-[10px] font-bold uppercase tracking-[0.09em] text-text-secondary backdrop-blur-xl">
              <Globe2 size={13} className="text-info" aria-hidden="true" />
              {copy.trust.locale}: {option.locale}
            </span>
          </div>

          <div data-ai-hero-actions>
            <a href="#ai-insights-intelligence" className="finance-focus" data-ai-primary-cta>
              <BrainCircuit size={16} aria-hidden="true" />
              <span>{copy.panel.briefing}</span>
              <ArrowDown size={15} aria-hidden="true" />
            </a>
            <a href="#ai-insights-trust" className="finance-focus" data-ai-secondary-cta>
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{copy.trust.title}</span>
            </a>
          </div>
        </div>

        <div data-ai-copilot-preview className="relative z-[1] min-w-0">
          <div data-ai-preview-topbar>
            <div>
              <span data-ai-live-dot aria-hidden="true" />
              <strong>{copy.panel.askFinances}</strong>
            </div>
            <div data-ai-command-settings>
              <AISettingsPanel />
            </div>
          </div>

          <div data-ai-preview-conversation>
            <div data-ai-preview-user-message>
              <MessageSquareText size={14} aria-hidden="true" />
              <p>{copy.starterPrompts[0]}</p>
            </div>

            <div data-ai-preview-response>
              <div data-ai-preview-ai-mark aria-hidden="true">
                <Sparkles size={15} />
              </div>
              <div>
                <p data-ai-preview-response-label>{copy.panel.briefing}</p>
                <p>{copy.panel.askDescription}</p>
                <div data-ai-preview-evidence>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>{copy.metadata.evidence}</span>
                  <span aria-hidden="true">·</span>
                  <span>{copy.metadata.confidence}</span>
                </div>
              </div>
            </div>
          </div>

          <div data-ai-finance-signal-grid>
            {financeSignals.map((signal) => {
              const SignalIcon = signal.icon;
              return (
                <div key={signal.label} data-ai-finance-signal>
                  <SignalIcon size={15} aria-hidden="true" />
                  <span>{signal.label}</span>
                </div>
              );
            })}
          </div>

          <a href="#ai-insights-intelligence" data-ai-preview-open className="finance-focus">
            <span>{copy.panel.askTitle}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>

        <div data-ai-premium-capability-rail aria-label={copy.toolbar.title}>
          {capabilities.map((capability) => {
            const CapabilityIcon = capability.icon;
            return (
              <article key={capability.key} data-ai-premium-capability={capability.key}>
                <span data-ai-premium-capability-icon>
                  <CapabilityIcon size={17} aria-hidden="true" />
                </span>
                <div>
                  <h2>{capability.label}</h2>
                  <p>{capability.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="ai-insights-trust" data-ai-trust-zone>
        <AIInsightsGlobalTrustCenter />
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
    </div>
  );
}
