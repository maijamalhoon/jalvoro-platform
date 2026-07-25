export type AIInsightsTextDirection = "ltr" | "rtl";

export type AIInsightsLocaleContext = {
  locale: string;
  language: string;
  region: string | null;
  timeZone: string;
  direction: AIInsightsTextDirection;
  weekStartsOn: number;
};

type LocaleWeekInfo = {
  firstDay?: number;
};

type LocaleWithWeekInfo = Intl.Locale & {
  weekInfo?: LocaleWeekInfo;
  getWeekInfo?: () => LocaleWeekInfo;
};

const DEFAULT_LOCALE = "en-US";
const DEFAULT_TIME_ZONE = "UTC";
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ps", "ur"]);

function canonicalizeLocale(value: string | null | undefined) {
  if (!value) return null;

  try {
    const canonical = Intl.getCanonicalLocales(value)[0] ?? null;
    if (!canonical) return null;

    return Intl.DateTimeFormat.supportedLocalesOf([canonical], {
      localeMatcher: "lookup",
    }).length === 1
      ? canonical
      : null;
  } catch {
    return null;
  }
}

function canonicalizeTimeZone(value: string | null | undefined) {
  if (!value) return DEFAULT_TIME_ZONE;

  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function getWeekStart(locale: string) {
  try {
    const localeObject = new Intl.Locale(locale) as LocaleWithWeekInfo;
    const weekInfo = localeObject.weekInfo ?? localeObject.getWeekInfo?.();
    const firstDay = weekInfo?.firstDay;

    if (
      typeof firstDay === "number" &&
      Number.isInteger(firstDay) &&
      firstDay >= 1 &&
      firstDay <= 7
    ) {
      return firstDay;
    }
  } catch {
    // Use a stable CLDR-aligned fallback below.
  }

  const region = new Intl.Locale(locale).region;
  return region === "US" || region === "CA" || region === "PK" ? 7 : 1;
}

export function resolveAIInsightsLocale({
  locales,
  timeZone,
  fallbackLocale = DEFAULT_LOCALE,
}: {
  locales?: readonly (string | null | undefined)[];
  timeZone?: string | null;
  fallbackLocale?: string;
} = {}): AIInsightsLocaleContext {
  const safeFallback = canonicalizeLocale(fallbackLocale) ?? DEFAULT_LOCALE;
  const locale =
    locales?.map(canonicalizeLocale).find((value): value is string => Boolean(value)) ??
    safeFallback;
  const localeObject = new Intl.Locale(locale);
  const language = localeObject.language.toLowerCase();

  return {
    locale,
    language,
    region: localeObject.region ?? null,
    timeZone: canonicalizeTimeZone(timeZone),
    direction: RTL_LANGUAGES.has(language) ? "rtl" : "ltr",
    weekStartsOn: getWeekStart(locale),
  };
}

export function getBrowserAIInsightsLocale() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return resolveAIInsightsLocale();
  }

  const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  return resolveAIInsightsLocale({
    locales,
    timeZone: resolvedTimeZone,
  });
}

export function formatAIInsightsDateTime(
  value: string | number | Date | null | undefined,
  context: Pick<AIInsightsLocaleContext, "locale" | "timeZone">,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
) {
  if (value === null || value === undefined || value === "") return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat(context.locale, {
    ...options,
    timeZone: context.timeZone,
  }).format(date);
}

export function getAIInsightsLocaleLabel(
  context: Pick<AIInsightsLocaleContext, "locale" | "language" | "region">,
) {
  try {
    const languageNames = new Intl.DisplayNames([context.locale], {
      type: "language",
    });
    const regionNames = new Intl.DisplayNames([context.locale], {
      type: "region",
    });
    const language = languageNames.of(context.language) ?? context.locale;
    const region = context.region ? regionNames.of(context.region) : null;

    return region ? `${language} (${region})` : language;
  } catch {
    return context.locale;
  }
}

export function getWeekStartLabel(
  weekStartsOn: number,
  locale: string,
) {
  const referenceSunday = new Date(Date.UTC(2024, 0, 7));
  const offset = weekStartsOn === 7 ? 0 : weekStartsOn;
  const date = new Date(referenceSunday);
  date.setUTCDate(referenceSunday.getUTCDate() + offset);

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}
