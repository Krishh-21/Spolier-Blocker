# Market review and implementation choices

Research date: September 19, 2026. This is a focused comparison of primary product material, not an exhaustive review of every blocker or a market-ranking claim.

| Product/source | Relevant advertised approach | Decision for this release |
|---|---|---|
| [BlockTube](https://github.com/amitbl/blocktube) | YouTube-focused title/channel/ID/comment filtering, regex and early filtering | Keep YouTube card targeting, but support ordinary webpages too. Do not claim equivalent pre-render coverage or channel-blocking features. |
| [Spoiler Slayer](https://brettp.github.io/spoiler-slayer/) | Keyword subscriptions, site controls, concealment modes, import/export and reveal controls; tracking-free positioning | Deliver local privacy, site controls, safe backups and deliberate reveal first. Defer remote subscriptions until provenance, size limits and update failure behavior are designed. |
| [Spoiler Protection 2.0](https://addons.mozilla.org/en-US/firefox/addon/spoiler-protection-2-0/) | Keyword-oriented general browsing protection | Make manual keywords work independently, offer opt-in topic packs, and state the limitations of metadata-only image detection. No claim that our Chromium build replaces its Firefox offering. |

The strongest immediate improvements are reliable behavior and privacy: a keyword must actually reach the detector, disabling must stop ongoing protection, imported JSON must not become executable markup/CSS, and an infinite-scroll burst must not silently discard posts. These changes are directly testable. There is no evidence supporting a “best in the market” accuracy claim from the small bundled corpus.

## Technical source material

- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): isolated script contexts and page access. Isolation does not make a page-owned sessionStorage entry private.
- [Chrome storage API](https://developer.chrome.com/docs/extensions/reference/api/storage): restrict storage access to trusted extension contexts; return only sanitized configuration through messaging.
- [Chrome storage and cookies](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies): distinction between extension storage and the host page's web storage.
- [Manifest V3 CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy): package scripts locally and avoid inline event handlers or remote executable code.
- [TMDB finding data](https://developer.themoviedb.org/docs/finding-data) and [alternative titles](https://developer.themoviedb.org/reference/movie-alternative-titles): enrich user-selected topics with alternative names rather than scraping plot summaries.
- [TMDB attribution FAQ](https://developer.themoviedb.org/docs/faq): the optional lookup UI includes the required notice and an unmodified approved logo. Maintainers should check the terms for their intended distribution/use.

## Next priorities after real-site validation

1. Build a consented, labeled multilingual evaluation corpus and measure precision/recall separately by site and content type.
2. Add tested site adapters and shadow-root traversal only where real failures justify it.
3. Design episode/chapter progress metadata before promising progress-aware blocking.
4. Consider signed/versioned keyword subscriptions with provenance and rollback. Do not silently download plot descriptions into the UI.

None of these deferred capabilities is advertised as shipped in 2.0.

The bundled `extension/tmdb-logo.svg` is the unmodified [official blue short logo](https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg), downloaded for TMDB attribution.
