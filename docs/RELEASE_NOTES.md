# Spoiler Shield 2.0.0

Release candidate prepared September 19, 2026. Canonical source: `extension/`; packaged manifest version: `2.0.0`. Historical folder names do not determine the new release version.

## Changes

- Rebuilt popup/settings around selecting topics, deliberate reveal and clear protection controls.
- Added 14 optional topic packs, strict/balanced matching, Unicode-safe literal keywords, local aliases and exact-text exceptions.
- Corrected independent keyword matching, common-word false positives, mutable shared knowledge arrays and dynamic-page rescanning.
- Kept page DOM structure intact, restored visibility/accessibility state on disable, protected lazy labels and frames, and preserved inline reply editors.
- Restricted storage, removed account/token messaging and shared-proxy dependence, bounded imports/network responses and removed unsafe HTML rendering.
- Added optional direct TMDB lookup, local credentials, permission removal on disconnect and safe backup previews.
- Patched confirmed historical security paths, refreshed all proxy/asset dependency lockfiles, and stopped v1.2/v1.3 migrations from deleting source phrases still used by content scripts.
- Added repeatable builds, root CI, behavioral/security regression tests and Chromium extension tests.

## Upgrade behavior

Same-extension-ID updates migrate supported sync settings, selected titles/aliases, custom keywords and false-positive entries into restricted local storage. A legacy 32-hex-character TMDB key moves to local credential storage. Account records and synced API keys are removed after that migration succeeds. Other legacy sync data remains available for recovery.

New detection mode defaults to Balanced and presentation defaults to Cover. Unsupported old style controls, adaptive-learning weights, watched-title history, Google sign-in and cloud sync are not transferred. A new unpacked extension ID needs manual export/import. Backups are capped and sanitized, so unknown or oversized entries may be omitted/truncated; review the preview and imported settings.

## Validation and publication

Automated checks cover sanitizer boundaries, credential isolation, migrated settings, concurrent writes, Unicode/word-boundary false positives, known contextual cases, historical proxy/backup fixes, non-destructive migration and mocked TMDB success/failure. Chromium tests exercise the actual installed extension against controlled webpages, including large documents, mutation bursts, frames, inline editors, safe settings rendering, backup preview and reveal/re-hide. The actual Express stack is tested locally with a mocked upstream. These are bounded regressions, not a measured overall detection-accuracy score.

Before publishing:

- Test the generated ZIP as an unpacked build in supported stable Chrome and the intended Edge version, including keyboard/screen-reader use and same-ID upgrade data.
- Exercise real YouTube, Reddit, X and normal news pages, SPA navigation, lazy media and long sessions. Automated fixtures do not establish live-site compatibility.
- Test optional lookup with a real TMDB credential and verify attribution/terms for the intended use. No real credential was available for the automated run.
- Confirm project license ownership: historical COPYRIGHT.md files still contain template owner/year text. Preserve notices and resolve that metadata with the owners before distribution. The approved TMDB logo is an attribution asset, not a grant of rights to unrelated artwork.
- Review Chrome Web Store permission/privacy disclosures and screenshots, then upload only the new `dist/spoiler-shield-2.0.0.zip`. Existing root ZIPs are unpatched historical artifacts.

This change creates a reviewable release candidate and pull request. It does not publish a store release, deploy a proxy, merge the branch, or claim all internet spoilers can be blocked.

## Additional 2.0.0 work (same version)

Search inputs now provide title/keyword dropdowns, and TMDB lookup has debounced suggestions. Reveal buttons default off; opting in enables deliberate text-preview popups without exposing the underlying page. YouTube protection and previews have separate toggles. Added motion blur, Gaussian blur, solid masks and an opaque pixelated mask, plus three game packs.

A responsive promotional website and real Node/SQLite account/admin service are included. Admin-configurable literal-keyword quotas default to Free 2, Premium 10, Max no tier quota (device safety capacity remains). Optional account upload/download uses revision checks and excludes credentials. Existing local protection is preserved on plan downgrades. The default release has no service origin until configured for deployment; `npm run dev` produces a complete local connected preview. No paid checkout is enabled. See [deployment](ACCOUNTS_AND_DEPLOYMENT.md) and [streaming/pricing proposals](STREAMING_AND_PRICING.md).

Follow-up validation: 32 Node tests, 12 Chromium browser tests and one actual Express integration test passed locally. The account integration test pre-grants only the test service's host permission because native permission prompts cannot be accepted in headless Chromium; the production UI still requests permission from a direct user action. Website desktop/mobile screenshots were inspected and the mobile document has no horizontal overflow.
