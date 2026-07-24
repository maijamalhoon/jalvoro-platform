"use client";

import { useMemo, useState } from "react";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import {
  JALVORO_ICON_TOKENS,
} from "@/components/icons/jalvoro/tokens";
import type {
  JalvoroIconCategory,
  JalvoroIconContext,
} from "@/components/icons/jalvoro/types";
import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";
import {
  JALVORO_ICON_CATEGORY_META,
  JALVORO_ICON_CATEGORY_ORDER,
  JALVORO_ICON_LIBRARY,
  JALVORO_ICON_LIBRARY_ENTRIES,
  JALVORO_LIBRARY_ROADMAP,
  buildJalvoroIconFullSnippet,
} from "@/lib/icon-system/library";

const ICON_SIZES = [16, 20, 24, 32] as const;
const ICON_CONTEXTS = [
  { id: "compact", label: "Compact", stroke: JALVORO_ICON_TOKENS.stroke.compact },
  { id: "content", label: "Default", stroke: JALVORO_ICON_TOKENS.stroke.content },
  { id: "heading", label: "Strong", stroke: JALVORO_ICON_TOKENS.stroke.heading },
  { id: "hero", label: "Hero", stroke: JALVORO_ICON_TOKENS.stroke.hero },
] as const satisfies readonly {
  id: JalvoroIconContext;
  label: string;
  stroke: number;
}[];

type CategoryFilter = "all" | JalvoroIconCategory;

type CopyState = {
  key: string;
  status: "copied" | "error";
} | null;

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function IconSystemLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [size, setSize] = useState<(typeof ICON_SIZES)[number]>(24);
  const [context, setContext] = useState<JalvoroIconContext>("content");
  const [selectedName, setSelectedName] = useState<JalvoroIconName>("dashboard");
  const [copyState, setCopyState] = useState<CopyState>(null);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return JALVORO_ICON_LIBRARY_ENTRIES.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        entry.name,
        entry.label,
        entry.category,
        ...entry.keywords,
        ...entry.aliases,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [category, query]);

  const selectedEntry =
    JALVORO_ICON_LIBRARY_ENTRIES.find((entry) => entry.name === selectedName) ??
    JALVORO_ICON_LIBRARY_ENTRIES[0];

  const snippet = buildJalvoroIconFullSnippet(selectedEntry.name, size, context);

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState({ key, status: "copied" });
    } catch {
      setCopyState({ key, status: "error" });
    }

    window.setTimeout(() => setCopyState(null), 1800);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] pb-12">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-sm">
        <div className="grid gap-8 border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-5 py-7 text-white sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              Design infrastructure
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              JALVORO Icon System
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              A private, versioned icon library center for designing, reviewing and
              standardizing JALVORO symbols before any product implementation.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur">
              <strong className="block text-2xl font-semibold">
                {JALVORO_ICON_LIBRARY.iconCount}
              </strong>
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">
                Icons
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur">
              <strong className="block text-2xl font-semibold">
                {JALVORO_ICON_LIBRARY.categoryCount}
              </strong>
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">
                Categories
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur">
              <strong className="block text-sm font-semibold sm:text-base">
                {JALVORO_ICON_LIBRARY.version}
              </strong>
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">
                Version
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          {JALVORO_LIBRARY_ROADMAP.map((library) => {
            const active = library.status === "active";
            return (
              <article
                key={library.id}
                className={`rounded-2xl border p-4 ${
                  active
                    ? "border-info/30 bg-info/7"
                    : "border-border/70 bg-surface-secondary/55"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Library
                    </p>
                    <h2 className="mt-1 font-semibold text-foreground">{library.name}</h2>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      active
                        ? "bg-info/12 text-info"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {active ? "Active" : "Planned"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-5 text-muted-foreground">
                  {library.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-[26px] border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Core library
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  Icon catalog
                </h2>
              </div>

              <label className="relative block w-full lg:max-w-sm">
                <span className="sr-only">Search icons</span>
                <JalvoroIcon
                  name="search"
                  size={18}
                  context="compact"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, label or keyword"
                  className="finance-focus h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Icon categories">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`finance-focus rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  category === "all"
                    ? "border-info/30 bg-info/10 text-info"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                All · {JALVORO_ICON_LIBRARY_ENTRIES.length}
              </button>
              {JALVORO_ICON_CATEGORY_ORDER.map((categoryName) => {
                const categoryCount = JALVORO_ICON_LIBRARY_ENTRIES.filter(
                  (entry) => entry.category === categoryName,
                ).length;
                return (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => setCategory(categoryName)}
                    className={`finance-focus rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      category === categoryName
                        ? "border-info/30 bg-info/10 text-info"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {JALVORO_ICON_CATEGORY_META[categoryName].label} · {categoryCount}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 rounded-2xl border border-border/70 bg-surface-secondary/55 p-4 md:grid-cols-2">
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Preview size
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ICON_SIZES.map((iconSize) => (
                    <button
                      key={iconSize}
                      type="button"
                      onClick={() => setSize(iconSize)}
                      className={`finance-focus min-w-14 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        size === iconSize
                          ? "border-info/30 bg-info/10 text-info"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {iconSize}px
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Stroke context
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ICON_CONTEXTS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setContext(option.id)}
                      className={`finance-focus rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        context === option.id
                          ? "border-info/30 bg-info/10 text-info"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label} · {option.stroke}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing <strong className="text-foreground">{filteredEntries.length}</strong>{" "}
              icons
            </p>
            <p className="text-xs text-muted-foreground">
              Clean outline · no default decorative accent
            </p>
          </div>

          {filteredEntries.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
              {filteredEntries.map((entry) => {
                const selected = entry.name === selectedEntry.name;
                return (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setSelectedName(entry.name)}
                    aria-pressed={selected}
                    className={`finance-focus group flex min-h-32 flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                      selected
                        ? "border-info/45 bg-info/8 shadow-[0_0_0_2px_rgba(59,130,246,0.08)]"
                        : "border-border/70 bg-background hover:-translate-y-0.5 hover:border-info/25 hover:bg-surface-secondary"
                    }`}
                  >
                    <span className="grid size-14 place-items-center rounded-2xl border border-border/60 bg-card text-foreground shadow-sm transition group-hover:text-info">
                      <JalvoroIcon
                        name={entry.name}
                        size={size}
                        context={context}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-3 line-clamp-1 text-sm font-semibold text-foreground">
                      {entry.label}
                    </span>
                    <span className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                      {entry.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-surface-secondary/35 p-6 text-center">
              <div>
                <JalvoroIcon
                  name="search"
                  size={32}
                  context="heading"
                  aria-hidden="true"
                  className="mx-auto text-muted-foreground"
                />
                <h3 className="mt-3 font-semibold text-foreground">No icons found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another name, keyword or category.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="self-start xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-sm">
            <div className="grid min-h-56 place-items-center border-b border-border/70 bg-[linear-gradient(145deg,rgba(99,102,241,0.10),transparent_52%)] p-8 text-foreground">
              <div className="text-center">
                <span className="mx-auto grid size-24 place-items-center rounded-[28px] border border-border/70 bg-background shadow-sm">
                  <JalvoroIcon
                    name={selectedEntry.name}
                    size={Math.max(size, 40)}
                    context={context}
                    title={selectedEntry.label}
                  />
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-tight">
                  {selectedEntry.label}
                </h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {selectedEntry.name}
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/70 bg-surface-secondary/50 p-3">
                  <dt className="text-xs text-muted-foreground">Category</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {JALVORO_ICON_CATEGORY_META[selectedEntry.category].label}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface-secondary/50 p-3">
                  <dt className="text-xs text-muted-foreground">Objects</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {selectedEntry.objects}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface-secondary/50 p-3">
                  <dt className="text-xs text-muted-foreground">Size</dt>
                  <dd className="mt-1 font-semibold text-foreground">{size}px</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface-secondary/50 p-3">
                  <dt className="text-xs text-muted-foreground">Context</dt>
                  <dd className="mt-1 font-semibold capitalize text-foreground">
                    {context}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Keywords
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEntry.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    React usage
                  </p>
                  <button
                    type="button"
                    onClick={() => copyText("snippet", snippet)}
                    className="finance-focus inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-secondary"
                  >
                    <JalvoroIcon
                      name={copyState?.key === "snippet" && copyState.status === "copied" ? "check" : "copy"}
                      size={14}
                      context="compact"
                      aria-hidden="true"
                    />
                    {copyState?.key === "snippet"
                      ? copyState.status === "copied"
                        ? "Copied"
                        : "Unavailable"
                      : "Copy"}
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-[11px] leading-5 text-slate-200">
                  <code>{snippet}</code>
                </pre>
              </div>

              <div className="rounded-2xl border border-warning/20 bg-warning/7 p-4 text-sm leading-5 text-foreground">
                <strong className="font-semibold">Review boundary:</strong>{" "}
                this library is for design and code review. Selecting or copying an icon
                does not replace any existing product icon.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
