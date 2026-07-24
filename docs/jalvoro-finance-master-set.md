# JALVORO Finance Master Set

Status: master inside the private Icon System library  
Version introduced: `1.0.0-alpha.4`  
Product rollout: not approved by this document

## Purpose

The Finance category represents financial objects, records, plans and financial states. It must remain globally understandable without depending on a specific currency sign, national emblem, payment brand or color convention.

The category contains 16 canonical icons:

`wallet`, `bank`, `card`, `cash`, `coin`, `receipt`, `invoice`, `budget`, `savings`, `trend-up`, `trend-down`, `transfer`, `exchange`, `calendar-money`, `shield-money`, `tax`.

## Category rules

1. Every icon uses the 24×24 JALVORO source grid.
2. `currentColor`, rounded caps and rounded joins remain mandatory.
3. Currency-specific letters, logos and national symbols are forbidden.
4. A definition may contain at most five vector nodes.
5. A definition may communicate at most two directly related objects.
6. No finance definition contains accent-placement geometry.
7. Financial objects must not be confused with Actions or Navigation destinations.
8. Composite icons are allowed only when both concepts are required for recognition.
9. Positive and negative financial direction must be communicated through geometry, not color.
10. Product UI remains unchanged until a later explicit icon-by-icon rollout approval.

## Canonical semantic decisions

### Wallet

- Cue: a rounded wallet with one clasp pocket
- Intent: immediately available personal or business funds
- Rejected: bank facade, purse ornament, currency symbol

### Bank

- Cue: a neutral institutional facade
- Intent: a regulated financial institution or branch
- Rejected: wallet silhouette, country-specific architecture, currency badge

### Card

- Cue: payment card with band and chip
- Intent: a physical or virtual payment card
- Rejected: payment-network logo, contactless decoration, stacked cards

### Cash

- Cue: one banknote with central seal and corner curves
- Intent: physical paper money
- Rejected: portraits, stacked notes, overlapping coins

### Coin

- Cue: concentric monetary token rims
- Intent: a generic coin or value token
- Rejected: currency letter, crypto logo, coin pile

### Receipt

- Cue: a narrow transaction record with a semantic tear edge
- Intent: proof that a purchase or transaction has already occurred
- Rejected: folded document corner, currency symbol, decorative internal zigzag

### Invoice

- Cue: folded document with item rows and aligned total
- Intent: a formal request for payment
- Rejected: receipt tear edge, currency-specific mark, overdue warning badge

Receipt and Invoice intentionally differ by transaction state: a receipt records completion; an invoice requests payment.

### Budget

- Cue: segmented allocation circle with two planning measures
- Intent: planned allocation of money
- Rejected: analytics bar chart, wallet container, currency symbol

### Savings

- Cue: simplified piggy bank with one slot
- Intent: money reserved for future use
- Rejected: falling coin, celebration spark, childish facial details

### Trend Up / Trend Down

- Cue: matched directional financial paths
- Intent: increasing or decreasing measured financial performance
- Relationship: true directional pair
- Rejected: bar charts, currency badges, success or error enclosures

### Transfer

- Cue: two account containers connected by opposing arrows
- Intent: move the same funds between accounts
- Rejected: standalone transaction arrows, currency tokens, refresh motion

### Exchange

- Cue: two monetary tokens connected by conversion arrows
- Intent: convert value from one denomination or currency into another
- Rejected: currency letters, account containers, refresh motion

Transfer and Exchange intentionally differ: transfer changes location; exchange changes denomination.

### Calendar Money

- Cue: calendar containing one neutral monetary marker
- Intent: a payment, obligation or financial event attached to a date
- Rejected: full calendar grid, currency symbol, notification badge

### Shield Money

- Cue: shield containing one neutral monetary marker
- Intent: funds protected by security, insurance or risk controls
- Rejected: lock duplication, currency symbol, success-check badge

### Tax

- Cue: folded financial document containing a percentage construction
- Intent: tax filing, tax rate or statutory financial charge
- Rejected: floating percent badge, receipt tear edge, government emblem

## Naming standard

- Source ID: lowercase kebab-case financial noun or precise noun-modifier compound
- Component: `Jalvoro{PascalCaseName}Icon`
- Label: readable title case without currency-specific assumptions
- Aliases: search-only alternate finance terms; never duplicate component exports
- Composite names: allowed only when both concepts are required for recognition
- Category boundary: Finance owns money objects and financial states; Actions owns operations; Navigation owns destinations

## Quality gates

Automated tests verify:

- all 16 canonical definitions are present and ordered;
- every geometry signature is unique;
- every icon uses five or fewer vector nodes;
- every icon uses no more than two directly related objects;
- no finance icon includes accent-placement geometry;
- explicit accent props cannot produce micro-accent output;
- every icon renders at 16, 20, 24 and 32 pixels;
- no hard-coded SVG color appears;
- every icon has semantic intent, silhouette, primary cue and rejection list;
- trend-up/trend-down, receipt/invoice and transfer/exchange remain explicitly differentiated;
- naming and category boundaries remain stable.

## Safety boundary

This master set updates only the isolated JALVORO Icon System library, its metadata, tests and documentation. It does not replace any icon in dashboard, finance screens, settings, business modules or other product surfaces.
