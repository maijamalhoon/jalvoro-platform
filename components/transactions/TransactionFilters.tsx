"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronRight, Filter, Search, X } from "lucide-react";

import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";
import { FEATURE_COLOR_CSS } from "@/lib/theme-colors";

export interface TransactionFilterOption {
  value: string;
  label: string;
}

type OpenMenu = "filter" | "sort" | null;
type PeriodValue = "all" | "today" | "week" | "month" | "year";

type TypeOption = {
  value: string;
  label: string;
  color: string;
};

type SortOption = {
  value: "newest" | "oldest" | "highest" | "lowest" | "name";
  label: string;
};

type FloatingMenuStyle = Pick<
  CSSProperties,
  "top" | "left" | "width" | "maxHeight" | "visibility"
>;

const TYPE_OPTIONS: TypeOption[] = [
  { value: "all", label: "All types", color: FEATURE_COLOR_CSS.muted },
  { value: "income", label: "Income", color: FEATURE_COLOR_CSS.income },
  { value: "expense", label: "Expense", color: FEATURE_COLOR_CSS.expense },
  { value: "transfer", label: "Transfer", color: FEATURE_COLOR_CSS.transfer },
  { value: "goal", label: "Goal", color: FEATURE_COLOR_CSS.goals },
  {
    value: "investment",
    label: "Investment",
    color: FEATURE_COLOR_CSS.investment,
  },
  { value: "payable", label: "Payable", color: FEATURE_COLOR_CSS.payables },
  { value: "refund", label: "Refund", color: "var(--info)" },
];

const PERIOD_OPTIONS: Array<{ value: PeriodValue; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
  { value: "name", label: "Name (A–Z)" },
];

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 8;
const MOBILE_BREAKPOINT = 640;
const MOBILE_FILTER_WIDTH = 252;
const MOBILE_SORT_WIDTH = 228;
const MOBILE_FILTER_HEIGHT_RATIO = 0.46;
const MOBILE_SORT_HEIGHT_RATIO = 0.44;

const HIDDEN_MENU_STYLE: FloatingMenuStyle = {
  top: 0,
  left: 0,
  width: 0,
  maxHeight: 0,
  visibility: "hidden",
};

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: Exclude<PeriodValue, "all">) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "week") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }

  return {
    from: formatDateValue(start),
    to: formatDateValue(now),
  };
}

function selectedClass(selected: boolean) {
  return selected
    ? "jf-transaction-menu-item-selected font-extrabold text-text-primary"
    : "text-text-primary hover:bg-hover";
}

export default function TransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const floatingMenuRef = useRef<HTMLDivElement>(null);
  const [pending, startNavigation] = useTransition();
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [menuStyle, setMenuStyle] =
    useState<FloatingMenuStyle>(HIDDEN_MENU_STYLE);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const activeType = searchParams.get("type") || "all";
  const activeSort = searchParams.get("sort") || "newest";
  const periodParam = searchParams.get("period");
  const hasDateRange = Boolean(
    searchParams.get("from") || searchParams.get("to"),
  );
  const activePeriod = PERIOD_OPTIONS.some(
    (option) => option.value === periodParam,
  )
    ? (periodParam as PeriodValue)
    : hasDateRange
      ? "custom"
      : "all";
  const hasActiveFilter = activeType !== "all" || activePeriod !== "all";
  const hasActiveSort = activeSort !== "newest";

  const navigate = useCallback(
    (update: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      update(params);
      params.delete("limit");

      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery === currentQuery) return;

      startNavigation(() => {
        router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const updateSearchParam = useCallback(
    (value: string) => {
      navigate((params) => {
        if (value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search");
        }
      });
    },
    [navigate],
  );

  const positionOpenMenu = useCallback(() => {
    if (!openMenu) return;

    const trigger =
      openMenu === "filter" ? filterButtonRef.current : sortButtonRef.current;
    const menu = floatingMenuRef.current;
    if (!trigger || !menu) return;

    const visualViewport = window.visualViewport;
    const viewportWidth =
      visualViewport?.width ?? document.documentElement.clientWidth;
    const viewportHeight =
      visualViewport?.height ?? document.documentElement.clientHeight;
    const triggerRect = trigger.getBoundingClientRect();
    const isMobileViewport = viewportWidth < MOBILE_BREAKPOINT;
    const preferredWidth = isMobileViewport
      ? openMenu === "filter"
        ? MOBILE_FILTER_WIDTH
        : MOBILE_SORT_WIDTH
      : openMenu === "filter"
        ? 304
        : 288;
    const width = Math.max(
      0,
      Math.min(preferredWidth, viewportWidth - VIEWPORT_MARGIN * 2),
    );
    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = Math.max(
      minLeft,
      viewportWidth - width - VIEWPORT_MARGIN,
    );
    const left = Math.min(
      Math.max(triggerRect.right - width, minLeft),
      maxLeft,
    );

    const availableBelow = Math.max(
      0,
      viewportHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_MARGIN,
    );
    const availableAbove = Math.max(
      0,
      triggerRect.top - MENU_GAP - VIEWPORT_MARGIN,
    );

    // Measure at the final width so wrapping never changes the computed height.
    menu.style.width = `${Math.round(width)}px`;
    menu.style.maxHeight = "none";
    const naturalHeight = menu.scrollHeight;
    const openAbove =
      naturalHeight > availableBelow && availableAbove > availableBelow;
    const availableHeight = openAbove ? availableAbove : availableBelow;
    const mobileHeightCap = Math.floor(
      viewportHeight *
        (openMenu === "filter"
          ? MOBILE_FILTER_HEIGHT_RATIO
          : MOBILE_SORT_HEIGHT_RATIO),
    );
    const allowedHeight = isMobileViewport
      ? Math.min(availableHeight, mobileHeightCap)
      : availableHeight;
    const maxHeight = Math.max(1, Math.floor(allowedHeight));
    const renderedHeight = Math.min(naturalHeight, maxHeight);
    const preferredTop = openAbove
      ? triggerRect.top - MENU_GAP - renderedHeight
      : triggerRect.bottom + MENU_GAP;
    const maxTop = Math.max(
      VIEWPORT_MARGIN,
      viewportHeight - renderedHeight - VIEWPORT_MARGIN,
    );
    const top = Math.min(
      Math.max(preferredTop, VIEWPORT_MARGIN),
      maxTop,
    );

    setMenuStyle({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(maxHeight),
      visibility: "visible",
    });
  }, [openMenu]);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!searchOpen) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (search === currentSearch) return;

    const timer = window.setTimeout(() => {
      updateSearchParam(search);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, searchParams, updateSearchParam]);

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (controlsRef.current?.contains(event.target)) return;
      if (floatingMenuRef.current?.contains(event.target)) return;
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  useLayoutEffect(() => {
    if (!openMenu) return;

    positionOpenMenu();

    let frame = 0;
    const schedulePosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(positionOpenMenu);
    };
    const visualViewport = window.visualViewport;
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedulePosition);
    const trigger =
      openMenu === "filter" ? filterButtonRef.current : sortButtonRef.current;

    if (trigger) resizeObserver?.observe(trigger);
    if (floatingMenuRef.current) resizeObserver?.observe(floatingMenuRef.current);

    window.addEventListener("resize", schedulePosition);
    window.addEventListener("orientationchange", schedulePosition);
    window.addEventListener("scroll", schedulePosition, true);
    visualViewport?.addEventListener("resize", schedulePosition);
    visualViewport?.addEventListener("scroll", schedulePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedulePosition);
      window.removeEventListener("orientationchange", schedulePosition);
      window.removeEventListener("scroll", schedulePosition, true);
      visualViewport?.removeEventListener("resize", schedulePosition);
      visualViewport?.removeEventListener("scroll", schedulePosition);
    };
  }, [openMenu, positionOpenMenu]);

  function closeSearch(clearValue = false) {
    if (clearValue) setSearch("");
    setSearchOpen(false);
  }

  function toggleMenu(menu: Exclude<OpenMenu, null>) {
    setSearchOpen(false);
    setMenuStyle(HIDDEN_MENU_STYLE);
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  function selectType(value: string) {
    navigate((params) => {
      if (value === "all") params.delete("type");
      else params.set("type", value);
    });
    setOpenMenu(null);
  }

  function selectPeriod(value: PeriodValue) {
    navigate((params) => {
      if (value === "all") {
        params.delete("period");
        params.delete("from");
        params.delete("to");
        return;
      }

      const range = getPeriodRange(value);
      params.set("period", value);
      params.set("from", range.from);
      params.set("to", range.to);
    });
    setOpenMenu(null);
  }

  function selectSort(value: SortOption["value"]) {
    navigate((params) => {
      if (value === "newest") params.delete("sort");
      else params.set("sort", value);
    });
    setOpenMenu(null);
  }

  const filterActive = openMenu === "filter" || hasActiveFilter;
  const sortActive = openMenu === "sort" || hasActiveSort;
  const iconButtonClass =
    "jf-transaction-icon-control finance-focus grid !size-11 !min-h-0 shrink-0 place-items-center !gap-0 rounded-xl !border-0 !bg-transparent !p-0 !shadow-none transition-[color,transform,opacity] duration-200 hover:-translate-y-px hover:text-brand active:translate-y-0";

  const activeChevron = (
    <ChevronRight
      size={18}
      strokeWidth={4.4}
      className="jf-transaction-active-chevron shrink-0 text-text-primary"
      aria-hidden="true"
    />
  );

  const floatingMenu =
    openMenu && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={floatingMenuRef}
            id={
              openMenu === "filter"
                ? "transaction-filter-panel"
                : "transaction-sort-panel"
            }
            role="menu"
            aria-label={
              openMenu === "filter"
                ? "Filter transactions"
                : "Sort transactions"
            }
            style={menuStyle}
            className="jf-transaction-floating-menu fixed z-[2147483000] overflow-y-auto overscroll-contain rounded-2xl bg-surface py-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] [scrollbar-gutter:stable] touch-pan-y"
          >
            {openMenu === "filter" ? (
              <>
                <p className="jf-transaction-menu-section-title px-4 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Type
                </p>
                {TYPE_OPTIONS.map((option) => {
                  const selected = activeType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectType(option.value)}
                      className={`jf-transaction-menu-item finance-focus relative flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium transition-colors ${selectedClass(
                        selected,
                      )}`}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {selected ? activeChevron : null}
                    </button>
                  );
                })}

                <div
                  className="mx-4 my-1.5 h-px bg-border/60"
                  role="separator"
                />

                <p className="jf-transaction-menu-section-title px-4 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Period
                </p>
                {PERIOD_OPTIONS.map((option) => {
                  const selected = activePeriod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectPeriod(option.value)}
                      className={`jf-transaction-menu-item finance-focus relative flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium transition-colors ${selectedClass(
                        selected,
                      )}`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {selected ? activeChevron : null}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <p className="jf-transaction-menu-section-title px-4 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Sort by
                </p>
                {SORT_OPTIONS.map((option) => {
                  const selected = activeSort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectSort(option.value)}
                      className={`jf-transaction-menu-item finance-focus relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${selectedClass(
                        selected,
                      )}`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {selected ? activeChevron : null}
                    </button>
                  );
                })}
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      id="transaction-filter-controls"
      ref={controlsRef}
      className="relative mb-5 min-w-0 space-y-2.5"
      aria-busy={pending || undefined}
    >
      <style>{`
        #transaction-filter-controls .jf-transaction-search[data-open="false"],
        #transaction-filter-controls .jf-transaction-search[data-open="false"]:hover,
        #transaction-filter-controls .jf-transaction-search[data-open="false"] > button:first-of-type,
        #transaction-filter-controls .jf-transaction-search[data-open="false"] > button:first-of-type:hover,
        #transaction-filter-controls .jf-transaction-icon-control,
        #transaction-filter-controls .jf-transaction-icon-control:hover,
        #transaction-filter-controls .jf-transaction-icon-control:focus-visible {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        #transaction-filter-controls .jf-transaction-icon-control {
          min-height: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
        }

        .jf-transaction-menu-item {
          transform: scale(1);
          transform-origin: center;
          transition:
            transform 155ms cubic-bezier(0.22, 1, 0.36, 1),
            color 160ms ease,
            background-color 160ms ease,
            font-weight 160ms ease !important;
        }

        .jf-transaction-menu-item:active {
          transform: scale(1.025);
        }

        .jf-transaction-menu-item-selected,
        .jf-transaction-menu-item-selected:hover,
        .jf-transaction-menu-item-selected:focus-visible {
          background: transparent !important;
          box-shadow: none !important;
          color: var(--text-primary) !important;
          font-weight: 800 !important;
          transform: scale(1.012);
          animation: jf-transaction-option-selected-pop 190ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .jf-transaction-menu-item-selected:active {
          transform: scale(1.025);
        }

        .jf-transaction-active-chevron {
          color: var(--text-primary) !important;
          stroke-width: 4.4 !important;
          transform: scale(1.08);
          transform-origin: center;
          animation: jf-transaction-chevron-selected-pop 210ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes jf-transaction-option-selected-pop {
          0% { transform: scale(0.985); }
          68% { transform: scale(1.02); }
          100% { transform: scale(1.012); }
        }

        @keyframes jf-transaction-chevron-selected-pop {
          0% { transform: scale(0.78); opacity: 0.45; }
          72% { transform: scale(1.14); opacity: 1; }
          100% { transform: scale(1.08); opacity: 1; }
        }

        @media (max-width: 639px) {
          .jf-transaction-floating-menu {
            border-radius: 1rem !important;
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
            scrollbar-gutter: auto !important;
            -webkit-overflow-scrolling: touch;
          }

          .jf-transaction-menu-section-title {
            padding-left: 0.875rem !important;
            padding-right: 0.875rem !important;
          }

          .jf-transaction-menu-item {
            min-height: 2.25rem !important;
            padding: 0.4rem 0.875rem !important;
            gap: 0.625rem !important;
            font-size: 0.8125rem !important;
          }
        }

        @media (max-height: 720px) {
          .jf-transaction-floating-menu {
            padding-top: 0.2rem !important;
            padding-bottom: 0.2rem !important;
          }

          .jf-transaction-menu-item {
            min-height: 2.125rem !important;
            padding-top: 0.32rem !important;
            padding-bottom: 0.32rem !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jf-transaction-menu-item,
          .jf-transaction-menu-item-selected,
          .jf-transaction-active-chevron {
            animation: none !important;
            transition-duration: 1ms !important;
          }
        }
      `}</style>

      <div className="relative flex min-w-0 items-center justify-end gap-1.5">
        <div
          role="search"
          aria-label="Search transactions"
          data-open={searchOpen ? "true" : "false"}
          className={`jf-transaction-search finance-focus flex h-11 shrink-0 items-center overflow-hidden rounded-full border transition-[width,background-color,border-color,box-shadow] duration-300 ease-out ${
            searchOpen
              ? "w-[min(26.25rem,calc(100vw-2rem))] border-border bg-surface-inset shadow-none"
              : "w-11 border-transparent bg-transparent"
          }`}
        >
          <button
            type="button"
            aria-label={
              searchOpen ? "Search transactions" : "Open transaction search"
            }
            aria-expanded={searchOpen}
            onClick={() => {
              setOpenMenu(null);
              setSearchOpen(true);
            }}
            className={`finance-focus grid !size-11 !min-h-0 shrink-0 place-items-center !border-0 !bg-transparent !p-0 !shadow-none transition-[color,transform] duration-200 hover:-translate-y-px hover:text-brand active:translate-y-0 ${
              search ? "text-brand" : "text-text-secondary"
            }`}
          >
            <Search
              size={20}
              strokeWidth={2.1}
              className="!size-5"
              aria-hidden="true"
            />
          </button>

          <label htmlFor="transaction-page-search" className="sr-only">
            Search transactions
          </label>
          <input
            ref={searchInputRef}
            id="transaction-page-search"
            type="search"
            autoComplete="off"
            tabIndex={searchOpen ? 0 : -1}
            aria-hidden={!searchOpen}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
              }
            }}
            placeholder="Search transactions..."
            className={`min-w-0 bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-secondary transition-[width,opacity] duration-200 ${
              searchOpen
                ? "mr-1 w-full flex-1 opacity-100"
                : "pointer-events-none w-0 opacity-0"
            }`}
          />

          <button
            type="button"
            aria-label={search ? "Clear and close search" : "Close search"}
            tabIndex={searchOpen ? 0 : -1}
            onClick={() => closeSearch(Boolean(search))}
            className={`finance-focus mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition-[opacity,transform,background-color,color] duration-200 hover:bg-hover hover:text-text-primary ${
              searchOpen
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-90 opacity-0"
            }`}
          >
            <X size={16} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </div>

        <div
          className={`flex shrink-0 items-center gap-1 overflow-visible transition-[width,opacity,transform] duration-200 ${
            searchOpen
              ? "pointer-events-none w-0 -translate-x-1 overflow-hidden opacity-0"
              : "w-auto translate-x-0 opacity-100"
          }`}
          aria-hidden={searchOpen || undefined}
        >
          <button
            ref={filterButtonRef}
            type="button"
            aria-label="Filter transactions"
            aria-expanded={openMenu === "filter"}
            aria-controls="transaction-filter-panel"
            tabIndex={searchOpen ? -1 : undefined}
            onClick={() => toggleMenu("filter")}
            className={`${iconButtonClass} ${
              filterActive ? "text-brand" : "text-text-secondary"
            }`}
          >
            <Filter
              size={20}
              strokeWidth={2.1}
              className="!size-5"
              aria-hidden="true"
            />
          </button>

          <button
            ref={sortButtonRef}
            type="button"
            aria-label="Sort transactions"
            aria-expanded={openMenu === "sort"}
            aria-controls="transaction-sort-panel"
            tabIndex={searchOpen ? -1 : undefined}
            onClick={() => toggleMenu("sort")}
            className={`${iconButtonClass} ${
              sortActive ? "text-brand" : "text-text-secondary"
            }`}
          >
            <ArrowUpDown
              size={20}
              strokeWidth={2.1}
              className="!size-5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {floatingMenu}

      <div aria-live="polite">
        <BackgroundRefreshStatus
          refreshing={pending}
          label="Updating transactions…"
        />
      </div>
    </div>
  );
}
