# JALVORO Objects Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.5`  
Product rollout: not approved by this document

## Purpose

The Objects category represents reusable physical and digital things. An object icon describes what something is, not what the user can do with it and not the status that results from an operation.

The category contains 12 canonical icons:

`file`, `folder`, `bell`, `clock`, `calendar`, `tag`, `link`, `image`, `camera`, `lock`, `key`, `pencil`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Generic objects stay visually simpler than domain-specific derivatives.
4. A definition may contain at most five vector nodes.
5. A definition may communicate at most two directly related objects.
6. No object definition contains accent-placement geometry.
7. An object must not silently imply an operation such as edit, upload or approve.
8. An object must not silently imply a status such as success, error or warning.
9. Related objects may share family proportions but require clearly different primary cues.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### File

- Cue: blank upright page with folded corner
- Intent: generic digital document or record
- Rejected: text lines, currency marks, receipt tear edge
- Distinction: simpler than invoice and reports

### Folder

- Cue: wide directory container with raised tab
- Intent: group related files or records
- Rejected: stacked files, book metaphor, decorative label

### Bell

- Cue: hanging notification bell
- Intent: alert or reminder object
- Rejected: motion lines, alert badge, filled clapper

### Clock

- Cue: circular timepiece with two hands
- Intent: time, duration or recorded moment
- Rejected: history arrow, alarm bells, second-hand detail

### Calendar

- Cue: bound month page with restrained date marks
- Intent: date or scheduled day
- Rejected: currency token, check badge, dense grid
- Distinction: plain date object rather than calendar-money

### Tag

- Cue: angled label with one attachment hole
- Intent: classification or identification
- Rejected: price symbol, stacked tags, bookmark silhouette

### Link

- Cue: two interlocking chain segments
- Intent: durable connection or reference
- Rejected: external-link arrow, network nodes, broken-link state

### Image

- Cue: framed landscape with one sun point
- Intent: an existing visual asset
- Rejected: camera lens, play triangle, multiple landscape layers

### Camera

- Cue: compact camera body with central lens
- Intent: a device used to capture a visual asset
- Rejected: image landscape, video play mark, flash burst

### Lock

- Cue: closed padlock
- Intent: secured boundary or closed access state
- Rejected: shield enclosure, check badge, open shackle

### Key

- Cue: circular bow, straight shaft and two teeth
- Intent: physical or symbolic access credential
- Rejected: password dots, API brackets, ornate teeth

### Pencil

- Cue: horizontal hexagonal writing instrument
- Intent: standalone stationery object
- Rejected: edit motion, document container, filled graphite triangle
- Distinction: deliberately different from the diagonal Edit action icon

## Naming standard

- Source ID: lowercase kebab-case singular object noun
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: concise title-case object name
- Aliases: search-only alternate nouns; never duplicate component exports
- State boundary: objects describe things; actions describe operations; status describes outcomes
- Specialization: generic objects remain simpler than domain-specific derivatives

## Quality gates

Automated tests verify:

- all 12 canonical definitions are present and ordered;
- every geometry signature is unique inside the category;
- every icon uses five or fewer vector nodes;
- every icon uses no more than two related objects;
- no object includes accent-placement geometry;
- explicit accent props cannot create micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue and rejection list;
- file, calendar, lock and pencil remain distinct from their domain-specific or action counterparts;
- naming and category boundaries remain stable.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, finance, settings, business modules or other product surfaces.
