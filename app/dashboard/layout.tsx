import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import ChartTooltipAutoDismiss from "@/components/charts/ChartTooltipAutoDismiss";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import FinanceDataTransfer from "@/components/data/FinanceDataTransfer";
import ConnectionStatus from "@/components/layout/ConnectionStatus";
import DashboardContentScope from "@/components/layout/DashboardContentScope";
import MobileScrollContactGuard from "@/components/layout/MobileScrollContactGuard";
import NotificationCenter, {
  NotificationCenterLoading,
} from "@/components/layout/NotificationCenter";
import ResponsiveDashboardHeader from "@/components/layout/ResponsiveDashboardHeader";
import UnifiedSearchBehavior from "@/components/layout/UnifiedSearchBehavior";
import DashboardScrollRestoration from "@/components/motion/DashboardScrollRestoration";
import NewUserExperienceGate from "@/components/setup/NewUserExperienceGate";
import TransactionReceiptViewportFit from "@/components/transactions/TransactionReceiptViewportFit";
import DateFormatDisplaySync from "@/components/ui/DateFormatDisplaySync";
import GlobalConfirmDialog from "@/components/ui/global-confirm-dialog";
import {
  BASE_CURRENCY,
  CURRENCY_STORAGE_KEY,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import {
  EMPTY_NEW_USER_EXPERIENCE_STATE,
  loadNewUserExperienceState,
} from "@/lib/new-user-experience";
import type { NotificationState } from "@/lib/notifications";
import { loadDashboardNotifications } from "@/lib/notifications-server";
import { createClient } from "@/lib/supabase/server";

import "./dashboard-performance.css";
import "./desktop-dashboard-layout.css";
import "./portfolio-amount.css";
import "./mobile-dashboard-safety.css";
import "./mobile-scroll-contact-guard.css";
import "./card-actions-polish.css";
import "./top-cards-polish.css";
import "./card-hover-policy.css";
import "./top-cards-responsive-tuning.css";
import "./transactions-responsive-polish.css";
import "./header-search-polish.css";
import "./desktop-header-surface.css";
// Keep the focused overview overrides last so they win only inside their scoped selectors.
import "./overview-top-metrics.css";
import "./metric-sparkline-fix.css";
import "./transaction-modal-viewport.css";
import "./card-borderless-policy.css";
// Dashboard overview typography/icons stay isolated from every nested route.
import "./dashboard-overview-type-icons.css";
// Keep compact portfolio values inside the dashboard investment donut.
import "./investment-donut-value-fit.css";
// Keep route-specific content typography last so it cannot leak into other pages.
import "./content-typography.css";
// Accounts and reports are the final untouched content routes in the type/icon audit.
import "./remaining-content-type-icons.css";
// Transactions typography/icons are scoped to the exact transactions route only.
import "./transactions-type-icons.css";
// Receipt polish stays last so its tightly scoped visual system cannot be muted by shared route styles.
import "./transaction-receipt-premium.css";
// Receipt controls and content stay inside the viewport without changing their data, icons, or colors.
// Keep this directly after the premium receipt layer so the compact viewport rules win.
import "./transaction-receipt-viewport.css";
// Compact header controls and menus stay last; selectors remain mobile/tablet scoped.
import "./mobile-header-detail-polish.css";
// Final mobile control corrections must win over every earlier compact-header rule.
import "./mobile-header-control-fixes.css";
// Goals Progress is the single visual reference for all dashboard card labels.
import "./dashboard-card-label-unify.css";
// Quick-action centering and button-origin form launch are intentionally the final overrides.
import "./quick-actions-launch.css";
// Standalone Lucide icons stay borderless while retaining their authored size and controls.
import "./icon-surface-cleanup.css";
// Reference drawer layout is the final mobile/tablet sidebar authority.
import "./mobile-sidebar-reference.css";
// Profile and notification dropdowns share one responsive, anchored surface.
import "./header-dropdown-responsive.css";
// Desktop navigation icons share one hover, tap and route-activation motion language.
import "./desktop-header-nav-motion.css";
// Mobile/tablet bell uses the same motion language and final theme-safe states.
import "./mobile-notification-bell-motion.css";
// Every primary route except the dashboard overview shares one compact page label.
import "./unified-page-heading.css";
// All content cards and decorative icon wrappers on those routes stay borderless.
import "./non-dashboard-card-borderless.css";
// Exact screenshot-approved hero/title blocks are removed and their space is reclaimed.
import "./cropped-section-removals.css";
// Final finance modal rule: no horizontal divider lines in any form header or footer.
import "./finance-modal-divider-cleanup.css";
// Slightly larger accent-bar labels apply only to routes using the shared heading system.
import "./page-heading-size-tuning.css";
// Compact header button badges stay removed after every earlier header override.
import "./compact-header-icon-only.css";
// Finger-release timing and icon-only compact surfaces are the final mobile authority.
import "./mobile-control-reveal-polish.css";
// Expanded mobile/tablet header search has no underline, border, outline, or focus ring.
import "./mobile-header-search-borderless.css";
// Prevent the drawer's programmatically focused first link from looking active.
import "./mobile-sidebar-focus-state-fix.css";
// Large dashboard currency values must always fit inside compact mobile widths.
import "./mobile-amount-fit.css";
// Final launch design layer is strictly scoped to the requested eight content routes.
import "./final-eight-pages-polish.css";
// Unified reference-style donut design and amount-only hover for every dashboard donut.
import "./donut-reference-system.css";
// Search controls share the approved header interaction without moving nearby actions.
import "./unified-search-controls.css";
// Compact search expands only inside the free header space on mobile and tablet.
import "./mobile-search-inline-stability.css";
// Full-screen finance backup transfer feedback stays isolated and GPU-friendly.
import "./data-transfer-overlay.css";
// Final proximity-style motion layer is presentation-only and must win over the legacy water effect.
import "./data-transfer-airdrop-polish.css";
// Successful imports use a cardless full-screen flash before exposing refreshed data.
import "./data-transfer-flash-override.css";
// Import selection/drop now produces exactly one cardless full-screen effect.
import "./data-transfer-single-import-animation.css";
// Physical left-edge lock stays absolutely last so generic sheet/dialog rules cannot recenter the drawer.
import "./mobile-sidebar-edge-lock.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

async function NotificationCenterSlot({
  statePromise,
}: {
  statePromise: Promise<NotificationState>;
}) {
  const state = await statePromise;

  return <NotificationCenter state={state} />;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, supabase] = await Promise.all([cookies(), createClient()]);
  const storedCurrency = cookieStore.get(CURRENCY_STORAGE_KEY)?.value;
  const storedPreference =
    isSupportedCurrency(storedCurrency) ? storedCurrency : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accountPreference: SupportedCurrency | null = null;
  let newUserExperience = EMPTY_NEW_USER_EXPERIENCE_STATE;

  if (user) {
    const [profileResult, setupState] = await Promise.all([
      supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .maybeSingle(),
      loadNewUserExperienceState(supabase),
    ]);

    if (
      !profileResult.error &&
      isSupportedCurrency(profileResult.data?.preferred_currency)
    ) {
      accountPreference = profileResult.data.preferred_currency;
    }

    newUserExperience = setupState;
  }

  const initialCurrency =
    accountPreference ?? storedPreference ?? BASE_CURRENCY;
  const notificationStatePromise = loadDashboardNotifications();
  const notificationSlot = (
    <Suspense fallback={<NotificationCenterLoading />}>
      <NotificationCenterSlot statePromise={notificationStatePromise} />
    </Suspense>
  );

  return (
    <CurrencyProvider
      initialCurrency={initialCurrency}
      hasStoredPreference={
        accountPreference !== null || storedPreference !== null
      }
    >
      <a className="jf-skip-link" href="#dashboard-main">
        Skip to main content
      </a>
      <div
        data-dashboard-shell
        className="relative flex h-dvh min-w-0 overflow-hidden bg-background text-foreground"
      >
        <div
          aria-hidden="true"
          className="jf-node4-dashboard-ambient pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden="true"
          className="jf-dashboard-grid pointer-events-none absolute inset-0 z-0 opacity-[0.34]"
        />

        <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col overflow-hidden">
          <ResponsiveDashboardHeader notificationSlot={notificationSlot} />
          <ConnectionStatus />
          <DashboardScrollRestoration />
          <MobileScrollContactGuard />
          <TransactionReceiptViewportFit />
          <DateFormatDisplaySync />
          <UnifiedSearchBehavior />
          <FinanceDataTransfer />

          <main
            id="dashboard-main"
            tabIndex={-1}
            aria-label="Finance workspace content"
            data-dashboard-scroll
            className="jf-dashboard-scroll relative flex-1 overflow-y-auto overscroll-contain px-3 pb-[var(--jf-mobile-content-bottom)] pt-[5rem] sm:px-5 sm:pb-[calc(var(--jf-mobile-content-bottom)+0.5rem)] sm:pt-[5.25rem] lg:px-6 lg:pb-10 lg:pt-6 xl:px-7"
          >
            <DashboardContentScope>
              <NewUserExperienceGate state={newUserExperience}>
                {children}
              </NewUserExperienceGate>
            </DashboardContentScope>
          </main>
        </div>
      </div>
      <GlobalConfirmDialog />
      <ChartTooltipAutoDismiss />
    </CurrencyProvider>
  );
}
