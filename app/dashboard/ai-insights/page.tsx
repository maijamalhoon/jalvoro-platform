import { BrainCircuit, ShieldCheck } from "lucide-react";

import AIConsentGate from "@/components/ai-insights/AIConsentGate";
import AIInsightsOnboarding from "@/components/ai-insights/AIInsightsOnboarding";
import AISettingsPanel from "@/components/ai-insights/AISettingsPanel";
import InsightsPanel from "@/components/ai-insights/InsightsPanel";

import "./ai-insights-experience.css";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div data-ai-insights-page className="w-full min-w-0 pb-8">
      <AIConsentGate>
        <AIInsightsOnboarding />

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
                Personalized finance intelligence
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-text-secondary">
                Review the strongest signals first, then move from insight to a
                clear next action.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-info">
                <ShieldCheck size={13} aria-hidden="true" />
                Read-only analysis
              </p>
            </div>
          </div>
          <AISettingsPanel />
        </section>

        <div data-ai-insights-experience>
          <InsightsPanel />
        </div>
      </AIConsentGate>
    </div>
  );
}
