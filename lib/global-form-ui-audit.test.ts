import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const auditAuthority = read("../components/forms/GlobalFormAuditAuthority.tsx");
const dialogAuthority = read("../components/forms/GlobalFormDialogAuthority.tsx");
const fieldAuthority = read("../components/forms/GlobalFormFieldAuthority.tsx");
const actionAuthority = read("../components/forms/GlobalFormActionAuthority.tsx");
const pwaRegister = read("../app/pwa-register.tsx");
const authControls = read("../components/auth/AuthControls.tsx");
const loginPage = read("../app/login/page.tsx");
const onboardingPage = read("../app/onboarding/page.tsx");
const resetPasswordPage = read("../app/reset-password/page.tsx");
const profileCustomization = read(
  "../components/settings/ProfileCustomizationSection.tsx",
);
const settingsPreferences = read(
  "../components/settings/SettingsPreferencesSection.tsx",
);
const settingsReference = read(
  "../components/settings/SettingsReferenceSections.tsx",
);
const categoryManagement = read(
  "../components/settings/CategoryManagementExperience.tsx",
);

describe("site-wide form UI audit authority", () => {
  it("mounts one field, action, modal and viewport authority on every route", () => {
    expect(pwaRegister).toContain("GlobalFormAuditAuthority");
    expect(pwaRegister).toContain("GlobalFormDialogAuthority");
    expect(pwaRegister).toContain("GlobalFormFieldAuthority");
    expect(pwaRegister).toContain("GlobalFormActionAuthority");
    expect(pwaRegister).toContain("<GlobalFormAuditAuthority />");
    expect(pwaRegister).toContain("<GlobalFormDialogAuthority />");
    expect(pwaRegister).toContain("<GlobalFormFieldAuthority />");
    expect(pwaRegister).toContain("<GlobalFormActionAuthority />");
  });

  it("centers every rendered dialog against the real visible viewport", () => {
    expect(dialogAuthority).toContain("window.visualViewport");
    expect(dialogAuthority).toContain("viewport?.offsetLeft");
    expect(dialogAuthority).toContain("viewport?.offsetTop");
    expect(dialogAuthority).toContain('"translate3d(-50%, -50%, 0)"');
    expect(dialogAuthority).toContain('viewport?.addEventListener("resize"');
    expect(dialogAuthority).toContain('viewport?.addEventListener("scroll"');
    expect(dialogAuthority).toContain("data-jf-global-centered-dialog");
  });

  it("locks the full-height baseline while the mobile keyboard animates", () => {
    expect(dialogAuthority).toContain(
      "let stableViewportMetrics: ViewportMetrics | null = null",
    );
    expect(dialogAuthority).toContain(
      "if (!hasFocusedEntry) stableViewportMetrics = getViewportMetrics()",
    );
    expect(dialogAuthority).toContain("if (activeEntry) return");
    expect(dialogAuthority).toContain(
      "Math.min(baseline.screenTop, metrics.height * 0.08)",
    );
    expect(dialogAuthority).toContain(
      `html body [\${KEYBOARD_ATTRIBUTE}="true"] .finance-modal-body`,
    );
    expect(dialogAuthority).toContain("overflow-y: auto !important");
  });

  it("uses one normal modal width and content-driven height", () => {
    expect(auditAuthority).toContain("--jf-global-form-modal-width: 36rem");
    expect(auditAuthority).toContain("--jf-global-form-wide-modal-width: 46rem");
    expect(auditAuthority).toContain("height: max-content !important");
    expect(auditAuthority).toContain("flex: 0 1 auto !important");
    expect(auditAuthority).toContain("overflow-y: auto !important");
  });

  it("uses the exact same height token for fields and form actions", () => {
    expect(auditAuthority).toContain("--jf-global-form-control-height: clamp(");
    expect(auditAuthority).toContain(
      "--jf-global-final-action-height: var(--jf-global-form-control-height)",
    );
    expect(auditAuthority).toContain(
      "--jf-global-form-action-height: var(--jf-global-form-control-height)",
    );
    expect(auditAuthority).toContain("width: 100% !important");
  });

  it("keeps final actions narrower, centered and more rounded", () => {
    expect(dialogAuthority).toContain("--jf-global-final-action-width: 88%");
    expect(dialogAuthority).toContain("--jf-global-final-action-max-width: 28rem");
    expect(dialogAuthority).toContain("--jf-global-final-action-radius: 1.3rem");
    expect(dialogAuthority).toContain("margin-inline: auto !important");
    expect(dialogAuthority).toContain("justify-self: center !important");
  });

  it("covers native, auth, date, account, category and wheel controls", () => {
    for (const selector of [
      "input:not",
      "textarea",
      "select",
      ".auth-field-control",
      ".auth-input",
      ".finance-account-select",
      '[data-slot="select-trigger"]',
      '[role="combobox"]',
      '[role="listbox"][aria-roledescription="scroll picker"]',
      '[role="spinbutton"][aria-haspopup="dialog"]',
    ]) {
      expect(fieldAuthority).toContain(selector);
    }
    expect(fieldAuthority).toContain('[role="radiogroup"], [role="group"]');
    expect(fieldAuthority).toContain("isManagedChoiceGroup");
    expect(fieldAuthority).not.toContain(':has(> button[aria-pressed])');
  });

  it("keeps authored button and loading copy instead of generated pseudo labels", () => {
    expect(auditAuthority).toContain(
      'button[data-jf-form-action="true"]::after',
    );
    expect(auditAuthority).toContain("content: none !important");
    expect(auditAuthority).toContain(
      'button[data-jf-form-action="true"] > *',
    );
    expect(auditAuthority).toContain("display: grid !important");
    expect(actionAuthority).not.toContain("shortActionLabel");
    expect(actionAuthority).not.toContain("jfFormActionLabel =");
    expect(actionAuthority).toContain("clearLegacyGeneratedPresentation");
  });

  it("marks only real final, submit, security and confirmation actions", () => {
    expect(actionAuthority).toContain("finance-modal-footer");
    expect(actionAuthority).toContain('button.type === "submit"');
    expect(actionAuthority).toContain("settings-security-panel");
    expect(actionAuthority).toContain("isConfirmationDialog(root)");
    expect(actionAuthority).toContain('/^(back|view|max|swap)\\b/i');
  });

  it("keeps Settings actions equal while changing only semantic colors", () => {
    for (const marker of [
      "#settings-currency-select",
      "#settings-date-format-select",
      "#settings-reference-display-name",
      "#custom-profile-name",
      ".settings-security-panel",
    ]) {
      expect(auditAuthority).toContain(marker);
    }
    expect(auditAuthority).toContain("background: var(--investment) !important");
    expect(auditAuthority).toContain("background: var(--info) !important");
    expect(auditAuthority).toContain("background: var(--warning) !important");
    expect(auditAuthority).toContain("background: var(--danger) !important");
  });

  it("preserves auth labels and colors while keeping actions equal and iconless", () => {
    expect(auditAuthority).toContain(".auth-primary-action");
    expect(auditAuthority).toContain(".jf-auth-card button.w-full");
    expect(auditAuthority).toContain("display: none !important");
    expect(authControls).toContain("auth-primary-action w-full");
    expect(loginPage).toContain("Continue");
    expect(loginPage).toContain("Log in");
    expect(loginPage).toContain("Create account");
    expect(resetPasswordPage).toContain("Update password");
    expect(onboardingPage).toContain("Open dashboard");
  });

  it("keeps onboarding segmented account type inside the shared field footprint", () => {
    expect(onboardingPage).toContain('role="group" aria-label="Account type"');
    expect(onboardingPage).toContain("aria-pressed={selected}");
    expect(fieldAuthority).toContain('[role="group"]');
  });

  it("covers all Settings form families and their real actions", () => {
    expect(profileCustomization).toContain("Choose Photo");
    expect(profileCustomization).toContain("Save Profile");
    expect(settingsPreferences).toContain("settings-currency-select");
    expect(settingsPreferences).toContain("settings-date-format-select");
    expect(settingsReference).toContain("Send verification code");
    expect(settingsReference).toContain("Resend code");
    expect(settingsReference).toContain("Sign out other devices");
    expect(categoryManagement).toContain("Create Category");
    expect(categoryManagement).toContain("Delete");
  });
});
