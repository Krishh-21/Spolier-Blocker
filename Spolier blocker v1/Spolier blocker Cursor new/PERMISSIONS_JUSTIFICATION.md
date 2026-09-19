# Permissions Justification - Spoiler Shield

## Chrome Web Store Submission Documentation

---

## Required Permissions

### 1. `storage`
**Why Required:** Store user preferences, blocked titles, custom keywords, and learning data  
**Data Stored:**
- Settings (blur radius, colors, behavior preferences)
- Selected media titles to block spoilers for
- Custom keywords added by user
- Reinforcement learning weights
- False positive tracking
- Watched items list

**Privacy:** All data stored locally in Chrome sync storage. No data sent to external servers except when user explicitly searches TMDB.

---

### 2. `scripting`
**Why Required:** Inject content script to detect and blur spoilers on web pages  
**What It Does:**
- Scans page content for spoiler-related text and images
- Applies CSS blur effects to matched content
- Handles user interactions (click to reveal)

**Privacy:** Only processes content locally in browser. No data transmitted.

---

### 3. `contextMenus`
**Why Required:** Right-click menu options for adding keywords and marking false positives  
**User Actions:**
- "Add selected text as keyword" - Quick add from any page
- "Report media as spoiler" - Extract keywords from images
- "Mark as NOT a spoiler" - Train false positive detection

**Privacy:** Selected text processed locally only.

---

## Optional Permissions (Granted On-Demand)

### 4. `activeTab` (Optional)
**Why Optional:** Only needed when user clicks extension icon or uses features  
**When Requested:** Popup opens, context menu used, keyboard shortcuts activated  
**What It Does:** Access current tab to send messages to content script

**Privacy:** No persistent access. Only when user explicitly interacts.

---

### 5. `tabs` (Optional)
**Why Optional:** Only needed for per-site toggles and badge updates  
**When Requested:** User toggles extension on/off for specific sites  
**What It Does:**
- Read tab URL to determine current site
- Update extension badge with blur count
- Show ON/OFF status per domain

**Privacy:** Only reads URL hostname, not full URL or page content.

---

### 6. `identity` (Optional)
**Why Optional:** Only needed if user chooses Google Sign-In for cross-device sync  
**When Requested:** User clicks "Sign In with Google" button in options  
**What It Does:**
- OAuth 2.0 authentication with Google
- Sync settings across user's devices
- Associate watched items with user account

**Privacy:** User chooses whether to sign in. Works fully without it.

---

## Optional Host Permissions (Granted On-Demand)

### 7. `https://api.themoviedb.org/*`
**Why Optional:** Only needed when user searches for movies/TV shows  
**When Requested:** User types search query and clicks "Search"  
**What It Does:** Fetch movie/TV metadata from The Movie Database (TMDB) API  
**Data Sent:** Search query only (movie/show title)  
**Data Received:** Titles, cast, crew, release dates (public data)

**Privacy:** Search only when user explicitly requests. Optional API key.

---

### 8. `https://www.googleapis.com/*`
**Why Optional:** Only needed if user chooses Google Sign-In  
**When Requested:** User clicks "Sign In with Google"  
**What It Does:** Fetch user profile (email, name) after OAuth consent  
**Data Sent:** OAuth token only  
**Data Received:** Email and name (with user consent)

**Privacy:** Completely optional. Extension works without sign-in.

---

### 9. `https://*/*`
**Why Optional:** Only needed if user configures custom TMDB proxy  
**When Requested:** User enters custom proxy URL in settings and searches  
**What It Does:** Allow searches via user's own proxy server instead of TMDB directly  
**Data Sent:** Search queries to user-specified server

**Privacy:** User controls proxy URL. Default proxy is open-source and auditable.

---

## NO Permissions (What We DON'T Request)

❌ **webRequest** - We don't intercept or modify network requests  
❌ **downloads** - We don't download files  
❌ **cookies** - We don't read or modify cookies  
❌ **history** - We don't access browsing history  
❌ **bookmarks** - We don't access bookmarks  
❌ **geolocation** - We don't track location  
❌ **notifications** - We don't send notifications  
❌ **clipboardRead** - We don't read clipboard  

---

## Privacy Summary

✅ **Local Processing:** All spoiler detection runs locally in your browser  
✅ **No Tracking:** No analytics, no user tracking, no data collection  
✅ **No Ads:** Completely ad-free  
✅ **Open Source:** Code is auditable  
✅ **Minimal Permissions:** Most permissions are optional  
✅ **User Control:** Every permission requested only when needed  

---

## Data Transmission Summary

**When Data Leaves Your Browser:**
1. ✅ TMDB API searches - only when you explicitly search
2. ✅ Google Sign-In - only if you choose to sign in
3. ✅ Custom proxy - only if you configure one

**What We NEVER Transmit:**
❌ Browsing history  
❌ Page content  
❌ Clicked links  
❌ Personal information  
❌ Usage analytics  

---

## Compliance

### GDPR Compliant
- No data collection without explicit consent
- User controls all data
- Right to export (settings export feature)
- Right to deletion (clear storage)

### CCPA Compliant
- No sale of personal information
- No sharing with third parties
- Transparent data practices

### Chrome Web Store Policy Compliant
- All permissions justified with user benefit
- No deceptive practices
- Clear privacy policy
- Minimal permission model

---

## Changes from Previous Versions

### v1.2.0 (Current)
- Moved `activeTab`, `tabs`, `identity` to **optional**
- All host permissions to **optional_host_permissions**
- Reduced required permissions from 6 to 3

### v1.1.0
- All permissions required
- No granular permission model

**User Impact:** Users grant permissions only when using specific features, improving privacy and trust.

---

## For Reviewers

**Permission Request Flow:**
1. Extension installs with only 3 base permissions
2. User opens popup → Requests `activeTab` (if approved once, persists)
3. User searches → Requests TMDB API access (per-host permission)
4. User signs in → Requests `identity` and Google APIs (optional)

**Testing Instructions:**
1. Install extension → Only storage, scripting, contextMenus active
2. Open popup → Chrome prompts for activeTab (accept)
3. Try search → Chrome prompts for TMDB API (accept)
4. Optional: Sign in → Chrome prompts for identity (accept)

All prompts show clear benefit to user before requesting.

---

**Last Updated:** June 16, 2026  
**Version:** 1.2.0  
**Status:** Ready for Chrome Web Store Review
