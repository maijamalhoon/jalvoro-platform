# JALVORO Icons

First-party icon design laboratory for JALVORO. The library is intentionally isolated from the current product UI.

## Clean default

- 24×24 source grid
- thin rounded outline
- `currentColor` only
- one clear object; two only when meaning requires it
- no automatic wave, zigzag, sparkle, or decorative inner line
- no generic fallback for unrelated concepts
- readable at 16, 20, 24, and 32 pixels

Existing application screens keep their established icons, sizes, colors, classes, spacing, hover states, and active states. A JALVORO icon enters the product only after individual visual approval.

Micro-accents remain available only through an explicit prop in isolated design previews. They never render by default.

## Mastered categories

### Navigation — master

The 12 navigation icons passed the complete master process with unique semantic silhouettes, no accent-placement geometry, documented intent and automated size, color and complexity checks.

- design brief: `docs/jalvoro-navigation-master-set.md`
- machine-readable specification: `lib/icon-system/navigation-master-set.ts`

### Actions — master

The 18 action icons passed the same master process with an additional operation-versus-status boundary and strict paired-action rules.

- every icon communicates one immediate operation
- maximum five vector nodes per icon
- no accent-placement geometry
- true opposite pairs use matched geometry only where meaning requires it
- export/import, download/upload and undo/redo are explicitly documented pairs
- check and close remain bare action marks rather than status badges
- automatic rendering checks run at 16, 20, 24 and 32 pixels

- design brief: `docs/jalvoro-actions-master-set.md`
- machine-readable specification: `lib/icon-system/actions-master-set.ts`

### Finance — master

The 16 finance icons now use currency-neutral, professional silhouettes designed for global finance products.

- every symbol remains understandable without a currency sign or brand color
- maximum five vector nodes per icon
- no accent-placement geometry
- receipt and invoice have intentionally different transaction states
- transfer and exchange have intentionally different financial meanings
- trend-up and trend-down use matched directional geometry
- calendar-money, shield-money and tax use restrained two-object compositions
- automatic rendering checks run at 16, 20, 24 and 32 pixels

- design brief: `docs/jalvoro-finance-master-set.md`
- machine-readable specification: `lib/icon-system/finance-master-set.ts`

## Design status

`master` means the icon has passed semantic, geometry, naming, size and clean-default gates inside the private Icon System library. It does not mean the icon has been approved for product rollout.

Navigation, Actions and Finance are mastered. Objects, Identity, Communication, Interface and Status remain design drafts until they pass the same category-level review and automated quality gates.
