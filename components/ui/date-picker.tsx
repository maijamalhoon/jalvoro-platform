"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { financeFieldErrorClass } from "@/components/ui/finance-modal";
import { useTouchWheelPickerMode } from "@/components/ui/touch-wheel-picker";
import { cn } from "@/lib/utils";

const DATE_WHEEL_RANGE = 8;
const MOMENTUM_WINDOW_MS = 220;
const MAX_MOMENTUM_DAYS = 4;
const CALENDAR_WIDTH = 276;
const CALENDAR_HEIGHT_ESTIMATE = 304;
const CALENDAR_VIEWPORT_GAP = 8;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const CALENDAR_THEME_PROPERTIES = [
  "--card",
  "--surface-primary",
  "--surface-secondary",
  "--surface-elevated",
  "--surface-inset",
  "--surface-soft",
  "--border",
  "--divider",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--text-inverse",
  "--brand-accent",
  "--primary-soft",
  "--hover",
  "--shadow-overlay",
] as const;

type CalendarPosition = {
  left: number;
  top: number;
  width: number;
  transformOrigin: string;
};

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  scrollPicker?: boolean;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isoToDisplay(value: string) {
  if (!isIsoDate(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function isoToDate(value: string) {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12);

  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
}

function dateToIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayIso() {
  return dateToIso(new Date());
}

function addIsoDays(value: string, days: number) {
  const parsed = isoToDate(value) ?? isoToDate(getTodayIso())!;
  parsed.setDate(parsed.getDate() + days);
  return dateToIso(parsed);
}

function daysBetween(start: string, end: string) {
  const first = isoToDate(start);
  const second = isoToDate(end);
  if (!first || !second) return 0;

  const firstUtc = Date.UTC(first.getFullYear(), first.getMonth(), first.getDate());
  const secondUtc = Date.UTC(second.getFullYear(), second.getMonth(), second.getDate());
  return Math.round((secondUtc - firstUtc) / 86_400_000);
}

function formatTypedDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function displayToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

function isWithinRange(value: string, minDate?: string, maxDate?: string) {
  if (minDate && value < minDate) return false;
  if (maxDate && value > maxDate) return false;
  return true;
}

function clampIsoDate(value: string, minDate?: string, maxDate?: string) {
  if (minDate && value < minDate) return minDate;
  if (maxDate && value > maxDate) return maxDate;
  return value;
}

function getDateError(value: string, minDate?: string, maxDate?: string) {
  if (!value) return "";
  if (value.length < 10) return "Enter the full date as DD/MM/YYYY.";

  const isoValue = displayToIso(value);
  if (!isoValue) return "Enter a valid date as DD/MM/YYYY.";
  if (!isWithinRange(isoValue, minDate, maxDate)) {
    return "Enter a date in the allowed range.";
  }

  return "";
}

function getCalendarDays(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOffset = new Date(year, month, 1, 12).getDay();
  const gridStart = new Date(year, month, 1 - firstDayOffset, 12);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function monthCanContainSelectableDate(
  viewMonth: Date,
  minDate?: string,
  maxDate?: string,
) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = dateToIso(new Date(year, month, 1, 12));
  const lastDay = dateToIso(new Date(year, month + 1, 0, 12));

  if (minDate && lastDay < minDate) return false;
  if (maxDate && firstDay > maxDate) return false;
  return true;
}

function calendarDayAriaLabel(day: Date) {
  return `${WEEKDAY_NAMES[day.getDay()]}, ${MONTH_NAMES[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`;
}

function DateWheelField({
  id,
  value,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  disabled,
  minDate,
  maxDate,
  openCalendar,
  calendarId,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  openCalendar: () => void;
  calendarId: string;
}) {
  const currentValue = isIsoDate(value) ? value : getTodayIso();
  const baseValueRef = useRef(currentValue);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const movedRef = useRef(false);
  const positionRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const isSettlingRef = useRef(false);
  const [position, setPosition] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging || isSettlingRef.current) return;
    clearSettleTimer();
    baseValueRef.current = currentValue;
    positionRef.current = 0;
    setTransitionMs(0);
    setPosition(0);
  }, [clearSettleTimer, currentValue, isDragging]);

  useEffect(() => () => clearSettleTimer(), [clearSettleTimer]);

  const commitOffset = useCallback(
    (offset: number) => {
      const baseValue = baseValueRef.current;
      const nextValue = clampIsoDate(
        addIsoDays(baseValue, offset),
        minDate,
        maxDate,
      );

      baseValueRef.current = nextValue;
      positionRef.current = 0;
      isSettlingRef.current = false;
      setTransitionMs(0);
      setPosition(0);
      if (nextValue !== value) onChange(nextValue);
    },
    [maxDate, minDate, onChange, value],
  );

  const settleAt = useCallback(
    (requestedOffset: number, duration = 260) => {
      clearSettleTimer();
      const baseValue = baseValueRef.current;
      const boundedValue = clampIsoDate(
        addIsoDays(baseValue, requestedOffset),
        minDate,
        maxDate,
      );
      const targetOffset = clamp(
        daysBetween(baseValue, boundedValue),
        -DATE_WHEEL_RANGE,
        DATE_WHEEL_RANGE,
      );
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const nextDuration = reducedMotion ? 0 : duration;

      isSettlingRef.current = true;
      positionRef.current = targetOffset;
      setTransitionMs(nextDuration);
      setPosition(targetOffset);

      if (nextDuration === 0) {
        commitOffset(targetOffset);
        return;
      }

      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        commitOffset(targetOffset);
      }, nextDuration + 24);
    },
    [clearSettleTimer, commitOffset, maxDate, minDate],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0 || !event.isPrimary) return;

      clearSettleTimer();
      isSettlingRef.current = false;
      baseValueRef.current = isIsoDate(value) ? value : getTodayIso();
      positionRef.current = 0;
      setPosition(0);
      setTransitionMs(0);
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      lastYRef.current = event.clientY;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      movedRef.current = false;
      setIsDragging(true);
    },
    [clearSettleTimer, disabled, value],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId || disabled) return;

      event.preventDefault();
      const height = Math.max(1, event.currentTarget.clientHeight);
      const now = performance.now();
      const deltaFromStart = startYRef.current - event.clientY;
      const nextPosition = clamp(
        deltaFromStart / height,
        -DATE_WHEEL_RANGE,
        DATE_WHEEL_RANGE,
      );
      const elapsed = Math.max(1, now - lastTimeRef.current);
      const instantVelocity =
        (lastYRef.current - event.clientY) / height / elapsed;

      velocityRef.current = velocityRef.current * 0.58 + instantVelocity * 0.42;
      lastYRef.current = event.clientY;
      lastTimeRef.current = now;
      movedRef.current = movedRef.current || Math.abs(deltaFromStart) > 4;
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    },
    [disabled],
  );

  const finishGesture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
      if (pointerIdRef.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pointerIdRef.current = null;
      setIsDragging(false);

      if (!movedRef.current && !cancelled) {
        positionRef.current = 0;
        setPosition(0);
        openCalendar();
        return;
      }

      const idleFor = performance.now() - lastTimeRef.current;
      const velocity = cancelled || idleFor > 90 ? 0 : velocityRef.current;
      const momentum = clamp(
        velocity * MOMENTUM_WINDOW_MS,
        -MAX_MOMENTUM_DAYS,
        MAX_MOMENTUM_DAYS,
      );
      const targetOffset = Math.round(
        clamp(
          positionRef.current + momentum,
          -DATE_WHEEL_RANGE,
          DATE_WHEEL_RANGE,
        ),
      );
      const distance = Math.abs(targetOffset - positionRef.current);
      const duration = Math.round(clamp(210 + distance * 72, 210, 520));

      settleAt(targetOffset, duration);
    },
    [openCalendar, settleAt],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCalendar();
        return;
      }

      const direction =
        event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -1
            : 0;
      if (!direction) return;

      event.preventDefault();
      baseValueRef.current = isIsoDate(value) ? value : getTodayIso();
      settleAt(direction, 220);
    },
    [disabled, openCalendar, settleAt, value],
  );

  const offsets = Array.from(
    { length: DATE_WHEEL_RANGE * 2 + 1 },
    (_, index) => index - DATE_WHEEL_RANGE,
  );
  const trackStyle = {
    transform: `translate3d(0, ${-(DATE_WHEEL_RANGE + position) * 100}%, 0)`,
    transition:
      transitionMs > 0
        ? `transform ${transitionMs}ms cubic-bezier(0.22, 0.72, 0.2, 1)`
        : "none",
  } satisfies CSSProperties;

  return (
    <div
      id={id}
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuetext={isoToDisplay(currentValue)}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || undefined}
      aria-controls={calendarId}
      tabIndex={disabled ? -1 : 0}
      className="field-input relative w-full cursor-ns-resize overflow-hidden p-0 touch-none select-none"
      data-dragging={isDragging ? "true" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
      onKeyDown={handleKeyDown}
    >
      <div aria-hidden="true" className="invisible flex h-full items-center px-3 pr-11">
        {isoToDisplay(currentValue)}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full will-change-transform"
        style={trackStyle}
      >
        {offsets.map((offset) => (
          <div
            key={offset}
            className="flex h-full w-full items-center px-3 pr-11 text-text-primary"
          >
            {isoToDisplay(addIsoDays(currentValue, offset))}
          </div>
        ))}
      </div>
      <CalendarDays
        aria-hidden="true"
        size={17}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-secondary"
      />
    </div>
  );
}

export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  ariaLabel = "Date",
  ariaDescribedBy,
  disabled,
  className,
  minDate,
  maxDate,
  scrollPicker = true,
}: DatePickerProps) {
  const generatedId = useId().replace(/:/g, "");
  const calendarId = `${id ?? `date-picker-${generatedId}`}-calendar`;
  const formattedValue = useMemo(() => isoToDisplay(value), [value]);
  const [displayValue, setDisplayValue] = useState(formattedValue);
  const [touched, setTouched] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = isoToDate(value) ?? isoToDate(getTodayIso())!;
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
  });
  const [calendarPosition, setCalendarPosition] = useState<CalendarPosition>({
    left: CALENDAR_VIEWPORT_GAP,
    top: CALENDAR_VIEWPORT_GAP,
    width: CALENDAR_WIDTH,
    transformOrigin: "top right",
  });
  const [calendarTheme, setCalendarTheme] = useState<Record<string, string>>({});
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const wheelLockRef = useRef(0);
  const touchPickerMode = useTouchWheelPickerMode(scrollPicker);

  useEffect(() => {
    if (value) {
      setDisplayValue(formattedValue);
      setTouched(false);
      return;
    }
    if (!touched) setDisplayValue("");
  }, [formattedValue, touched, value]);

  useEffect(() => {
    if (disabled) setCalendarOpen(false);
  }, [disabled]);

  const error = getDateError(displayValue, minDate, maxDate);
  const internalErrorId = id ? `${id}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, touched && error ? internalErrorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const syncCalendarGeometry = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === "undefined") return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      CALENDAR_WIDTH,
      Math.max(0, viewportWidth - CALENDAR_VIEWPORT_GAP * 2),
    );
    const maxLeft = Math.max(
      CALENDAR_VIEWPORT_GAP,
      viewportWidth - width - CALENDAR_VIEWPORT_GAP,
    );
    const left = clamp(
      rect.right - width,
      CALENDAR_VIEWPORT_GAP,
      maxLeft,
    );
    const spaceBelow = viewportHeight - rect.bottom - CALENDAR_VIEWPORT_GAP;
    const spaceAbove = rect.top - CALENDAR_VIEWPORT_GAP;
    const placeAbove =
      spaceBelow < CALENDAR_HEIGHT_ESTIMATE && spaceAbove > spaceBelow;
    const maxTop = Math.max(
      CALENDAR_VIEWPORT_GAP,
      viewportHeight - CALENDAR_HEIGHT_ESTIMATE - CALENDAR_VIEWPORT_GAP,
    );
    const requestedTop = placeAbove
      ? rect.top - CALENDAR_HEIGHT_ESTIMATE - CALENDAR_VIEWPORT_GAP
      : rect.bottom + CALENDAR_VIEWPORT_GAP;
    const top = clamp(
      requestedTop,
      CALENDAR_VIEWPORT_GAP,
      maxTop,
    );

    const computedStyle = window.getComputedStyle(anchor);
    const nextTheme: Record<string, string> = {};
    CALENDAR_THEME_PROPERTIES.forEach((property) => {
      const propertyValue = computedStyle.getPropertyValue(property).trim();
      if (propertyValue) nextTheme[property] = propertyValue;
    });

    setCalendarPosition({
      left,
      top,
      width,
      transformOrigin: placeAbove ? "bottom right" : "top right",
    });
    setCalendarTheme(nextTheme);
  }, []);

  const focusDateControl = useCallback(() => {
    const focusTarget =
      textInputRef.current ??
      anchorRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), [role="spinbutton"][tabindex="0"], button:not([disabled])',
      );
    focusTarget?.focus({ preventScroll: true });
  }, []);

  const closeCalendar = useCallback(
    (restoreFocus = false) => {
      setCalendarOpen(false);
      if (restoreFocus) {
        window.requestAnimationFrame(focusDateControl);
      }
    },
    [focusDateControl],
  );

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const startingIso = clampIsoDate(
      isIsoDate(value) ? value : getTodayIso(),
      minDate,
      maxDate,
    );
    const startingDate = isoToDate(startingIso) ?? isoToDate(getTodayIso())!;
    setViewMonth(
      new Date(startingDate.getFullYear(), startingDate.getMonth(), 1, 12),
    );
    setCalendarOpen(true);
  }, [disabled, maxDate, minDate, value]);

  useEffect(() => {
    if (!calendarOpen) return;
    syncCalendarGeometry();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        anchorRef.current?.contains(target) ||
        calendarRef.current?.contains(target)
      ) {
        return;
      }
      closeCalendar();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeCalendar(true);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", syncCalendarGeometry);
    window.addEventListener("scroll", syncCalendarGeometry, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", syncCalendarGeometry);
      window.removeEventListener("scroll", syncCalendarGeometry, true);
    };
  }, [calendarOpen, closeCalendar, syncCalendarGeometry]);

  useEffect(() => {
    if (!calendarOpen) return;
    const frame = window.requestAnimationFrame(syncCalendarGeometry);
    return () => window.cancelAnimationFrame(frame);
  }, [calendarOpen, syncCalendarGeometry, viewMonth]);

  function handleChange(nextRawValue: string) {
    const nextDisplayValue = formatTypedDate(nextRawValue);
    const nextIsoValue = displayToIso(nextDisplayValue);

    setTouched(true);
    setDisplayValue(nextDisplayValue);

    if (nextIsoValue && isWithinRange(nextIsoValue, minDate, maxDate)) {
      onChange(nextIsoValue);
      return;
    }
    onChange("");
  }

  function handleWheel(event: ReactWheelEvent<HTMLInputElement>) {
    if (!scrollPicker || disabled || Math.abs(event.deltaY) < 2) return;

    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (now - wheelLockRef.current < 110) return;
    wheelLockRef.current = now;

    const baseValue = isIsoDate(value) ? value : getTodayIso();
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextValue = clampIsoDate(
      addIsoDays(baseValue, direction),
      minDate,
      maxDate,
    );
    if (nextValue !== value) onChange(nextValue);
  }

  function selectCalendarDate(nextValue: string) {
    if (!isWithinRange(nextValue, minDate, maxDate)) return;
    setTouched(false);
    setDisplayValue(isoToDisplay(nextValue));
    onChange(nextValue);
    closeCalendar(true);
  }

  function shiftViewMonth(offset: number) {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1, 12),
    );
  }

  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
  const todayIso = getTodayIso();
  const previousMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() - 1,
    1,
    12,
  );
  const nextMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    1,
    12,
  );
  const canGoPrevious = monthCanContainSelectableDate(
    previousMonth,
    minDate,
    maxDate,
  );
  const canGoNext = monthCanContainSelectableDate(nextMonth, minDate, maxDate);
  const canSelectToday = isWithinRange(todayIso, minDate, maxDate);

  const calendar =
    calendarOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={calendarRef}
            id={calendarId}
            role="dialog"
            aria-label={`${ariaLabel} calendar`}
            style={
              {
                ...calendarPosition,
                ...calendarTheme,
              } as CSSProperties
            }
            className="fixed z-[140] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[1.05rem] bg-surface-elevated p-2.5 text-text-primary shadow-dialog ring-1 ring-border/70 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
          >
            <div className="flex items-center justify-between gap-2 px-0.5 pb-2">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!canGoPrevious}
                onClick={() => shiftViewMonth(-1)}
                className="finance-focus grid size-8 shrink-0 place-items-center rounded-[0.7rem] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
              </button>

              <div
                aria-live="polite"
                className="min-w-0 flex-1 text-center text-[0.82rem] font-[680] tracking-[-0.01em] text-text-primary"
              >
                {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </div>

              <button
                type="button"
                aria-label="Next month"
                disabled={!canGoNext}
                onClick={() => shiftViewMonth(1)}
                className="finance-focus grid size-8 shrink-0 place-items-center rounded-[0.7rem] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
              </button>
            </div>

            <div
              role="row"
              className="grid grid-cols-7 gap-0.5 px-0.5 pb-1"
            >
              {WEEKDAY_LABELS.map((weekday) => (
                <div
                  key={weekday}
                  role="columnheader"
                  aria-label={weekday}
                  className="grid h-6 place-items-center text-[0.64rem] font-semibold uppercase tracking-[0.045em] text-text-muted"
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div role="grid" className="grid grid-cols-7 gap-0.5 px-0.5">
              {calendarDays.map((day) => {
                const dayIso = dateToIso(day);
                const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
                const isSelected = dayIso === value;
                const isToday = dayIso === todayIso;
                const isDisabled = !isWithinRange(dayIso, minDate, maxDate);

                return (
                  <button
                    key={dayIso}
                    type="button"
                    role="gridcell"
                    aria-label={calendarDayAriaLabel(day)}
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    disabled={isDisabled}
                    onClick={() => selectCalendarDate(dayIso)}
                    className={cn(
                      "finance-focus relative grid size-[1.95rem] place-items-center justify-self-center rounded-[0.62rem] text-[0.74rem] font-medium tabular-nums transition-[background-color,color,transform] duration-150 hover:bg-hover active:scale-[0.94] disabled:pointer-events-none disabled:opacity-25",
                      !isCurrentMonth && "text-text-muted/45",
                      isCurrentMonth && !isSelected && "text-text-secondary",
                      isToday &&
                        !isSelected &&
                        "bg-primary-soft text-brand hover:bg-primary-soft",
                      isSelected &&
                        "bg-brand font-semibold text-text-inverse shadow-sm hover:bg-brand",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-end border-t border-divider/70 px-0.5 pt-2">
              <button
                type="button"
                disabled={!canSelectToday}
                onClick={() => selectCalendarDate(todayIso)}
                className="finance-focus min-h-8 rounded-[0.65rem] px-2.5 text-[0.72rem] font-semibold text-brand transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-30"
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("w-full", className)}>
      <div ref={anchorRef} className="relative">
        {touchPickerMode ? (
          <DateWheelField
            id={id}
            value={value}
            onChange={onChange}
            ariaLabel={ariaLabel}
            ariaDescribedBy={describedBy}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            openCalendar={openCalendar}
            calendarId={calendarId}
          />
        ) : (
          <>
            <input
              ref={textInputRef}
              id={id}
              type="text"
              role="combobox"
              inputMode="numeric"
              value={displayValue}
              disabled={disabled}
              placeholder={placeholder}
              aria-label={ariaLabel}
              aria-describedby={describedBy}
              aria-invalid={Boolean(touched && error)}
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
              aria-controls={calendarId}
              maxLength={10}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={() => setTouched(true)}
              onClick={openCalendar}
              onWheel={handleWheel}
              className="field-input pr-11 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20"
            />
            <button
              type="button"
              aria-label={`Open ${ariaLabel.toLowerCase()} calendar`}
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
              aria-controls={calendarId}
              disabled={disabled}
              onClick={openCalendar}
              className="finance-focus absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              <CalendarDays aria-hidden="true" size={17} />
            </button>
          </>
        )}
      </div>

      {calendar}

      {touched && error ? (
        <p id={internalErrorId} className={financeFieldErrorClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
