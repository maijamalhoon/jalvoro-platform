# Observability and performance certification

Status: repository instrumentation prepared; live certification not passed.

## Sentry

The candidate keeps default PII disabled, omits session replay, scrubs request/user/extra data, allowlists diagnostic breadcrumbs, drops expected session-expiry events, and derives release identity from the deployed Git SHA.

Live verification is blocked until read-only Sentry API access is configured outside chat. Required evidence:

- event received from the candidate deployment;
- source map resolves to repository source;
- event release equals the exact candidate SHA;
- environment is preview during certification and production only after promotion;
- alert rules and owners;
- known test error triggers an alert;
- expected authentication/user errors do not create noise;
- no token, credential, finance value, document content, or personal data appears.

## Real-user performance

The candidate records LCP, INP, CLS, TTFB, route transition time, same-origin API latency/error, device category, browser category, and normalized route category at a privacy-preserving sample rate. Global Privacy Control and Do Not Track opt out. Query strings, request bodies, account IDs, and user identifiers are not collected.

The active production telemetry query returned no samples, so no before/after improvement is claimed.

Required controlled runs:

| Profile | Cold cache | Warm cache | Status |
| --- | --- | --- | --- |
| Mobile throttled network | required | required | Not run |
| Mobile throttled CPU | required | required | Not run |
| Desktop | required | required | Not run |

Report median and p75 for navigation, LCP, INP, CLS, TTFB, key API latency, and error rate. A comparison needs the same route/data fixture, region, browser build, device profile, and run count before and after.
