import type { JalvoroIconContext } from "./types";

export const JALVORO_ICON_SYSTEM_VERSION = "1.0.0-alpha.3";

export const JALVORO_ICON_TOKENS = Object.freeze({
  viewBox: "0 0 24 24",
  size: Object.freeze({ xs: 16, sm: 20, md: 24, lg: 32, xl: 40, hero: 48 }),
  stroke: Object.freeze({ compact: 1.45, content: 1.55, heading: 1.7, hero: 1.85 }),
  accent: Object.freeze({
    strokeDelta: 0.25,
    minimumStroke: 1,
    opacity: Object.freeze({ wave: 0.86, zigzag: 0.9, subtle: 0.58 }),
  }),
});

export function resolveJalvoroStrokeWidth(
  context: JalvoroIconContext = "content",
  override?: number,
) {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }

  return JALVORO_ICON_TOKENS.stroke[context];
}
