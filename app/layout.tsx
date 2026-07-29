import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./icon-system.css";
import "./finance-form-unification.css";
import "./finance-form-theme-refinement.css";
import "./finance-form-final-polish.css";
import "./finance-form-content-fit.css";
import "./light-background-tuning.css";
import "./interaction-lock.css";
import "./scrollbar-visibility.css";
import "./public-icon-surface-cleanup.css";
// Shared transform-only symbol rain for the landing and authentication surfaces.
import "./landing-math-symbols.css";
// Final dark-mode-only icon tone lift; light mode and semantic hues stay intact.
import "./dark-icon-tone.css";
import "./animation-preference.css";
// Final global authority for equal, compact single-line form controls.
import "./form-control-height-unify.css";
// Standard/green animation polish stays last so it can optimize every surface
// without changing Fast or No-animation behavior.
import "./standard-motion-ultra.css";
// Cross-route accessibility, viewport and scroll stability safeguards.
import "./global-ux-foundation.css";
import { Toaster } from "sonner";
import LanguageProvider from "@/components/i18n/LanguageProvider";
import DeferredDesktopOverscrollBounce from "@/components/motion/DeferredDesktopOverscrollBounce";
import RouteMotionProvider from "@/components/motion/RouteMotionProvider";
import { ANIMATION_BOOTSTRAP_SCRIPT } from "@/lib/animation-preference";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  APP_URL,
} from "@/lib/brand";
import {
  CURRENCY_STORAGE_KEY,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency";
import { LANGUAGE_BOOTSTRAP_SCRIPT } from "@/lib/i18n/config";
import {
  THEME_BOOTSTRAP_SCRIPT,
  THEME_VIEWPORT_COLORS,
} from "@/lib/theme";
import PWARegister from "./pwa-register";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const CURRENCY_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const key = ${JSON.stringify(CURRENCY_STORAGE_KEY)};
    const allowed = ${JSON.stringify(SUPPORTED_CURRENCIES)};
    const saved = window.localStorage.getItem(key);
    if (!allowed.includes(saved)) return;

    const cookieEntry = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(key + "="));
    const cookieValue = cookieEntry
      ? decodeURIComponent(cookieEntry.slice(key.length + 1))
      : null;
    const syncKey = key + "-cookie-sync";

    if (cookieValue === saved) {
      window.sessionStorage.removeItem(syncKey);
      return;
    }

    if (window.sessionStorage.getItem(syncKey) === saved) return;

    window.sessionStorage.setItem(syncKey, saved);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = key + "=" + encodeURIComponent(saved) + "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
    window.location.replace(window.location.href);
  } catch {}
})();
`;

const NATIVE_TOOLTIP_CLEANUP_SCRIPT = `
(() => {
  try {
    const marker = "__jfNativeTooltipCleanupInstalled";
    if (window[marker]) return;
    window[marker] = true;

    const accessibleSelector =
      "button, a, input, select, textarea, summary, [role], img, svg";
    const pendingRoots = new Set();
    let frameId = null;

    const cleanTitleAttribute = (element) => {
      if (
        !(element instanceof Element) ||
        !element.hasAttribute("title") ||
        !element.matches(accessibleSelector)
      ) {
        return;
      }

      const label = element.getAttribute("title")?.trim();
      const hasAccessibleLabel =
        element.hasAttribute("aria-label") ||
        element.hasAttribute("aria-labelledby");

      if (label && !hasAccessibleLabel) {
        element.setAttribute("aria-label", label);
      }

      element.removeAttribute("title");
    };

    const cleanWithin = (root) => {
      if (!(root instanceof Element || root instanceof Document)) return;

      if (root instanceof Element) cleanTitleAttribute(root);
      root.querySelectorAll("[title]").forEach(cleanTitleAttribute);
    };

    const flush = () => {
      frameId = null;
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      roots.forEach(cleanWithin);
    };

    const queueRoot = (root) => {
      if (!(root instanceof Element || root instanceof Document)) return;
      pendingRoots.add(root);
      if (frameId === null) frameId = window.requestAnimationFrame(flush);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => queueRoot(document), {
        once: true,
      });
    } else {
      queueRoot(document);
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          queueRoot(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) queueRoot(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    window.addEventListener(
      "pagehide",
      () => {
        observer.disconnect();
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        pendingRoots.clear();
      },
      { once: true },
    );
  } catch {}
})();
`;

const defaultTitle = `${APP_NAME} — ${APP_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: defaultTitle,
    template: `%s — ${APP_NAME}`,
  },
  verification: {
    google: "W-UmHqy2sJyd2xbsdPdPeqJLOhLS2cf_aszWJf15aMk",
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "personal finance workspace",
    "business management platform",
    "point of sale",
    "ERP software",
    "CRM software",
    "accounting",
    "inventory management",
    "JALVORO",
  ],
  authors: [{ name: "Jamal Yaqoob" }],
  creator: "Jamal Yaqoob",
  publisher: APP_NAME,
  category: "Business",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: defaultTitle,
    description: APP_DESCRIPTION,
    url: "/",
    siteName: APP_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: THEME_VIEWPORT_COLORS.light,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: ANIMATION_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: LANGUAGE_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: CURRENCY_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: NATIVE_TOOLTIP_CLEANUP_SCRIPT,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <LanguageProvider>
          <RouteMotionProvider>
            {children}
            <DeferredDesktopOverscrollBounce />
            <PWARegister />
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "theme-toast",
                },
              }}
            />
          </RouteMotionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
