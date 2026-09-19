# Security review and remediation

Baseline: commit `126d2a151ac8d7f66a72d5780fd0bc9a114aa722`. Review date: September 19, 2026. A Standard Codex Security scan examined the original seven source trees with independent review and parent validation. The generated [baseline report](security-baseline/report.md), [findings](security-baseline/findings.json), [coverage](security-baseline/coverage.json) and [manifest](security-baseline/scan-manifest.json) preserve original evidence and line locations. They describe the original checkout, not unfixed findings in the new release.

| Baseline finding | Severity and prerequisites | Remediation and evidence |
|---|---|---|
| External account-token disclosure | Medium; a permitted web origin plus a configured OAuth flow or stored account token | Removed all five external handlers and all external manifest allowlists. New release has no OAuth flow; content messages cannot read secrets. Legacy and background regression tests. |
| Public health route spends upstream quota without its API limiter | Medium; reachable proxy and real upstream key | Six health routes now return only local configured state without an upstream request. Repeated-health tests assert zero fetches; real Express test checks the API limiter. |
| Health errors can disclose an API-key-bearing URL | Medium; node-fetch transport error under affected route | Removed upstream health requests and raw error serialization; ordinary API errors are generic with timeout/response limits. Mocked error tests assert no key disclosure. |
| Watched metadata interpreted as HTML | Low; crafted/imported/catalog metadata reaches watched UI | Historical selected/watched rows now use DOM creation and textContent; new options uses text-only rendering. Chromium injection fixture creates no attacker image. MV3 CSP constrained baseline impact; arbitrary JavaScript execution was not demonstrated. |
| Full watchlist copied into host-page sessionStorage | Medium; historical image/overlay match | Removed all three page-readable watchlist caches/title labels. New extension keeps selection in isolated script memory and restricted extension storage. Legacy guard tests. |
| Legacy backup strings interpolated as CSS | Low; victim imports a malicious v1.1 backup | Allowlisted backup schemas, typed/clamped values, strict legacy colors, 1 MB limit and secret omission. New imports preview sanitized state. Sanitizer and browser import tests. |

All seven historical proxy/asset manifests have current resolved lockfiles. Advisory checks for root tooling, the representative proxy and both distinct asset dependency trees reported zero known npm advisories at validation time. All proxy copies share the refreshed proxy lock; asset copies share the matching refreshed asset lock. This does not establish that dependencies have no undisclosed vulnerabilities. Native historical asset conversion was not executed; these tools are excluded from the release.

## Structural changes

The original architecture combined sync-stored accounts, externally connectable pages, a shared proxy and page-visible overlays. Version 2.0 uses restricted local storage, narrowly authorized extension UI messages, fixed-host optional lookup and text-only UI rendering. Content scripts receive sanitized protection configuration; they never receive the TMDB credential. Page content is never sent to the lookup service.

The historical IndexedDB migration also discarded phrases still consumed from sync storage, including titles without IDs. Its cleanup is now non-destructive and regression-tested. This was a functional data-loss defect, separate from the six validated security findings.

## Scope and limits

The scan covered unique runtime scripts and relevant configuration across all seven source trees, with full-file review or complete variant-diff review against an already reviewed counterpart. Builders, proxy variants, IndexedDB, onboarding, i18n, compression and local benchmark/conversion tools were investigated. Binary assets, old ZIP contents, every prose document and transitive dependency source were not exhaustively audited. No deployed proxy or configured OAuth client was attacked or exercised.

The new release has automated security/regression checks and implementation review; the immutable baseline report is not a separate exhaustive audit of version 2.0. No claim is made that all vulnerabilities have been found. Advanced Daybreak capability was unavailable for this account; the Standard source review completed. Security scan token usage was not reported by the tool.

Known product limits include heuristic matching, possible initial spoiler flashes, common-name false positives, no shadow-root traversal/OCR/transcription, main-frame-only badge counts and no live-site/real-key validation in the automated fixtures. Refer to [release checks](RELEASE_NOTES.md) before store publication.
