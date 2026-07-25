import type { AppLanguage } from "@/lib/i18n/config";
import type {
  QualityIssueCode,
  TimelineEventType,
} from "@/lib/ai-insights/workspace";
import type { InsightTopic } from "@/lib/ai-insights/actionable";

export type AIInsightsWorkspaceCopy = {
  eyebrow: string;
  title: string;
  description: string;
  quality: {
    title: string;
    description: string;
    score: string;
    categoryComplete: (value: number) => string;
    grades: Record<"excellent" | "good" | "fair" | "limited", string>;
    issuesTitle: string;
    noIssues: string;
    issues: Record<QualityIssueCode, string>;
  };
  timeline: {
    title: string;
    description: string;
    previous: (value: string) => string;
    events: Record<TimelineEventType, string>;
    topics: Record<InsightTopic | "quality" | "overview", string>;
  };
  saved: {
    title: string;
    description: string;
    saved: string;
    resolved: string;
    empty: string;
    save: string;
    remove: string;
    resolve: string;
    restore: string;
    saving: string;
    unavailable: string;
  };
  scenarios: {
    title: string;
    description: string;
    spendingTitle: string;
    spendingDescription: string;
    spendingReduction: (value: number) => string;
    monthlyImprovement: string;
    projectedNet: string;
    annualImpact: string;
    incomeTitle: string;
    incomeDescription: string;
    incomeReduction: (value: number) => string;
    projectedIncome: string;
    monthlyImpact: string;
    payablesTitle: string;
    payablesDescription: string;
    monthlyPayment: string;
    monthsToClear: string;
    months: (value: number) => string;
    unavailable: string;
    calculationNotice: string;
  };
};

const COPY: Record<AppLanguage, AIInsightsWorkspaceCopy> = {
  en: {
    eyebrow: "Decision intelligence",
    title: "Your financial intelligence workspace",
    description:
      "Compare what changed, strengthen the data behind each signal, keep important insights, and test decisions without changing a finance record.",
    quality: {
      title: "Data Quality Score",
      description: "Measures freshness, coverage, categorization, and recorded history—not financial performance.",
      score: "quality score",
      categoryComplete: (value) => `${value}% expenses categorized`,
      grades: { excellent: "Excellent", good: "Good", fair: "Fair", limited: "Limited" },
      issuesTitle: "Improve the briefing",
      noIssues: "Your recorded data is strong enough for a high-confidence briefing.",
      issues: {
        "no-records": "Add transactions so JALVORO can identify real changes.",
        "stale-records": "Recent transactions are missing; refresh your records.",
        "low-volume": "More transaction history will make comparisons more reliable.",
        uncategorized: "Categorize more expenses to improve spending signals.",
        "no-income": "Record income so cash-flow and savings signals are complete.",
        "no-active-account": "Add or activate an account to improve balance context.",
        "short-history": "Build at least three months of history for stronger trends.",
      },
    },
    timeline: {
      title: "What changed",
      description: "Compares this recorded briefing with your previous workspace snapshot.",
      previous: (value) => `Previous snapshot ${value}`,
      events: {
        baseline: "Baseline created",
        new: "New signal",
        improved: "Improved",
        worsened: "Needs more attention",
        resolved: "Resolved",
        changed: "Updated",
        "quality-improved": "Data quality improved",
        "quality-declined": "Data quality declined",
        stable: "No material change",
      },
      topics: {
        "cash-flow": "Cash flow",
        spending: "Spending",
        goals: "Goals",
        payables: "Payables",
        overview: "Financial briefing",
        quality: "Data quality",
      },
    },
    saved: {
      title: "Saved and resolved insights",
      description: "Keep important signals across sessions and mark an issue resolved when you have handled it.",
      saved: "Saved",
      resolved: "Resolved",
      empty: "No insights have been saved yet.",
      save: "Save insight",
      remove: "Remove saved insight",
      resolve: "Mark resolved",
      restore: "Restore",
      saving: "Saving…",
      unavailable: "Saved insights are temporarily unavailable.",
    },
    scenarios: {
      title: "Scenario Lab",
      description: "Test deterministic outcomes with your recorded monthly summary. No record is edited and no AI estimate replaces the math.",
      spendingTitle: "Reduce flexible spending",
      spendingDescription: "See how a percentage reduction changes monthly net and the annualized impact.",
      spendingReduction: (value) => `${value}% reduction`,
      monthlyImprovement: "Monthly improvement",
      projectedNet: "Projected monthly net",
      annualImpact: "12-month impact",
      incomeTitle: "Income stress test",
      incomeDescription: "See the monthly position if recorded income temporarily decreases.",
      incomeReduction: (value) => `${value}% income reduction`,
      projectedIncome: "Projected income",
      monthlyImpact: "Monthly income impact",
      payablesTitle: "Payables payoff plan",
      payablesDescription: "Enter a planned monthly payment to estimate the number of whole months required.",
      monthlyPayment: "Planned monthly payment",
      monthsToClear: "Estimated time to clear",
      months: (value) => `${value} month${value === 1 ? "" : "s"}`,
      unavailable: "Add a positive monthly payment to calculate a payoff period.",
      calculationNotice: "Straight-line calculations only. Interest, fees, taxes, and future changes are not assumed.",
    },
  },
  ur: {
    eyebrow: "فیصلہ جاتی ذہانت",
    title: "آپ کا مالی ذہانت ورک اسپیس",
    description: "دیکھیں کیا بدلا، ڈیٹا بہتر کریں، اہم انسائٹس محفوظ رکھیں اور کسی مالی ریکارڈ کو بدلے بغیر فیصلے آزمائیں۔",
    quality: {
      title: "ڈیٹا کوالٹی اسکور",
      description: "تازگی، کوریج، کیٹیگریز اور ریکارڈ شدہ ہسٹری کو ناپتا ہے—مالی کارکردگی کو نہیں۔",
      score: "کوالٹی اسکور",
      categoryComplete: (value) => `${value}% اخراجات کیٹیگرائزڈ`,
      grades: { excellent: "بہترین", good: "اچھا", fair: "مناسب", limited: "محدود" },
      issuesTitle: "بریفنگ بہتر کریں",
      noIssues: "آپ کا ریکارڈ شدہ ڈیٹا مضبوط بریفنگ کے لیے کافی ہے۔",
      issues: {
        "no-records": "حقیقی تبدیلیاں سمجھنے کے لیے ٹرانزیکشنز شامل کریں۔",
        "stale-records": "حالیہ ٹرانزیکشنز موجود نہیں؛ ریکارڈ اپ ڈیٹ کریں۔",
        "low-volume": "مزید ٹرانزیکشن ہسٹری سے موازنہ زیادہ قابلِ اعتماد ہوگا۔",
        uncategorized: "اخراجات کی مزید کیٹیگریز مقرر کریں۔",
        "no-income": "کیش فلو اور بچت مکمل کرنے کے لیے آمدنی ریکارڈ کریں۔",
        "no-active-account": "بیلنس سیاق بہتر کرنے کے لیے اکاؤنٹ شامل یا فعال کریں۔",
        "short-history": "مضبوط رجحانات کے لیے کم از کم تین ماہ کی ہسٹری بنائیں۔",
      },
    },
    timeline: {
      title: "کیا بدلا",
      description: "موجودہ ریکارڈ شدہ بریفنگ کا پچھلے ورک اسپیس اسنیپ شاٹ سے موازنہ۔",
      previous: (value) => `پچھلا اسنیپ شاٹ ${value}`,
      events: {
        baseline: "بنیادی اسنیپ شاٹ بن گیا",
        new: "نیا اشارہ",
        improved: "بہتری",
        worsened: "مزید توجہ درکار",
        resolved: "حل ہوگیا",
        changed: "اپ ڈیٹ ہوا",
        "quality-improved": "ڈیٹا کوالٹی بہتر ہوئی",
        "quality-declined": "ڈیٹا کوالٹی کم ہوئی",
        stable: "کوئی اہم تبدیلی نہیں",
      },
      topics: { "cash-flow": "کیش فلو", spending: "اخراجات", goals: "اہداف", payables: "واجبات", overview: "مالی بریفنگ", quality: "ڈیٹا کوالٹی" },
    },
    saved: {
      title: "محفوظ اور حل شدہ انسائٹس",
      description: "اہم اشارے سیشنز کے درمیان محفوظ رکھیں اور نمٹنے کے بعد حل شدہ نشان لگائیں۔",
      saved: "محفوظ", resolved: "حل شدہ", empty: "ابھی کوئی انسائٹ محفوظ نہیں۔", save: "انسائٹ محفوظ کریں", remove: "محفوظ انسائٹ ہٹائیں", resolve: "حل شدہ نشان لگائیں", restore: "واپس لائیں", saving: "محفوظ ہو رہا ہے…", unavailable: "محفوظ انسائٹس عارضی طور پر دستیاب نہیں۔",
    },
    scenarios: {
      title: "سیناریو لیب",
      description: "ریکارڈ شدہ ماہانہ خلاصے سے قطعی نتائج آزمائیں۔ کوئی ریکارڈ تبدیل نہیں ہوتا۔",
      spendingTitle: "لچکدار خرچ کم کریں", spendingDescription: "دیکھیں فیصد کمی ماہانہ نیٹ اور سالانہ اثر کو کیسے بدلتی ہے۔", spendingReduction: (value) => `${value}% کمی`, monthlyImprovement: "ماہانہ بہتری", projectedNet: "متوقع ماہانہ نیٹ", annualImpact: "12 ماہ کا اثر",
      incomeTitle: "آمدنی اسٹریس ٹیسٹ", incomeDescription: "ریکارڈ شدہ آمدنی عارضی طور پر کم ہو تو ماہانہ پوزیشن دیکھیں۔", incomeReduction: (value) => `${value}% آمدنی میں کمی`, projectedIncome: "متوقع آمدنی", monthlyImpact: "ماہانہ آمدنی کا اثر",
      payablesTitle: "واجبات ادائیگی پلان", payablesDescription: "منصوبہ شدہ ماہانہ ادائیگی درج کرکے مکمل مہینوں کا اندازہ دیکھیں۔", monthlyPayment: "منصوبہ شدہ ماہانہ ادائیگی", monthsToClear: "مکمل ہونے کا اندازاً وقت", months: (value) => `${value} ماہ`, unavailable: "حساب کے لیے مثبت ماہانہ ادائیگی درج کریں۔", calculationNotice: "صرف سیدھا حساب۔ سود، فیس، ٹیکس اور مستقبل کی تبدیلیاں فرض نہیں کی جاتیں۔",
    },
  },
  ar: {
    eyebrow: "ذكاء القرار",
    title: "مساحة الذكاء المالي الخاصة بك",
    description: "قارن ما تغير، وحسّن البيانات، واحتفظ بالإشارات المهمة، واختبر القرارات دون تعديل أي سجل مالي.",
    quality: {
      title: "درجة جودة البيانات", description: "تقيس الحداثة والتغطية والتصنيف والسجل المسجل، وليس الأداء المالي.", score: "درجة الجودة", categoryComplete: (value) => `${value}% من المصروفات مصنفة`, grades: { excellent: "ممتاز", good: "جيد", fair: "متوسط", limited: "محدود" }, issuesTitle: "حسّن الملخص", noIssues: "بياناتك المسجلة قوية بما يكفي لملخص عالي الثقة.",
      issues: { "no-records": "أضف معاملات لاكتشاف التغييرات الحقيقية.", "stale-records": "المعاملات الحديثة مفقودة؛ حدّث سجلاتك.", "low-volume": "المزيد من السجل يجعل المقارنات أكثر موثوقية.", uncategorized: "صنّف مزيدًا من المصروفات لتحسين إشارات الإنفاق.", "no-income": "سجل الدخل لاستكمال إشارات التدفق والادخار.", "no-active-account": "أضف حسابًا نشطًا لتحسين سياق الرصيد.", "short-history": "أنشئ ثلاثة أشهر على الأقل لاتجاهات أقوى." },
    },
    timeline: {
      title: "ما الذي تغير", description: "يقارن هذا الملخص المسجل باللقطة السابقة.", previous: (value) => `اللقطة السابقة ${value}`,
      events: { baseline: "تم إنشاء خط الأساس", new: "إشارة جديدة", improved: "تحسن", worsened: "يحتاج انتباهًا أكبر", resolved: "تم الحل", changed: "تم التحديث", "quality-improved": "تحسنت جودة البيانات", "quality-declined": "انخفضت جودة البيانات", stable: "لا تغيير جوهري" },
      topics: { "cash-flow": "التدفق النقدي", spending: "الإنفاق", goals: "الأهداف", payables: "المستحقات", overview: "الملخص المالي", quality: "جودة البيانات" },
    },
    saved: { title: "الإشارات المحفوظة والمحلولة", description: "احتفظ بالإشارات المهمة وحدد المشكلة كمحلولة بعد معالجتها.", saved: "محفوظ", resolved: "محلول", empty: "لم يتم حفظ أي إشارة بعد.", save: "حفظ الإشارة", remove: "إزالة الإشارة المحفوظة", resolve: "تحديد كمحلولة", restore: "استعادة", saving: "جارٍ الحفظ…", unavailable: "الإشارات المحفوظة غير متاحة مؤقتًا." },
    scenarios: {
      title: "مختبر السيناريوهات", description: "اختبر نتائج حسابية باستخدام ملخصك الشهري دون تعديل السجلات.", spendingTitle: "خفض الإنفاق المرن", spendingDescription: "شاهد أثر خفض النسبة على الصافي الشهري والأثر السنوي.", spendingReduction: (value) => `خفض ${value}%`, monthlyImprovement: "التحسن الشهري", projectedNet: "الصافي الشهري المتوقع", annualImpact: "أثر 12 شهرًا", incomeTitle: "اختبار ضغط الدخل", incomeDescription: "شاهد الوضع الشهري إذا انخفض الدخل المسجل مؤقتًا.", incomeReduction: (value) => `خفض الدخل ${value}%`, projectedIncome: "الدخل المتوقع", monthlyImpact: "أثر الدخل الشهري", payablesTitle: "خطة سداد المستحقات", payablesDescription: "أدخل دفعة شهرية مخططة لتقدير عدد الأشهر الكاملة.", monthlyPayment: "الدفعة الشهرية المخططة", monthsToClear: "المدة التقديرية للسداد", months: (value) => `${value} شهر`, unavailable: "أدخل دفعة شهرية موجبة للحساب.", calculationNotice: "حساب خطي فقط. لا يفترض فوائد أو رسومًا أو ضرائب أو تغييرات مستقبلية." },
  },
  hi: {
    eyebrow: "निर्णय बुद्धिमत्ता", title: "आपका वित्तीय इंटेलिजेंस वर्कस्पेस", description: "क्या बदला देखें, डेटा मजबूत करें, महत्वपूर्ण संकेत सहेजें और बिना रिकॉर्ड बदले निर्णयों को परखें।",
    quality: { title: "डेटा गुणवत्ता स्कोर", description: "ताज़गी, कवरेज, वर्गीकरण और दर्ज इतिहास को मापता है—वित्तीय प्रदर्शन को नहीं।", score: "गुणवत्ता स्कोर", categoryComplete: (value) => `${value}% खर्च वर्गीकृत`, grades: { excellent: "उत्कृष्ट", good: "अच्छा", fair: "ठीक", limited: "सीमित" }, issuesTitle: "ब्रीफिंग बेहतर करें", noIssues: "आपका दर्ज डेटा उच्च-विश्वास ब्रीफिंग के लिए मजबूत है।", issues: { "no-records": "वास्तविक बदलाव पहचानने के लिए लेन-देन जोड़ें।", "stale-records": "हाल के लेन-देन नहीं हैं; रिकॉर्ड अपडेट करें।", "low-volume": "अधिक इतिहास तुलना को अधिक भरोसेमंद बनाएगा।", uncategorized: "खर्च संकेत बेहतर करने के लिए अधिक खर्च वर्गीकृत करें।", "no-income": "कैश फ्लो और बचत संकेत पूरा करने के लिए आय दर्ज करें।", "no-active-account": "बैलेंस संदर्भ के लिए सक्रिय खाता जोड़ें।", "short-history": "मजबूत रुझानों के लिए कम से कम तीन महीने का इतिहास बनाएं।" } },
    timeline: { title: "क्या बदला", description: "इस दर्ज ब्रीफिंग की पिछले वर्कस्पेस स्नैपशॉट से तुलना।", previous: (value) => `पिछला स्नैपशॉट ${value}`, events: { baseline: "बेसलाइन बनाई गई", new: "नया संकेत", improved: "सुधार", worsened: "अधिक ध्यान चाहिए", resolved: "समाधान हुआ", changed: "अपडेट हुआ", "quality-improved": "डेटा गुणवत्ता सुधरी", "quality-declined": "डेटा गुणवत्ता घटी", stable: "कोई महत्वपूर्ण बदलाव नहीं" }, topics: { "cash-flow": "कैश फ्लो", spending: "खर्च", goals: "लक्ष्य", payables: "देय राशि", overview: "वित्तीय ब्रीफिंग", quality: "डेटा गुणवत्ता" } },
    saved: { title: "सहेजे और समाधान किए संकेत", description: "महत्वपूर्ण संकेत सुरक्षित रखें और काम पूरा होने पर समाधान चिह्नित करें।", saved: "सहेजा", resolved: "समाधान", empty: "अभी कोई संकेत सहेजा नहीं गया।", save: "संकेत सहेजें", remove: "सहेजा संकेत हटाएं", resolve: "समाधान चिह्नित करें", restore: "वापस लाएं", saving: "सेव हो रहा है…", unavailable: "सहेजे संकेत अभी उपलब्ध नहीं हैं।" },
    scenarios: { title: "सिनेरियो लैब", description: "दर्ज मासिक सारांश से निश्चित परिणाम परखें। कोई रिकॉर्ड नहीं बदलता।", spendingTitle: "लचीला खर्च घटाएं", spendingDescription: "देखें प्रतिशत कमी मासिक नेट और वार्षिक प्रभाव को कैसे बदलती है।", spendingReduction: (value) => `${value}% कमी`, monthlyImprovement: "मासिक सुधार", projectedNet: "अनुमानित मासिक नेट", annualImpact: "12-महीने का प्रभाव", incomeTitle: "आय तनाव परीक्षण", incomeDescription: "दर्ज आय अस्थायी रूप से घटने पर मासिक स्थिति देखें।", incomeReduction: (value) => `${value}% आय कमी`, projectedIncome: "अनुमानित आय", monthlyImpact: "मासिक आय प्रभाव", payablesTitle: "देय भुगतान योजना", payablesDescription: "पूरे महीनों का अनुमान पाने के लिए नियोजित मासिक भुगतान दर्ज करें।", monthlyPayment: "नियोजित मासिक भुगतान", monthsToClear: "समाप्ति का अनुमानित समय", months: (value) => `${value} महीने`, unavailable: "गणना के लिए सकारात्मक मासिक भुगतान दर्ज करें।", calculationNotice: "केवल सीधी गणना। ब्याज, शुल्क, कर और भविष्य के बदलाव शामिल नहीं हैं।" },
  },
  es: {
    eyebrow: "Inteligencia para decidir", title: "Tu espacio de inteligencia financiera", description: "Compara cambios, mejora los datos, guarda señales importantes y prueba decisiones sin modificar registros.",
    quality: { title: "Puntuación de calidad de datos", description: "Mide actualidad, cobertura, categorización e historial; no el rendimiento financiero.", score: "puntuación de calidad", categoryComplete: (value) => `${value}% de gastos categorizados`, grades: { excellent: "Excelente", good: "Buena", fair: "Aceptable", limited: "Limitada" }, issuesTitle: "Mejora el informe", noIssues: "Tus datos registrados son suficientemente sólidos para un informe de alta confianza.", issues: { "no-records": "Añade transacciones para identificar cambios reales.", "stale-records": "Faltan transacciones recientes; actualiza tus registros.", "low-volume": "Más historial hará las comparaciones más fiables.", uncategorized: "Categoriza más gastos para mejorar las señales.", "no-income": "Registra ingresos para completar el flujo y el ahorro.", "no-active-account": "Añade una cuenta activa para mejorar el contexto.", "short-history": "Crea al menos tres meses de historial para mejores tendencias." } },
    timeline: { title: "Qué cambió", description: "Compara este informe registrado con la instantánea anterior.", previous: (value) => `Instantánea anterior ${value}`, events: { baseline: "Línea base creada", new: "Nueva señal", improved: "Mejoró", worsened: "Necesita más atención", resolved: "Resuelto", changed: "Actualizado", "quality-improved": "Mejoró la calidad de datos", "quality-declined": "Bajó la calidad de datos", stable: "Sin cambios importantes" }, topics: { "cash-flow": "Flujo de caja", spending: "Gastos", goals: "Objetivos", payables: "Pagos pendientes", overview: "Informe financiero", quality: "Calidad de datos" } },
    saved: { title: "Señales guardadas y resueltas", description: "Conserva señales importantes y marca un asunto como resuelto cuando lo hayas atendido.", saved: "Guardada", resolved: "Resuelta", empty: "Todavía no has guardado señales.", save: "Guardar señal", remove: "Quitar señal guardada", resolve: "Marcar resuelta", restore: "Restaurar", saving: "Guardando…", unavailable: "Las señales guardadas no están disponibles temporalmente." },
    scenarios: { title: "Laboratorio de escenarios", description: "Prueba resultados deterministas con tu resumen mensual sin modificar registros.", spendingTitle: "Reducir gasto flexible", spendingDescription: "Comprueba cómo una reducción cambia el neto mensual y el impacto anual.", spendingReduction: (value) => `${value}% de reducción`, monthlyImprovement: "Mejora mensual", projectedNet: "Neto mensual proyectado", annualImpact: "Impacto a 12 meses", incomeTitle: "Prueba de estrés de ingresos", incomeDescription: "Comprueba la posición mensual si el ingreso registrado disminuye temporalmente.", incomeReduction: (value) => `${value}% menos ingresos`, projectedIncome: "Ingreso proyectado", monthlyImpact: "Impacto mensual", payablesTitle: "Plan de pago de pendientes", payablesDescription: "Introduce un pago mensual previsto para estimar los meses completos necesarios.", monthlyPayment: "Pago mensual previsto", monthsToClear: "Tiempo estimado", months: (value) => `${value} mes${value === 1 ? "" : "es"}`, unavailable: "Introduce un pago mensual positivo para calcular.", calculationNotice: "Cálculo lineal. No supone intereses, comisiones, impuestos ni cambios futuros." },
  },
};

export function getAIInsightsWorkspaceCopy(language: AppLanguage) {
  return COPY[language] ?? COPY.en;
}
