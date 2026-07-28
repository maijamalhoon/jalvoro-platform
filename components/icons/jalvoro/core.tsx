import { forwardRef, type ReactElement } from "react";

import { JALVORO_ICON_TOKENS, resolveJalvoroStrokeWidth } from "./tokens";
import type {
  JalvoroAccentPlacement,
  JalvoroIconAccent,
  JalvoroIconComponent,
  JalvoroIconDefinition,
  JalvoroIconNode,
  JalvoroIconProps,
} from "./types";

type Point = { x: number; y: number };

function clean(value: number) {
  return Number(value.toFixed(3));
}

function rotate(point: Point, center: Point, angle = 0): Point {
  if (!angle) return point;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: clean(center.x + dx * cos - dy * sin),
    y: clean(center.y + dx * sin + dy * cos),
  };
}

function pointText(point: Point) {
  return `${clean(point.x)} ${clean(point.y)}`;
}

function resolveAccentPath(
  placement: JalvoroAccentPlacement,
  accent: Exclude<JalvoroIconAccent, "none">,
) {
  const { x, y, width, height, rotation = 0 } = placement;
  const center = { x: x + width / 2, y };
  const r = (point: Point) => rotate(point, center, rotation);

  if (accent === "wave") {
    const p0 = r({ x, y });
    const c1 = r({ x: x + width * 0.18, y: y - height });
    const c2 = r({ x: x + width * 0.32, y: y + height });
    const p1 = r({ x: x + width * 0.5, y });
    const c3 = r({ x: x + width * 0.68, y: y - height });
    const c4 = r({ x: x + width * 0.82, y: y + height });
    const p2 = r({ x: x + width, y });
    return `M${pointText(p0)} C${pointText(c1)} ${pointText(c2)} ${pointText(p1)} C${pointText(c3)} ${pointText(c4)} ${pointText(p2)}`;
  }

  if (accent === "zigzag") {
    const points = [
      r({ x, y: y + height * 0.15 }),
      r({ x: x + width * 0.28, y: y - height }),
      r({ x: x + width * 0.52, y: y + height * 0.65 }),
      r({ x: x + width * 0.76, y: y - height * 0.45 }),
      r({ x: x + width, y: y + height * 0.05 }),
    ];
    return `M${points.map(pointText).join(" L")}`;
  }

  const p0 = r({ x, y });
  const c1 = r({ x: x + width * 0.3, y: y - height * 0.35 });
  const c2 = r({ x: x + width * 0.7, y: y + height * 0.35 });
  const p1 = r({ x: x + width, y });
  return `M${pointText(p0)} C${pointText(c1)} ${pointText(c2)} ${pointText(p1)}`;
}

function renderNode(
  node: JalvoroIconNode,
  index: number,
  strokeWidth: number,
): ReactElement {
  const width = strokeWidth * (node.strokeScale ?? 1);
  const key = `${node.kind}-${index}`;
  const common = {
    opacity: node.opacity,
    stroke: node.filled ? "none" : "currentColor",
    fill: node.filled ? "currentColor" : "none",
    strokeWidth: node.filled ? undefined : width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (node.kind) {
    case "path":
      return <path key={key} {...common} d={node.d} />;
    case "circle":
      return <circle key={key} {...common} cx={node.cx} cy={node.cy} r={node.r} />;
    case "rect":
      return (
        <rect
          key={key}
          {...common}
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={node.rx}
        />
      );
    case "line":
      return (
        <line
          key={key}
          {...common}
          x1={node.x1}
          y1={node.y1}
          x2={node.x2}
          y2={node.y2}
        />
      );
    case "polyline":
      return <polyline key={key} {...common} points={node.points} />;
  }
}

export function createJalvoroIcon(
  definition: JalvoroIconDefinition,
): JalvoroIconComponent {
  const Component = forwardRef<SVGSVGElement, JalvoroIconProps>(
    function JalvoroIconComponent(
      {
        size = JALVORO_ICON_TOKENS.size.md,
        strokeWidth: strokeWidthOverride,
        context = "content",
        accent: accentOverride,
        title,
        role,
        ...props
      },
      ref,
    ) {
      const strokeWidth = resolveJalvoroStrokeWidth(context, strokeWidthOverride);
      const accent = definition.accent
        ? (accentOverride ?? "none")
        : "none";
      const labelled = Boolean(
        title || props["aria-label"] || props["aria-labelledby"],
      );
      const accentStroke = Math.max(
        JALVORO_ICON_TOKENS.accent.minimumStroke,
        strokeWidth - JALVORO_ICON_TOKENS.accent.strokeDelta,
      );

      return (
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={JALVORO_ICON_TOKENS.viewBox}
          fill="none"
          role={role ?? (labelled ? "img" : undefined)}
          aria-hidden={labelled ? undefined : true}
          data-jalvoro-icon={definition.name}
          data-jalvoro-accent={accent}
          {...props}
        >
          {title ? <title>{title}</title> : null}
          {definition.body.map((node, index) =>
            renderNode(node, index, strokeWidth),
          )}
          {definition.accent && accent !== "none" ? (
            <path
              d={resolveAccentPath(definition.accent, accent)}
              fill="none"
              stroke="currentColor"
              strokeWidth={accentStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={JALVORO_ICON_TOKENS.accent.opacity[accent]}
              data-jalvoro-micro-accent={accent}
            />
          ) : null}
        </svg>
      );
    },
  );

  Component.displayName = `Jalvoro${definition.label.replace(/[^a-zA-Z0-9]/g, "")}Icon`;
  return Component;
}
