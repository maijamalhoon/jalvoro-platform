"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  WheelEvent,
} from "react";

import { getAnimationDurationScale } from "@/lib/animation-preference";
import { cn } from "@/lib/utils";

import styles from "./TouchWheelPicker.module.css";

const TOUCH_PICKER_QUERY = "(max-width: 1024px) and (pointer: coarse)";
const MOMENTUM_WINDOW_MS = 220;
const MAX_MOMENTUM_ITEMS = 4;
const WHEEL_STEP_PX = 28;
const WHEEL_RESET_MS = 120;
const MAX_WHEEL_ITEMS_PER_EVENT = 3;

export interface TouchWheelPickerOption {
  value: string;
  content: ReactNode;
  ariaLabel?: string;
}

interface TouchWheelPickerProps {
  id?: string;
  value: string;
  options: TouchWheelPickerOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  emptyContent?: ReactNode;
  onTap?: () => void;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function rubberBand(position: number, maximum: number) {
  if (position < 0) return position * 0.26;
  if (position > maximum) return maximum + (position - maximum) * 0.26;
  return position;
}

export function useTouchWheelPickerMode(enabled = true) {
  const [isTouchPickerMode, setIsTouchPickerMode] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setIsTouchPickerMode(false);
      return;
    }

    const media = window.matchMedia(TOUCH_PICKER_QUERY);
    const update = () => setIsTouchPickerMode(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [enabled]);

  return isTouchPickerMode;
}

export default function TouchWheelPicker({
  id,
  value,
  options,
  onValueChange,
  ariaLabel,
  disabled = false,
  className,
  itemClassName,
  emptyContent,
  onTap,
}: TouchWheelPickerProps) {
  const valuesKey = useMemo(
    () => options.map((option) => option.value).join("\u001f"),
    [options],
  );
  const optionsRef = useRef(options);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const onTapRef = useRef(onTap);
  const positionRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const startPositionRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const movedRef = useRef(false);
  const isSettlingRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    optionsRef.current = options;
    valueRef.current = value;
    onValueChangeRef.current = onValueChange;
    onTapRef.current = onTap;
  }, [onTap, onValueChange, options, value]);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const maximumIndex = Math.max(0, options.length - 1);
  const unavailable = disabled || options.length === 0;

  const clearPendingAnimation = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const clearWheelReset = useCallback(() => {
    if (wheelResetTimerRef.current !== null) {
      window.clearTimeout(wheelResetTimerRef.current);
      wheelResetTimerRef.current = null;
    }
  }, []);

  const scheduleWheelReset = useCallback(() => {
    clearWheelReset();
    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelDeltaRef.current = 0;
      wheelResetTimerRef.current = null;
    }, WHEEL_RESET_MS);
  }, [clearWheelReset]);

  const commitIndex = useCallback((index: number) => {
    const option = optionsRef.current[index];
    if (!option || option.value === valueRef.current) return;
    valueRef.current = option.value;
    onValueChangeRef.current(option.value);
  }, []);

  const settleAt = useCallback(
    (index: number, requestedDuration = 260) => {
      clearPendingAnimation();
      isSettlingRef.current = true;
      const nextIndex = clamp(index, 0, Math.max(0, optionsRef.current.length - 1));
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const durationScale = getAnimationDurationScale();
      const duration =
        reducedMotion || durationScale === 0
          ? 0
          : Math.round(requestedDuration * durationScale);

      positionRef.current = nextIndex;
      if (duration === 0) {
        isSettlingRef.current = false;
        setTransitionMs(0);
        setPosition(nextIndex);
        commitIndex(nextIndex);
        return;
      }

      setTransitionMs(duration);
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setPosition(nextIndex);
        animationFrameRef.current = null;
      });
      settleTimerRef.current = window.setTimeout(() => {
        isSettlingRef.current = false;
        setTransitionMs(0);
        settleTimerRef.current = null;
        commitIndex(nextIndex);
      }, duration + 24);
    },
    [clearPendingAnimation, commitIndex],
  );

  useEffect(() => {
    if (isDragging || isSettlingRef.current) return;
    clearPendingAnimation();
    positionRef.current = selectedIndex;
    setTransitionMs(0);
    setPosition(selectedIndex);
  }, [clearPendingAnimation, isDragging, selectedIndex, valuesKey]);

  useEffect(
    () => () => {
      clearPendingAnimation();
      clearWheelReset();
    },
    [clearPendingAnimation, clearWheelReset],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (unavailable || event.button !== 0 || !event.isPrimary) return;

      clearPendingAnimation();
      isSettlingRef.current = false;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      startPositionRef.current = positionRef.current;
      lastYRef.current = event.clientY;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      movedRef.current = false;
      setTransitionMs(0);
      setIsDragging(true);
    },
    [clearPendingAnimation, unavailable],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId || unavailable) return;

      event.preventDefault();
      const height = Math.max(1, event.currentTarget.clientHeight);
      const now = performance.now();
      const deltaFromStart = startYRef.current - event.clientY;
      const rawPosition = startPositionRef.current + deltaFromStart / height;
      const nextPosition = rubberBand(rawPosition, maximumIndex);
      const elapsed = Math.max(1, now - lastTimeRef.current);
      const instantVelocity = (lastYRef.current - event.clientY) / height / elapsed;

      velocityRef.current = velocityRef.current * 0.58 + instantVelocity * 0.42;
      lastYRef.current = event.clientY;
      lastTimeRef.current = now;
      movedRef.current = movedRef.current || Math.abs(deltaFromStart) > 3;
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    },
    [maximumIndex, unavailable],
  );

  const finishGesture = useCallback(
    (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
      if (pointerIdRef.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pointerIdRef.current = null;
      setIsDragging(false);

      if (!cancelled && !movedRef.current && onTapRef.current) {
        settleAt(
          clamp(Math.round(positionRef.current), 0, maximumIndex),
          0,
        );
        onTapRef.current();
        return;
      }

      const idleFor = performance.now() - lastTimeRef.current;
      const velocity = cancelled || idleFor > 90 ? 0 : velocityRef.current;
      const projectedMomentum = clamp(
        velocity * MOMENTUM_WINDOW_MS,
        -MAX_MOMENTUM_ITEMS,
        MAX_MOMENTUM_ITEMS,
      );
      const projectedPosition = movedRef.current
        ? positionRef.current + projectedMomentum
        : positionRef.current;
      const targetIndex = clamp(
        Math.round(projectedPosition),
        0,
        maximumIndex,
      );
      const distance = Math.abs(targetIndex - positionRef.current);
      const duration = Math.round(clamp(210 + distance * 72, 210, 520));

      settleAt(targetIndex, duration);
    },
    [maximumIndex, settleAt],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (unavailable) return;

      event.preventDefault();
      clearPendingAnimation();
      isSettlingRef.current = false;

      const normalizedDelta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * Math.max(1, event.currentTarget.clientHeight)
            : event.deltaY;

      wheelDeltaRef.current += normalizedDelta;
      const requestedSteps = Math.trunc(wheelDeltaRef.current / WHEEL_STEP_PX);

      if (requestedSteps === 0) {
        scheduleWheelReset();
        return;
      }

      const appliedSteps = clamp(
        requestedSteps,
        -MAX_WHEEL_ITEMS_PER_EVENT,
        MAX_WHEEL_ITEMS_PER_EVENT,
      );
      wheelDeltaRef.current -= appliedSteps * WHEEL_STEP_PX;

      const currentIndex = clamp(
        Math.round(positionRef.current),
        0,
        maximumIndex,
      );
      const targetIndex = clamp(
        currentIndex + appliedSteps,
        0,
        maximumIndex,
      );

      scheduleWheelReset();
      settleAt(targetIndex, 170);
    },
    [
      clearPendingAnimation,
      maximumIndex,
      scheduleWheelReset,
      settleAt,
      unavailable,
    ],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (unavailable) return;

      let nextIndex: number | null = null;
      const currentIndex = clamp(Math.round(positionRef.current), 0, maximumIndex);

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = currentIndex - 1;
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = currentIndex + 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = maximumIndex;
      }

      if (nextIndex === null) return;
      event.preventDefault();
      settleAt(nextIndex, 220);
    },
    [maximumIndex, settleAt, unavailable],
  );

  const trackStyle = {
    transform: `translate3d(0, ${-position * 100}%, 0)`,
    transition:
      transitionMs > 0
        ? `transform ${transitionMs}ms cubic-bezier(0.22, 0.72, 0.2, 1)`
        : "none",
  } satisfies CSSProperties;

  if (options.length === 0) {
    return (
      <div
        id={id}
        role="listbox"
        aria-label={ariaLabel}
        aria-disabled="true"
        className={cn(styles.root, className)}
        data-disabled="true"
      >
        <div className={styles.empty}>
          <div className={styles.itemContent}>{emptyContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`${id ?? "touch-wheel-picker"}-${selectedIndex}`}
      aria-disabled={unavailable || undefined}
      aria-roledescription="scroll picker"
      tabIndex={unavailable ? -1 : 0}
      className={cn(styles.root, className)}
      data-disabled={unavailable ? "true" : undefined}
      data-dragging={isDragging ? "true" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.sizer} aria-hidden="true">
        {options[selectedIndex]?.content}
      </div>
      <div className={styles.track} style={trackStyle}>
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id ?? "touch-wheel-picker"}-${index}`}
            role="option"
            aria-label={option.ariaLabel}
            aria-selected={option.value === value}
            className={cn(styles.item, itemClassName)}
          >
            <div className={styles.itemContent}>{option.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
