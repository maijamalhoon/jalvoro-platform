# Controlled identities and authenticated certification matrix

Status: not executed. The identities below must be created in isolated non-production projects with a controlled email sink. Do not use real customers.

## Required identities

| Identity | Required state |
| --- | --- |
| New customer | unverified, then verified during test |
| Existing customer A | seeded personal finance data |
| Existing customer B | different tenant for isolation assertions |
| Business owner | owns Business A |
| Business manager | manager in Business A |
| Business member | member in Business A |
| Platform admin | application admin role |
| Root Owner | MFA enrolled; recovery material escrowed per policy |
| Control Plane admin | active operator admin |
| Control Plane analyst | active analyst |
| Control Plane support | active support |
| Disabled operator | disabled with historical audit record |
| Expired invitation recipient | expired, unused invitation |

Addresses, tokens, temporary passwords, MFA seeds, and recovery codes belong only in the approved QA secrets store. The evidence report may use identity labels, never credentials.

## Journey matrix

Every row requires timestamp, exact release SHA, deployment ID, identity label, browser/device, expected result, actual result, and screenshot/log reference with personal data redacted.

| Journey | Status |
| --- | --- |
| registration, verification, resend | Not run |
| login, logout, login after logout | Not run |
| password reset; expired, reused, and invalid links | Not run |
| expired and revoked sessions; token rotation; multi-tab synchronization | Not run |
| protected page and API redirects/statuses | Not run |
| profile changes and avatar upload rejection/acceptance | Not run |
| customer A/B isolation | Not run |
| business invitation and owner/manager/member role transitions | Not run |
| operator invite, grant, revoke, disable, restore | Not run |
| Root Owner MFA and recovery behavior | Not run |
| backup export/import against isolated restore | Not run |
| AI valid, empty, malformed, timeout, rate limit, auth failure, outage, partial stream, retry exhaustion | Repository unit coverage exists; authenticated runtime not run |
| notifications, search, filters, empty/loading/error states | Not run |
| concurrent sessions | Not run |

## Browser, responsive, and accessibility matrix

Run real browsers at 320×568, 360×800, 390×844, 412×915, tablet portrait/landscape, and 1280/1440/1920 desktop. Required engines are Android Chrome and iOS Safari where available.

For each viewport, capture sidebar gutter/width, modal and bottom-sheet placement, virtual keyboard, dropdown/date-picker/touch-wheel behavior, scrolling, focus trap, sticky/safe-area behavior, landscape, zoomed text, long content, and errors.

Accessibility evidence must cover keyboard-only use, visible focus, accessible names, valid ARIA, headings, contrast, reduced motion, forced colors, and light/dark modes. Automated results do not replace keyboard and screen-reader checks.

The PR #165 sidebar files are in this candidate, but real-device certification remains not run.

## Email workflow matrix

Use only the controlled sink. Verify registration, recovery, business invitation, operator invitation, resend, expired, reused, and invalid links. Record sender, reply-to, redirect, lifetime, single-use behavior, custom domain, SPF, DKIM, DMARC, spam placement, and mobile rendering. No email evidence exists yet.
