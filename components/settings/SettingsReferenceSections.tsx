"use client";

import { APP_NAME } from "@/lib/brand";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Monitor,
  Moon,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import { Button } from "@/components/ui/button";
import { checkPasswordProtection } from "@/lib/auth/password-protection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { Input } from "@/components/ui/input";
import {
  buildSettingsSnapshot,
  mapAuthError,
  validatePasswordChange,
  validateProfileName,
} from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";
import {
  applyThemePreference,
  getStoredThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

export type SettingsReferenceStats = {
  accounts: number | null;
  transactions: number | null;
  goals: number | null;
  investments: number | null;
};

type DateFormat = "MMM d, yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";

type SectionHeadingProps = {
  icon: ReactNode;
  children: ReactNode;
};

type ReferenceRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  value?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: ReactNode;
}> = [
  { value: "system", label: "System", icon: <Monitor size={18} /> },
  { value: "light", label: "Light", icon: <Sun size={18} /> },
  { value: "dark", label: "Dark", icon: <Moon size={18} /> },
];

function SectionHeading({ icon, children }: SectionHeadingProps) {
  return (
    <h2 className="settings-reference-section-heading">
      <span aria-hidden="true">{icon}</span>
      {children}
    </h2>
  );
}

function ReferenceRow({
  icon,
  title,
  description,
  value,
  onClick,
  disabled = false,
}: ReferenceRowProps) {
  const content = (
    <>
      <span className="settings-reference-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-reference-row-copy">
        <span className="settings-reference-row-title">{title}</span>
        <span className="settings-reference-row-description">{description}</span>
      </span>
      {value ? <span className="settings-reference-row-value">{value}</span> : null}
      {onClick ? (
        <ChevronRight
          size={18}
          strokeWidth={2.35}
          className="settings-reference-row-chevron"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  if (!onClick) {
    return <div className="settings-reference-row">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="finance-focus settings-reference-row settings-reference-row-button"
    >
      {content}
    </button>
  );
}

export function SettingsAppearanceSection() {
  const [themeMode, setThemeMode] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredThemePreference();
    setThemeMode(stored);
    setResolvedTheme(applyThemePreference(stored, { persist: false }));
    setReady(true);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      const stored = getStoredThemePreference();
      setThemeMode(stored);
      setResolvedTheme(applyThemePreference(stored, { persist: false }));
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!ready || themeMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () =>
      setResolvedTheme(applyThemePreference("system", { persist: false }));
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [ready, themeMode]);

  function chooseTheme(nextTheme: ThemePreference) {
    setThemeMode(nextTheme);
    setResolvedTheme(applyThemePreference(nextTheme));
    toast.success(
      nextTheme === "system"
        ? "Theme now follows your system."
        : `${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.`,
    );
  }

  function handleThemeKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;
    const lastIndex = THEME_OPTIONS.length - 1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    chooseTheme(THEME_OPTIONS[nextIndex].value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  }

  return (
    <section className="settings-reference-section settings-reference-appearance">
      <SectionHeading icon={<Sun size={19} strokeWidth={2.35} />}>
        Appearance
      </SectionHeading>
      <div
        className="settings-reference-appearance-control"
        role="radiogroup"
        aria-label="Theme preference"
        data-resolved-theme={resolvedTheme}
      >
        {THEME_OPTIONS.map((option, index) => {
          const active = themeMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => chooseTheme(option.value)}
              onKeyDown={(event) => handleThemeKeyDown(event, index)}
              className={`finance-focus settings-reference-theme-option ${
                active ? "is-active" : ""
              }`}
            >
              <span className="settings-reference-theme-icon" aria-hidden="true">
                {option.icon}
              </span>
              <span>{option.label}</span>
              {active ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProfileDetailsDialog({ email, displayName }: { email: string; displayName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const fallbackName =
    displayName.trim() || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal";
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState(fallbackName);
  const [draftName, setDraftName] = useState(fallbackName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextName =
      displayName.trim() || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal";
    setProfileName(nextName);
    setDraftName(nextName);
  }, [displayName, email]);

  useEffect(() => {
    function handleProfileUpdate(event: Event) {
      const detail = (event as CustomEvent<{ displayName?: string }>).detail;
      if (!detail?.displayName) return;
      setProfileName(detail.displayName);
      setDraftName(detail.displayName);
    }

    window.addEventListener("jamal-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("jamal-profile-updated", handleProfileUpdate);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validation = validateProfileName(draftName);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    const name = validation.value;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, name },
    });
    setSaving(false);

    if (error) {
      toast.error(mapAuthError(error, "Could not update your profile. Please try again."));
      return;
    }

    setProfileName(name);
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("jamal-profile-updated", {
        detail: { displayName: name },
      }),
    );
    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && setOpen(nextOpen)}>
      <ReferenceRow
        icon={<UserRound size={21} strokeWidth={2.35} />}
        title="Profile Details"
        description="Name, email and personal information"
        onClick={() => {
          setDraftName(profileName);
          setOpen(true);
        }}
      />
      <DialogContent className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem]`}>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <FinanceModalHeader
            title="Profile Details"
            description={`Update the name shown across ${APP_NAME}.`}
            icon={UserRound}
            tone="info"
          />
          <FinanceModalBody>
            <FinanceFormField label="Display name" htmlFor="settings-reference-display-name">
              <Input
                id="settings-reference-display-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                autoComplete="name"
                placeholder="Your display name"
                disabled={saving}
              />
            </FinanceFormField>
            <FinanceFormField
              label="Email"
              htmlFor="settings-reference-email"
              hint="Your authenticated sign-in email is read-only here."
            >
              <Input
                id="settings-reference-email"
                value={email}
                autoComplete="email"
                disabled
              />
            </FinanceFormField>
            <Button type="submit" size="lg" disabled={saving} className="w-full">
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </FinanceModalBody>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountSecurityDialog({ email }: { email: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [confirmOtherSignOut, setConfirmOtherSignOut] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);

  function resetState() {
    setStage("request");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
    setPasswordFeedback(null);
    setSessionFeedback(null);
    setConfirmOtherSignOut(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (isSendingCode || isUpdatingPassword || isSigningOutOthers)) return;
    setOpen(nextOpen);
    if (!nextOpen) resetState();
  }

  async function sendVerificationCode() {
    if (isSendingCode) return;
    setIsSendingCode(true);
    setPasswordFeedback(null);
    const { error } = await supabase.auth.reauthenticate();
    setIsSendingCode(false);

    if (error) {
      setPasswordFeedback({
        tone: "error",
        message: mapAuthError(error, "Could not send a verification code. Please try again."),
      });
      return;
    }

    setStage("verify");
    setPasswordFeedback({
      tone: "success",
      message: "Verification code sent. Check your configured email or phone.",
    });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUpdatingPassword) return;

    const validation = validatePasswordChange({
      verificationCode,
      newPassword,
      confirmPassword,
    });
    if (!validation.ok) {
      setPasswordFeedback({ tone: "error", message: validation.error });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordFeedback(null);

    const passwordProtection = await checkPasswordProtection(
      validation.value.newPassword,
    );
    if (!passwordProtection.ok) {
      setIsUpdatingPassword(false);
      setPasswordFeedback({
        tone: "error",
        message: passwordProtection.error,
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: validation.value.newPassword,
      nonce: validation.value.verificationCode,
    });

    if (error) {
      setIsUpdatingPassword(false);
      setPasswordFeedback({
        tone: "error",
        message: mapAuthError(
          error,
          "Could not update your password. Check the code and try again.",
        ),
      });
      return;
    }

    const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
    setIsUpdatingPassword(false);
    resetState();

    if (revokeError) {
      toast.warning(
        "Password updated, but other sessions could not be revoked. Your current device remains signed in.",
      );
      return;
    }

    toast.success("Password updated and other devices signed out.");
  }

  async function signOutOtherDevices() {
    if (isSigningOutOthers) return;
    setIsSigningOutOthers(true);
    setSessionFeedback(null);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setIsSigningOutOthers(false);

    if (error) {
      setSessionFeedback(
        mapAuthError(error, "Could not sign out other devices. Please try again."),
      );
      return;
    }

    setConfirmOtherSignOut(false);
    setSessionFeedback("Other devices have been signed out.");
    toast.success("Other devices signed out. This device remains signed in.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ReferenceRow
        icon={<ShieldCheck size={21} strokeWidth={2.35} />}
        title="Account Security"
        description="Password and authentication"
        onClick={() => setOpen(true)}
      />
      <DialogContent className={`${financeModalContentClass} sm:[--finance-modal-max-width:34rem]`}>
        <FinanceModalHeader
          title="Account Security"
          description={`Protect ${email || "this profile"} with password and authentication controls.`}
          icon={LockKeyhole}
          tone="info"
        />
        <FinanceModalBody className="space-y-4">
          <section className="settings-security-panel">
            <div className="settings-security-panel-heading">
              <span className="settings-security-panel-icon">
                <KeyRound size={20} strokeWidth={2.35} />
              </span>
              <span>
                <strong>Update Password</strong>
                <small>Verify your identity before choosing a new password.</small>
              </span>
            </div>

            {stage === "request" ? (
              <Button
                type="button"
                onClick={sendVerificationCode}
                disabled={isSendingCode}
                className="w-full"
                size="lg"
              >
                {isSendingCode ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSendingCode ? "Sending..." : "Send verification code"}
              </Button>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <FinanceFormField label="Verification code" htmlFor="security-verification-code">
                  <Input
                    id="security-verification-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter verification code"
                  />
                </FinanceFormField>
                <FinanceFormField label="New password" htmlFor="security-new-password">
                  <div className="relative">
                    <Input
                      id="security-new-password"
                      type={showPasswords ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 12 characters"
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((visible) => !visible)}
                      className="finance-focus absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-text-secondary hover:bg-hover"
                      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FinanceFormField>
                <FinanceFormField
                  label="Confirm new password"
                  htmlFor="security-confirm-password"
                >
                  <Input
                    id="security-confirm-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat new password"
                  />
                </FinanceFormField>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendVerificationCode}
                    disabled={isSendingCode || isUpdatingPassword}
                  >
                    {isSendingCode ? "Resending..." : "Resend code"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword || isSendingCode}
                  >
                    {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : null}
                    {isUpdatingPassword ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
            )}

            {passwordFeedback ? (
              <p
                role={passwordFeedback.tone === "error" ? "alert" : undefined}
                className={`settings-security-feedback ${
                  passwordFeedback.tone === "error" ? "text-danger" : "text-success"
                }`}
              >
                {passwordFeedback.message}
              </p>
            ) : null}
          </section>

          <section className="settings-security-panel settings-security-panel-muted">
            <div className="settings-security-panel-heading">
              <span className="settings-security-panel-icon">
                <Smartphone size={20} strokeWidth={2.35} />
              </span>
              <span>
                <strong>Two-factor authentication</strong>
                <small>Add a second verification step to your account.</small>
              </span>
              <span className="settings-coming-soon">Coming soon</span>
            </div>
            <Button type="button" variant="outline" disabled className="w-full">
              Add 2FA
            </Button>
          </section>

          <section className="settings-security-panel settings-security-panel-muted">
            <div className="settings-security-panel-heading">
              <span className="settings-security-panel-icon">
                <LogOut size={20} strokeWidth={2.35} />
              </span>
              <span>
                <strong>Other sessions</strong>
                <small>Sign out every other device while keeping this one active.</small>
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSessionFeedback(null);
                setConfirmOtherSignOut(true);
              }}
              disabled={isSigningOutOthers || isUpdatingPassword}
              className="w-full"
            >
              <LogOut size={16} />
              Sign out other devices
            </Button>
            {sessionFeedback ? (
              <p className="settings-security-feedback text-text-secondary">
                {sessionFeedback}
              </p>
            ) : null}
          </section>
        </FinanceModalBody>
      </DialogContent>

      <Dialog
        open={confirmOtherSignOut}
        onOpenChange={(nextOpen) => !isSigningOutOthers && setConfirmOtherSignOut(nextOpen)}
      >
        <DialogContent className="rounded-3xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign out other devices?</DialogTitle>
            <DialogDescription>
              Other sessions will be revoked. This device will remain signed in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOtherSignOut(false)}
              disabled={isSigningOutOthers}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={signOutOtherDevices}
              disabled={isSigningOutOthers}
              className="bg-danger text-[var(--status-foreground)] hover:bg-danger/90"
            >
              {isSigningOutOthers ? <Loader2 size={16} className="animate-spin" /> : null}
              {isSigningOutOthers ? "Signing out..." : "Sign out other devices"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export function SettingsProfileSecuritySection({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  return (
    <section className="settings-reference-section settings-reference-profile-security">
      <SectionHeading icon={<UserRound size={19} strokeWidth={2.35} />}>
        Profile
      </SectionHeading>
      <div className="settings-reference-group">
        <ProfileDetailsDialog email={email} displayName={displayName} />
        <div className="settings-reference-divider" />
        <AccountSecurityDialog email={email} />
      </div>
    </section>
  );
}

type SettingsDataSectionProps = {
  email: string;
  displayName: string;
  categories: PersistentSettingsCategory[];
  categoriesAvailable: boolean;
  stats: SettingsReferenceStats;
};

export function SettingsDataSection({
  email,
  displayName,
  categories,
  categoriesAvailable,
  stats,
}: SettingsDataSectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const { currency } = useCurrency();
  const [profileName, setProfileName] = useState(
    displayName.trim() || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
  );
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    function handleProfileUpdate(event: Event) {
      const detail = (event as CustomEvent<{ displayName?: string }>).detail;
      if (detail?.displayName) setProfileName(detail.displayName);
    }
    window.addEventListener("jamal-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("jamal-profile-updated", handleProfileUpdate);
  }, []);

  function handleExport() {
    const generatedAt = new Date();
    const storedDateFormat = window.localStorage.getItem("jamal-date-format");
    const dateFormat: DateFormat =
      storedDateFormat === "dd MMM yyyy" || storedDateFormat === "yyyy-MM-dd"
        ? storedDateFormat
        : "MMM d, yyyy";
    const compactMode =
      window.localStorage.getItem("jamal-compact-dashboard") === "true";
    const themeMode = getStoredThemePreference();

    const payload = buildSettingsSnapshot({
      generatedAt: generatedAt.toISOString(),
      email,
      displayName: profileName,
      preferences: { currency, dateFormat, compactMode, themeMode },
      categories: categoriesAvailable ? categories : null,
      stats,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `jamals-finance-settings-${generatedAt
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Settings snapshot downloaded.");
    } finally {
      window.URL.revokeObjectURL(url);
    }
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setIsSigningOut(false);

    if (error) {
      toast.error(mapAuthError(error, "Could not sign out this device. Please try again."));
      return;
    }

    toast.success("Signed out successfully.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <section className="settings-reference-section settings-reference-data">
      <SectionHeading icon={<Download size={19} strokeWidth={2.35} />}>
        Data
      </SectionHeading>
      <div className="settings-reference-group">
        <ReferenceRow
          icon={<Download size={21} strokeWidth={2.35} />}
          title="Export Data"
          description="Download your profile, preferences, categories and account summary"
          onClick={handleExport}
        />
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="finance-focus settings-reference-logout"
      >
        {isSigningOut ? (
          <Loader2 size={19} className="animate-spin" aria-hidden="true" />
        ) : (
          <LogOut size={19} strokeWidth={2.35} aria-hidden="true" />
        )}
        {isSigningOut ? "Signing Out..." : "Log Out"}
      </button>
    </section>
  );
}
