"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

type ScrollEdge = "start" | "end";

interface UseScrollSelectBehaviorProps {
  enabled?: boolean;
  open: boolean;
  value: string;
  values: string[];
  onValueChange: (value: string) => void;
}

function pulseEdge(node: HTMLElement, edge: ScrollEdge) {
  node.removeAttribute("data-scroll-edge");
  void node.offsetWidth;
  node.setAttribute("data-scroll-edge", edge);
  window.setTimeout(() => {
    if (node.getAttribute("data-scroll-edge") === edge) {
      node.removeAttribute("data-scroll-edge");
    }
  }, 260);
}

export function useScrollSelectBehavior({
  enabled = true,
  open,
  value,
  values,
  onValueChange,
}: UseScrollSelectBehaviorProps) {
  const [isTouchScrollOnly, setIsTouchScrollOnly] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const selectedValueRef = useRef(value);
  const wheelLockRef = useRef(0);
  const touchYRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    selectedValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setIsTouchScrollOnly(false);
      return;
    }

    const media = window.matchMedia("(max-width: 1024px) and (pointer: coarse)");
    const update = () => setIsTouchScrollOnly(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [enabled]);

  const alignSelected = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;

    const items = Array.from(
      node.querySelectorAll<HTMLElement>("[data-scroll-select-value]"),
    );
    const selected = items.find(
      (item) => item.dataset.scrollSelectValue === selectedValueRef.current,
    );
    if (!selected) return;

    const nextTop =
      selected.offsetTop - (node.clientHeight - selected.offsetHeight) / 2;
    node.scrollTop = Math.max(0, nextTop);
  }, []);

  useEffect(() => {
    if (!enabled || !open) return;
    const frame = window.requestAnimationFrame(alignSelected);
    return () => window.cancelAnimationFrame(frame);
  }, [alignSelected, enabled, open]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    [],
  );

  const selectCenteredItem = useCallback(
    (node: HTMLDivElement) => {
      const items = Array.from(
        node.querySelectorAll<HTMLElement>("[data-scroll-select-value]"),
      );
      if (items.length === 0) return;

      const center = node.scrollTop + node.clientHeight / 2;
      let closest = items[0];
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const item of items) {
        const itemCenter = item.offsetTop + item.offsetHeight / 2;
        const distance = Math.abs(itemCenter - center);
        if (distance < closestDistance) {
          closest = item;
          closestDistance = distance;
        }
      }

      const nextValue = closest.dataset.scrollSelectValue;
      if (nextValue && nextValue !== selectedValueRef.current) {
        selectedValueRef.current = nextValue;
        onValueChange(nextValue);
      }
    },
    [onValueChange],
  );

  const onTriggerWheel = useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      if (!enabled || values.length === 0 || Math.abs(event.deltaY) < 2) return;

      event.preventDefault();
      event.stopPropagation();

      const now = performance.now();
      if (now - wheelLockRef.current < 110) return;
      wheelLockRef.current = now;

      const currentIndex = Math.max(0, values.indexOf(selectedValueRef.current));
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.min(
        values.length - 1,
        Math.max(0, currentIndex + direction),
      );

      if (nextIndex === currentIndex) {
        pulseEdge(event.currentTarget, direction > 0 ? "end" : "start");
        return;
      }

      const nextValue = values[nextIndex];
      selectedValueRef.current = nextValue;
      onValueChange(nextValue);
    },
    [enabled, onValueChange, values],
  );

  const onContentScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!enabled || !isTouchScrollOnly) return;
      const node = event.currentTarget;

      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        selectCenteredItem(node);
        scrollFrameRef.current = null;
      });
    },
    [enabled, isTouchScrollOnly, selectCenteredItem],
  );

  const onContentWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const node = event.currentTarget;
      const atStart = node.scrollTop <= 1;
      const atEnd = node.scrollTop >= node.scrollHeight - node.clientHeight - 1;

      if (atStart && event.deltaY < 0) pulseEdge(node, "start");
      if (atEnd && event.deltaY > 0) pulseEdge(node, "end");
    },
    [enabled],
  );

  const onContentTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!enabled || !isTouchScrollOnly) return;
      touchYRef.current = event.touches[0]?.clientY ?? null;
    },
    [enabled, isTouchScrollOnly],
  );

  const onContentTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!enabled || !isTouchScrollOnly || touchYRef.current === null) return;

      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;

      const node = event.currentTarget;
      const movement = currentY - touchYRef.current;
      const atStart = node.scrollTop <= 1;
      const atEnd = node.scrollTop >= node.scrollHeight - node.clientHeight - 1;

      if (atStart && movement > 3) pulseEdge(node, "start");
      if (atEnd && movement < -3) pulseEdge(node, "end");
      touchYRef.current = currentY;
    },
    [enabled, isTouchScrollOnly],
  );

  return {
    contentRef,
    isTouchScrollOnly,
    onContentScroll,
    onContentTouchMove,
    onContentTouchStart,
    onContentWheel,
    onTriggerWheel,
  };
}
