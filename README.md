# Spoiler Shield 2.0

Protect the topics you have not finished watching, reading or playing. This Manifest V3 extension conceals matching text and related thumbnails locally, with explicit reveal controls and no account requirement.

**The release source is `extension/`.** The seven `Spolier blocker v*` directories and existing root ZIPs are historical snapshots, not release packages. Their version labels were inconsistent; the 2.0 release establishes one source, test suite and build.

## Try it

1. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this repository's `extension` directory. Chromium 120 or newer is required.
2. Choose a title pack or add a title and character aliases, then save. Packs are opt-in; an empty watchlist does not protect a topic automatically.
3. Choose **Strict** to hide every mention of a selected topic, or **Balanced** for topic-plus-spoiler signals and bundled contextual rules. Custom keywords always block, independently of title selection.
4. Reload existing pages after first installation or an extension update. Use the popup to pause a website, rescan, reveal, or hide again.

Cover mode is the default. Hover reveal is off by default. Detection handles ordinary HTTP/HTTPS documents, new posts, text edits, lazy image labels and frames; it cannot recognize image pixels, video/audio, or shadow-root content. It is heuristic and may miss spoilers or hide innocent text. Initial content can appear before detection finishes.

## Build and verify

Use Node.js 22 or newer:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm ci --ignore-scripts --prefix "Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy"
npm run test:proxy
npx playwright install chromium
npm run test:browser
npm run build
```

On Linux CI, Playwright uses `npx playwright install --with-deps chromium`. The deterministic build creates `dist/spoiler-shield-2.0.0.zip` and its SHA-256 file. It packages only an explicit list of extension assets; it contains no proxy, development dependency, historical tree or credential.

## Privacy and lookup

Watchlists and preferences stay in local extension storage. There is no browsing telemetry, remote model, shared proxy, Google sign-in or account-token bridge. Optional TMDB lookup requests permission when enabled and uses your own credential directly against TMDB. Search labels omit plot summaries. Backups exclude credentials. See [privacy and permissions](extension/privacy.html).

An update under the same extension ID migrates supported old sync settings. Loading a different unpacked extension ID cannot access the old installation's storage; use a settings export/import instead. The release does not transfer Google accounts, learning weights or watched-title history. See [release notes and checks](docs/RELEASE_NOTES.md).

## Project documentation

- [Feature inventory and old/new behavior](docs/FEATURES.md)
- [Competitor research and product decisions](docs/MARKET_RESEARCH.md)
- [Keyword packs, source links and maintenance](docs/KEYWORDS.md)
- [Security findings and patch evidence](docs/SECURITY_REVIEW.md)
- [Security reporting and supported source](SECURITY.md)

The source audit and automated checks support a release candidate, not a claim of complete internet coverage, perfect detection, or absence of all vulnerabilities. Store publication, real-site checks and ownership/license confirmation remain maintainer release steps.
