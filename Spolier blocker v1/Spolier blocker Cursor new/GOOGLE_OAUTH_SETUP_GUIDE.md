# Google OAuth Setup Guide - Fix "OAuth client was not found" Error

## Error You're Seeing:
```
Access blocked: Authorization Error
krushna.patare@gmail.com
The OAuth client was not found.
Error 401: invalid_client
```

## Why This Happens:
The extension is using a test/placeholder OAuth client ID that doesn't exist or isn't configured for your Chrome extension.

---

## 🔧 Solution: Set Up Your Own OAuth Client ID

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com/
2. Sign in with your Google account (krushna.patare@gmail.com)

### Step 2: Create a New Project
1. Click on the project dropdown at the top
2. Click "NEW PROJECT"
3. Project name: **Spoiler Shield Extension**
4. Click "CREATE"
5. Wait for project to be created
6. Select your new project from the dropdown

### Step 3: Enable Required APIs
1. Go to: https://console.cloud.google.com/apis/library
2. Search for: **"Google+ API"** or **"People API"**
3. Click on it
4. Click "ENABLE"
5. Wait for it to enable

### Step 4: Create OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** user type
3. Click "CREATE"

#### Fill in the form:
- **App name**: Spoiler Shield
- **User support email**: krushna.patare@gmail.com
- **Developer contact**: krushna.patare@gmail.com
- **App logo**: (optional - skip for now)
- Click "SAVE AND CONTINUE"

#### Scopes:
- Click "ADD OR REMOVE SCOPES"
- Search and add these scopes:
  - `../auth/userinfo.email`
  - `../auth/userinfo.profile`
  - `openid`
- Click "UPDATE"
- Click "SAVE AND CONTINUE"

#### Test Users:
- Click "ADD USERS"
- Add your email: **krushna.patare@gmail.com**
- Click "ADD"
- Click "SAVE AND CONTINUE"

### Step 5: Create OAuth Client ID
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "CREATE CREDENTIALS"
3. Select **"OAuth client ID"**
4. Application type: **"Chrome Extension"** or **"Web Application"**

#### For Chrome Extension:
- **Name**: Spoiler Shield Extension
- **Application ID**: Get from chrome://extensions/
  - Go to chrome://extensions/
  - Enable "Developer mode"
  - Find your extension ID (looks like: `abcdefghijklmnopqrstuvwxyz`)
  - Copy the full ID
  - Paste in "Application ID" field
- Click "CREATE"

#### For Web Application (Alternative):
- **Name**: Spoiler Shield Extension
- **Authorized redirect URIs**: 
  - Click "ADD URI"
  - Add: `https://<YOUR-EXTENSION-ID>.chromiumapp.org/`
  - Replace `<YOUR-EXTENSION-ID>` with your actual extension ID
  - Example: `https://abcdefghijklmnopqrstuvwxyz.chromiumapp.org/`
- Click "CREATE"

### Step 6: Get Your Client ID
1. After creating, you'll see a popup with:
   - **Client ID**: (copy this - looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret**: (not needed for extension)
2. Click "OK"
3. You can always find it again in the credentials list

---

## 📝 Update Your Extension Code

### Option A: Update manifest.json (Recommended)

Open `manifest.json` and add:

```json
{
  "manifest_version": 3,
  "name": "Spoiler Shield",
  "version": "1.2.0",
  
  "oauth2": {
    "client_id": "YOUR-CLIENT-ID-HERE.apps.googleusercontent.com",
    "scopes": [
      "openid",
      "email",
      "profile"
    ]
  },
  
  "permissions": [
    "storage",
    "scripting",
    "contextMenus",
    "identity"
  ],
  
  // ... rest of manifest
}
```

**Replace `YOUR-CLIENT-ID-HERE.apps.googleusercontent.com` with your actual Client ID!**

### Option B: Update options.js

Find this line in `options.js` (around line 175):

```javascript
const clientId = '1077083917677-rmntmr1b2i7lq0e90kd0d8i2vkb8autc.apps.googleusercontent.com'; // Public test ID
```

Replace with:

```javascript
const clientId = 'YOUR-CLIENT-ID-HERE.apps.googleusercontent.com'; // Your actual client ID
```

---

## 🔄 Reload Your Extension

1. Go to: chrome://extensions/
2. Find "Spoiler Shield"
3. Click the refresh icon 🔄
4. OR click "Remove" and reload the extension

---

## ✅ Test Google Sign-In

1. Open extension options (right-click icon > Options)
2. Click "Sign In with Google"
3. You should see Google's OAuth consent screen
4. Grant permissions
5. You'll be signed in!

---

## 🚨 Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution**: Make sure your redirect URI matches exactly
- Format: `https://<extension-id>.chromiumapp.org/`
- Get extension ID from chrome://extensions/
- Add trailing slash `/`

### Error: "invalid_client"
**Solution**: 
- Check client ID is correct in manifest.json or options.js
- Make sure you copied the FULL client ID
- No extra spaces or quotes

### Error: "access_denied"
**Solution**:
- Make sure you added your email as a test user
- Check OAuth consent screen is configured
- Try incognito mode

### Still showing test client error?
**Solution**:
1. Clear extension data:
   - chrome://extensions/
   - Click "Details" on Spoiler Shield
   - Scroll down
   - Click "Clear storage"
2. Reload extension
3. Try sign-in again

---

## 📋 Quick Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google+ API or People API
- [ ] Created OAuth Consent Screen
- [ ] Added your email as test user
- [ ] Created OAuth Client ID
- [ ] Got your Client ID (123456789-xxx.apps.googleusercontent.com)
- [ ] Updated manifest.json or options.js with your Client ID
- [ ] Reloaded extension
- [ ] Tested sign-in

---

## 🎯 Alternative: Simple Method Without OAuth

If you want to skip OAuth for now (for development/testing):

### Modify renderSignInButton() in options.js:

Find the `renderSignInButton()` function and replace it with:

```javascript
function renderSignInButton() {
  const container = document.getElementById('google-signin-container');
  container.innerHTML = `
    <div class="google-signin">
      <div style="text-align: center; padding: 20px;">
        <p style="color: #98a2c8; margin-bottom: 16px;">
          Sign in feature requires OAuth setup.<br>
          <a href="GOOGLE_OAUTH_SETUP_GUIDE.md" style="color: #7c8cff;">See setup guide</a>
        </p>
        <button class="btn-secondary" id="useLocalBtn">
          Use Local Account (No Sign-In Required)
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('useLocalBtn').addEventListener('click', () => {
    useLocalAccount(container, '');
  });
}
```

This gives users a clear option to use local storage without OAuth.

---

## 📞 Need Help?

If you're still stuck:
1. Check the Console for errors (F12 > Console)
2. Verify your Client ID is correct
3. Make sure extension ID matches in Google Console
4. Try clearing browser cache
5. Test in incognito mode

---

**Your Client ID Format**: `123456789-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`

**Your Extension ID**: Get from `chrome://extensions/` (enable Developer mode)

**Redirect URI Format**: `https://<extension-id>.chromiumapp.org/`

---

✅ Once configured, Google Sign-In will work perfectly!
