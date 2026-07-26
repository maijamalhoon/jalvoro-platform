# Jamal's Finance Android TWA

This directory stores the reproducible Trusted Web Activity configuration for the Android package.

- Package ID: `com.jamalsfinance.app`
- Production host: not configured; `example.invalid` is a deliberate build blocker until an owned canonical host is certified.
- Signing keys and passwords must never be committed.
- Website UI, data, calculations, and application logic remain owned by the existing web project.

Normal website deployments are loaded by the Android wrapper without rebuilding the APK. Rebuild the Android package only when native wrapper configuration, package metadata, permissions, or Android publishing requirements change.
