# Security Review: spoiler

## Scope

Repository-wide Standard source audit of the original checkout at 126d2a151ac8d7f66a72d5780fd0bc9a114aa722, before release remediation. Seven historical extension trees and their unique runtime, proxy, metadata, migration and developer-tool variants were examined.

- Scan mode: repository
- Target kind: git_revision
- Target ID: target_sha256_8e65dae0aabc2e3127f100290c9353d24ee743441c7142598508566c29b5e4aa
- Revision: 126d2a151ac8d7f66a72d5780fd0bc9a114aa722
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: Static baseline validation; no original application or deployed proxy was executed during discovery. Later remediation tests are separate.
- Artifacts reviewed: Seven manifest variants and active background/content/options/popup flows, Unique knowledge engines, detector/integration variants and TMDB/Wikipedia builders, All unique proxy server implementations and package manifests/lock inventory, IndexedDB migration, onboarding, i18n, local compression, benchmark and asset-conversion tools

Limitations and exclusions:
- Coverage is partial: binary assets, historical ZIP contents, all prose documentation and transitive dependency source were not exhaustively reviewed.
- No deployed proxy, configured OAuth client or real credentials were exercised. Exploit prerequisites and CSP limits are retained in each finding.
- New extension/ release code and subsequent patches are not the immutable baseline covered by these findings; see release regression tests and remediation documentation.
- This is one Standard scan, not a multi-pass exhaustive audit or a guarantee of absence of additional vulnerabilities.
- Excluded \*.zip; binary images/fonts: Historical archives and binary media were inventoried, not unpacked or security audited.
- Excluded node_modules/\*\*; transitive dependency source: Dependency advisory checks were performed separately during remediation; not an exhaustive source audit of dependencies.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 6 |
| Severity mix | medium: 4, low: 2 |
| Confidence mix | high: 6 |
| Coverage | partial |
| Validation mode | not recorded |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

Spoiler Shield is a Chrome Manifest V3 extension with popup/options pages, a service worker, DOM-scanning content scripts, and an optional separately deployed Node/Express TMDB proxy. Users select media; the popup retrieves metadata and writes selectedMedia to chrome.storage.sync; content scripts read that selection and apply local V4 classification and blur/reveal DOM changes. The most advanced source candidate is Spolier blocker v1/Spolier blocker Cursor new: its manifest is 1.3.0 and its popup loads Wikipedia enrichment. The v1 - Copy tree also declares 1.3.0 but lacks Wikipedia; folders v1.1 through v1.5 declare 1.2.0. There is no root source selector establishing the actual released tree. Evidence: Spolier blocker v1/Spolier blocker Cursor new/manifest.json:4, Spolier blocker v1/Spolier blocker Cursor new/manifest.json:39, Spolier blocker v1/Spolier blocker Cursor new/popup.html:370, Spolier blocker v1/Spolier blocker Cursor new/popup.js:526, Spolier blocker v1/Spolier blocker Cursor new/content.js:202, Spolier blocker v1 - Copy/Spolier blocker Cursor new/manifest.json:4, Spolier blocker v1.5/Spolier blocker Cursor new/manifest.json:4.

### Assets

- User protection preferences, selected media, watched history, custom keywords, exceptions and learning weights are stored under extension chrome.storage.sync keys. User-specific preference keys use a sanitized email string, but all remain within one extension/browser-profile authority. Evidence: Spolier blocker v1/Spolier blocker Cursor new/options.js:797, Spolier blocker v1/Spolier blocker Cursor new/options.js:800, Spolier blocker v1/Spolier blocker Cursor new/popup.js:549.
- Google profile identity and an OAuth access-token reference are combined in userAccount and persisted to chrome.storage.sync after successful authentication. Direct TMDB API keys, configured proxy URL and Wikipedia contact address are also saved to sync storage. Evidence: Spolier blocker v1/Spolier blocker Cursor new/options.js:242, Spolier blocker v1/Spolier blocker Cursor new/options.js:250, Spolier blocker v1/Spolier blocker Cursor new/options.js:797.
- The proxy operator's DEFAULT_TMDB_KEY and upstream API quota belong to the separately deployed server. The consumer appends this environment-derived secret to requests to https://api.themoviedb.org; callers cannot select another upstream host through the request path. Evidence: Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:9, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:54, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:80.
- Webpage integrity, responsiveness, spoiler concealment, browser extension capabilities, and downloaded backup confidentiality matter. The content script modifies page DOM, while authorized popup/background actions may inject scripts. Evidence: Spolier blocker v1/Spolier blocker Cursor new/content.js:469, Spolier blocker v1/Spolier blocker Cursor new/background.js:267, Spolier blocker v1/Spolier blocker Cursor new/popup.js:653, Spolier blocker v1/Spolier blocker Cursor new/options.js:1192.

### Trust Boundaries

- Arbitrary visited-page DOM enters manifest-registered content scripts. These scripts operate on page text and image alt/title metadata, combine it with trusted extension preferences, and wrap detected blocks. Browser content-script isolation is the host boundary; the repository's enablement controls are global enabled, suffix-matched include/exclude lists, and exact perSite entries. Evidence: Spolier blocker v1/Spolier blocker Cursor new/manifest.json:41, Spolier blocker v1/Spolier blocker Cursor new/content.js:130, Spolier blocker v1/Spolier blocker Cursor new/content.js:236, Spolier blocker v1/Spolier blocker Cursor new/content.js:450.
- Extension popup/options pages and content scripts communicate with the service worker via Chrome messaging. The internal handler's reprocessing path uses sender.tab where available and otherwise the active tab; badge state uses sender.tab. This authority is separate from external webpage messaging. Evidence: Spolier blocker v1/Spolier blocker Cursor new/background.js:267, Spolier blocker v1/Spolier blocker Cursor new/background.js:293.
- External webpages matching localhost, 127.0.0.1, \*.yourdomain.com and the declared file pattern can request ping, account retrieval, options opening and sign-out via onMessageExternal. Manifest matching is the visible admission control; the handler does not inspect sender and returns the complete stored userAccount. Actual acceptance of every declared pattern remains browser-dependent. Evidence: Spolier blocker v1/Spolier blocker Cursor new/manifest.json:90, Spolier blocker v1/Spolier blocker Cursor new/background.js:489, Spolier blocker v1/Spolier blocker Cursor new/background.js:497, Spolier blocker v1/Spolier blocker Cursor new/background.js:510.
- The popup transfers user-entered search terms to a configurable HTTPS TMDB proxy or direct TMDB API. Search code checks/request host permission, omits credentials, and imposes a ten-second timeout; metadata enrichment has its own consumer and a twelve-second timeout. Configured proxy takes precedence over direct-key metadata retrieval, including the shared default proxy. Evidence: Spolier blocker v1/Spolier blocker Cursor new/popup.js:18, Spolier blocker v1/Spolier blocker Cursor new/popup.js:239, Spolier blocker v1/Spolier blocker Cursor new/popup.js:373, Spolier blocker v1/Spolier blocker Cursor new/tmdb-knowledge-builder.js:20.
- Wikipedia/Wikidata enrichment transfers title/search parameters and the configured contact address in Api-User-Agent to fixed Wikimedia API hosts. Returned profiles cross into selectedMedia and local detection. Requests omit browser credentials and time out after twelve seconds. Evidence: Spolier blocker v1/Spolier blocker Cursor new/wikipedia-knowledge-builder.js:6, Spolier blocker v1/Spolier blocker Cursor new/wikipedia-knowledge-builder.js:11, Spolier blocker v1/Spolier blocker Cursor new/wikipedia-knowledge-builder.js:16, Spolier blocker v1/Spolier blocker Cursor new/popup.js:1010.
- Google authentication uses Chrome identity APIs with a launchWebAuthFlow fallback, obtains profile information from Google's userinfo endpoint and persists the resulting account. This is an identity/profile convenience feature, not a server-enforced multi-tenant authorization system. Evidence: Spolier blocker v1/Spolier blocker Cursor new/options.js:144, Spolier blocker v1/Spolier blocker Cursor new/options.js:168, Spolier blocker v1/Spolier blocker Cursor new/options.js:220, Spolier blocker v1/Spolier blocker Cursor new/options.js:354.
- A user-selected backup JSON file enters extension storage. The effective v1 import function checks for a version field, asks the user to confirm, and writes seven explicitly selected preference/history fields; it does not import account or API-key fields. The earlier v1.1 deployment imports arbitrary parsed top-level keys and exports the entire sync store. Evidence: Spolier blocker v1/Spolier blocker Cursor new/options.js:1178, Spolier blocker v1/Spolier blocker Cursor new/options.js:1207, Spolier blocker v1.1/Spolier blocker Cursor new/options.js:931, Spolier blocker v1.1/Spolier blocker Cursor new/options.js:943.
- Network clients enter the optional Express proxy. CORS checks an environment-origin allowlist, or accepts chrome-extension origins by default; development mode also permits missing Origin. /3/ requests have a 100-request/15-minute IP limiter and an endpoint regex allowlist before using the operator's key. /health is a distinct upstream-requesting route outside that limiter. Evidence: Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:13, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:38, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:54, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:104.

### Attacker Capabilities

- A website publisher or attacker controlling displayed posts can supply arbitrary DOM text, attributes, markup and mutation frequency on a page the user visits; this does not by itself grant Chrome extension APIs or access to the extension's sync store.
- A party controlling an externally-connectable origin may send the permitted external message types if the extension is installed and discoverable. Arbitrary unrelated origins should not be assumed to bypass Chrome's manifest admission control. The account-token consequence additionally requires populated userAccount state from a functioning or imported authentication workflow.
- A malicious metadata provider or configured proxy can control API response fields; a malicious backup author can control JSON that the user explicitly selects for import. Neither starts with arbitrary trusted extension-code execution.
- A network client reaching a deployed proxy can choose paths, query parameters and non-browser HTTP headers. CORS is not evidence of client authentication; endpoint allowlisting, fixed upstream host and IP throttling are distinct controls. Public exposure, key configuration, reverse-proxy topology and any external gateway controls are unknown.
- The operator or developer can alter extension code, configure API endpoints or server secrets, and package a release. Such existing authority is not modeled as an attacker escalation.

### Security Objectives

- Keep OAuth and TMDB credential material within the intended identity/API consumers; only minimal profile data should cross any account-display boundary. Existing data paths are documented at Spolier blocker v1/Spolier blocker Cursor new/options.js:242 and Spolier blocker v1/Spolier blocker Cursor new/background.js:497.
- Treat page DOM, API response fields and imported backup structures as data; preserve browser/extension isolation and prevent untrusted data from becoming privileged execution or unrestricted capability requests.
- Preserve the user's global/site settings, keep detection responsive on mutation-heavy pages, and avoid revealing protected spoilers through normal UI flows. Actual DOM control points are Spolier blocker v1/Spolier blocker Cursor new/content.js:130, Spolier blocker v1/Spolier blocker Cursor new/content.js:469 and Spolier blocker v1/Spolier blocker Cursor new/content.js:603.
- Bound use of the proxy operator's upstream key and quota across every upstream-requesting route, while restricting destinations and paths. Existing route-specific controls are Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:47 and Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:74.
- Make privacy claims correspond to actual sync-storage, metadata, account and contact-address flows. User context requests a stable release with fixes; it supplies no additional deployment or tenant-isolation guarantees.

### Assumptions

- Architecture review only, performed offline and read-only at requested commit 126d2a1; this is not completed vulnerability-audit coverage or a runtime compatibility verdict.
- The active/released source directory is unresolved. v1 is the strongest latest-code candidate because of manifest 1.3.0 and unique Wikipedia integration; folder names alone are unreliable. The v1 and v1 - Copy trees differ in nine files. No release chronology can be inferred from the single import commit.
- Authentication is conditional: v1 manifest oauth2.client_id is a placeholder; fallback code uses a test-client identifier. No working OAuth registration, extension ID or deployed account integration was supplied. Evidence: Spolier blocker v1/Spolier blocker Cursor new/manifest.json:16, Spolier blocker v1/Spolier blocker Cursor new/options.js:168.
- Documentation says settings remain locally in the browser, but implementation uses chrome.storage.sync for preferences, account/token state, selected profiles and diagnostics. Whether the user's browser synchronizes that store is host configuration, not an application-owned local-only guarantee. Evidence: Spolier blocker v1/Spolier blocker Cursor new/options.html:943, Spolier blocker v1/Spolier blocker Cursor new/options.js:250, Spolier blocker v1/Spolier blocker Cursor new/options.js:797, Spolier blocker v1/Spolier blocker Cursor new/content.js:582.
- README says the proxy keeps API keys server-side, while the supported direct-key mode stores tmdbKey in browser sync storage and sends it to TMDB in a URL query. Both modes must remain represented. Evidence: Spolier blocker v1/Spolier blocker Cursor new/README.md:49, Spolier blocker v1/Spolier blocker Cursor new/options.js:797, Spolier blocker v1/Spolier blocker Cursor new/popup.js:385.
- Wikipedia enrichment defaults enabled rather than requiring a dedicated first-use opt-in; metadata calls are not equivalent to transmitting visited-page contents. Evidence: Spolier blocker v1/Spolier blocker Cursor new/popup.js:995, Spolier blocker v1/Spolier blocker Cursor new/popup.js:1015.
- indexeddb-manager.js is a placeholder, not durable IndexedDB storage. landing-sync.js and scripts/telemetry.js exist but no v1 manifest, HTML loader or actual caller activates them. Do not treat their postMessage bridge or telemetry endpoint as normal active runtime surfaces. Evidence: Spolier blocker v1/Spolier blocker Cursor new/indexeddb-manager.js:3, Spolier blocker v1/Spolier blocker Cursor new/manifest.json:39, Spolier blocker v1/Spolier blocker Cursor new/options.html:1077, Spolier blocker v1/Spolier blocker Cursor new/popup.html:369.
- Nested .github/workflows files describe developer CI but are not root GitHub workflows for this repository layout. No active publication pipeline, deployed proxy environment, or hosted-server correspondence was established. Evidence for nested workflow assumptions: Spolier blocker v1/Spolier blocker Cursor new/.github/workflows/ci.yml:23, Spolier blocker v1/Spolier blocker Cursor new/.github/workflows/ci.yml:29.
- Static inspection found UI for custom keywords, watched history, false-positive reports, learning weights, blur settings and telemetry. Presence of controls is not proof every setting affects the current V4 runtime; for example the v1 content getSettings call loads settings and selectedMedia, not customKeywords. Evidence: Spolier blocker v1/Spolier blocker Cursor new/popup.js:125, Spolier blocker v1/Spolier blocker Cursor new/popup.js:475, Spolier blocker v1/Spolier blocker Cursor new/content.js:100.

## Findings

| Finding | Severity | Confidence | Detailed write-up |
| --- | --- | --- | --- |
| [External account requests disclose a stored OAuth token](#finding-1) | medium | high | inline below |
| [Legacy media overlays expose the watchlist to webpage scripts](#finding-2) | medium | high | inline below |
| [Network-failure health responses disclose the TMDB API key](#finding-3) | medium | high | inline below |
| [Public health checks bypass the proxy request quota](#finding-4) | medium | high | inline below |
| [A legacy settings backup can inject persistent page CSS](#finding-5) | low | high | inline below |
| [Watched-item metadata is interpreted as extension-page HTML](#finding-6) | low | high | inline below |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] External account requests disclose a stored OAuth token

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Source-to-sink trace with explicit deployment prerequisites and counterevidence. |
| Category | external-account-token |
| CWE | CWE-201 |
| Affected lines | Spolier blocker v1/Spolier blocker Cursor new/options.js:242-250, Spolier blocker v1/Spolier blocker Cursor new/manifest.json:90-98, Spolier blocker v1/Spolier blocker Cursor new/background.js:489-502 |

#### Summary

A Google OAuth result is stored with userAccount.token in sync storage. The external getUserAccount handler returns that entire object without additional sender validation.

#### Root Cause

A Google OAuth result is stored with userAccount.token in sync storage. The external getUserAccount handler returns that entire object without additional sender validation.

**Oauth storage** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:242-250`

The live token is persisted with the display profile.

```javascript
      const userAccount = {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture || null,
        token: token,
        id: userInfo.id || null
      };
      
      chrome.storage.sync.set({ userAccount }, () => {
```

**External admission** — `Spolier blocker v1/Spolier blocker Cursor new/manifest.json:90-98`

The manifest admits development and placeholder website origins.

```javascript
  "externally_connectable": {
    "matches": [
      "*://localhost/*",
      "*://127.0.0.1/*",
      "*://*.yourdomain.com/*",
      "file:///*"
    ]
  }
}
```

**External response** — `Spolier blocker v1/Spolier blocker Cursor new/background.js:489-502`

An admitted caller receives the entire stored account, including token when present.

```javascript
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[Background] External message received:', request);
  
  if (request.type === 'ping') {
    sendResponse({ success: true, extensionId: chrome.runtime.id });
    return true;
  }
  
  if (request.type === 'getUserAccount') {
    chrome.storage.sync.get(['userAccount'], (data) => {
      sendResponse({ userAccount: data.userAccount || null });
    });
    return true; // Keep channel open for async response
  }
```

#### Validation

A script on an admitted localhost or placeholder domain sends getUserAccount and receives profile data and any stored live bearer token.

Validation method: static source trace

**Oauth storage** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:242-250`

The live token is persisted with the display profile.

```javascript
      const userAccount = {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture || null,
        token: token,
        id: userInfo.id || null
      };
      
      chrome.storage.sync.set({ userAccount }, () => {
```

**External admission** — `Spolier blocker v1/Spolier blocker Cursor new/manifest.json:90-98`

The manifest admits development and placeholder website origins.

```javascript
  "externally_connectable": {
    "matches": [
      "*://localhost/*",
      "*://127.0.0.1/*",
      "*://*.yourdomain.com/*",
      "file:///*"
    ]
  }
}
```

**External response** — `Spolier blocker v1/Spolier blocker Cursor new/background.js:489-502`

An admitted caller receives the entire stored account, including token when present.

```javascript
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[Background] External message received:', request);
  
  if (request.type === 'ping') {
    sendResponse({ success: true, extensionId: chrome.runtime.id });
    return true;
  }
  
  if (request.type === 'getUserAccount') {
    chrome.storage.sync.get(['userAccount'], (data) => {
      sendResponse({ userAccount: data.userAccount || null });
    });
    return true; // Keep channel open for async response
  }
```

Limitations:
- Requires successfully configured OAuth or a preexisting synced live token; manifest currently has a placeholder client ID.
- Declared token scopes cover identity/profile/email, not Gmail or Drive. Chrome external admission still blocks unrelated origins.

#### Dataflow

A Google OAuth result is stored with userAccount.token in sync storage. The external getUserAccount handler returns that entire object without additional sender validation.

**Oauth storage** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:242-250`

The live token is persisted with the display profile.

```javascript
      const userAccount = {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture || null,
        token: token,
        id: userInfo.id || null
      };
      
      chrome.storage.sync.set({ userAccount }, () => {
```

**External admission** — `Spolier blocker v1/Spolier blocker Cursor new/manifest.json:90-98`

The manifest admits development and placeholder website origins.

```javascript
  "externally_connectable": {
    "matches": [
      "*://localhost/*",
      "*://127.0.0.1/*",
      "*://*.yourdomain.com/*",
      "file:///*"
    ]
  }
}
```

**External response** — `Spolier blocker v1/Spolier blocker Cursor new/background.js:489-502`

An admitted caller receives the entire stored account, including token when present.

```javascript
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[Background] External message received:', request);
  
  if (request.type === 'ping') {
    sendResponse({ success: true, extensionId: chrome.runtime.id });
    return true;
  }
  
  if (request.type === 'getUserAccount') {
    chrome.storage.sync.get(['userAccount'], (data) => {
      sendResponse({ userAccount: data.userAccount || null });
    });
    return true; // Keep channel open for async response
  }
```

#### Reachability

Requires successfully configured OAuth or a preexisting synced live token; manifest currently has a placeholder client ID. Declared token scopes cover identity/profile/email, not Gmail or Drive. Chrome external admission still blocks unrelated origins.

- **Attacker:** A script on an admitted localhost or placeholder domain sends getUserAccount and receives profile data and any stored live bearer token.

#### Severity

**Medium** — The scan assigned medium severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Remove external account/sign-out messaging and public admission rules; keep credentials in restricted local storage and return only explicit nonsecret settings.

<a id="finding-2"></a>

### [2] Legacy media overlays expose the watchlist to webpage scripts

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Source-to-sink trace with explicit deployment prerequisites and counterevidence. |
| Category | page-readable-watchlist |
| CWE | CWE-200 |
| Affected lines | Spolier blocker v1.1/Spolier blocker Cursor new/content.js:478-489, Spolier blocker v1.1/Spolier blocker Cursor new/content.js:492-504 |

#### Summary

A content script reads selectedMedia from extension storage and writes all titles into page-origin sessionStorage.__spoilerSelectedTitles during overlay creation.

#### Root Cause

A content script reads selectedMedia from extension storage and writes all titles into page-origin sessionStorage.__spoilerSelectedTitles during overlay creation.

**Overlay trigger** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:478-489`

A matching media overlay invokes the title-list helper.

```javascript
function addOverlay(hostEl, why) {
  try {
    const container = hostEl.closest('[data-spoiler-shield="1"]') || hostEl;
    if (!container || container.querySelector('.spoiler-shield-overlay')) return;
    const label = document.createElement('span');
    label.className = 'spoiler-shield-overlay';
    let reason = why || '';
    const from = collectMatchedTitles();
    const titleText = from.length ? ` for ${from.slice(0,3).join(', ')}${from.length>3?'…':''}` : '';
    label.textContent = reason ? `Blocked: ${reason}${titleText}` : (from.length ? `Blocked${titleText}` : 'Blocked by Spoiler Shield');
    container.appendChild(label);
  } catch {}
```

**Watchlist cache** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:492-504`

The complete private selection crosses from extension storage into webpage-readable session storage.

```javascript
function collectMatchedTitles() {
  try {
    const titles = [];
    const items = JSON.parse(sessionStorage.getItem('__spoilerSelectedTitles') || 'null');
    if (Array.isArray(items)) return items;
    // fallback read from storage once per page
    chrome.storage.sync.get({ selectedMedia: [] }, store => {
      const arr = (store.selectedMedia || []).map(i => i.title).filter(Boolean);
      sessionStorage.setItem('__spoilerSelectedTitles', JSON.stringify(arr));
    });
    return titles;
  } catch { return []; }
}
```

#### Validation

A publisher waits for an overlay and reads the page sessionStorage key to learn unrelated protected titles, beyond the local matching block.

Validation method: static source trace

**Overlay trigger** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:478-489`

A matching media overlay invokes the title-list helper.

```javascript
function addOverlay(hostEl, why) {
  try {
    const container = hostEl.closest('[data-spoiler-shield="1"]') || hostEl;
    if (!container || container.querySelector('.spoiler-shield-overlay')) return;
    const label = document.createElement('span');
    label.className = 'spoiler-shield-overlay';
    let reason = why || '';
    const from = collectMatchedTitles();
    const titleText = from.length ? ` for ${from.slice(0,3).join(', ')}${from.length>3?'…':''}` : '';
    label.textContent = reason ? `Blocked: ${reason}${titleText}` : (from.length ? `Blocked${titleText}` : 'Blocked by Spoiler Shield');
    container.appendChild(label);
  } catch {}
```

**Watchlist cache** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:492-504`

The complete private selection crosses from extension storage into webpage-readable session storage.

```javascript
function collectMatchedTitles() {
  try {
    const titles = [];
    const items = JSON.parse(sessionStorage.getItem('__spoilerSelectedTitles') || 'null');
    if (Array.isArray(items)) return items;
    // fallback read from storage once per page
    chrome.storage.sync.get({ selectedMedia: [] }, store => {
      const arr = (store.selectedMedia || []).map(i => i.title).filter(Boolean);
      sessionStorage.setItem('__spoilerSelectedTitles', JSON.stringify(arr));
    });
    return titles;
  } catch { return []; }
}
```

Limitations:
- Requires a matching media overlay; showOverlay defaults enabled. A visited website can read its own sessionStorage.
- Applies to v1.1, v1.2 and v1.3 content implementations. Newer V4-only implementations do not call this helper.

#### Dataflow

A content script reads selectedMedia from extension storage and writes all titles into page-origin sessionStorage.__spoilerSelectedTitles during overlay creation.

**Overlay trigger** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:478-489`

A matching media overlay invokes the title-list helper.

```javascript
function addOverlay(hostEl, why) {
  try {
    const container = hostEl.closest('[data-spoiler-shield="1"]') || hostEl;
    if (!container || container.querySelector('.spoiler-shield-overlay')) return;
    const label = document.createElement('span');
    label.className = 'spoiler-shield-overlay';
    let reason = why || '';
    const from = collectMatchedTitles();
    const titleText = from.length ? ` for ${from.slice(0,3).join(', ')}${from.length>3?'…':''}` : '';
    label.textContent = reason ? `Blocked: ${reason}${titleText}` : (from.length ? `Blocked${titleText}` : 'Blocked by Spoiler Shield');
    container.appendChild(label);
  } catch {}
```

**Watchlist cache** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:492-504`

The complete private selection crosses from extension storage into webpage-readable session storage.

```javascript
function collectMatchedTitles() {
  try {
    const titles = [];
    const items = JSON.parse(sessionStorage.getItem('__spoilerSelectedTitles') || 'null');
    if (Array.isArray(items)) return items;
    // fallback read from storage once per page
    chrome.storage.sync.get({ selectedMedia: [] }, store => {
      const arr = (store.selectedMedia || []).map(i => i.title).filter(Boolean);
      sessionStorage.setItem('__spoilerSelectedTitles', JSON.stringify(arr));
    });
    return titles;
  } catch { return []; }
}
```

#### Reachability

Requires a matching media overlay; showOverlay defaults enabled. A visited website can read its own sessionStorage. Applies to v1.1, v1.2 and v1.3 content implementations. Newer V4-only implementations do not call this helper.

- **Attacker:** A publisher waits for an overlay and reads the page sessionStorage key to learn unrelated protected titles, beyond the local matching block.

#### Severity

**Medium** — The scan assigned medium severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Keep watchlists in the isolated extension context. Remove page-origin caches and use generic reveal labels.

<a id="finding-3"></a>

### [3] Network-failure health responses disclose the TMDB API key

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Source-to-sink trace with explicit deployment prerequisites and counterevidence. |
| Category | proxy-health-error-secret |
| CWE | CWE-209 |
| Affected lines | Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:115-122, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:125-133 |

#### Summary

The health fetch URL contains the server API key. Its catch block copies error.message into the public response; node-fetch 2.7.0 includes request.url in network failure messages.

#### Root Cause

The health fetch URL contains the server API key. Its catch block copies error.message into the public response; node-fetch 2.7.0 includes request.url in network failure messages.

**Keyed health url** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:115-122`

The credential is present in the URL passed to node-fetch.

```javascript
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testResponse = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${TMDB_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
```

**Public error** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:125-133`

Raw exception text is returned in the health JSON without redaction.

```javascript
    } catch (error) {
      health.tmdbReachable = false;
      health.tmdbError = error.message;
    }
  }
  
  // Return 503 if unhealthy, 200 if healthy
  const statusCode = (health.tmdbConfigured && health.tmdbReachable) ? 200 : 503;
  res.status(statusCode).json(health);
```

#### Validation

During an upstream network failure, a remote health requester can receive an error string containing the operator key as api_key in the request URL.

Validation method: static source trace

**Keyed health url** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:115-122`

The credential is present in the URL passed to node-fetch.

```javascript
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testResponse = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${TMDB_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
```

**Public error** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:125-133`

Raw exception text is returned in the health JSON without redaction.

```javascript
    } catch (error) {
      health.tmdbReachable = false;
      health.tmdbError = error.message;
    }
  }
  
  // Return 503 if unhealthy, 200 if healthy
  const statusCode = (health.tmdbConfigured && health.tmdbReachable) ? 200 : 503;
  res.status(statusCode).json(health);
```

Limitations:
- Disclosure requires an upstream DNS/TLS/socket failure, not an ordinary HTTP error or necessarily an abort. An arbitrary caller cannot force that fixed-host failure.
- Dependency formatting verified in official node-fetch v2.7.0 src/index.js lines 113–114: https://github.com/node-fetch/node-fetch/blob/v2.7.0/src/index.js#L113-L114. No live deployment probed.

#### Dataflow

The health fetch URL contains the server API key. Its catch block copies error.message into the public response; node-fetch 2.7.0 includes request.url in network failure messages.

**Keyed health url** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:115-122`

The credential is present in the URL passed to node-fetch.

```javascript
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testResponse = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${TMDB_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
```

**Public error** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:125-133`

Raw exception text is returned in the health JSON without redaction.

```javascript
    } catch (error) {
      health.tmdbReachable = false;
      health.tmdbError = error.message;
    }
  }
  
  // Return 503 if unhealthy, 200 if healthy
  const statusCode = (health.tmdbConfigured && health.tmdbReachable) ? 200 : 503;
  res.status(statusCode).json(health);
```

#### Reachability

Disclosure requires an upstream DNS/TLS/socket failure, not an ordinary HTTP error or necessarily an abort. An arbitrary caller cannot force that fixed-host failure. Dependency formatting verified in official node-fetch v2.7.0 src/index.js lines 113–114: https://github.com/node-fetch/node-fetch/blob/v2.7.0/src/index.js#L113-L114. No live deployment probed.

- **Attacker:** During an upstream network failure, a remote health requester can receive an error string containing the operator key as api_key in the request URL.

#### Severity

**Medium** — The scan assigned medium severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Do not fetch upstream for public health and never expose or log raw exceptions from credential-bearing URLs.

<a id="finding-4"></a>

### [4] Public health checks bypass the proxy request quota

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Source-to-sink trace with explicit deployment prerequisites and counterevidence. |
| Category | proxy-health-unlimited-upstream |
| CWE | CWE-770 |
| Affected lines | Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:38-47, Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:104-123 |

#### Summary

The limiter is mounted only on /3/. Every /health request independently starts a keyed TMDB request, with no aggregate rate or concurrency control.

#### Root Cause

The limiter is mounted only on /3/. Every /health request independently starts a keyed TMDB request, with no aggregate rate or concurrency control.

**Api limiter** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:38-47`

The request budget applies only to API-forwarding routes.

```javascript
// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/3/', limiter);
```

**Health fetch** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:104-123`

The separate public health path bypasses that budget and allocates upstream work per call.

```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    tmdbConfigured: !!TMDB_KEY,
    tmdbReachable: false
  };
  
  // Test TMDB API connectivity
  if (TMDB_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testResponse = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${TMDB_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
```

#### Validation

A remote client repeatedly calls /health with an accepted Origin header, consuming shared upstream API capacity outside the /3 request budget.

Validation method: static source trace

**Api limiter** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:38-47`

The request budget applies only to API-forwarding routes.

```javascript
// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/3/', limiter);
```

**Health fetch** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:104-123`

The separate public health path bypasses that budget and allocates upstream work per call.

```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    tmdbConfigured: !!TMDB_KEY,
    tmdbReachable: false
  };
  
  // Test TMDB API connectivity
  if (TMDB_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testResponse = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${TMDB_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
```

Limitations:
- Requires an exposed deployed proxy with DEFAULT_TMDB_KEY configured. Reverse-proxy controls were not supplied.
- CORS is not authentication; a nonbrowser client can supply an accepted Origin. Individual calls have a three-second timeout.
- Six identical proxy copies are affected; v1.1 lacks this route.

#### Dataflow

The limiter is mounted only on /3/. Every /health request independently starts a keyed TMDB request, with no aggregate rate or concurrency control.

**Api limiter** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:38-47`

The request budget applies only to API-forwarding routes.

```javascript
// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/3/', limiter);
```

**Health fetch** — `Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js:104-123`

The separate public health path bypasses that budget and allocates upstream work per call.

```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    tmdbConfigured: !!TMDB_KEY,
    tmdbReachable: false
  };
  
  // Test TMDB API connectivity
  if (TMDB_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testResponse = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${TMDB_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
```

#### Reachability

Requires an exposed deployed proxy with DEFAULT_TMDB_KEY configured. Reverse-proxy controls were not supplied. CORS is not authentication; a nonbrowser client can supply an accepted Origin. Individual calls have a three-second timeout. Six identical proxy copies are affected; v1.1 lacks this route.

- **Attacker:** A remote client repeatedly calls /health with an accepted Origin header, consuming shared upstream API capacity outside the /3 request budget.

#### Severity

**Medium** — The scan assigned medium severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Make public liveness/readiness local and cheap; impose deadlines and response-size bounds on actual upstream requests.

<a id="finding-5"></a>

### [5] A legacy settings backup can inject persistent page CSS

| Field | Value |
| --- | --- |
| Severity | low |
| Confidence | high |
| Confidence rationale | Source-to-sink trace with explicit deployment prerequisites and counterevidence. |
| Category | legacy-import-css |
| CWE | CWE-74 |
| Affected lines | Spolier blocker v1.1/Spolier blocker Cursor new/options.js:943-955, Spolier blocker v1.1/Spolier blocker Cursor new/content.js:137-163 |

#### Summary

The reachable v1.1 import handler writes unvalidated JSON into extension storage. Imported color and radius fields are subsequently interpolated into a stylesheet on enabled websites.

#### Root Cause

The reachable v1.1 import handler writes unvalidated JSON into extension storage. Imported color and radius fields are subsequently interpolated into a stylesheet on enabled websites.

**Backup import** — `Spolier blocker v1.1/Spolier blocker Cursor new/options.js:943-955`

User-selected JSON is accepted without schema validation.

```javascript
function importSettings() {
  const input = document.getElementById('importFile');
  const file = input && input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      chrome.storage.sync.set(data, () => {
        const status = document.getElementById('status');
        status.textContent = 'Imported';
        status.className = 'status';
```

**Css interpolation** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:137-163`

Imported values become stylesheet syntax on visited pages.

```javascript
function installStyles(store) {
  const existing = document.querySelector('style[data-spoiler-shield-style]');
  if (existing) existing.remove();

  const radius = (store.settings && store.settings.blurRadiusPx) ?? 6;
  const blurStyle = (store.settings && store.settings.blurStyle) || 'gaussian';
  const overlayBg = (store.settings && store.settings.overlayColor) || '#0b1020';
  const overlayText = (store.settings && store.settings.overlayTextColor) || '#e7ecff';

  const style = document.createElement('style');
  style.setAttribute('data-spoiler-shield-style', '');

  // Note: true pixelation requires canvas/SVG filters; we approximate with blur + contrast.
  const filterCss =
    blurStyle === 'gaussian'
      ? `filter: blur(${radius}px);`
      : blurStyle === 'pixelate'
        ? `filter: blur(${Math.max(1, Math.round(radius / 2))}px) contrast(1.2);`
        : `filter: none; opacity: .08; color: transparent; text-shadow: 0 0 12px currentColor;`;

  style.textContent = `
    .spoiler-shield-blur{${filterCss}transition:filter .15s ease}
    .spoiler-shield-revealed{filter:none!important; opacity:1!important; color:inherit!important; text-shadow:none!important}
    .spoiler-shield-wrapper{position:relative; display:inline-block}
    .spoiler-shield-overlay{position:absolute; inset:auto 6px 6px auto; background:${overlayBg}; color:${overlayText}; font:600 11px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:4px 6px; border-radius:6px; pointer-events:none; opacity:.95; max-width:260px}
  `;
  document.documentElement.appendChild(style);
```

#### Validation

An attacker supplies a settings backup containing stylesheet syntax in a color field; after import that syntax is inserted into visited pages.

Validation method: static source trace

**Backup import** — `Spolier blocker v1.1/Spolier blocker Cursor new/options.js:943-955`

User-selected JSON is accepted without schema validation.

```javascript
function importSettings() {
  const input = document.getElementById('importFile');
  const file = input && input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      chrome.storage.sync.set(data, () => {
        const status = document.getElementById('status');
        status.textContent = 'Imported';
        status.className = 'status';
```

**Css interpolation** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:137-163`

Imported values become stylesheet syntax on visited pages.

```javascript
function installStyles(store) {
  const existing = document.querySelector('style[data-spoiler-shield-style]');
  if (existing) existing.remove();

  const radius = (store.settings && store.settings.blurRadiusPx) ?? 6;
  const blurStyle = (store.settings && store.settings.blurStyle) || 'gaussian';
  const overlayBg = (store.settings && store.settings.overlayColor) || '#0b1020';
  const overlayText = (store.settings && store.settings.overlayTextColor) || '#e7ecff';

  const style = document.createElement('style');
  style.setAttribute('data-spoiler-shield-style', '');

  // Note: true pixelation requires canvas/SVG filters; we approximate with blur + contrast.
  const filterCss =
    blurStyle === 'gaussian'
      ? `filter: blur(${radius}px);`
      : blurStyle === 'pixelate'
        ? `filter: blur(${Math.max(1, Math.round(radius / 2))}px) contrast(1.2);`
        : `filter: none; opacity: .08; color: transparent; text-shadow: 0 0 12px currentColor;`;

  style.textContent = `
    .spoiler-shield-blur{${filterCss}transition:filter .15s ease}
    .spoiler-shield-revealed{filter:none!important; opacity:1!important; color:inherit!important; text-shadow:none!important}
    .spoiler-shield-wrapper{position:relative; display:inline-block}
    .spoiler-shield-overlay{position:absolute; inset:auto 6px 6px auto; background:${overlayBg}; color:${overlayText}; font:600 11px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:4px 6px; border-radius:6px; pointer-events:none; opacity:.95; max-width:260px}
  `;
  document.documentElement.appendChild(style);
```

Limitations:
- Requires a user-selected malicious backup and a protected page with an active phrase.
- Impact is CSS/UI manipulation and possible resource requests, not demonstrated JavaScript execution or arbitrary secret extraction. Page CSP can limit styles.
- Later options implementations have different shadowed import functions and broken handler registration; the finding is restricted to the demonstrated v1.1 path.

#### Dataflow

The reachable v1.1 import handler writes unvalidated JSON into extension storage. Imported color and radius fields are subsequently interpolated into a stylesheet on enabled websites.

**Backup import** — `Spolier blocker v1.1/Spolier blocker Cursor new/options.js:943-955`

User-selected JSON is accepted without schema validation.

```javascript
function importSettings() {
  const input = document.getElementById('importFile');
  const file = input && input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      chrome.storage.sync.set(data, () => {
        const status = document.getElementById('status');
        status.textContent = 'Imported';
        status.className = 'status';
```

**Css interpolation** — `Spolier blocker v1.1/Spolier blocker Cursor new/content.js:137-163`

Imported values become stylesheet syntax on visited pages.

```javascript
function installStyles(store) {
  const existing = document.querySelector('style[data-spoiler-shield-style]');
  if (existing) existing.remove();

  const radius = (store.settings && store.settings.blurRadiusPx) ?? 6;
  const blurStyle = (store.settings && store.settings.blurStyle) || 'gaussian';
  const overlayBg = (store.settings && store.settings.overlayColor) || '#0b1020';
  const overlayText = (store.settings && store.settings.overlayTextColor) || '#e7ecff';

  const style = document.createElement('style');
  style.setAttribute('data-spoiler-shield-style', '');

  // Note: true pixelation requires canvas/SVG filters; we approximate with blur + contrast.
  const filterCss =
    blurStyle === 'gaussian'
      ? `filter: blur(${radius}px);`
      : blurStyle === 'pixelate'
        ? `filter: blur(${Math.max(1, Math.round(radius / 2))}px) contrast(1.2);`
        : `filter: none; opacity: .08; color: transparent; text-shadow: 0 0 12px currentColor;`;

  style.textContent = `
    .spoiler-shield-blur{${filterCss}transition:filter .15s ease}
    .spoiler-shield-revealed{filter:none!important; opacity:1!important; color:inherit!important; text-shadow:none!important}
    .spoiler-shield-wrapper{position:relative; display:inline-block}
    .spoiler-shield-overlay{position:absolute; inset:auto 6px 6px auto; background:${overlayBg}; color:${overlayText}; font:600 11px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:4px 6px; border-radius:6px; pointer-events:none; opacity:.95; max-width:260px}
  `;
  document.documentElement.appendChild(style);
```

#### Reachability

Requires a user-selected malicious backup and a protected page with an active phrase. Impact is CSS/UI manipulation and possible resource requests, not demonstrated JavaScript execution or arbitrary secret extraction. Page CSP can limit styles. Later options implementations have different shadowed import functions and broken handler registration; the finding is restricted to the demonstrated v1.1 path.

- **Attacker:** An attacker supplies a settings backup containing stylesheet syntax in a color field; after import that syntax is inserted into visited pages.

#### Severity

**Low** — The scan assigned low severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Allowlist imported preference fields, require literal hex colors, clamp numeric values and bound file size; never import account or network configuration.

<a id="finding-6"></a>

### [6] Watched-item metadata is interpreted as extension-page HTML

| Field | Value |
| --- | --- |
| Severity | low |
| Confidence | high |
| Confidence rationale | Source-to-sink trace with explicit deployment prerequisites and counterevidence. |
| Category | watched-metadata-html |
| CWE | CWE-79 |
| Affected lines | Spolier blocker v1/Spolier blocker Cursor new/options.js:405-420, Spolier blocker v1/Spolier blocker Cursor new/options.js:429-442 |

#### Summary

Catalog title/director fields enter watchedItems and are interpolated into innerHTML in the options page, allowing persistent markup and style injection.

#### Root Cause

Catalog title/director fields enter watchedItems and are interpolated into innerHTML in the options page, allowing persistent markup and style injection.

**Watched source** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:405-420`

The options renderer reads saved watchedItems.

```javascript
function renderWatchedItems(type) {
  chrome.storage.sync.get(['watchedItems', 'userAccount'], (store) => {
    const watchedItems = store.watchedItems || [];
    const userAccount = store.userAccount;
    
    // Filter by type and user
    const filtered = watchedItems.filter(item => {
      if (item.type !== type) return false;
      // If user is signed in, only show their items
      if (userAccount && userAccount.email) {
        return item.userEmail === userAccount.email;
      }
      // If not signed in, show all items (local only)
      return !item.userEmail;
    });
    
```

**Watched html** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:429-442`

Raw catalog fields are interpolated into HTML instead of inserted as text.

```javascript
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'watched-item';
      div.innerHTML = `
        <div class="watched-item-title">${item.title}</div>
        <div class="watched-item-meta">${item.year || ''} ${item.director ? '• ' + item.director : ''}</div>
        <button class="remove-watched" data-id="${item.id}">Remove</button>
      `;
      
      div.querySelector('.remove-watched').addEventListener('click', () => {
        removeWatchedItem(item.id);
      });
      
      container.appendChild(div);
```

#### Validation

A crafted catalog result saved as watched is rendered as markup on the next options-page view.

Validation method: static source trace

**Watched source** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:405-420`

The options renderer reads saved watchedItems.

```javascript
function renderWatchedItems(type) {
  chrome.storage.sync.get(['watchedItems', 'userAccount'], (store) => {
    const watchedItems = store.watchedItems || [];
    const userAccount = store.userAccount;
    
    // Filter by type and user
    const filtered = watchedItems.filter(item => {
      if (item.type !== type) return false;
      // If user is signed in, only show their items
      if (userAccount && userAccount.email) {
        return item.userEmail === userAccount.email;
      }
      // If not signed in, show all items (local only)
      return !item.userEmail;
    });
    
```

**Watched html** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:429-442`

Raw catalog fields are interpolated into HTML instead of inserted as text.

```javascript
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'watched-item';
      div.innerHTML = `
        <div class="watched-item-title">${item.title}</div>
        <div class="watched-item-meta">${item.year || ''} ${item.director ? '• ' + item.director : ''}</div>
        <button class="remove-watched" data-id="${item.id}">Remove</button>
      `;
      
      div.querySelector('.remove-watched').addEventListener('click', () => {
        removeWatchedItem(item.id);
      });
      
      container.appendChild(div);
```

Limitations:
- A malicious metadata source or configured proxy must supply the data and the user must mark the result as watched.
- Manifest V3 CSP prevents ordinary inline JavaScript. Demonstrated impact is UI spoofing/markup injection and possible remote image requests, not unrestricted extension execution.

#### Dataflow

Catalog title/director fields enter watchedItems and are interpolated into innerHTML in the options page, allowing persistent markup and style injection.

**Watched source** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:405-420`

The options renderer reads saved watchedItems.

```javascript
function renderWatchedItems(type) {
  chrome.storage.sync.get(['watchedItems', 'userAccount'], (store) => {
    const watchedItems = store.watchedItems || [];
    const userAccount = store.userAccount;
    
    // Filter by type and user
    const filtered = watchedItems.filter(item => {
      if (item.type !== type) return false;
      // If user is signed in, only show their items
      if (userAccount && userAccount.email) {
        return item.userEmail === userAccount.email;
      }
      // If not signed in, show all items (local only)
      return !item.userEmail;
    });
    
```

**Watched html** — `Spolier blocker v1/Spolier blocker Cursor new/options.js:429-442`

Raw catalog fields are interpolated into HTML instead of inserted as text.

```javascript
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'watched-item';
      div.innerHTML = `
        <div class="watched-item-title">${item.title}</div>
        <div class="watched-item-meta">${item.year || ''} ${item.director ? '• ' + item.director : ''}</div>
        <button class="remove-watched" data-id="${item.id}">Remove</button>
      `;
      
      div.querySelector('.remove-watched').addEventListener('click', () => {
        removeWatchedItem(item.id);
      });
      
      container.appendChild(div);
```

#### Reachability

A malicious metadata source or configured proxy must supply the data and the user must mark the result as watched. Manifest V3 CSP prevents ordinary inline JavaScript. Demonstrated impact is UI spoofing/markup injection and possible remote image requests, not unrestricted extension execution.

- **Attacker:** A crafted catalog result saved as watched is rendered as markup on the next options-page view.

#### Severity

**Low** — The scan assigned low severity; no separate canonical severity rationale was recorded.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Construct elements with createElement and textContent and bind actions using closures rather than interpolated attributes.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Extension credentials and messaging boundaries | not recorded | Reported | Traced options OAuth storage to five external background handlers and their manifest allowlists; evaluated content-script storage, extension-page rendering and sender boundaries. |
| Proxy route authentication, availability and error handling | not recorded | Reported | Reviewed both unique server variants, six equivalent health routes, rate limiter placement, URL construction and error serialization. Deployment and reverse-proxy behavior remain unknown. |
| Untrusted metadata, page DOM and backup imports | not recorded | Reported | Reviewed original title rendering and all active import-handler variants. Confirmed watched metadata HTML injection, three page-readable sessionStorage watchlists and v1.1 import-to-CSS path. CSP and broken later event binding limit impact/reachability. |
| Detection lifecycle and all remaining content variants | not recorded | No issue found | Full source or complete differing hunks reviewed for v1, Copy, v1.1/v1.2 and v1.4/v1.5 detector, knowledge, integration, content and popup variants. Additional functional gaps include dropped mutations, stale attributes, disabled-mode observers and keyword settings ignored by active V4 logic; not classified as attacker-driven security findings. |
| Metadata builders and legacy auxiliary modules | not recorded | No issue found | Reviewed unique TMDB builders, Wikipedia enrichment, compression, V3 enhancement/integration/options, V4 bridge and asset conversion scripts. No additional validated remote-code execution or arbitrary-host credential disclosure. Some modules are not loaded by the manifest. |
| Persistence, onboarding and developer benchmarks | not recorded | No issue found | Reviewed real/stub IndexedDB implementations, both onboarding variants, i18n and complete benchmark/test scripts; hash-identical copies inherit review. Destructive historical phrase migration and benchmark exit-status/fixture-count defects are functional issues. No externally reachable database writer or attacker-controlled eval source was established. |
| Extension external messaging, metadata rendering and legacy backup boundaries | not recorded | Reported | Validated by independent baseline and parent source review. Chrome external admission/CSP limit exploit reachability; OAuth needs working configuration. |
| Proxy health request budget and raw-error disclosure | not recorded | Reported | Fixed upstream host/path allowlist rejects SSRF. Parent verified node-fetch 2.7.0 URL-bearing network error formatting from official source; no deployment probed. |
| Legacy content-script page storage | not recorded | Reported | Full selectedMedia list crosses into page-origin sessionStorage in v1.1-v1.3. |

## Open Questions And Follow Up

- Whether any historical proxy is publicly deployed with a real key or additional ingress limits.
- Whether any distributed build replaces the placeholder OAuth client ID; token disclosure requires a stored account token.
