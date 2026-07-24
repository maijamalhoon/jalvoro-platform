# JALVORO Actions Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.3`  
Product rollout: not approved by this document

## Purpose

The Actions category represents immediate user operations. An action icon must describe what the user can do now; it must not describe the resulting status, destination or business object.

The category contains 18 canonical icons:

`add`, `edit`, `delete`, `copy`, `search`, `filter`, `sort`, `share`, `export`, `import`, `download`, `upload`, `refresh`, `check`, `close`, `more`, `undo`, `redo`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Every action has one clear operation cue.
4. A definition may contain at most five vector nodes.
5. A definition may communicate at most two directly related objects.
6. No action definition contains accent-placement geometry.
7. Check and close remain bare marks; enclosing circles belong to status or button surfaces.
8. Paired geometry is allowed only for true opposite operations.
9. No icon relies on a brand color, animation or badge to become understandable.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### Add

- Cue: a centered plus
- Intent: create or insert one new item
- Rejected: decorative circle, sparkle, filled badge

### Edit

- Cue: diagonal pencil
- Intent: modify an existing item
- Rejected: document container, brush metaphor, filled triangular tip

### Delete

- Cue: restrained waste bin
- Intent: remove an item
- Rejected: danger badge, cross mark, shredded-paper detail

### Copy

- Cue: two overlapping rounded documents
- Intent: duplicate content
- Rejected: clipboard, plus badge, three-document stack

### Search

- Cue: magnifying lens
- Intent: find content through a query
- Rejected: eye metaphor, sparkle, text inside the lens

### Filter

- Cue: one funnel
- Intent: narrow results by criteria
- Rejected: slider controls, search lens, stacked funnels

### Sort

- Cue: descending measure lines with a direction arrow
- Intent: change collection order
- Rejected: transfer arrows, filter funnel, alphabet-specific labels

### Share

- Cue: one source node distributing to two destinations
- Intent: distribute content
- Rejected: paper plane, external-link box, dense network

### Export / Import

- Cue: an arrow crossing an application boundary
- Intent: move content out of or into the current system
- Relationship: mirrored semantic pair
- Rejected: download/upload baseline, share network, file-format badge

### Download / Upload

- Cue: a vertical arrow moving toward or away from a local baseline
- Intent: save to or send from the device
- Relationship: matched vertical pair
- Rejected: inbox/outbox tray, import/export container, cloud decoration

### Refresh

- Cue: two opposing open circular arcs
- Intent: request the latest state
- Rejected: undo arrow, sync badge, closed decorative ring

### Check

- Cue: one clean confirmation mark
- Intent: confirm, accept or complete an operation
- Rejected: status circle, success badge, double-check symbol

### Close

- Cue: two equal crossing diagonal strokes
- Intent: dismiss the current surface
- Rejected: status circle, trash metaphor, unequal diagonals

### More

- Cue: three evenly spaced horizontal points
- Intent: reveal additional contextual actions
- Rejected: canonical vertical orientation, menu lines, enclosure

### Undo / Redo

- Cue: a curved historical arrow turning left or right
- Intent: reverse or reapply the latest reversible change
- Relationship: mirrored semantic pair
- Rejected: browser arrows, refresh cycle, multiple history rings

## Naming standard

- Source ID: lowercase kebab-case imperative action
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: concise title-case verb
- Aliases: search-only alternate verbs; never duplicate component exports
- Paired actions: mirrored geometry only for true semantic opposites
- Status boundary: operations belong here; result states belong in Status

## Quality gates

Automated tests verify:

- all 18 canonical definitions are present and ordered;
- every geometry signature is unique;
- every icon uses five or fewer vector nodes;
- every icon uses no more than two related objects;
- no action includes accent-placement geometry;
- explicit accent props cannot create micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue and rejection list;
- true opposite action pairs document each other;
- naming and action-versus-status boundaries remain stable.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, finance, settings, business modules or other product surfaces.
