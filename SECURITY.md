# Security policy

The supported release source is `extension/` at version 2.0 and later. Historical `Spolier blocker v*` directories receive the targeted backports in this change but are not supported release builds. Existing historical ZIP files are not patched.

Report a suspected vulnerability privately to a repository maintainer through an available GitHub security-advisory channel. If private reporting is unavailable, ask a maintainer for a private contact without posting credentials or an exploit against a live deployment. No response-time guarantee or unverified contact address is implied.

Include the affected version, entry point, required attacker access, reproducible steps, impact and a small safe example. Never include a real API token, account token, browsing history or another person's watchlist.

## Security properties

- Page content and remote metadata are untrusted text, never extension HTML, executable code or arbitrary CSS.
- Websites cannot obtain account/API credentials or use extension messages to mutate settings or trigger authenticated lookups.
- Page text stays on device. Optional lookup uses only a fixed HTTPS TMDB destination, bounded responses and explicit permission.
- Imports are bounded, allowlisted data; secrets are neither restored from nor written to backups.
- Website exclusion boundaries must not match lookalike domains.
- Release builds contain only approved local extension assets, with no shared proxy or remote code.

Concealment is not access control: the original page remains accessible to website scripts and developer tools. Detection misses and ordinary false positives are product defects unless they establish a distinct security boundary violation. See [the review and remediation record](docs/SECURITY_REVIEW.md).

## Optional account service

The new `server/` and `website/` components have separate trust boundaries: web sessions, exact-origin write checks, administrator authorization, per-user settings isolation and server-enforced upload quotas. Account session credentials must never enter content-script messages or backups. Administrators are bootstrapped from server environment, never client-supplied registration roles. This initial service requires the production hardening and deployment steps in [ACCOUNTS_AND_DEPLOYMENT.md](docs/ACCOUNTS_AND_DEPLOYMENT.md); the original baseline security report predates it. Behavioral tests cover authorization, quotas, revision conflicts, session revocation and deletion. Local-only quota enforcement is not a tamper-proof licensing boundary.
