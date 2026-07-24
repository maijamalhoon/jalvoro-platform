# JALVORO Icon Library Center

Status: private admin design infrastructure  
Route: `/admin/icon-system`

## Purpose

The Icon Library Center is the controlled workspace for creating, reviewing and standardizing JALVORO icons before product implementation. It is not a workspace-wide icon replacement mechanism.

## Current library

`JALVORO Core` is the first versioned library. It exposes the canonical icon manifest across navigation, actions, finance, objects, identity, communication, interface and status categories.

The catalog provides:

- searchable names, labels, aliases and keywords;
- category filters and category counts;
- 16, 20, 24 and 32 pixel previews;
- compact, content, heading and hero stroke contexts;
- component names and direct category import paths;
- copyable React usage snippets;
- library version, design status and roadmap visibility;
- machine-readable semantic intent and review metadata for mastered icons.

## Master process

A category moves from `draft` to `master` only after it has:

1. unique semantic silhouettes;
2. clean-default geometry with no decorative dependency;
3. fixed naming, aliases and category ownership;
4. size checks at 16, 20, 24 and 32 pixels;
5. complexity and object-count limits;
6. a semantic intent, primary cue and rejection list per icon;
7. automated quality-gate tests;
8. explicit isolation from product rollout.

Five categories are currently mastered:

- Navigation — 12 icons, documented in `docs/jalvoro-navigation-master-set.md`;
- Actions — 18 icons, documented in `docs/jalvoro-actions-master-set.md`;
- Finance — 16 icons, documented in `docs/jalvoro-finance-master-set.md`;
- Objects — 12 icons, documented in `docs/jalvoro-objects-master-set.md`;
- Identity — 3 icons, documented in `docs/jalvoro-identity-master-set.md`.

Actions enforce a strict operation-versus-status boundary and document true opposite pairs such as export/import, download/upload and undo/redo.

Finance enforces global currency neutrality, separates financial objects from operations and destinations, and explicitly differentiates receipt/invoice, transfer/exchange and trend-up/trend-down.

Objects enforce a thing-versus-action boundary, keep generic objects simpler than domain-specific derivatives, and explicitly distinguish file/invoice/report, calendar/calendar-money, pencil/edit and image/camera.

Identity enforces neutral actor silhouettes, separates singular, plural and person-add meanings, and forbids demographic, emotional, role and account-status assumptions.

## Standard library model

Library metadata lives in `lib/icon-system/library.ts`. The model separates:

1. the canonical vector definitions;
2. the typed manifest and registry;
3. reusable library metadata;
4. category master specifications;
5. the private review interface;
6. future package extraction.

Planned libraries may be added to the roadmap without pretending that their icons already exist. A library becomes active only when its symbols, metadata and tests are complete.

## Product safety boundary

The catalog does not apply icons to the dashboard, settings, finance screens or business modules. Existing product icons remain unchanged. A future JALVORO icon enters the product only after individual visual approval.

No aliasing, compatibility fallback or repository-wide icon codemod is part of this center.

## Clean icon rule

Preview and copied usage use the clean default:

- no wave;
- no zigzag;
- no sparkle fallback;
- no automatic decorative inner line;
- no hard-coded product color;
- one clear semantic object, or two directly related objects when required.

## Future package direction

The model is ready for later extraction into versioned packages such as `@jalvoro/icons-core`. Package extraction is a future delivery step and does not change the current internal import contract.
