# Android Release Identity

Current launch status: excluded. The checked-in TWA manifest uses `example.invalid` so a new wrapper cannot be published against a legacy or unowned host.

## Version 3

- Package ID: `com.jamalsfinance.app`
- App version name: `1.0.2`
- App version code: `3`
- Minimum SDK: `23` (Android 6)
- Compile SDK: `36`
- Target SDK: `36`
- Historical production origin: `https://jamals-finance-sable.vercel.app` (not valid for a new release)
- Android build source baseline: `e9f06d45ec89a216cc93a5b254fc429987777359`
- Certificate SHA-256: `2F:7F:D9:B0:1F:59:F7:FB:A0:93:3F:55:AA:F2:AF:FB:8A:B2:72:1E:B3:97:02:17:B8:5F:66:8E:9A:CD:AE:40`
- App icon: marker-drawn finance growth chart and currency coin, with no wording.

The APK is aligned and signed with APK Signature Schemes v1, v2, and v3. The AAB is signed with the same upload certificate. Version 3 replaces the Android launcher, maskable, splash, web/PWA, and Windows install icons while preserving the package identity and user data update path.

## Version 2

- Package ID: `com.jamalsfinance.app`
- App version name: `1.0.1`
- App version code: `2`
- Minimum SDK: `23` (Android 6)
- Compile SDK: `36`
- Target SDK: `36`
- Historical production origin: `https://jamals-finance-sable.vercel.app` (not valid for a new release)
- Website source baseline: `b9b9ad0b255f72dc3b651526e6cc748b3370d1a0`
- Certificate SHA-256: `2F:7F:D9:B0:1F:59:F7:FB:A0:93:3F:55:AA:F2:AF:FB:8A:B2:72:1E:B3:97:02:17:B8:5F:66:8E:9A:CD:AE:40`

## Version 1

- Package ID: `com.jamalsfinance.app`
- App version name: `1.0.0.0`
- App version code: `1`
- Minimum SDK: `23` (Android 6)
- Compile SDK: `36`
- Target SDK: `36`
- Historical production origin: `https://jamals-finance-sable.vercel.app` (not valid for a new release)
- Certificate SHA-256: `2F:7F:D9:B0:1F:59:F7:FB:A0:93:3F:55:AA:F2:AF:FB:8A:B2:72:1E:B3:97:02:17:B8:5F:66:8E:9A:CD:AE:40`

## Future release rules

1. Keep the package ID unchanged.
2. Sign every APK/AAB update with the same private signing key.
3. Increase `versionCode` for every native Android release.
4. Keep the production origin and `/.well-known/assetlinks.json` certificate association valid.
5. Normal web UI and logic deployments do not require a new Android package; rebuild only for native wrapper, package metadata, permissions, SDK, icon, or store-policy changes.
6. Never commit signing keys or passwords.
