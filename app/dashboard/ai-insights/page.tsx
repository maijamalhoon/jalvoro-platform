import AIConsentGate from "@/components/ai-insights/AIConsentGate";
import AIInsightsGlobalExperience from "@/components/ai-insights/AIInsightsGlobalExperience";
import AIInsightsOnboarding from "@/components/ai-insights/AIInsightsOnboarding";

import "./ai-insights-experience.css";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div data-ai-insights-page className="w-full min-w-0 pb-8">
      <AIConsentGate>
        <AIInsightsOnboarding />
        <AIInsightsGlobalExperience />
      </AIConsentGate>
    </div>
  );
}
