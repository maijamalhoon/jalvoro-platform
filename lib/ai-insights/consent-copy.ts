import type { AppLanguage } from "@/lib/i18n/config";

type ConsentCopy = {
  loading: string;
  eyebrow: string;
  title: string;
  description: (appName: string) => string;
  summaryTitle: string;
  summaryItems: [string, string, string, string];
  excluded: string;
  warning: string;
  enable: string;
  notNow: string;
  read: string;
  privacyNotice: string;
  and: string;
  disclosures: string;
  enabled: string;
  disableAria: string;
  disable: string;
};

const COPY: Record<AppLanguage, ConsentCopy> = {
  en: {
    loading: "Loading AI privacy choice",
    eyebrow: "AI privacy choice",
    title: "Choose before using external AI",
    description: (appName) =>
      `${appName} first tries local, deterministic calculations. When a question or briefing needs Gemini and the provider is configured, the service may send your question plus a summarized finance context to Google Gemini.`,
    summaryTitle: "The summary can include:",
    summaryItems: [
      "income, expense, cash-flow, and estimated net-position totals;",
      "category names and summarized category spending;",
      "goal, investment, payable, and recent-trend totals;",
      "the finance question you submit.",
    ],
    excluded:
      "The application prompt does not include your password, authentication token, or online-banking credentials.",
    warning:
      "AI output can be wrong and is not financial, tax, legal, accounting, or investment advice. You can disable this choice from this page at any time.",
    enable: "Enable AI insights",
    notNow: "Not now",
    read: "Read the",
    privacyNotice: "Privacy Notice",
    and: "and",
    disclosures: "AI disclosures",
    enabled:
      "External AI sharing is enabled for summarized finance context. Local deterministic answers are used whenever available.",
    disableAria: "Disable external AI sharing",
    disable: "Disable",
  },
  ur: {
    loading: "AI پرائیویسی کا انتخاب لوڈ ہو رہا ہے",
    eyebrow: "AI پرائیویسی کا انتخاب",
    title: "بیرونی AI استعمال کرنے سے پہلے انتخاب کریں",
    description: (appName) =>
      `${appName} پہلے مقامی اور قطعی حساب استعمال کرتا ہے۔ جب کسی سوال یا بریفنگ کے لیے Gemini درکار ہو اور فراہم کنندہ فعال ہو، تو سروس آپ کا سوال اور مجموعی مالی سیاق Google Gemini کو بھیج سکتی ہے۔`,
    summaryTitle: "خلاصے میں شامل ہو سکتا ہے:",
    summaryItems: [
      "آمدنی، خرچ، کیش فلو اور اندازاً خالص مالی پوزیشن کے مجموعے؛",
      "کیٹیگری کے نام اور کیٹیگری کے مطابق مجموعی خرچ؛",
      "اہداف، سرمایہ کاری، واجبات اور حالیہ رجحانات کے مجموعے؛",
      "آپ کا بھیجا ہوا مالی سوال۔",
    ],
    excluded:
      "ایپلیکیشن پرامپٹ میں آپ کا پاس ورڈ، تصدیقی ٹوکن یا آن لائن بینکنگ کی اسناد شامل نہیں ہوتیں۔",
    warning:
      "AI کا جواب غلط ہو سکتا ہے اور مالی، ٹیکس، قانونی، اکاؤنٹنگ یا سرمایہ کاری کا مشورہ نہیں۔ آپ اس انتخاب کو اسی صفحے سے کسی بھی وقت بند کر سکتے ہیں۔",
    enable: "AI Insights فعال کریں",
    notNow: "ابھی نہیں",
    read: "پڑھیں",
    privacyNotice: "پرائیویسی نوٹس",
    and: "اور",
    disclosures: "AI انکشافات",
    enabled:
      "مجموعی مالی سیاق کے لیے بیرونی AI شیئرنگ فعال ہے۔ جہاں ممکن ہو مقامی قطعی جوابات استعمال ہوتے ہیں۔",
    disableAria: "بیرونی AI شیئرنگ بند کریں",
    disable: "بند کریں",
  },
  ar: {
    loading: "جارٍ تحميل خيار خصوصية الذكاء",
    eyebrow: "خيار خصوصية الذكاء",
    title: "اختر قبل استخدام الذكاء الخارجي",
    description: (appName) =>
      `يستخدم ${appName} أولًا حسابات محلية وحتمية. عندما يحتاج السؤال أو الموجز إلى Gemini ويكون المزوّد مهيأً، قد ترسل الخدمة سؤالك مع سياق مالي مجمع إلى Google Gemini.`,
    summaryTitle: "قد يتضمن الملخص:",
    summaryItems: [
      "إجماليات الدخل والمصروفات والتدفق النقدي وصافي المركز المالي المقدر؛",
      "أسماء الفئات والإنفاق المجمع حسب الفئة؛",
      "إجماليات الأهداف والاستثمارات والمستحقات والاتجاهات الأخيرة؛",
      "السؤال المالي الذي ترسله.",
    ],
    excluded:
      "لا يتضمن طلب التطبيق كلمة المرور أو رمز المصادقة أو بيانات اعتماد الخدمات المصرفية عبر الإنترنت.",
    warning:
      "قد تكون مخرجات الذكاء خاطئة وليست نصيحة مالية أو ضريبية أو قانونية أو محاسبية أو استثمارية. يمكنك تعطيل هذا الخيار من الصفحة في أي وقت.",
    enable: "تفعيل رؤى الذكاء",
    notNow: "ليس الآن",
    read: "اقرأ",
    privacyNotice: "إشعار الخصوصية",
    and: "و",
    disclosures: "إفصاحات الذكاء",
    enabled:
      "تم تفعيل مشاركة السياق المالي المجمع مع الذكاء الخارجي. تُستخدم الإجابات المحلية الحتمية متى كانت متاحة.",
    disableAria: "تعطيل مشاركة الذكاء الخارجي",
    disable: "تعطيل",
  },
  hi: {
    loading: "AI गोपनीयता विकल्प लोड हो रहा है",
    eyebrow: "AI गोपनीयता विकल्प",
    title: "बाहरी AI उपयोग करने से पहले चुनें",
    description: (appName) =>
      `${appName} पहले स्थानीय और निश्चित गणनाओं का उपयोग करता है। जब किसी प्रश्न या ब्रीफिंग के लिए Gemini चाहिए और प्रदाता कॉन्फ़िगर हो, तो सेवा आपका प्रश्न और समेकित वित्तीय संदर्भ Google Gemini को भेज सकती है।`,
    summaryTitle: "सारांश में शामिल हो सकता है:",
    summaryItems: [
      "आय, खर्च, नकदी प्रवाह और अनुमानित शुद्ध वित्तीय स्थिति के योग;",
      "श्रेणी नाम और श्रेणी के अनुसार समेकित खर्च;",
      "लक्ष्य, निवेश, देय राशि और हाल के रुझानों के योग;",
      "आपके द्वारा भेजा गया वित्तीय प्रश्न।",
    ],
    excluded:
      "एप्लिकेशन प्रॉम्प्ट में आपका पासवर्ड, प्रमाणीकरण टोकन या ऑनलाइन बैंकिंग क्रेडेंशियल शामिल नहीं होते।",
    warning:
      "AI आउटपुट गलत हो सकता है और वित्तीय, कर, कानूनी, लेखांकन या निवेश सलाह नहीं है। आप इस विकल्प को किसी भी समय इसी पेज से बंद कर सकते हैं।",
    enable: "AI इनसाइट सक्षम करें",
    notNow: "अभी नहीं",
    read: "पढ़ें",
    privacyNotice: "गोपनीयता सूचना",
    and: "और",
    disclosures: "AI प्रकटीकरण",
    enabled:
      "समेकित वित्तीय संदर्भ के लिए बाहरी AI साझाकरण सक्षम है। जहाँ उपलब्ध हों, स्थानीय निश्चित उत्तर उपयोग किए जाते हैं।",
    disableAria: "बाहरी AI साझाकरण बंद करें",
    disable: "बंद करें",
  },
  es: {
    loading: "Cargando la elección de privacidad de IA",
    eyebrow: "Elección de privacidad de IA",
    title: "Elige antes de usar IA externa",
    description: (appName) =>
      `${appName} intenta primero cálculos locales y deterministas. Cuando una pregunta o informe necesita Gemini y el proveedor está configurado, el servicio puede enviar tu pregunta y un contexto financiero resumido a Google Gemini.`,
    summaryTitle: "El resumen puede incluir:",
    summaryItems: [
      "totales de ingresos, gastos, flujo de caja y posición neta estimada;",
      "nombres de categorías y gasto resumido por categoría;",
      "totales de objetivos, inversiones, pagos pendientes y tendencias recientes;",
      "la pregunta financiera que envíes.",
    ],
    excluded:
      "El prompt de la aplicación no incluye tu contraseña, token de autenticación ni credenciales de banca en línea.",
    warning:
      "La salida de la IA puede ser incorrecta y no es asesoramiento financiero, fiscal, legal, contable ni de inversión. Puedes desactivar esta elección desde esta página en cualquier momento.",
    enable: "Activar conclusiones de IA",
    notNow: "Ahora no",
    read: "Lee el",
    privacyNotice: "Aviso de privacidad",
    and: "y las",
    disclosures: "divulgaciones de IA",
    enabled:
      "El intercambio con IA externa está activo para el contexto financiero resumido. Se usan respuestas locales deterministas siempre que estén disponibles.",
    disableAria: "Desactivar el intercambio con IA externa",
    disable: "Desactivar",
  },
};

export function getAIInsightsConsentCopy(language: AppLanguage) {
  return COPY[language] ?? COPY.en;
}
