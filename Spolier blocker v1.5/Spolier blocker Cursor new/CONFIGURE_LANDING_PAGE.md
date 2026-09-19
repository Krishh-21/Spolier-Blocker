# Configure Landing Page URL

## 🔗 How to Set Your Landing Page URL

When you click the Spoiler Shield logo in the popup or settings, it opens your landing page. You need to configure the URL.

---

## 📝 Method 1: Host Landing Page in Extension (Recommended)

### Step 1: Move Landing Page to Extension Folder

```
1. Copy: spoiler-shield-landing (1).html
2. Paste into: Spolier blocker Cursor new/
3. Rename to: spoiler-shield-landing.html (remove spaces and "(1)")
```

### Step 2: Update manifest.json

Add the landing page to `web_accessible_resources`:

```json
"web_accessible_resources": [
  {
    "resources": [
      "styles.css",
      "welcome.html",
      "onboarding.html",
      "spoiler-shield-landing.html",    ← ADD THIS
      "assets/*"
    ],
    "matches": ["<all_urls>"]
  }
],
```

### Step 3: Update popup.js

Find this line (around line 9):

```javascript
const LANDING_PAGE_URL = chrome.runtime.getURL('spoiler-shield-landing.html') || 'https://yourdomain.com/spoiler-shield-landing.html';
```

Make sure it says:
```javascript
const LANDING_PAGE_URL = chrome.runtime.getURL('spoiler-shield-landing.html');
```

### Step 4: Reload Extension

```
1. Go to chrome://extensions/
2. Find Spoiler Shield
3. Click Reload (🔄)
4. Test by clicking logo in popup
```

---

## 🌐 Method 2: Host Landing Page on Your Website

### Step 1: Upload Landing Page

Upload `spoiler-shield-landing (1).html` to your website:
```
Example: https://yourdomain.com/spoiler-shield-landing.html
```

### Step 2: Update popup.js

Find this line (around line 9):

```javascript
const LANDING_PAGE_URL = chrome.runtime.getURL('spoiler-shield-landing.html') || 'https://yourdomain.com/spoiler-shield-landing.html';
```

Change to your actual URL:
```javascript
const LANDING_PAGE_URL = 'https://yourdomain.com/spoiler-shield-landing.html';
```

### Step 3: Update options.js

Find this line (around the end of file):

```javascript
const landingPageUrl = chrome.runtime.getURL('spoiler-shield-landing.html') || 
                      'https://yourdomain.com/spoiler-shield-landing.html';
```

Change to your actual URL:
```javascript
const landingPageUrl = 'https://yourdomain.com/spoiler-shield-landing.html';
```

### Step 4: Update manifest.json

Make sure your domain is in `externally_connectable`:

```json
"externally_connectable": {
  "matches": [
    "*://localhost/*",
    "*://yourdomain.com/*",           ← Your domain
    "*://*.yourdomain.com/*",         ← Your domain with subdomains
    "file:///*"
  ]
}
```

---

## 📁 Method 3: Open Local File (Development Only)

### For Local Testing:

In popup.js:
```javascript
const LANDING_PAGE_URL = 'file:///C:/Users/krush/Downloads/Spolier/Spolier%20blocker%20v1/spoiler-shield-landing%20(1).html';
```

In options.js:
```javascript
const landingPageUrl = 'file:///C:/Users/krush/Downloads/Spolier/Spolier%20blocker%20v1/spoiler-shield-landing%20(1).html';
```

⚠️ **Note**: This only works on your computer. Use Method 1 or 2 for production.

---

## ✅ Quick Setup Checklist

**For hosting in extension** (Recommended):
- [ ] Copy landing page to extension folder
- [ ] Rename to `spoiler-shield-landing.html`
- [ ] Add to `web_accessible_resources` in manifest.json
- [ ] Verify `popup.js` uses `chrome.runtime.getURL()`
- [ ] Reload extension
- [ ] Test by clicking logo

**For hosting on website**:
- [ ] Upload landing page to your website
- [ ] Get the full URL (e.g., `https://yourdomain.com/landing.html`)
- [ ] Update `LANDING_PAGE_URL` in popup.js
- [ ] Update `landingPageUrl` in options.js
- [ ] Update `externally_connectable` in manifest.json
- [ ] Reload extension
- [ ] Test by clicking logo

---

## 🧪 Testing

### Test in Popup:
```
1. Click extension icon
2. Click the "Spoiler Shield" logo/header
3. Landing page opens in new tab
```

### Test in Settings:
```
1. Right-click extension icon → Options
2. Click the shield logo in sidebar
3. Landing page opens in new tab
```

---

## 🐛 Troubleshooting

### Logo doesn't open landing page
**Check:**
1. URL is correctly set in `popup.js` and `options.js`
2. Landing page file exists at that location
3. No typos in URL
4. Extension was reloaded after changes

### "File not found" error
**For Method 1 (Extension)**:
- Landing page must be in extension folder
- Must be added to `web_accessible_resources`
- Extension must be reloaded

**For Method 2 (Website)**:
- URL must be publicly accessible
- HTTPS required (not HTTP)
- CORS must allow extension

### Logo click does nothing
**Check browser console**:
```
F12 → Console tab
Look for errors
Should see: "[Popup] Landing page link initialized"
```

---

## 💡 Recommendations

### For Development:
- Use Method 1 (host in extension)
- Easy to test and update
- No need for web hosting

### For Production:
- Use Method 2 (host on website)
- Better for marketing
- Can update without extension update
- Better SEO

### Best Practice:
- Keep both versions in sync
- Use same design and features
- Test both methods before release

---

## 📝 Current Configuration

Your files currently have:

**popup.js** (line ~9):
```javascript
const LANDING_PAGE_URL = chrome.runtime.getURL('spoiler-shield-landing.html') || 
                        'https://yourdomain.com/spoiler-shield-landing.html';
```

**options.js** (end of file):
```javascript
const landingPageUrl = chrome.runtime.getURL('spoiler-shield-landing.html') || 
                      'https://yourdomain.com/spoiler-shield-landing.html';
```

**What this means**:
- First tries to load from extension (`chrome.runtime.getURL`)
- Falls back to website URL if not found
- Replace `yourdomain.com` with your actual domain

---

## 🎯 Quick Setup for Your Use Case

**Since your landing page is currently**:
```
c:\Users\krush\Downloads\Spolier\Spolier blocker v1\spoiler-shield-landing (1).html
```

**Recommended Setup**:

1. Copy file to:
   ```
   c:\Users\krush\Downloads\Spolier\Spolier blocker v1\Spolier blocker Cursor new\spoiler-shield-landing.html
   ```

2. Add to manifest.json `web_accessible_resources`:
   ```json
   "spoiler-shield-landing.html"
   ```

3. Reload extension

4. Click logo in popup or settings → Landing page opens! ✅

---

## 📞 Summary

- ✅ Logo in popup now clickable
- ✅ Logo in settings now clickable
- ✅ Opens landing page in new tab
- ✅ URL configurable in 2 places:
  - `popup.js` (line ~9)
  - `options.js` (end of file)
- ✅ Works with extension-hosted or web-hosted page

**Just update the URLs and you're done!** 🎉
