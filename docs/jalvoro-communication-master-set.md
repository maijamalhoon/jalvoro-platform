# JALVORO Communication Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.7`  
Product rollout: not approved by this document

## Purpose

The Communication category represents channels, messages, delivery and worldwide communication reach. Its icons must remain readable without badges, motion lines, platform branding or decorative effects.

The category contains 5 canonical icons:

`mail`, `chat`, `phone`, `send`, `globe`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Every icon communicates one channel, message-delivery concept or reach concept.
4. A definition may contain at most four vector nodes.
5. A definition may communicate at most two directly related objects.
6. No communication definition contains accent-placement geometry.
7. Communication channels must remain distinct without relying on color or badges.
8. Generic operations stay in Actions; Communication owns channel-scoped message delivery.
9. Global reach must not rely on country-specific landmass or language text.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### Mail

- Cue: rounded envelope with folded flap
- Intent: addressed asynchronous mail, email or inbox communication
- Rejected: notification badge, paper plane, stacked envelopes

Mail represents correspondence as a channel or object. It does not imply unread state, success, urgency or delivery status.

### Chat

- Cue: one speech bubble with restrained text lines
- Intent: an active written conversation or discussion thread
- Rejected: overlapping bubble stack, ellipsis-only bubble, notification badge

Chat remains distinct from Mail by using a conversational tail and visible message content rather than an envelope flap.

### Phone

- Cue: one continuous telephone handset
- Intent: voice calling or telephone contact
- Rejected: smartphone rectangle, signal waves, call-status badge

The handset is device-brand neutral and does not imply incoming, outgoing, missed or active call state.

### Send

- Cue: right-facing paper plane with central fold
- Intent: deliver a composed message through the active communication channel
- Rejected: share nodes, export container, motion streaks

Send is a communication-scoped action. Generic distribution continues to use Share, while data crossing a system boundary continues to use Export.

### Globe

- Cue: circular world grid with equator and longitude curves
- Intent: international communication, language availability or worldwide presence
- Rejected: map pin, browser window, country-specific landmass

Globe represents communication reach rather than location, travel, physical geography or browser navigation.

## Relationship rules

- `mail` and `chat` are written channels but use different container metaphors.
- `phone` is a synchronous voice channel and must not inherit written-message cues.
- `send` may combine with a communication surface, but it must remain visually distinct from Share and Export.
- `globe` communicates worldwide reach and must not become a location or internet-browser icon.
- Notification state, unread state and delivery status require separate Status compositions or UI indicators.

## Naming standard

- Source ID: lowercase kebab-case channel, message or communication-reach concept
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: concise title-case communication label
- Aliases: search-only channel synonyms; never duplicate component exports
- Channel boundary: channels, messages and delivery belong here; generic operations remain in Actions and physical items remain in Objects
- Global boundary: Globe means worldwide communication or language reach, not location, browser navigation or geography detail

## Quality gates

Automated tests verify:

- all 5 canonical definitions are present and ordered;
- every geometry signature is unique;
- every icon uses four or fewer vector nodes;
- every icon uses no more than two related objects;
- no communication icon includes accent-placement geometry;
- explicit accent props cannot create micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue, relationship and rejection list;
- mail/chat and send/share/export boundaries remain documented;
- communication naming and global-reach rules remain stable.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, finance, settings, business modules, messaging surfaces or other product screens.
