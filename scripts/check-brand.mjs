import { readFile } from "node:fs/promises";

const filesThatMustUseTheBrandSystem = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/manifest.ts",
  "app/opengraph-image.tsx",
  "app/login/layout.tsx",
  "app/pwa-register.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "components/auth/AuthShell.tsx",
  "components/landing/PremiumLandingPage.tsx",
  "components/pwa/AppUpdateManager.tsx",
  "components/pwa/WindowsAppManager.tsx",
  "app/business/page.tsx",
  "app/disclosures/page.tsx",
  "app/onboarding/page.tsx",
  "app/support/page.tsx",
  "app/dashboard/transactions/[id]/page.tsx",
  "components/ai-insights/AIConsentGate.tsx",
  "components/ai-insights/AIInsightsOnboarding.tsx",
  "components/data/FinanceDataTransfer.tsx",
  "components/layout/JamalMenu.tsx",
  "components/layout/MobileNav.tsx",
  "components/legal/LegalPageShell.tsx",
  "components/pwa/AndroidAppManager.tsx",
  "components/settings/ProfileCustomizationSection.tsx",
  "components/settings/SettingsDataTransferSection.tsx",
  "components/settings/SettingsOneUI.tsx",
  "components/settings/SettingsPreferencesSection.tsx",
  "components/settings/SettingsReferenceSections.tsx",
  "components/settings/SignOutButton.tsx",
  "lib/constants.ts",
];

const generatedPublicFiles = [
  "public/manifest.json",
  "public/offline.html",
  "public/icons/icon.svg",
  "public/readme/jalvoro-platform-hero.svg",
];

const forbiddenPatterns = [
  /Jamal(?:'|’|&apos;|&#x27;)s Finance/i,
  /Jamals Finance/i,
];
const failures = [];

for (const file of [...filesThatMustUseTheBrandSystem, ...generatedPublicFiles]) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  if (forbiddenPatterns.some((pattern) => pattern.test(source))) {
    failures.push(`${file} still contains legacy public brand copy.`);
  }
}

const config = JSON.parse(
  await readFile(new URL("../brand/brand.config.json", import.meta.url), "utf8"),
);

const requiredValues = {
  name: "JALVORO",
  tagline: "Everything you run. One place.",
  internalId: "jf-platform",
};

for (const [key, expected] of Object.entries(requiredValues)) {
  if (config[key] !== expected) {
    failures.push(`brand/brand.config.json must set ${key} to ${expected}.`);
  }
}

if (failures.length) {
  console.error("Brand system check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Brand system check passed.");
