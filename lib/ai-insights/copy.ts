import type { AppLanguage } from "@/lib/i18n/config";

export type InsightConfidence = "high" | "medium" | "low";
export type InsightPriority = "high" | "medium" | "low";

export type AIInsightsCopy = {
  toolbar: {
    title: string;
    description: string;
    readOnly: string;
  };
  trust: {
    title: string;
    description: string;
    readOnly: string;
    locale: string;
    currency: string;
    coverage: string;
    freshness: string;
    weekStarts: (day: string) => string;
    liveRate: string;
    savedRate: string;
    unavailableRate: string;
    checkingRecords: string;
    activeSources: (count: number) => string;
    coverageUnavailable: string;
    dataThrough: (date: string) => string;
    noTransactionDate: string;
    contextChecked: (date: string) => string;
    unavailable: string;
    localeRemainsActive: string;
    whyWrong: string;
    review: string;
    close: string;
    analysisBoundary: string;
    analysisBoundaryDetail: string;
    limitations: string;
    recordOnly: string;
    categoryQuality: string;
    informational: string;
    transactions: (count: number | null) => string;
    accounts: (count: number | null) => string;
    goals: (count: number | null) => string;
  };
  panel: {
    health: string;
    healthAria: string;
    loadingOverview: string;
    healthPending: string;
    briefing: string;
    refresh: string;
    refreshAria: string;
    providerUnavailable: string;
    localFallback: string;
    unavailable: string;
    tryAgainLater: string;
    tryAgain: string;
    briefingReadyToGrow: string;
    addRecords: string;
    nextMoves: string;
    actionsPending: string;
    spendingFocus: string;
    categoriesPending: string;
    recentPulse: string;
    trendsPending: string;
    askFinances: string;
    askTitle: string;
    askDescription: string;
    thinking: string;
    placeholder: string;
    questionAria: string;
    sendAria: string;
    moneyIn: string;
    moneyOut: string;
    generated: (date: string) => string;
  };
  metadata: {
    why: string;
    evidence: string;
    confidence: string;
    dataThrough: string;
    generatedAt: string;
    review: string;
    close: string;
    noDate: string;
    accuracyNotice: string;
  };
  confidence: Record<InsightConfidence, string>;
  priority: Record<InsightPriority, string>;
  health: {
    excellent: string;
    good: string;
    fair: string;
    attention: string;
  };
  summary: {
    income: string;
    expenses: string;
    netBalance: string;
    payables: string;
    savingsRate: (value: number) => string;
    aboveLastMonth: (value: string) => string;
    belowLastMonth: (value: string) => string;
    currentSpending: string;
    cashBalance: (value: string) => string;
    overdue: (count: number) => string;
  };
  evidence: {
    monthNet: string;
    monthIncome: string;
    monthExpenses: string;
    topCategory: string;
    goalsProgress: string;
    activeGoals: string;
    outstandingPayables: string;
    overdueRecords: string;
    savingsRate: string;
    estimatedNetWorth: string;
  };
  why: {
    monthlyNet: string;
    spending: string;
    goals: string;
    payables: string;
    general: string;
  };
  deterministic: {
    monthlyPositiveTitle: string;
    monthlyNegativeTitle: string;
    monthlyPositiveMessage: (value: string) => string;
    monthlyNegativeMessage: (value: string) => string;
    categoryTitle: (category: string) => string;
    categoryMessage: (category: string, value: string) => string;
    noCategoryTitle: string;
    noCategoryMessage: string;
    goalsTitle: string;
    goalsMessage: (percent: number, count: number) => string;
    noGoalsMessage: string;
    payablesTitle: string;
    payablesMessage: (value: string, overdue: number) => string;
    noPayablesMessage: string;
    allocateSurplus: string;
    reduceCategory: string;
    allocateSurplusDetail: string;
    reduceCategoryDetail: (category: string | null) => string;
    reviewPayables: string;
    reviewPayablesDetail: string;
    keepRecordsCurrent: string;
    keepRecordsCurrentDetail: string;
  };
  starterPrompts: [string, string, string];
  server: {
    authRequired: string;
    emptyMessage: string;
    unavailable: string;
  };
};

const COPY: Record<AppLanguage, AIInsightsCopy> = {
  en: {
    toolbar: {
      title: "Personalized finance intelligence",
      description: "Review the strongest signals first, then move from insight to a clear next action.",
      readOnly: "Read-only analysis",
    },
    trust: {
      title: "Global intelligence context",
      description: "JALVORO localizes presentation to your selected language and explains the recorded-data coverage behind this briefing.",
      readOnly: "Read-only",
      locale: "Locale",
      currency: "Currency",
      coverage: "Recorded coverage",
      freshness: "Freshness",
      weekStarts: (day) => `Week starts ${day}`,
      liveRate: "Live exchange rate",
      savedRate: "Saved exchange rate",
      unavailableRate: "Exchange rate unavailable",
      checkingRecords: "Checking finance records…",
      activeSources: (count) => `${count} active finance source${count === 1 ? "" : "s"}`,
      coverageUnavailable: "Coverage unavailable",
      dataThrough: (date) => `Data through ${date}`,
      noTransactionDate: "No transaction date available",
      contextChecked: (date) => `Context checked ${date}`,
      unavailable: "Trust context is temporarily unavailable.",
      localeRemainsActive: "Language, locale, and currency settings remain active.",
      whyWrong: "Why this briefing can still be wrong",
      review: "Review",
      close: "Close",
      analysisBoundary: "Analysis boundary",
      analysisBoundaryDetail: "The AI receives an aggregated finance summary. Raw transaction rows are not included in the provider prompt, and this page cannot move money or edit records.",
      limitations: "Known limitations",
      recordOnly: "Insights only reflect finance records currently stored in JALVORO.",
      categoryQuality: "Missing or incorrect categories can reduce the quality of spending signals.",
      informational: "JALVORO AI provides informational analysis, not financial, tax, or legal advice.",
      transactions: (count) => count === null ? "Transactions unavailable" : `${count.toLocaleString("en-US")} transaction${count === 1 ? "" : "s"}`,
      accounts: (count) => count === null ? "Accounts unavailable" : `${count.toLocaleString("en-US")} active account${count === 1 ? "" : "s"}`,
      goals: (count) => count === null ? "Goals unavailable" : `${count.toLocaleString("en-US")} goal${count === 1 ? "" : "s"}`,
    },
    panel: {
      health: "Financial health",
      healthAria: "Financial health score",
      loadingOverview: "Loading financial overview",
      healthPending: "Your health score will appear once enough finance activity is available.",
      briefing: "Financial briefing",
      refresh: "Refresh",
      refreshAria: "Regenerate AI insights",
      providerUnavailable: "Gemini is temporarily unavailable",
      localFallback: "Verified local finance guidance is shown until the connection is restored.",
      unavailable: "AI insights are temporarily unavailable.",
      tryAgainLater: "Try again later.",
      tryAgain: "Try again",
      briefingReadyToGrow: "Your briefing is ready to grow",
      addRecords: "Add finance records and refresh to generate your briefing.",
      nextMoves: "Next best moves",
      actionsPending: "Suggested actions will appear after JALVORO reviews your summary.",
      spendingFocus: "Spending focus",
      categoriesPending: "Category totals appear after expenses are categorized.",
      recentPulse: "Recent pulse",
      trendsPending: "Recent trends will appear after you add transactions.",
      askFinances: "Ask your finances",
      askTitle: "What would you like to understand?",
      askDescription: "Ask about spending, cash flow, payables, goals, investments, or recent trends.",
      thinking: "Thinking",
      placeholder: "Ask a finance question…",
      questionAria: "Finance question",
      sendAria: "Send finance question",
      moneyIn: "in",
      moneyOut: "out",
      generated: (date) => `Generated ${date}`,
    },
    metadata: {
      why: "Why this insight",
      evidence: "Evidence",
      confidence: "Evidence confidence",
      dataThrough: "Data through",
      generatedAt: "Generated",
      review: "Review evidence",
      close: "Close evidence",
      noDate: "No recorded transaction date",
      accuracyNotice: "Confidence describes the strength of recorded evidence, not a guarantee that the conclusion is correct.",
    },
    confidence: { high: "High", medium: "Medium", low: "Low" },
    priority: { high: "High", medium: "Medium", low: "Low" },
    health: { excellent: "Excellent", good: "Good", fair: "Fair", attention: "Needs attention" },
    summary: {
      income: "Month income",
      expenses: "Month expenses",
      netBalance: "Net balance",
      payables: "Payables due",
      savingsRate: (value) => `${value}% savings rate`,
      aboveLastMonth: (value) => `${value} above last month`,
      belowLastMonth: (value) => `${value} below last month`,
      currentSpending: "Current month spending",
      cashBalance: (value) => `${value} cash balance`,
      overdue: (count) => `${count} overdue record${count === 1 ? "" : "s"}`,
    },
    evidence: {
      monthNet: "Current month net",
      monthIncome: "Current month income",
      monthExpenses: "Current month expenses",
      topCategory: "Top spending category",
      goalsProgress: "Goal funding progress",
      activeGoals: "Recorded goals",
      outstandingPayables: "Outstanding payables",
      overdueRecords: "Overdue records",
      savingsRate: "Savings rate",
      estimatedNetWorth: "Estimated net balance",
    },
    why: {
      monthlyNet: "This signal compares recorded income and expenses for the current month.",
      spending: "This signal uses categorized expense totals to identify the strongest spending concentration.",
      goals: "This signal uses recorded goal targets and saved amounts to assess funding progress.",
      payables: "This signal uses recorded remaining balances and overdue status across payables.",
      general: "This signal is based on the aggregated finance summary available to JALVORO AI.",
    },
    deterministic: {
      monthlyPositiveTitle: "Positive monthly net",
      monthlyNegativeTitle: "Monthly net needs attention",
      monthlyPositiveMessage: (value) => `This month is ahead by ${value} after recorded expenses.`,
      monthlyNegativeMessage: (value) => `This month is short by ${value}; review flexible spending first.`,
      categoryTitle: (category) => `${category} is the top category`,
      categoryMessage: (category, value) => `${category} has reached ${value} this month.`,
      noCategoryTitle: "No category spending yet",
      noCategoryMessage: "Add categorized expenses to get stronger spending guidance.",
      goalsTitle: "Goal progress",
      goalsMessage: (percent, count) => `Goals are ${percent}% funded across ${count} recorded target${count === 1 ? "" : "s"}.`,
      noGoalsMessage: "Create one savings goal to make monthly surplus easier to direct.",
      payablesTitle: "Payables check",
      payablesMessage: (value, overdue) => `${value} remains payable, with ${overdue} overdue record${overdue === 1 ? "" : "s"}.`,
      noPayablesMessage: "No outstanding payable balance is visible in the current summary.",
      allocateSurplus: "Allocate monthly surplus",
      reduceCategory: "Reduce the biggest category",
      allocateSurplusDetail: "Move a clear amount from this month's surplus into goals or investments.",
      reduceCategoryDetail: (category) => category ? `Start with ${category}, the largest current expense category.` : "Review recent expenses and pause non-essential spending.",
      reviewPayables: "Review payable commitments",
      reviewPayablesDetail: "Prioritize overdue and high remaining payables before adding new obligations.",
      keepRecordsCurrent: "Keep records current",
      keepRecordsCurrentDetail: "Refresh categories and account balances so JALVORO can compare month-to-month movement.",
    },
    starterPrompts: ["Where did I spend the most?", "How can I improve my cash flow?", "What should I focus on next?"],
    server: {
      authRequired: "Please log in before using AI insights.",
      emptyMessage: "Add or refresh finance records to build your personalized briefing.",
      unavailable: "AI insights are temporarily unavailable.",
    },
  },
  ur: {
    toolbar: {
      title: "ذاتی مالی ذہانت",
      description: "پہلے سب سے اہم اشارے دیکھیں، پھر واضح اگلے قدم کی طرف بڑھیں۔",
      readOnly: "صرف تجزیہ",
    },
    trust: {
      title: "عالمی ذہانت کا سیاق",
      description: "JALVORO آپ کی منتخب زبان کے مطابق پیشکش بناتا ہے اور اس بریفنگ کے پیچھے موجود ریکارڈ شدہ ڈیٹا کی وضاحت کرتا ہے۔",
      readOnly: "صرف پڑھنے کے لیے",
      locale: "لوکیل",
      currency: "کرنسی",
      coverage: "ریکارڈ شدہ کوریج",
      freshness: "تازگی",
      weekStarts: (day) => `ہفتہ ${day} سے شروع ہوتا ہے`,
      liveRate: "لائیو ایکسچینج ریٹ",
      savedRate: "محفوظ ایکسچینج ریٹ",
      unavailableRate: "ایکسچینج ریٹ دستیاب نہیں",
      checkingRecords: "مالی ریکارڈ چیک ہو رہے ہیں…",
      activeSources: (count) => `${count} فعال مالی ذریعہ`,
      coverageUnavailable: "کوریج دستیاب نہیں",
      dataThrough: (date) => `${date} تک کا ڈیٹا`,
      noTransactionDate: "کوئی ٹرانزیکشن تاریخ دستیاب نہیں",
      contextChecked: (date) => `سیاق ${date} کو چیک ہوا`,
      unavailable: "اعتماد کا سیاق عارضی طور پر دستیاب نہیں۔",
      localeRemainsActive: "زبان، لوکیل اور کرنسی کی سیٹنگز فعال رہیں گی۔",
      whyWrong: "یہ بریفنگ پھر بھی غلط کیوں ہو سکتی ہے",
      review: "دیکھیں",
      close: "بند کریں",
      analysisBoundary: "تجزیے کی حد",
      analysisBoundaryDetail: "AI کو مجموعی مالی خلاصہ ملتا ہے۔ خام ٹرانزیکشن قطاریں پرامپٹ میں شامل نہیں ہوتیں، اور یہ صفحہ رقم منتقل یا ریکارڈ تبدیل نہیں کر سکتا۔",
      limitations: "معلوم حدود",
      recordOnly: "Insights صرف JALVORO میں موجود مالی ریکارڈ دکھاتے ہیں۔",
      categoryQuality: "غائب یا غلط کیٹیگریز خرچ کے اشاروں کا معیار کم کر سکتی ہیں۔",
      informational: "JALVORO AI معلوماتی تجزیہ دیتا ہے، مالی، ٹیکس یا قانونی مشورہ نہیں۔",
      transactions: (count) => count === null ? "ٹرانزیکشنز دستیاب نہیں" : `${count.toLocaleString("ur-PK")} ٹرانزیکشنز`,
      accounts: (count) => count === null ? "اکاؤنٹس دستیاب نہیں" : `${count.toLocaleString("ur-PK")} فعال اکاؤنٹس`,
      goals: (count) => count === null ? "اہداف دستیاب نہیں" : `${count.toLocaleString("ur-PK")} اہداف`,
    },
    panel: {
      health: "مالی صحت",
      healthAria: "مالی صحت کا اسکور",
      loadingOverview: "مالی جائزہ لوڈ ہو رہا ہے",
      healthPending: "کافی مالی سرگرمی کے بعد صحت کا اسکور نظر آئے گا۔",
      briefing: "مالی بریفنگ",
      refresh: "تازہ کریں",
      refreshAria: "AI Insights دوبارہ بنائیں",
      providerUnavailable: "Gemini عارضی طور پر دستیاب نہیں",
      localFallback: "کنکشن بحال ہونے تک تصدیق شدہ مقامی مالی رہنمائی دکھائی جا رہی ہے۔",
      unavailable: "AI Insights عارضی طور پر دستیاب نہیں۔",
      tryAgainLater: "بعد میں دوبارہ کوشش کریں۔",
      tryAgain: "دوبارہ کوشش",
      briefingReadyToGrow: "آپ کی بریفنگ بہتر ہونے کے لیے تیار ہے",
      addRecords: "بریفنگ بنانے کے لیے مالی ریکارڈ شامل کرکے تازہ کریں۔",
      nextMoves: "بہترین اگلے اقدامات",
      actionsPending: "JALVORO کے خلاصہ دیکھنے کے بعد تجاویز نظر آئیں گی۔",
      spendingFocus: "خرچ کی توجہ",
      categoriesPending: "اخراجات کی کیٹیگریز مکمل ہونے کے بعد مجموعے نظر آئیں گے۔",
      recentPulse: "حالیہ صورتحال",
      trendsPending: "ٹرانزیکشنز شامل کرنے کے بعد حالیہ رجحانات نظر آئیں گے۔",
      askFinances: "اپنے مالیات سے پوچھیں",
      askTitle: "آپ کیا سمجھنا چاہتے ہیں؟",
      askDescription: "خرچ، کیش فلو، واجبات، اہداف، سرمایہ کاری یا حالیہ رجحانات کے بارے میں پوچھیں۔",
      thinking: "سوچ رہا ہے",
      placeholder: "مالی سوال پوچھیں…",
      questionAria: "مالی سوال",
      sendAria: "مالی سوال بھیجیں",
      moneyIn: "آمدنی",
      moneyOut: "خرچ",
      generated: (date) => `${date} کو تیار ہوا`,
    },
    metadata: {
      why: "یہ Insight کیوں",
      evidence: "ثبوت",
      confidence: "ثبوت کا اعتماد",
      dataThrough: "ڈیٹا یہاں تک",
      generatedAt: "تیار ہوا",
      review: "ثبوت دیکھیں",
      close: "ثبوت بند کریں",
      noDate: "کوئی ریکارڈ شدہ ٹرانزیکشن تاریخ نہیں",
      accuracyNotice: "اعتماد ریکارڈ شدہ ثبوت کی مضبوطی بتاتا ہے، نتیجے کی ضمانت نہیں۔",
    },
    confidence: { high: "زیادہ", medium: "درمیانہ", low: "کم" },
    priority: { high: "زیادہ", medium: "درمیانہ", low: "کم" },
    health: { excellent: "بہترین", good: "اچھی", fair: "مناسب", attention: "توجہ درکار" },
    summary: {
      income: "ماہانہ آمدنی",
      expenses: "ماہانہ خرچ",
      netBalance: "خالص بیلنس",
      payables: "واجب الادا رقم",
      savingsRate: (value) => `${value}% بچت کی شرح`,
      aboveLastMonth: (value) => `گزشتہ ماہ سے ${value} زیادہ`,
      belowLastMonth: (value) => `گزشتہ ماہ سے ${value} کم`,
      currentSpending: "موجودہ ماہ کا خرچ",
      cashBalance: (value) => `${value} نقد بیلنس`,
      overdue: (count) => `${count} تاخیر شدہ ریکارڈ`,
    },
    evidence: {
      monthNet: "موجودہ ماہ کا خالص نتیجہ",
      monthIncome: "موجودہ ماہ کی آمدنی",
      monthExpenses: "موجودہ ماہ کے اخراجات",
      topCategory: "سب سے بڑی خرچ کی کیٹیگری",
      goalsProgress: "اہداف کی فنڈنگ",
      activeGoals: "ریکارڈ شدہ اہداف",
      outstandingPayables: "باقی واجبات",
      overdueRecords: "تاخیر شدہ ریکارڈز",
      savingsRate: "بچت کی شرح",
      estimatedNetWorth: "اندازاً خالص بیلنس",
    },
    why: {
      monthlyNet: "یہ اشارہ موجودہ ماہ کی ریکارڈ شدہ آمدنی اور اخراجات کا موازنہ کرتا ہے۔",
      spending: "یہ اشارہ کیٹیگری کے مطابق اخراجات میں سب سے بڑی توجہ دکھاتا ہے۔",
      goals: "یہ اشارہ ریکارڈ شدہ ہدف اور محفوظ رقم سے فنڈنگ کی پیش رفت دیکھتا ہے۔",
      payables: "یہ اشارہ واجبات کی باقی رقم اور تاخیر شدہ حیثیت استعمال کرتا ہے۔",
      general: "یہ اشارہ JALVORO AI کو دستیاب مجموعی مالی خلاصے پر مبنی ہے۔",
    },
    deterministic: {
      monthlyPositiveTitle: "مثبت ماہانہ خالص نتیجہ",
      monthlyNegativeTitle: "ماہانہ خالص نتیجے پر توجہ دیں",
      monthlyPositiveMessage: (value) => `ریکارڈ شدہ اخراجات کے بعد یہ ماہ ${value} آگے ہے۔`,
      monthlyNegativeMessage: (value) => `یہ ماہ ${value} کم ہے؛ پہلے لچکدار خرچ کا جائزہ لیں۔`,
      categoryTitle: (category) => `${category} سب سے بڑی کیٹیگری ہے`,
      categoryMessage: (category, value) => `${category} میں اس ماہ ${value} خرچ ہوا۔`,
      noCategoryTitle: "ابھی کیٹیگری خرچ موجود نہیں",
      noCategoryMessage: "بہتر رہنمائی کے لیے اخراجات کو کیٹیگرائز کریں۔",
      goalsTitle: "اہداف کی پیش رفت",
      goalsMessage: (percent, count) => `${count} ریکارڈ شدہ اہداف میں فنڈنگ ${percent}% ہے۔`,
      noGoalsMessage: "ماہانہ اضافی رقم کو سمت دینے کے لیے ایک بچت ہدف بنائیں۔",
      payablesTitle: "واجبات کا جائزہ",
      payablesMessage: (value, overdue) => `${value} باقی ہے، جس میں ${overdue} تاخیر شدہ ریکارڈ شامل ہیں۔`,
      noPayablesMessage: "موجودہ خلاصے میں کوئی باقی واجب الادا بیلنس نظر نہیں آتا۔",
      allocateSurplus: "ماہانہ اضافی رقم مختص کریں",
      reduceCategory: "سب سے بڑی کیٹیگری کم کریں",
      allocateSurplusDetail: "اس ماہ کی اضافی رقم میں سے واضح حصہ ہدف یا سرمایہ کاری میں منتقل کریں۔",
      reduceCategoryDetail: (category) => category ? `${category} سے شروع کریں، جو موجودہ سب سے بڑی خرچ کی کیٹیگری ہے۔` : "حالیہ اخراجات دیکھیں اور غیر ضروری خرچ روکیں۔",
      reviewPayables: "واجبات کا جائزہ لیں",
      reviewPayablesDetail: "نئی ذمہ داری سے پہلے تاخیر شدہ اور بڑی باقی رقم کو ترجیح دیں۔",
      keepRecordsCurrent: "ریکارڈ تازہ رکھیں",
      keepRecordsCurrentDetail: "کیٹیگریز اور اکاؤنٹ بیلنس تازہ رکھیں تاکہ ماہ بہ ماہ موازنہ درست رہے۔",
    },
    starterPrompts: ["میں نے سب سے زیادہ کہاں خرچ کیا؟", "میں کیش فلو کیسے بہتر کر سکتا ہوں؟", "مجھے اگلا فوکس کس پر کرنا چاہیے؟"],
    server: {
      authRequired: "AI Insights استعمال کرنے سے پہلے لاگ اِن کریں۔",
      emptyMessage: "اپنی ذاتی مالی بریفنگ کے لیے ریکارڈ شامل یا تازہ کریں۔",
      unavailable: "AI Insights عارضی طور پر دستیاب نہیں۔",
    },
  },
  ar: {
    toolbar: {
      title: "ذكاء مالي مخصص",
      description: "راجع أقوى الإشارات أولًا، ثم انتقل إلى خطوة تالية واضحة.",
      readOnly: "تحليل للقراءة فقط",
    },
    trust: {
      title: "سياق الذكاء العالمي",
      description: "يكيّف JALVORO العرض مع لغتك المختارة ويوضح تغطية البيانات المسجلة خلف هذا الموجز.",
      readOnly: "للقراءة فقط",
      locale: "الإعداد المحلي",
      currency: "العملة",
      coverage: "التغطية المسجلة",
      freshness: "حداثة البيانات",
      weekStarts: (day) => `يبدأ الأسبوع يوم ${day}`,
      liveRate: "سعر صرف مباشر",
      savedRate: "سعر صرف محفوظ",
      unavailableRate: "سعر الصرف غير متاح",
      checkingRecords: "جارٍ فحص السجلات المالية…",
      activeSources: (count) => `${count} مصدر مالي نشط`,
      coverageUnavailable: "التغطية غير متاحة",
      dataThrough: (date) => `البيانات حتى ${date}`,
      noTransactionDate: "لا يوجد تاريخ معاملة متاح",
      contextChecked: (date) => `تم فحص السياق ${date}`,
      unavailable: "سياق الثقة غير متاح مؤقتًا.",
      localeRemainsActive: "تبقى إعدادات اللغة والمنطقة والعملة فعالة.",
      whyWrong: "لماذا قد يكون هذا الموجز غير صحيح",
      review: "مراجعة",
      close: "إغلاق",
      analysisBoundary: "حدود التحليل",
      analysisBoundaryDetail: "يتلقى الذكاء ملخصًا ماليًا مجمعًا. لا تُرسل صفوف المعاملات الخام إلى المزوّد، ولا يمكن لهذه الصفحة نقل الأموال أو تعديل السجلات.",
      limitations: "القيود المعروفة",
      recordOnly: "تعكس الرؤى السجلات المالية الموجودة حاليًا في JALVORO فقط.",
      categoryQuality: "قد تقلل الفئات المفقودة أو غير الصحيحة من جودة إشارات الإنفاق.",
      informational: "يقدم JALVORO AI تحليلًا معلوماتيًا وليس نصيحة مالية أو ضريبية أو قانونية.",
      transactions: (count) => count === null ? "المعاملات غير متاحة" : `${count.toLocaleString("ar")} معاملة`,
      accounts: (count) => count === null ? "الحسابات غير متاحة" : `${count.toLocaleString("ar")} حساب نشط`,
      goals: (count) => count === null ? "الأهداف غير متاحة" : `${count.toLocaleString("ar")} هدف`,
    },
    panel: {
      health: "الصحة المالية",
      healthAria: "درجة الصحة المالية",
      loadingOverview: "جارٍ تحميل النظرة المالية",
      healthPending: "ستظهر درجة الصحة بعد توفر نشاط مالي كافٍ.",
      briefing: "الموجز المالي",
      refresh: "تحديث",
      refreshAria: "إعادة إنشاء الرؤى",
      providerUnavailable: "Gemini غير متاح مؤقتًا",
      localFallback: "يتم عرض إرشاد مالي محلي موثّق حتى عودة الاتصال.",
      unavailable: "الرؤى غير متاحة مؤقتًا.",
      tryAgainLater: "حاول مرة أخرى لاحقًا.",
      tryAgain: "حاول مجددًا",
      briefingReadyToGrow: "موجزك جاهز للتحسن",
      addRecords: "أضف سجلات مالية ثم حدّث لإنشاء الموجز.",
      nextMoves: "أفضل الخطوات التالية",
      actionsPending: "ستظهر الإجراءات بعد مراجعة JALVORO لملخصك.",
      spendingFocus: "تركيز الإنفاق",
      categoriesPending: "تظهر إجماليات الفئات بعد تصنيف المصروفات.",
      recentPulse: "النبض الأخير",
      trendsPending: "تظهر الاتجاهات بعد إضافة المعاملات.",
      askFinances: "اسأل بياناتك المالية",
      askTitle: "ما الذي تريد فهمه؟",
      askDescription: "اسأل عن الإنفاق أو التدفق النقدي أو المستحقات أو الأهداف أو الاستثمارات أو الاتجاهات.",
      thinking: "جارٍ التفكير",
      placeholder: "اكتب سؤالًا ماليًا…",
      questionAria: "سؤال مالي",
      sendAria: "إرسال السؤال المالي",
      moneyIn: "داخل",
      moneyOut: "خارج",
      generated: (date) => `تم الإنشاء ${date}`,
    },
    metadata: {
      why: "لماذا هذه الرؤية",
      evidence: "الأدلة",
      confidence: "الثقة في الأدلة",
      dataThrough: "البيانات حتى",
      generatedAt: "تم الإنشاء",
      review: "مراجعة الأدلة",
      close: "إغلاق الأدلة",
      noDate: "لا يوجد تاريخ معاملة مسجل",
      accuracyNotice: "تصف الثقة قوة الأدلة المسجلة، وليست ضمانًا لصحة النتيجة.",
    },
    confidence: { high: "مرتفعة", medium: "متوسطة", low: "منخفضة" },
    priority: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
    health: { excellent: "ممتازة", good: "جيدة", fair: "مقبولة", attention: "تحتاج انتباهًا" },
    summary: {
      income: "دخل الشهر",
      expenses: "مصروفات الشهر",
      netBalance: "الرصيد الصافي",
      payables: "المستحقات",
      savingsRate: (value) => `معدل الادخار ${value}%`,
      aboveLastMonth: (value) => `أعلى من الشهر الماضي بـ ${value}`,
      belowLastMonth: (value) => `أقل من الشهر الماضي بـ ${value}`,
      currentSpending: "إنفاق الشهر الحالي",
      cashBalance: (value) => `رصيد نقدي ${value}`,
      overdue: (count) => `${count} سجل متأخر`,
    },
    evidence: {
      monthNet: "صافي الشهر الحالي",
      monthIncome: "دخل الشهر الحالي",
      monthExpenses: "مصروفات الشهر الحالي",
      topCategory: "أكبر فئة إنفاق",
      goalsProgress: "تقدم تمويل الأهداف",
      activeGoals: "الأهداف المسجلة",
      outstandingPayables: "المستحقات المتبقية",
      overdueRecords: "السجلات المتأخرة",
      savingsRate: "معدل الادخار",
      estimatedNetWorth: "الرصيد الصافي المقدر",
    },
    why: {
      monthlyNet: "تقارن هذه الإشارة الدخل والمصروفات المسجلة للشهر الحالي.",
      spending: "تستخدم هذه الإشارة إجماليات المصروفات المصنفة لتحديد أكبر تركّز للإنفاق.",
      goals: "تستخدم هذه الإشارة أهدافك المسجلة والمبالغ المدخرة لقياس التقدم.",
      payables: "تستخدم هذه الإشارة الأرصدة المتبقية وحالة التأخر للمستحقات.",
      general: "تعتمد هذه الإشارة على الملخص المالي المجمع المتاح لـ JALVORO AI.",
    },
    deterministic: {
      monthlyPositiveTitle: "صافي شهري إيجابي",
      monthlyNegativeTitle: "الصافي الشهري يحتاج انتباهًا",
      monthlyPositiveMessage: (value) => `هذا الشهر متقدم بمقدار ${value} بعد المصروفات المسجلة.`,
      monthlyNegativeMessage: (value) => `هذا الشهر أقل بمقدار ${value}؛ راجع الإنفاق المرن أولًا.`,
      categoryTitle: (category) => `${category} هي الفئة الأعلى`,
      categoryMessage: (category, value) => `بلغ الإنفاق على ${category} مقدار ${value} هذا الشهر.`,
      noCategoryTitle: "لا يوجد إنفاق مصنف بعد",
      noCategoryMessage: "صنّف المصروفات للحصول على إرشاد أقوى.",
      goalsTitle: "تقدم الأهداف",
      goalsMessage: (percent, count) => `تم تمويل ${count} هدف مسجل بنسبة ${percent}%.`,
      noGoalsMessage: "أنشئ هدف ادخار لتوجيه الفائض الشهري.",
      payablesTitle: "فحص المستحقات",
      payablesMessage: (value, overdue) => `يتبقى ${value}، مع ${overdue} سجل متأخر.`,
      noPayablesMessage: "لا يظهر رصيد مستحق متبقٍ في الملخص الحالي.",
      allocateSurplus: "خصص الفائض الشهري",
      reduceCategory: "خفّض أكبر فئة",
      allocateSurplusDetail: "انقل مبلغًا واضحًا من فائض الشهر إلى الأهداف أو الاستثمارات.",
      reduceCategoryDetail: (category) => category ? `ابدأ بـ ${category}، أكبر فئة مصروفات حاليًا.` : "راجع المصروفات الأخيرة وأوقف الإنفاق غير الضروري.",
      reviewPayables: "راجع الالتزامات المستحقة",
      reviewPayablesDetail: "أعطِ الأولوية للمبالغ المتأخرة والكبيرة قبل إضافة التزامات جديدة.",
      keepRecordsCurrent: "حافظ على تحديث السجلات",
      keepRecordsCurrentDetail: "حدّث الفئات وأرصدة الحسابات لتحسين المقارنة الشهرية.",
    },
    starterPrompts: ["أين أنفقت أكثر؟", "كيف أحسن التدفق النقدي؟", "ما الذي يجب أن أركز عليه الآن؟"],
    server: {
      authRequired: "يرجى تسجيل الدخول قبل استخدام AI Insights.",
      emptyMessage: "أضف السجلات المالية أو حدّثها لإنشاء موجزك المخصص.",
      unavailable: "الرؤى غير متاحة مؤقتًا.",
    },
  },
  hi: {
    toolbar: {
      title: "व्यक्तिगत वित्तीय बुद्धिमत्ता",
      description: "पहले सबसे मजबूत संकेत देखें, फिर स्पष्ट अगले कदम की ओर बढ़ें।",
      readOnly: "केवल-पठन विश्लेषण",
    },
    trust: {
      title: "वैश्विक इंटेलिजेंस संदर्भ",
      description: "JALVORO आपकी चुनी हुई भाषा में प्रस्तुति देता है और इस ब्रीफिंग के पीछे रिकॉर्ड किए गए डेटा की कवरेज समझाता है।",
      readOnly: "केवल पढ़ने योग्य",
      locale: "लोकेल",
      currency: "मुद्रा",
      coverage: "रिकॉर्डेड कवरेज",
      freshness: "ताज़गी",
      weekStarts: (day) => `सप्ताह ${day} से शुरू`,
      liveRate: "लाइव विनिमय दर",
      savedRate: "सहेजी गई विनिमय दर",
      unavailableRate: "विनिमय दर उपलब्ध नहीं",
      checkingRecords: "वित्त रिकॉर्ड जाँचे जा रहे हैं…",
      activeSources: (count) => `${count} सक्रिय वित्त स्रोत`,
      coverageUnavailable: "कवरेज उपलब्ध नहीं",
      dataThrough: (date) => `${date} तक डेटा`,
      noTransactionDate: "कोई लेनदेन तारीख उपलब्ध नहीं",
      contextChecked: (date) => `संदर्भ ${date} को जाँचा गया`,
      unavailable: "ट्रस्ट संदर्भ अस्थायी रूप से उपलब्ध नहीं है।",
      localeRemainsActive: "भाषा, लोकेल और मुद्रा सेटिंग सक्रिय रहेंगी।",
      whyWrong: "यह ब्रीफिंग फिर भी गलत क्यों हो सकती है",
      review: "समीक्षा",
      close: "बंद करें",
      analysisBoundary: "विश्लेषण सीमा",
      analysisBoundaryDetail: "AI को समेकित वित्तीय सारांश मिलता है। कच्ची लेनदेन पंक्तियाँ प्रदाता को नहीं भेजी जातीं, और यह पेज धन स्थानांतरित या रिकॉर्ड संपादित नहीं कर सकता।",
      limitations: "ज्ञात सीमाएँ",
      recordOnly: "इनसाइट केवल JALVORO में मौजूद वित्त रिकॉर्ड दर्शाती हैं।",
      categoryQuality: "गुम या गलत श्रेणियाँ खर्च संकेतों की गुणवत्ता घटा सकती हैं।",
      informational: "JALVORO AI सूचनात्मक विश्लेषण देता है, वित्तीय, कर या कानूनी सलाह नहीं।",
      transactions: (count) => count === null ? "लेनदेन उपलब्ध नहीं" : `${count.toLocaleString("hi-IN")} लेनदेन`,
      accounts: (count) => count === null ? "खाते उपलब्ध नहीं" : `${count.toLocaleString("hi-IN")} सक्रिय खाते`,
      goals: (count) => count === null ? "लक्ष्य उपलब्ध नहीं" : `${count.toLocaleString("hi-IN")} लक्ष्य`,
    },
    panel: {
      health: "वित्तीय स्वास्थ्य",
      healthAria: "वित्तीय स्वास्थ्य स्कोर",
      loadingOverview: "वित्तीय अवलोकन लोड हो रहा है",
      healthPending: "पर्याप्त वित्तीय गतिविधि के बाद स्वास्थ्य स्कोर दिखाई देगा।",
      briefing: "वित्तीय ब्रीफिंग",
      refresh: "रीफ़्रेश",
      refreshAria: "AI इनसाइट फिर बनाएँ",
      providerUnavailable: "Gemini अस्थायी रूप से उपलब्ध नहीं है",
      localFallback: "कनेक्शन लौटने तक सत्यापित स्थानीय वित्त मार्गदर्शन दिखाया जा रहा है।",
      unavailable: "AI इनसाइट अस्थायी रूप से उपलब्ध नहीं हैं।",
      tryAgainLater: "बाद में फिर कोशिश करें।",
      tryAgain: "फिर कोशिश करें",
      briefingReadyToGrow: "आपकी ब्रीफिंग बेहतर होने के लिए तैयार है",
      addRecords: "ब्रीफिंग बनाने के लिए वित्त रिकॉर्ड जोड़ें और रीफ़्रेश करें।",
      nextMoves: "अगले सर्वोत्तम कदम",
      actionsPending: "JALVORO द्वारा सारांश देखने के बाद सुझाव दिखाई देंगे।",
      spendingFocus: "खर्च पर फोकस",
      categoriesPending: "खर्च वर्गीकृत होने के बाद श्रेणी योग दिखाई देंगे।",
      recentPulse: "हाल की स्थिति",
      trendsPending: "लेनदेन जोड़ने के बाद हाल के रुझान दिखाई देंगे।",
      askFinances: "अपने वित्त से पूछें",
      askTitle: "आप क्या समझना चाहते हैं?",
      askDescription: "खर्च, नकदी प्रवाह, देय राशि, लक्ष्य, निवेश या हाल के रुझानों के बारे में पूछें।",
      thinking: "सोच रहा है",
      placeholder: "वित्तीय प्रश्न पूछें…",
      questionAria: "वित्तीय प्रश्न",
      sendAria: "वित्तीय प्रश्न भेजें",
      moneyIn: "आय",
      moneyOut: "खर्च",
      generated: (date) => `${date} को बनाया गया`,
    },
    metadata: {
      why: "यह इनसाइट क्यों",
      evidence: "प्रमाण",
      confidence: "प्रमाण का भरोसा",
      dataThrough: "डेटा यहाँ तक",
      generatedAt: "बनाया गया",
      review: "प्रमाण देखें",
      close: "प्रमाण बंद करें",
      noDate: "कोई रिकॉर्डेड लेनदेन तारीख नहीं",
      accuracyNotice: "भरोसा रिकॉर्डेड प्रमाण की मजबूती बताता है, निष्कर्ष की गारंटी नहीं।",
    },
    confidence: { high: "उच्च", medium: "मध्यम", low: "कम" },
    priority: { high: "उच्च", medium: "मध्यम", low: "कम" },
    health: { excellent: "उत्कृष्ट", good: "अच्छा", fair: "ठीक", attention: "ध्यान चाहिए" },
    summary: {
      income: "महीने की आय",
      expenses: "महीने का खर्च",
      netBalance: "शुद्ध शेष",
      payables: "देय राशि",
      savingsRate: (value) => `${value}% बचत दर`,
      aboveLastMonth: (value) => `पिछले महीने से ${value} अधिक`,
      belowLastMonth: (value) => `पिछले महीने से ${value} कम`,
      currentSpending: "चालू महीने का खर्च",
      cashBalance: (value) => `${value} नकद शेष`,
      overdue: (count) => `${count} विलंबित रिकॉर्ड`,
    },
    evidence: {
      monthNet: "चालू महीने का शुद्ध परिणाम",
      monthIncome: "चालू महीने की आय",
      monthExpenses: "चालू महीने का खर्च",
      topCategory: "सबसे बड़ी खर्च श्रेणी",
      goalsProgress: "लक्ष्य फंडिंग प्रगति",
      activeGoals: "रिकॉर्डेड लक्ष्य",
      outstandingPayables: "बाकी देय राशि",
      overdueRecords: "विलंबित रिकॉर्ड",
      savingsRate: "बचत दर",
      estimatedNetWorth: "अनुमानित शुद्ध शेष",
    },
    why: {
      monthlyNet: "यह संकेत चालू महीने की रिकॉर्डेड आय और खर्च की तुलना करता है।",
      spending: "यह संकेत वर्गीकृत खर्च से सबसे बड़ा खर्च केंद्र पहचानता है।",
      goals: "यह संकेत रिकॉर्डेड लक्ष्य और बचत राशि से फंडिंग प्रगति मापता है।",
      payables: "यह संकेत देय राशि के बाकी शेष और विलंब स्थिति का उपयोग करता है।",
      general: "यह संकेत JALVORO AI को उपलब्ध समेकित वित्तीय सारांश पर आधारित है।",
    },
    deterministic: {
      monthlyPositiveTitle: "सकारात्मक मासिक शुद्ध परिणाम",
      monthlyNegativeTitle: "मासिक शुद्ध परिणाम पर ध्यान दें",
      monthlyPositiveMessage: (value) => `रिकॉर्डेड खर्च के बाद यह महीना ${value} आगे है।`,
      monthlyNegativeMessage: (value) => `यह महीना ${value} कम है; पहले लचीले खर्च की समीक्षा करें।`,
      categoryTitle: (category) => `${category} सबसे बड़ी श्रेणी है`,
      categoryMessage: (category, value) => `${category} में इस महीने ${value} खर्च हुआ।`,
      noCategoryTitle: "अभी श्रेणी खर्च नहीं है",
      noCategoryMessage: "बेहतर मार्गदर्शन के लिए खर्च को वर्गीकृत करें।",
      goalsTitle: "लक्ष्य प्रगति",
      goalsMessage: (percent, count) => `${count} रिकॉर्डेड लक्ष्यों में ${percent}% फंडिंग हुई है।`,
      noGoalsMessage: "मासिक अधिशेष को दिशा देने के लिए एक बचत लक्ष्य बनाएँ।",
      payablesTitle: "देय राशि की जाँच",
      payablesMessage: (value, overdue) => `${value} बाकी है, जिसमें ${overdue} विलंबित रिकॉर्ड हैं।`,
      noPayablesMessage: "वर्तमान सारांश में कोई बाकी देय शेष दिखाई नहीं देता।",
      allocateSurplus: "मासिक अधिशेष आवंटित करें",
      reduceCategory: "सबसे बड़ी श्रेणी घटाएँ",
      allocateSurplusDetail: "इस महीने के अधिशेष से स्पष्ट राशि लक्ष्य या निवेश में डालें।",
      reduceCategoryDetail: (category) => category ? `${category} से शुरू करें, जो सबसे बड़ी वर्तमान खर्च श्रेणी है।` : "हाल के खर्च देखें और गैर-ज़रूरी खर्च रोकें।",
      reviewPayables: "देय प्रतिबद्धताओं की समीक्षा करें",
      reviewPayablesDetail: "नई जिम्मेदारी से पहले विलंबित और बड़ी बाकी राशि को प्राथमिकता दें।",
      keepRecordsCurrent: "रिकॉर्ड अद्यतन रखें",
      keepRecordsCurrentDetail: "महीना-दर-महीना तुलना के लिए श्रेणियाँ और खाता शेष अद्यतन रखें।",
    },
    starterPrompts: ["मैंने सबसे अधिक कहाँ खर्च किया?", "मैं नकदी प्रवाह कैसे सुधारूँ?", "मुझे आगे किस पर ध्यान देना चाहिए?"],
    server: {
      authRequired: "AI Insights उपयोग करने से पहले लॉग इन करें।",
      emptyMessage: "व्यक्तिगत वित्तीय ब्रीफिंग के लिए रिकॉर्ड जोड़ें या अपडेट करें।",
      unavailable: "AI इनसाइट अस्थायी रूप से उपलब्ध नहीं हैं।",
    },
  },
  es: {
    toolbar: {
      title: "Inteligencia financiera personalizada",
      description: "Revisa primero las señales más importantes y avanza hacia una acción clara.",
      readOnly: "Análisis de solo lectura",
    },
    trust: {
      title: "Contexto de inteligencia global",
      description: "JALVORO adapta la presentación al idioma seleccionado y explica la cobertura de datos registrada detrás del informe.",
      readOnly: "Solo lectura",
      locale: "Configuración regional",
      currency: "Moneda",
      coverage: "Cobertura registrada",
      freshness: "Actualización",
      weekStarts: (day) => `La semana empieza el ${day}`,
      liveRate: "Tipo de cambio en vivo",
      savedRate: "Tipo de cambio guardado",
      unavailableRate: "Tipo de cambio no disponible",
      checkingRecords: "Revisando registros financieros…",
      activeSources: (count) => `${count} fuente${count === 1 ? "" : "s"} financiera${count === 1 ? "" : "s"} activa${count === 1 ? "" : "s"}`,
      coverageUnavailable: "Cobertura no disponible",
      dataThrough: (date) => `Datos hasta ${date}`,
      noTransactionDate: "No hay fecha de transacción disponible",
      contextChecked: (date) => `Contexto revisado ${date}`,
      unavailable: "El contexto de confianza no está disponible temporalmente.",
      localeRemainsActive: "El idioma, la región y la moneda siguen activos.",
      whyWrong: "Por qué este informe aún puede estar equivocado",
      review: "Revisar",
      close: "Cerrar",
      analysisBoundary: "Límite del análisis",
      analysisBoundaryDetail: "La IA recibe un resumen financiero agregado. Las filas de transacciones no se incluyen en el prompt y esta página no puede mover dinero ni editar registros.",
      limitations: "Limitaciones conocidas",
      recordOnly: "Las conclusiones solo reflejan los registros financieros guardados en JALVORO.",
      categoryQuality: "Las categorías ausentes o incorrectas pueden reducir la calidad de las señales de gasto.",
      informational: "JALVORO AI ofrece análisis informativo, no asesoramiento financiero, fiscal ni legal.",
      transactions: (count) => count === null ? "Transacciones no disponibles" : `${count.toLocaleString("es")} transacción${count === 1 ? "" : "es"}`,
      accounts: (count) => count === null ? "Cuentas no disponibles" : `${count.toLocaleString("es")} cuenta${count === 1 ? "" : "s"} activa${count === 1 ? "" : "s"}`,
      goals: (count) => count === null ? "Objetivos no disponibles" : `${count.toLocaleString("es")} objetivo${count === 1 ? "" : "s"}`,
    },
    panel: {
      health: "Salud financiera",
      healthAria: "Puntuación de salud financiera",
      loadingOverview: "Cargando resumen financiero",
      healthPending: "La puntuación aparecerá cuando haya suficiente actividad financiera.",
      briefing: "Informe financiero",
      refresh: "Actualizar",
      refreshAria: "Regenerar conclusiones de IA",
      providerUnavailable: "Gemini no está disponible temporalmente",
      localFallback: "Se muestra orientación financiera local verificada hasta que vuelva la conexión.",
      unavailable: "Las conclusiones de IA no están disponibles temporalmente.",
      tryAgainLater: "Inténtalo de nuevo más tarde.",
      tryAgain: "Intentar de nuevo",
      briefingReadyToGrow: "Tu informe está listo para mejorar",
      addRecords: "Añade registros financieros y actualiza para generar el informe.",
      nextMoves: "Próximos mejores pasos",
      actionsPending: "Las acciones sugeridas aparecerán después de que JALVORO revise el resumen.",
      spendingFocus: "Enfoque de gasto",
      categoriesPending: "Los totales aparecerán después de categorizar los gastos.",
      recentPulse: "Pulso reciente",
      trendsPending: "Las tendencias aparecerán después de añadir transacciones.",
      askFinances: "Pregunta a tus finanzas",
      askTitle: "¿Qué quieres entender?",
      askDescription: "Pregunta sobre gastos, flujo de caja, pagos pendientes, objetivos, inversiones o tendencias.",
      thinking: "Pensando",
      placeholder: "Haz una pregunta financiera…",
      questionAria: "Pregunta financiera",
      sendAria: "Enviar pregunta financiera",
      moneyIn: "entrada",
      moneyOut: "salida",
      generated: (date) => `Generado ${date}`,
    },
    metadata: {
      why: "Por qué esta conclusión",
      evidence: "Evidencia",
      confidence: "Confianza de la evidencia",
      dataThrough: "Datos hasta",
      generatedAt: "Generado",
      review: "Revisar evidencia",
      close: "Cerrar evidencia",
      noDate: "Sin fecha de transacción registrada",
      accuracyNotice: "La confianza describe la solidez de la evidencia registrada, no garantiza que la conclusión sea correcta.",
    },
    confidence: { high: "Alta", medium: "Media", low: "Baja" },
    priority: { high: "Alta", medium: "Media", low: "Baja" },
    health: { excellent: "Excelente", good: "Buena", fair: "Aceptable", attention: "Necesita atención" },
    summary: {
      income: "Ingresos del mes",
      expenses: "Gastos del mes",
      netBalance: "Saldo neto",
      payables: "Pagos pendientes",
      savingsRate: (value) => `Tasa de ahorro ${value}%`,
      aboveLastMonth: (value) => `${value} por encima del mes pasado`,
      belowLastMonth: (value) => `${value} por debajo del mes pasado`,
      currentSpending: "Gasto del mes actual",
      cashBalance: (value) => `${value} de saldo en efectivo`,
      overdue: (count) => `${count} registro${count === 1 ? "" : "s"} vencido${count === 1 ? "" : "s"}`,
    },
    evidence: {
      monthNet: "Neto del mes actual",
      monthIncome: "Ingresos del mes actual",
      monthExpenses: "Gastos del mes actual",
      topCategory: "Principal categoría de gasto",
      goalsProgress: "Progreso de financiación de objetivos",
      activeGoals: "Objetivos registrados",
      outstandingPayables: "Pagos pendientes",
      overdueRecords: "Registros vencidos",
      savingsRate: "Tasa de ahorro",
      estimatedNetWorth: "Saldo neto estimado",
    },
    why: {
      monthlyNet: "Esta señal compara los ingresos y gastos registrados del mes actual.",
      spending: "Esta señal utiliza los gastos categorizados para identificar la mayor concentración.",
      goals: "Esta señal utiliza los objetivos y cantidades ahorradas para medir el progreso.",
      payables: "Esta señal utiliza los saldos pendientes y el estado de vencimiento.",
      general: "Esta señal se basa en el resumen financiero agregado disponible para JALVORO AI.",
    },
    deterministic: {
      monthlyPositiveTitle: "Neto mensual positivo",
      monthlyNegativeTitle: "El neto mensual necesita atención",
      monthlyPositiveMessage: (value) => `Este mes está por delante en ${value} después de los gastos registrados.`,
      monthlyNegativeMessage: (value) => `Este mes tiene un déficit de ${value}; revisa primero el gasto flexible.`,
      categoryTitle: (category) => `${category} es la categoría principal`,
      categoryMessage: (category, value) => `${category} ha alcanzado ${value} este mes.`,
      noCategoryTitle: "Aún no hay gasto por categoría",
      noCategoryMessage: "Categoriza los gastos para obtener una orientación más sólida.",
      goalsTitle: "Progreso de objetivos",
      goalsMessage: (percent, count) => `Los ${count} objetivos registrados están financiados al ${percent}%.`,
      noGoalsMessage: "Crea un objetivo de ahorro para dirigir mejor el excedente mensual.",
      payablesTitle: "Revisión de pagos pendientes",
      payablesMessage: (value, overdue) => `Quedan ${value} pendientes, con ${overdue} registro${overdue === 1 ? "" : "s"} vencido${overdue === 1 ? "" : "s"}.`,
      noPayablesMessage: "No aparece saldo pendiente en el resumen actual.",
      allocateSurplus: "Asignar el excedente mensual",
      reduceCategory: "Reducir la categoría principal",
      allocateSurplusDetail: "Mueve una cantidad clara del excedente del mes a objetivos o inversiones.",
      reduceCategoryDetail: (category) => category ? `Empieza por ${category}, la mayor categoría de gasto actual.` : "Revisa los gastos recientes y pausa los no esenciales.",
      reviewPayables: "Revisar compromisos pendientes",
      reviewPayablesDetail: "Prioriza pagos vencidos y saldos altos antes de añadir nuevas obligaciones.",
      keepRecordsCurrent: "Mantener los registros actualizados",
      keepRecordsCurrentDetail: "Actualiza categorías y saldos para mejorar la comparación mensual.",
    },
    starterPrompts: ["¿Dónde gasté más?", "¿Cómo puedo mejorar mi flujo de caja?", "¿En qué debería centrarme ahora?"],
    server: {
      authRequired: "Inicia sesión antes de usar AI Insights.",
      emptyMessage: "Añade o actualiza registros financieros para crear tu informe personalizado.",
      unavailable: "Las conclusiones de IA no están disponibles temporalmente.",
    },
  },
};

export function getAIInsightsCopy(language: AppLanguage): AIInsightsCopy {
  return COPY[language] ?? COPY.en;
}
