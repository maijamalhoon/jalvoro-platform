import Image from "next/image";
import {
  BarChart3,
  Boxes,
  FileBarChart,
  Goal,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { brand } from "@/lib/brand";

export function ProductPreview() {
  const previewIcons = [
    LayoutDashboard,
    WalletCards,
    ShoppingCart,
    PackageSearch,
    Users,
    FileBarChart,
  ];

  const metrics = [
    [
      WalletCards,
      "Sample balance",
      "PKR 248,500",
      "Illustrative account view",
      "bg-emerald-50 text-emerald-700",
    ],
    [
      ShoppingCart,
      "Sample sales",
      "PKR 18,240",
      "Illustrative daily view",
      "bg-slate-100 text-slate-600",
    ],
    [
      Boxes,
      "Stock review",
      "12 items",
      "Illustrative stock view",
      "bg-amber-50 text-amber-700",
    ],
  ] as const;

  const attentionItems = [
    [
      ReceiptText,
      "3 invoices to review",
      "Finance",
      "bg-emerald-50 text-emerald-700",
    ],
    [
      PackageSearch,
      "12 low-stock items",
      "Inventory",
      "bg-amber-50 text-amber-700",
    ],
    [
      Goal,
      "Goal is 72% funded",
      "Personal",
      "bg-slate-100 text-slate-600",
    ],
  ] as const;

  return (
    <figure className="jv-enter-late relative m-0 min-w-0">
      <div
        className="absolute -inset-10 -z-10 rounded-full bg-emerald-200/30 blur-3xl"
        aria-hidden="true"
      />

      <div className="jv-preview-shell grid min-h-[560px] grid-cols-[70px_minmax(0,1fr)] overflow-hidden rounded-[28px] border border-[#12211b]/10 bg-white shadow-[0_24px_70px_rgba(28,55,43,.12)] max-sm:min-h-[460px] max-sm:grid-cols-[46px_minmax(0,1fr)] max-sm:rounded-[22px]">
        <aside
          className="flex flex-col items-center gap-3 border-r border-[#12211b]/[0.07] bg-[#fbfcfb] px-3 py-5 max-sm:gap-2 max-sm:px-1.5 max-sm:py-3"
          aria-hidden="true"
        >
          <span className="mb-3 grid size-10 place-items-center max-sm:mb-1 max-sm:size-8">
            <Image
              src={brand.assets.logoMark}
              alt=""
              width={26}
              height={26}
            />
          </span>
          {previewIcons.map((Icon, index) => (
            <span
              key={index}
              className={`grid size-10 place-items-center rounded-xl max-sm:size-8 ${
                index === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-400"
              }`}
            >
              <Icon className="size-[18px] max-sm:size-4" />
            </span>
          ))}
        </aside>

        <div className="min-w-0 bg-gradient-to-b from-white to-[#fbfcfb] p-7 max-xl:p-5 max-sm:px-3 max-sm:py-4">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="m-0 text-[11px] font-semibold text-slate-400">
                Unified workspace
              </p>
              <strong className="mt-1 block text-lg tracking-tight max-sm:text-sm">
                Your unified workspace
              </strong>
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 max-sm:hidden">
              <i className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.1)]" />
              Illustrative preview
            </span>
          </div>

          <div className="mt-6 flex w-max max-w-full gap-1 rounded-xl border border-[#12211b]/[0.07] bg-slate-100 p-1 text-[11px] font-semibold text-slate-500 max-sm:mt-4">
            <span className="rounded-lg bg-white px-3 py-2 text-[#12211b] shadow-sm max-sm:px-2">
              Personal
            </span>
            <span className="px-3 py-2 max-sm:px-2">POS</span>
            <span className="px-3 py-2 max-sm:px-2">Business</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 max-sm:grid-cols-2 max-sm:gap-2">
            {metrics.map(([Icon, label, value, detail, tone], index) => {
              const MetricIcon = Icon as LucideIcon;
              return (
                <article
                  key={label}
                  className={`min-w-0 rounded-2xl border border-[#12211b]/[0.07] bg-white p-4 max-sm:p-3 ${
                    index === 2 ? "max-sm:hidden" : ""
                  }`}
                >
                  <span
                    className={`mb-4 grid size-8 place-items-center rounded-[10px] max-sm:mb-2 ${tone}`}
                  >
                    <MetricIcon className="size-4" />
                  </span>
                  <p className="m-0 text-[11px] font-semibold text-slate-400">
                    {label}
                  </p>
                  <strong className="mt-1.5 block truncate text-[clamp(.86rem,1.1vw,1.1rem)] tracking-tight">
                    {value}
                  </strong>
                  <small className="mt-2 block truncate text-[11px] text-slate-500">
                    {detail}
                  </small>
                </article>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-[1.4fr_.8fr] gap-3 max-xl:grid-cols-1">
            <article className="min-w-0 rounded-2xl border border-[#12211b]/[0.07] bg-white p-5 max-sm:p-3.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="m-0 text-[11px] font-semibold text-slate-400">
                    Connected performance
                  </p>
                  <strong className="mt-1 block text-sm">
                    Money and operations
                  </strong>
                </div>
                <BarChart3
                  className="size-[18px] text-slate-400"
                  aria-hidden="true"
                />
              </div>

              <div
                className="relative mt-3 h-[215px] overflow-hidden max-sm:h-[170px]"
                role="img"
                aria-label="Illustrative seven period performance chart"
              >
                <span className="absolute inset-x-0 bottom-6 top-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_49px,rgba(18,33,27,.055)_50px_51px)]" />
                <svg
                  className="absolute inset-x-0 bottom-6 top-3 h-[calc(100%-36px)] w-full overflow-visible text-emerald-600"
                  viewBox="0 0 620 220"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="jv-area-audited"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="currentColor"
                        stopOpacity="0.22"
                      />
                      <stop
                        offset="100%"
                        stopColor="currentColor"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#jv-area-audited)"
                    d="M0 181 C58 173 78 136 132 143 C189 151 212 103 270 108 C326 113 351 61 410 76 C468 91 505 45 559 57 C590 64 606 45 620 31 L620 220 L0 220 Z"
                  />
                  <path
                    className="jv-chart-line"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="3.2"
                    vectorEffect="non-scaling-stroke"
                    d="M0 181 C58 173 78 136 132 143 C189 151 212 103 270 108 C326 113 351 61 410 76 C468 91 505 45 559 57 C590 64 606 45 620 31"
                  />
                </svg>
                <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-semibold text-slate-500">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-[#12211b]/[0.07] bg-white p-5 max-xl:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="m-0 text-[11px] font-semibold text-slate-400">
                    What needs attention
                  </p>
                  <strong className="mt-1 block text-sm">
                    Today&apos;s control list
                  </strong>
                </div>
                <ShieldCheck className="size-[18px] text-slate-400" />
              </div>
              <div className="mt-5 grid gap-3">
                {attentionItems.map(([Icon, label, area, tone]) => {
                  const ItemIcon = Icon as LucideIcon;
                  return (
                    <span
                      key={label}
                      className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-x-2.5 rounded-xl bg-slate-50 p-2.5"
                    >
                      <i
                        className={`row-span-2 grid size-[34px] place-items-center rounded-[10px] ${tone}`}
                      >
                        <ItemIcon className="size-4" />
                      </i>
                      <b className="truncate text-[11px]">{label}</b>
                      <small className="text-[10px] text-slate-500">
                        {area}
                      </small>
                    </span>
                  );
                })}
              </div>
            </article>
          </div>
        </div>
      </div>

      <figcaption className="mt-3 text-center text-[11px] leading-5 text-slate-500">
        Illustrative interface using sample data. No live customer information
        is shown.
      </figcaption>
    </figure>
  );
}
