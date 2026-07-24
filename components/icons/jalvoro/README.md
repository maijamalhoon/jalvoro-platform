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

The 16 finance icons use currency-neutral, professional silhouettes designed for global finance products.

- every symbol remains understandable without a currency sign or brand color
- maximum five vector nodes per icon
- no accent-placement geometry
- receipt and invoice have intentionally different transaction states
- transfer and exchange have intentionally different financial meanings
- trend-up and trend-down use matched directional geometry
- automatic rendering checks run at 16, 20, 24 and 32 pixels

- design brief: `docs/jalvoro-finance-master-set.md`
- machine-readable specification: `lib/icon-system/finance-master-set.ts`

### Objects — master

The 12 reusable object icons use clean standalone silhouettes without inheriting action or domain-specific meaning.

- generic objects stay visually simpler than specialized derivatives
- maximum five vector nodes per icon
- no accent-placement geometry
- file remains distinct from invoice and reports
- calendar remains distinct from calendar-money
- pencil remains distinct from the Edit action
- image and camera communicate asset versus capture device
- lock and key communicate security objects without duplicating protected-funds symbols
- automatic rendering checks run at 16, 20, 24 and 32 pixels

- design brief: `docs/jalvoro-objects-master-set.md`
- machine-readable specification: `lib/icon-system/objects-master-set.ts`

### Identity — master

The 3 identity icons use neutral, inclusive actor silhouettes without demographic, emotional, role or status assumptions.

- single-user, multi-user and person-add meanings remain distinct
- maximum four vector nodes per icon
- no accent-placement geometry
- no facial features, gendered styling, role clothing or profile-status badges
- user-plus is reserved for person-specific addition rather than generic Add
- automatic rendering checks run at 16, 20, 24 and 32 pixels

- design brief: `docs/jalvoro-identity-master-set.md`
- machine-readable specification: `lib/icon-system/identity-master-set.ts`

### Communication — master

The 5 communication icons use distinct channel, delivery and global-reach silhouettes without notification or motion decoration.

- mail, chat and phone remain clearly different communication channels
- maximum four vector nodes per icon
- no accent-placement geometry
- send is communication-scoped delivery rather than share or export
- globe means international communication or language reach rather than location or browser navigation
- automatic rendering checks run at 16, 20, 24 and 32 pixels

- design brief: `docs/jalvoro-communication-master-set.md`
- machine-readable specification: `lib/icon-system/communication-master-set.ts`

## Design status

`master` means the icon has passed semantic, geometry, naming, size and clean-default gates inside the private Icon System library. It does not mean the icon has been approved for product rollout.

Navigation, Actions, Finance, Objects, Identity and Communication are mastered. Interface and Status remain design drafts until they pass the same category-level review and automated quality gates.
