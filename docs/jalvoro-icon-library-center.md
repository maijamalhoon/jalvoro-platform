# JALVORO Icon Library Center

Status: private admin design infrastructure  
Route: `/admin/icon-system`

## Purpose

The Icon Library Center is the controlled workspace for creating, reviewing and standardizing JALVORO icons before product implementation. It is not a workspace-wide icon replacement mechanism.

## Current library

`JALVORO Core` is the first versioned library. It currently exposes the canonical icon manifest across navigation, actions, finance, objects, identity, communication, interface and status categories.

The catalog provides:

- searchable names, labels, aliases and keywords;
- category filters and category counts;
- 16, 20, 24 and 32 pixel previews;
- compact, content, heading and hero stroke contexts;
- component names and direct category import paths;
- copyable React usage snippets;
- library version, status and roadmap visibility.

## Standard library model

Library metadata lives in `lib/icon-system/library.ts`. The model separates:

1. the canonical vector definitions;
2. the typed manifest and registry;
3. reusable library metadata;
4. the private review interface;
5. future package extraction.

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
