# JALVORO Status Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.9`  
Product rollout: not approved by this document

## Purpose

The Status category represents a resulting system condition, severity or capability state. It must not be used for an operation the user performs, a reusable object, or a decorative visual accent.

The category contains 6 canonical icons:

`success`, `warning`, `info`, `error`, `pending`, `spark`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Every state must be understandable without severity color.
4. A definition may contain at most three vector nodes.
5. Every definition communicates one resulting state.
6. No status definition contains accent-placement geometry.
7. Success and Error use state enclosures so they remain separate from bare Check and Close actions.
8. Pending must communicate unresolved waiting without duplicating Clock or Refresh.
9. Spark is permitted only when the semantic concept itself is AI-enhanced, new or special.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### Success

- Cue: enclosed confirmation mark
- Intent: completed, confirmed or resolved state
- Boundary: distinct from the bare Check action
- Rejected: double check, celebration rays, color-only meaning

### Warning

- Cue: triangular caution enclosure
- Intent: attention, elevated risk or non-final concern
- Boundary: warns without claiming the operation has failed
- Rejected: hazard stripes, flame metaphor, color-only meaning

### Info

- Cue: rounded-square information notice
- Intent: neutral context, explanation or informational notice
- Boundary: separate from Help actions and Warning severity
- Rejected: question mark, speech bubble, color-only meaning

### Error

- Cue: eight-sided stop enclosure with a crossing mark
- Intent: failed, invalid or blocked state
- Boundary: distinct from the bare Close action
- Rejected: trash metaphor, skull symbol, color-only meaning

### Pending

- Cue: minimal hourglass
- Intent: queued, waiting or incomplete process
- Boundary: distinct from the Clock object and Refresh action
- Rejected: spinner animation, percentage text, color-only meaning

### Spark

- Cue: one restrained four-direction spark
- Intent: explicitly designated AI-enhanced, new or special capability
- Boundary: never a generic fallback or automatic decoration
- Rejected: multiple sparkles, unrelated feature decoration, repeated visual noise

## Naming standard

- Source ID: lowercase kebab-case resulting state or severity concept
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: concise title-case state label
- Aliases: search-only state synonyms; never duplicate component exports
- State boundary: resulting conditions belong here; operations belong in Actions
- Color boundary: geometry and context must carry meaning without severity colors
- Spark boundary: explicit semantic use only; never automatic decoration

## Quality gates

Automated tests verify:

- all 6 canonical definitions are present and ordered;
- every geometry signature is unique;
- every icon uses three or fewer vector nodes;
- every definition represents exactly one state object;
- no status includes accent-placement geometry;
- explicit accent props cannot create micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue, relationship and rejection list;
- success/error remain distinct from Check/Close actions;
- pending remains distinct from Clock and Refresh;
- spark remains a single explicit semantic mark rather than a decoration system.

## Core completion

With Status mastered, all 8 JALVORO Core categories and all 82 canonical icons have completed the category-level master process. This confirms design-system readiness inside the private Icon Library Center only. It does not approve automatic product rollout.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, finance, settings, communication, business modules or other product surfaces.
