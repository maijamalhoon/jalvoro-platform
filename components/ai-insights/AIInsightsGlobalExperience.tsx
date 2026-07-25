"use client";

import {
  ArrowDown,
  BrainCircuit,
  Globe2,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import AIInsightsExplainablePanel from "@/components/ai-insights/AIInsightsExplainablePanel";
import AIInsightsGlobalTrustCenter from "@/components/ai-insights/AIInsightsGlobalTrustCenter";
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
      icon: ListChecks,
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

          <div
            data-ai-command-status
            className="mt-6 flex flex-wrap items-center gap-2.5"
          >
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3.5 text-[10px] font-bold uppercase tracking-[0.09em] text-success">
              <ShieldCheck size={13} aria-hidden="true" />
              {copy.toolbar.readOnly}
            </span>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border/70 bg-surface/65 px-3.5 text-[10px] font-bold uppercase tracking-[0.09em] text-text-secondary backdrop-blur-xl">
              <Globe2 size={13} className="text-info" aria-hidden="true" />
              {copy.trust.locale}: {option.locale}
            </span>
          </div>
        </div>

        <div
          data-ai-command-controls
          className="relative z-[1] flex min-w-0 flex-col justify-between gap-6 lg:items-end"
        >
          <div data-ai-command-settings className="w-full">
            <AISettingsPanel />
          </div>

          <div className="w-full">
            <div
              data-ai-command-actions
              className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
            >
              <a
                href="#ai-insights-intelligence"
                className="finance-focus group inline-flex min-h-12 items-center justify-between gap-3 rounded-[18px] bg-active px-4 text-xs font-semibold text-text-inverse shadow-[0_14px_34px_color-mix(in_srgb,var(--active)_24%,transparent)] transition-transform hover:-translate-y-0.5"
              >
                <span className="inline-flex items-center gap-2">
                  <BrainCircuit size={15} aria-hidden="true" />
                  {copy.panel.briefing}
                </span>
                <ArrowDown
                  size={14}
                  className="transition-transform group-hover:translate-y-0.5"
                  aria-hidden="true"
                />
              </a>

              <a
                href="#ai-insights-trust"
                className="finance-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-border/75 bg-surface/72 px-4 text-xs font-semibold text-text-primary backdrop-blur-xl transition-colors hover:bg-hover"
              >
                <ShieldCheck size={15} className="text-info" aria-hidden="true" />
                {copy.trust.title}
              </a>
            </div>

            <p className="mt-3 text-[10px] leading-4 text-text-muted lg:text-end">
              {copy.trust.informational}
            </p>
          </div>
        </div>

        <div data-ai-premium-capability-rail aria-label={copy.toolbar.title}>
          {capabilities.map((capability) => {
            const CapabilityIcon = capability.icon;
            return (
              <article
                key={capability.key}
                data-ai-premium-capability={capability.key}
              >
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
        <AIInsightsExplainablePanel />
      </section>
    </div>
  );
}
