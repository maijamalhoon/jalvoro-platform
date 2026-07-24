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

The 12 navigation icons are the first category to pass the complete master process:

- unique semantic silhouettes
- no accent-placement geometry
- maximum six vector nodes per icon
- documented intent, primary cue, rejection list, relationships, and aliases
- automatic rendering checks at 16, 20, 24, and 32 pixels
- stable naming and import rules

The canonical design brief lives in `docs/jalvoro-navigation-master-set.md`. Machine-readable review metadata lives in `lib/icon-system/navigation-master-set.ts`.

## Design status

`master` means the icon has passed semantic, geometry, naming, size, and clean-default gates inside the private Icon System library. It does not mean the icon has been approved for product rollout.

All non-master categories remain design drafts until they receive the same category-level review and automated quality gates.
