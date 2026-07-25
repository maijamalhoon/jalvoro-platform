# JALVORO Interface Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.8`  
Product rollout: not approved by this document

## Purpose

The Interface category represents controls, view modes, visibility states and directional movement inside a product surface. It does not represent product destinations, business operations or outcome statuses.

The category contains 10 canonical icons:

`menu`, `grid`, `list`, `sidebar`, `eye`, `eye-off`, `chevron-down`, `chevron-right`, `arrow-left`, `arrow-right`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Every interface icon communicates one control, view mode, visibility state or direction.
4. A definition may contain at most four vector nodes.
5. Every current Interface definition communicates one primary object.
6. No Interface definition contains accent-placement geometry.
7. Interface controls must remain distinct from Navigation destinations and domain Actions.
8. Chevrons indicate disclosure or hierarchy; arrows indicate movement between interface states.
9. Visibility icons do not imply surveillance, authorization, deletion or encryption.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### Menu

- Cue: three equal horizontal strokes
- Intent: reveal or collapse a navigation or contextual menu
- Rejected: uneven decorative lines, overflow dots, enclosing button shape

Menu is a control that reveals content. It is not itself a destination in the Navigation category.

### Grid

- Cue: four balanced tiles
- Intent: switch a collection to tile or gallery view
- Rejected: dashboard charts, nine dense dots, selected-tile badge

### List

- Cue: three markers and three aligned rows
- Intent: switch a collection to ordered row view
- Rejected: check marks, numbered ranking, unequal decorative rows

Grid and List are matched view-mode alternatives. They must not become generic app-launcher or task-list icons.

### Sidebar

- Cue: application frame with a narrow side rail
- Intent: identify or control a persistent side panel
- Rejected: browser chrome, dashboard widgets, built-in collapse arrow

### Eye

- Cue: symmetric eye contour with centered pupil
- Intent: show, preview or indicate visible content
- Rejected: eyelashes, camera lens, status badge

### Eye Off

- Cue: interrupted eye contour crossed by one slash
- Intent: hide or indicate concealed content
- Rejected: lock symbol, close mark alone, privacy-status badge

Eye and Eye Off describe interface visibility only. They do not describe access control or security state.

### Chevron Down

- Cue: two strokes meeting at a lower point
- Intent: disclose or expand downward
- Rejected: shaft, download baseline, filled triangle

### Chevron Right

- Cue: two strokes meeting at a right point
- Intent: disclose or drill into a hierarchy
- Rejected: shaft, send plane, filled triangle

### Arrow Left

- Cue: left-facing head with horizontal shaft
- Intent: move back or return to a previous interface state
- Rejected: curved history arc, chevron-only form, browser enclosure

### Arrow Right

- Cue: right-facing head with horizontal shaft
- Intent: move forward or continue to a next interface state
- Rejected: paper plane, export container, chevron-only form

Arrows describe directional movement. Undo and Redo remain change-history actions; Send, Share and Export remain domain operations.

## Relationship rules

- `grid` and `list` are paired view modes.
- `eye` and `eye-off` are paired visibility controls.
- `chevron-down` and `chevron-right` are disclosure directions, not movement arrows.
- `arrow-left` and `arrow-right` are directional counterparts.
- `arrow-left` must remain distinct from `undo`.
- `arrow-right` must remain distinct from `send`, `share` and `export`.
- `menu` may reveal Navigation content but remains an Interface control.
- `sidebar` represents layout structure rather than a destination or content module.

## Naming standard

- Source ID: lowercase kebab-case interface control, layout or directional concept
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: concise title-case interface label
- Aliases: search-only UI terminology; never duplicate component exports
- Control boundary: Interface owns controls, view modes, visibility and direction
- Direction boundary: chevrons indicate disclosure; arrows indicate movement

## Quality gates

Automated tests verify:

- all 10 canonical definitions are present and ordered;
- every geometry signature is unique;
- every icon uses four or fewer vector nodes;
- every icon communicates one primary object;
- no Interface icon includes accent-placement geometry;
- explicit accent props cannot create micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue, relationship and rejection list;
- grid/list, eye/eye-off, chevron/arrow and history/action boundaries remain explicit;
- naming and category ownership remain stable.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, navigation, finance, settings, business modules or other product surfaces.
