# Feature inventory

Reviewed September 19, 2026. Historical folders contain divergent implementations; a UI control or README claim did not always have a working runtime path.

| Capability | Historical source | Canonical 2.0 behavior |
|---|---|---|
| Movie/TV/topic watchlist | Multiple selected-media formats and inconsistent versions | Manual titles and up to 120 aliases per title; 200 custom titles |
| Bundled knowledge | V4 franchise knowledge and contextual spoiler rules | Retained local contextual engine, corrected word boundaries and shared-array mutation; 11 opt-in packs |
| Custom keywords | Saved by UI but ignored by active V4 settings path in newer copies | 2,000 bounded literal keywords, active without a title |
| Matching | Regex/contextual rules, relevance heuristics | Unicode normalization, literal boundaries, strict topic mode, balanced cues plus inherited contextual rules |
| Languages | i18n scripts and mixed metadata | English interface; Japanese aliases and multilingual spoiler cues; no comprehensive translation guarantee |
| Images and thumbnails | DOM labels/background wrappers; no verified pixel recognition | Image descriptions, media labels and URL paths associated with matching blocks; no OCR or video analysis |
| Dynamic feeds | Mutation caps, stale attribute/text cases and viewport limits | Cooperative full scans, overflow rescan, text/attribute updates, recycled cards, frame injection |
| Targeting | Site-specific selectors and generic elements | YouTube/Reddit/X selectors plus generic cards/paragraphs; markup can change |
| Conceal and reveal | Blur/overlay wrappers, hover/click settings | Cover or blur without reparenting page content; deliberate reveal button, optional hover and timed re-hide; inline editors preserved |
| Global/site pause | Observer could continue after disabling; loose domain suffix checks | Disconnect/restoration on pause; domain/subdomain boundaries and exact-host overrides |
| Popup | Controls and several partially implemented paths | Count for main document, pause, site override, add keyword, rescan, reveal/hide and settings |
| Context menu/shortcuts | Present in variants | Block selected text; toggle protection and rescan commands (browser shortcut assignment may differ) |
| False-positive handling | Feedback/learning controls, inconsistent active wiring | Exact normalized allowed-text entries; no claim of trained learning |
| Search/enrichment | Shared/custom proxy; TMDB; one Wikipedia builder | Optional direct TMDB title/alias/cast-character lookup, fixed host, own local credential; no Wikipedia fetch |
| Sign-in/sync | Placeholder OAuth, synced account token and external bridge | Removed; local-only config and supported same-ID migration |
| Watched history | Watched-title UI with unsafe HTML insertion | Remove completed titles from protection; watched-history archive is not migrated |
| Backups | Raw storage imports/exports or broken duplicate handlers | 1 MB maximum; schema allowlist; preview and explicit replace; secrets never imported/exported |
| Storage | Sync plus partially connected IndexedDB/stubs | Restricted local storage; serialized writes; source migration preserves old non-secret data |
| Diagnostics | Telemetry/benchmark claims not equivalent to measured accuracy | No telemetry upload; regression fixtures and real Chromium extension tests |
| Packaging | Seven source copies, stale ZIPs, incomplete locks | One allowlisted deterministic ZIP, SHA-256, lockfiles and root CI |

## Interaction flow

Installation opens settings. Users choose what to protect before ordinary browsing. The popup handles frequent page actions; settings handles title packs, aliases, matching, domain rules, optional lookup and backup. Lookup results display title/year without overview or poster content. Import previews the sanitized backup before replacing the configuration.

Exclusions and global pause take precedence over site overrides. A site override applies to that exact hostname. If a site is excluded in settings, remove the exclusion to re-enable it; the popup cannot override a global pause or exclusion. Badge counts cover the main document, even though subframes run their own protection.

## Deliberate limits

No episode/chapter progress tracking, live keyword subscription feed, remote AI, OCR, video/audio transcription, regex execution from user input, automatic account sync, or guaranteed pre-render concealment. No Firefox build or live Edge compatibility result is claimed. Existing historical ZIPs are unchanged and unsafe to treat as patched release artifacts.
