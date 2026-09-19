# Website, administrator panel and optional accounts

The extension remains version **2.0.0**. `website/` contains the responsive promotional site, account pages and administrator UI. `server/app.cjs` is the working Node/SQLite account service. No hosted account provider or paid checkout is silently provisioned.

## Local preview, including admin and connected extension

Use Node 22.20 or newer (the built-in SQLite module emits an experimental warning on Node 22):

```sh
npm ci --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:4173`. The first run creates a random local administrator password in **`server/data/local-admin.json`**, which is ignored by Git. Sign in at `/account`, then open `/admin`. Do not upload or share this file. The local service binds only to loopback.

The command also creates **`dist/local-extension/`** with a stable development extension ID and permission for this local service. Load that folder using Chrome's **Load unpacked** to test optional accounts. The canonical `extension/` directory still contains the actual source; the generated local copy is a development build. Rerun `npm run dev` after source changes, then reload the extension.

Local and production databases are separate (`local-preview.sqlite` and `portal.sqlite`). The helper does not create a production administrator or deploy anything publicly. Registration creates Free users; only the bootstrap administrator can assign Premium/Max or change quotas.

## Tier rules

| Tier | Default custom keyword entries |
|---|---:|
| Free, including signed-out users | 2 |
| Premium | 10 |
| Max | No plan quota |

A phrase such as “Mira Vale” counts as **one entry**. Normalized duplicates are deduplicated. Title packs, custom protected titles and their character aliases do not consume keyword slots, as requested. The administrator can change any tier's limit, including setting it to `unlimited`.

The existing device safety capacity remains 2,000 literal entries, 160 characters per entry and 1 MB total settings. “Unlimited” means no additional tier quota, not infinite memory or processing capacity. These limits are disclosed on the website. Existing over-quota local protection is preserved when upgrading/downgrading; adding further entries beyond quota is rejected. Server uploads enforce the current tier immediately, so an over-quota user must reduce entries before uploading.

Limits refresh when a connected options page opens or the user clicks Refresh plan; uploads/downloads also refresh account state. Offline clients use their last saved policy. Local enforcement is not DRM: anyone controlling an unpacked extension can edit it. Cloud quotas and administrator authorization are enforced independently on the server.

## Settings flow

1. Enable account access for the configured service and sign in/register in extension settings.
2. Save local changes. **Upload saved settings** sends only sanitized settings, watchlist/aliases and keyword exceptions; it excludes TMDB credentials, account credentials and page content.
3. On another device, sign in and choose **Download cloud settings**, then confirm replacement. Cloud settings do not merge silently with unsaved form changes.
4. Revision checks reject uploads if another device changed the cloud copy. Download the current copy before retrying; export local settings first if you need to preserve both.
5. Sign out to delete the local session. If the network is unavailable, local sign-out still completes and the UI explains that server revocation could not be confirmed.

Website users can download their saved configuration or delete their account and cloud settings. Passwords use salted scrypt hashes, server session records store only token hashes, and sessions expire after 30 days. Browser writes require an allowlisted Origin. Queries use prepared statements. The cloud database is **not end-to-end encrypted**.

## Deploy your own service

1. Choose a Node host with a persistent volume for `server/data/`. Set `SITE_ORIGIN` to the exact HTTPS origin. Serve behind TLS; configure the reverse proxy and appropriate ingress limits. The application deliberately does not trust arbitrary forwarded IP headers; its in-process login limiter sees the socket IP, so a proxy needs its own per-client limiting. Multi-instance/shared-session deployment requires replacing the single SQLite design.
2. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 16 characters using the host's secrets manager; consult `server/.env.example`. Start `npm start`. Bootstrap only creates an administrator if that email does not already exist; changing the environment password does not silently reset an existing account.
3. Set `EXTENSION_ORIGINS` to the exact published extension origin(s). No wildcard CORS or externally-connectable messaging is used.
4. Build the extension with `ACCOUNT_ORIGIN=https://your-domain.example` in the environment, then `npm run build`. This injects that origin into `account-config.js` and adds only that exact optional host permission to the packaged manifest. The default build has no account service and makes no account requests.
5. Publish the resulting ZIP through your extension store flow. Keep the same extension ID for upgrades. Configure monitoring, backups and restore drills; document the operator's privacy contact and retention policy.

Before a public paid launch, add verified email/password recovery (or replace this initial auth service with a managed identity provider), administrator MFA, durable abuse controls and operational monitoring. The current local integration tests do not establish production scalability. Paid billing/webhooks are a proposed next step, not an implemented checkout.
