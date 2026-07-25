import type { AppLanguage } from "@/lib/i18n/config";
import type {
  InsightAttention,
  InsightTopic,
} from "@/lib/ai-insights/actionable";

export type AIInsightsActionableCopy = {
  title: string;
  description: string;
  buckets: Record<InsightAttention, string>;
  bucketDescriptions: Record<InsightAttention, string>;
  count: (value: number) => string;
  empty: string;
  whyAmISeeingThis: string;
  actionLabels: Record<InsightTopic, string>;
  actionSafety: string;
};

const COPY: Record<AppLanguage, AIInsightsActionableCopy> = {
  en: {
    title: "What needs your attention",
    description:
      "JALVORO organizes recorded signals by urgency so you can review the most important decision first.",
    buckets: {
      "act-now": "Act now",
      "watch-closely": "Watch closely",
      "doing-well": "Doing well",
    },
    bucketDescriptions: {
      "act-now": "Recorded conditions that deserve the earliest review.",
      "watch-closely": "Useful signals to monitor before they become urgent.",
      "doing-well": "Positive movement worth maintaining.",
    },
    count: (value) => `${value} signal${value === 1 ? "" : "s"}`,
    empty: "No signal currently belongs in this group.",
    whyAmISeeingThis: "Why am I seeing this?",
    actionLabels: {
      "cash-flow": "Review transactions",
      spending: "Open spending analytics",
      goals: "Review goals",
      payables: "Review payables",
      overview: "Open analytics",
    },
    actionSafety:
      "Opens the relevant read-only workflow. JALVORO AI will not change records or move money.",
  },
  ur: {
    title: "آپ کی توجہ کہاں درکار ہے",
    description:
      "JALVORO ریکارڈ شدہ اشاروں کو اہمیت کے مطابق ترتیب دیتا ہے تاکہ آپ پہلے سب سے ضروری فیصلے کا جائزہ لیں۔",
    buckets: {
      "act-now": "ابھی کارروائی کریں",
      "watch-closely": "قریب سے دیکھیں",
      "doing-well": "اچھی پیش رفت",
    },
    bucketDescriptions: {
      "act-now": "ریکارڈ شدہ حالات جن کا پہلے جائزہ لینا ضروری ہے۔",
      "watch-closely": "وہ اشارے جنہیں فوری مسئلہ بننے سے پہلے دیکھتے رہنا مفید ہے۔",
      "doing-well": "مثبت پیش رفت جسے برقرار رکھنا چاہیے۔",
    },
    count: (value) => `${value.toLocaleString("ur-PK")} اشارے`,
    empty: "اس وقت اس گروپ میں کوئی اشارہ موجود نہیں۔",
    whyAmISeeingThis: "یہ مجھے کیوں دکھایا جا رہا ہے؟",
    actionLabels: {
      "cash-flow": "لین دین کا جائزہ لیں",
      spending: "اخراجات کا تجزیہ کھولیں",
      goals: "اہداف کا جائزہ لیں",
      payables: "واجبات کا جائزہ لیں",
      overview: "تجزیات کھولیں",
    },
    actionSafety:
      "متعلقہ صرف مطالعہ ورک فلو کھلتا ہے۔ JALVORO AI ریکارڈ تبدیل یا رقم منتقل نہیں کرے گا۔",
  },
  ar: {
    title: "ما الذي يحتاج إلى انتباهك",
    description:
      "يرتب JALVORO الإشارات المسجلة حسب الأولوية حتى تراجع القرار الأهم أولاً.",
    buckets: {
      "act-now": "تصرّف الآن",
      "watch-closely": "راقب عن قرب",
      "doing-well": "أداء جيد",
    },
    bucketDescriptions: {
      "act-now": "حالات مسجلة تستحق المراجعة في أقرب وقت.",
      "watch-closely": "إشارات مفيدة للمراقبة قبل أن تصبح عاجلة.",
      "doing-well": "حركة إيجابية تستحق الاستمرار.",
    },
    count: (value) => `${value.toLocaleString("ar")} إشارة`,
    empty: "لا توجد حالياً إشارة ضمن هذه المجموعة.",
    whyAmISeeingThis: "لماذا أرى هذه الإشارة؟",
    actionLabels: {
      "cash-flow": "مراجعة المعاملات",
      spending: "فتح تحليلات الإنفاق",
      goals: "مراجعة الأهداف",
      payables: "مراجعة المستحقات",
      overview: "فتح التحليلات",
    },
    actionSafety:
      "يفتح مسار العمل المناسب للعرض فقط. لن يغيّر JALVORO AI السجلات أو ينقل الأموال.",
  },
  hi: {
    title: "किस चीज़ पर आपका ध्यान चाहिए",
    description:
      "JALVORO दर्ज संकेतों को प्राथमिकता के अनुसार व्यवस्थित करता है ताकि आप सबसे महत्वपूर्ण निर्णय पहले देख सकें।",
    buckets: {
      "act-now": "अभी कार्रवाई करें",
      "watch-closely": "करीब से देखें",
      "doing-well": "अच्छी प्रगति",
    },
    bucketDescriptions: {
      "act-now": "दर्ज स्थितियाँ जिनकी सबसे पहले समीक्षा होनी चाहिए।",
      "watch-closely": "ऐसे संकेत जिन्हें जरूरी बनने से पहले देखते रहना उपयोगी है।",
      "doing-well": "सकारात्मक प्रगति जिसे बनाए रखना चाहिए।",
    },
    count: (value) => `${value.toLocaleString("hi-IN")} संकेत`,
    empty: "इस समूह में अभी कोई संकेत नहीं है।",
    whyAmISeeingThis: "मुझे यह क्यों दिख रहा है?",
    actionLabels: {
      "cash-flow": "लेन-देन देखें",
      spending: "खर्च विश्लेषण खोलें",
      goals: "लक्ष्य देखें",
      payables: "देय राशि देखें",
      overview: "विश्लेषण खोलें",
    },
    actionSafety:
      "संबंधित केवल-पढ़ने वाला कार्यप्रवाह खुलता है। JALVORO AI रिकॉर्ड नहीं बदलेगा और धन नहीं भेजेगा।",
  },
  es: {
    title: "Qué necesita tu atención",
    description:
      "JALVORO organiza las señales registradas por prioridad para que revises primero la decisión más importante.",
    buckets: {
      "act-now": "Actúa ahora",
      "watch-closely": "Vigila de cerca",
      "doing-well": "Va bien",
    },
    bucketDescriptions: {
      "act-now": "Condiciones registradas que merecen la revisión más temprana.",
      "watch-closely": "Señales útiles para observar antes de que sean urgentes.",
      "doing-well": "Movimiento positivo que conviene mantener.",
    },
    count: (value) => `${value.toLocaleString("es")} señal${value === 1 ? "" : "es"}`,
    empty: "Actualmente no hay señales en este grupo.",
    whyAmISeeingThis: "¿Por qué veo esto?",
    actionLabels: {
      "cash-flow": "Revisar transacciones",
      spending: "Abrir análisis de gastos",
      goals: "Revisar objetivos",
      payables: "Revisar pagos pendientes",
      overview: "Abrir análisis",
    },
    actionSafety:
      "Abre el flujo correspondiente en modo de consulta. JALVORO AI no cambiará registros ni moverá dinero.",
  },
};

export function getAIInsightsActionableCopy(
  language: AppLanguage,
): AIInsightsActionableCopy {
  return COPY[language] ?? COPY.en;
}
