# JALVORO Navigation Master Set

Status: design master  
Library version: 1.0.0-alpha.2  
Product rollout: not approved and not included

## Purpose

This document defines the first mastered category in JALVORO Core. The navigation set establishes the visual discipline future categories must follow: same family language, different semantic silhouettes.

The set is intentionally isolated inside the Icon System library. Updating these vectors changes design previews and first-party exports, but does not replace icons in dashboard, finance, settings, business, or other product screens.

## Locked visual rules

- 24×24 source grid
- thin rounded outline
- `currentColor` only
- no decorative micro-accent geometry
- no default wave, zigzag, sparkle, or filler line
- one primary concept; maximum two directly related objects
- six body nodes or fewer for this category
- readable at 16, 20, 24, and 32 pixels
- paired icons may share structure only when direction is the actual semantic distinction
- no currency-specific symbol in global navigation icons

## Naming standard

| Layer | Rule | Example |
|---|---|---|
| Source id | lowercase semantic kebab-case | `ai-insights` |
| Component | `Jalvoro{PascalCaseName}Icon` | `JalvoroAiInsightsIcon` |
| Label | readable title case | `AI Insights` |
| Alias | search-only alternate terminology | `smart-insights` |
| Import | category-owned first-party path | `@/components/icons/jalvoro/components/navigation` |

Aliases must never create duplicate component exports. A semantic rename requires a manifest migration and versioned deprecation plan.

## Master silhouettes

### Dashboard

Four interface panels with intentionally different proportions. The icon communicates workspace overview without using a home or speedometer metaphor.

### Transactions

Two parallel opposing arrows. It communicates recorded movement in both directions and avoids receipt duplication.

### Accounts

A simplified institutional facade with three stable columns. It communicates the structured set of financial accounts without duplicating the wallet icon.

### Income

A downward arrow entering a receiving tray. This is the incoming half of a deliberately matched directional pair.

### Expenses

An upward arrow leaving a receiving tray. This is the outgoing half of the income/expenses pair; it must not use warning or danger styling.

### Goals

Three concentric target levels ending in one center point. No arrow, flag, or celebration decoration is needed.

### Payables

A folded document containing a compact clock. It combines documented obligation and due-time meaning while avoiding the detailed hand-and-coin illustration.

### Investments

A portfolio case containing one ascending path. The case prevents confusion with analytics, while the path prevents confusion with a generic work briefcase.

### Analytics

Three ascending rounded bars aligned to one baseline. It represents measurable comparison and intentionally excludes trend arrows or report containers.

### AI Insights

A central reasoning node linked to three balanced outer nodes. The icon represents connected intelligence without relying on sparkles, robot faces, or a literal brain outline.

### Reports

A folded document with restrained text and one miniature report graph. It remains distinct from files, receipts, and analytics.

### Settings

Three horizontal controls with independently positioned circular handles. This replaces the visually heavy gear and provides a cleaner universal configuration cue.

## Directional pair contract

Income and expenses are the only deliberately mirrored icons in this set. Their tray geometry, size, and visual weight remain matched; only the arrow direction changes. Reusing the same silhouette for unrelated navigation concepts is prohibited.

## Quality gates

The automated navigation master test verifies:

- all 12 canonical names are present and ordered;
- every body signature is unique;
- no definition contains accent placement geometry;
- all icons render at 16, 20, 24, and 32 pixels;
- no hard-coded color is emitted;
- complexity remains within the six-node category ceiling;
- every icon has a semantic intent, silhouette statement, primary cue, and rejection list.

## Future-agent protocol

1. Change the smallest relevant vector definition.
2. Preserve the icon's semantic intent and rejection list.
3. Do not add decorative detail to compensate for a weak silhouette.
4. Test the icon at all approved sizes in the private Icon System library.
5. Update the master specification when meaning changes.
6. Never roll the icon into product UI without separate explicit approval.
