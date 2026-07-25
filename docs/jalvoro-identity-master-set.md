# JALVORO Identity Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.6`  
Product rollout: not approved by this document

## Purpose

The Identity category represents people and account actors. Its icons must communicate singular, plural or person-specific addition without assuming gender, age, ethnicity, profession, emotion, authority or account status.

The category contains 3 canonical icons:

`user`, `users`, `user-plus`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Human silhouettes stay neutral and abstract.
4. No facial features, hair, clothing, role equipment or demographic markers are allowed.
5. A definition may contain at most four vector nodes.
6. A definition may communicate at most two directly related objects.
7. No identity definition contains accent-placement geometry.
8. Identity icons describe actors; Actions describe operations; Status describes resulting state.
9. A plus mark may appear only when the identity context is explicit.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### User

- Cue: one centered head and one open shoulder arc
- Intent: one person, account actor or profile
- Rejected: facial features, gendered styling, enclosing status circle

The silhouette is deliberately broad and balanced. It does not imply a specific role, mood, body type or account state.

### Users

- Cue: one leading actor with one smaller offset actor
- Intent: a team, member set or small group
- Rejected: a three-person crowd, organization-building metaphor, demographic detail

Plurality comes from one secondary actor only. The icon remains readable at compact sizes without becoming a dense crowd.

### User Plus

- Cue: one neutral actor with a detached plus beside it
- Intent: invite, add or onboard a person
- Rejected: plus inside the head or torso, status badge, generic Add usage

The plus is positioned outside the actor silhouette so it reads as an identity-scoped operation rather than a physical or status attribute.

## Relationship rules

- `user` is the canonical base identity silhouette.
- `users` extends the base language with one secondary actor and must not become a crowd icon.
- `user-plus` combines the base actor language with the Add action only where the object being added is a person.
- Generic creation continues to use `add`, not `user-plus`.
- Team destinations may use `users`; organization, department or building concepts require separate future icons.

## Naming standard

- Source ID: lowercase kebab-case identity noun or identity-scoped composite
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: concise title-case identity label
- Aliases: search-only alternate identity terms; never duplicate component exports
- Neutrality: no gender, age, ethnicity, role, emotion or status assumptions
- Category boundary: actors belong in Identity, operations in Actions and outcomes in Status

## Quality gates

Automated tests verify:

- all 3 canonical definitions are present and ordered;
- every geometry signature is unique;
- every icon uses four or fewer vector nodes;
- every icon uses no more than two related objects;
- no identity icon includes accent-placement geometry;
- explicit accent props cannot create micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue and rejection list;
- singular, plural and person-add meanings remain documented and separate;
- neutral naming and actor-versus-action boundaries remain stable.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, finance, settings, business modules, account screens or other product surfaces.
