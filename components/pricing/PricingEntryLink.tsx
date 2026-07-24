import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function PricingEntryLink() {
  return (
    <Link
      href="/pricing"
      aria-label="View JALVORO plans and regional pricing"
      className="finance-focus fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-slate-950/92 px-4 text-sm font-extrabold text-white shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-slate-900 sm:bottom-6 sm:right-6 sm:px-5"
    >
      <Sparkles className="size-4 text-emerald-300" aria-hidden="true" />
      <span>View plans</span>
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
