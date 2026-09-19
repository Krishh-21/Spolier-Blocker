# Quick Fix: Google Sign-In Setup

## 🚨 Current Error:
```
Error 401: invalid_client
The OAuth client was not found.
```

## ✅ Solution (5 Minutes):

### Step 1: Get Your Extension ID
1. Open Chrome
2. Go to: `chrome://extensions/`
3. Enable "**Developer mode**" (top right)
4. Find **Spoiler Shield**
5. Copy the **ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)

Example ID: `phkdfghmjkliopasdfghjklzxcvbnm`

---

### Step 2: Create Google Cloud Project

#### A. Go to Google Cloud Console:
🔗 **https://console.cloud.google.com/**

#### B. Create Project:
1. Click project dropdown (top left)
2. Click "**NEW PROJECT**"
3. Name: `Spoiler Shield`
4. Click "**CREATE**"
5. Wait 10 seconds
6. Select your new project

---

### Step 3: Enable APIs

#### A. Enable Identity API:
🔗 **https://console.cloud.google.com/apis/library**

1. Search: `Google+ API` or `People API`
2. Click on it
3. Click "**ENABLE**"
4. Wait for it to enable

---

### Step 4: Configure OAuth Consent

#### A. Go to OAuth Consent Screen:
🔗 **https://console.cloud.google.com/apis/credentials/consent**

#### B. Fill Basic Info:
1. User Type: **External**
2. Click "**CREATE**"
3. App name: `Spoiler Shield`
4. User support email: `krushna.patare@gmail.com`
5. Developer email: `krushna.patare@gmail.com`
6. Click "**SAVE AND CONTINUE**"

#### C. Scopes (Step 2):
1. Click "**ADD OR REMOVE SCOPES**"
2. Select these 3:
   - ✅ `userinfo.email`
   - ✅ `userinfo.profile`  
   - ✅ `openid`
3. Click "**UPDATE**"
4. Click "**SAVE AND CONTINUE**"

#### D. Test Users (Step 3):
1. Click "**ADD USERS**"
2. Add: `krushna.patare@gmail.com`
3. Click "**ADD**"
4. Click "**SAVE AND CONTINUE**"
5. Click "**BACK TO DASHBOARD**"

---

### Step 5: Create OAuth Client ID

#### A. Go to Credentials:
🔗 **https://console.cloud.google.com/apis/credentials**

#### B. Create Credentials:
1. Click "**+ CREATE CREDENTIALS**"
2. Select "**OAuth client ID**"
3. Application type: Select "**Web application**"
4. Name: `Spoiler Shield Extension`

#### C. Add Redirect URI:
1. Under "Authorized redirect URIs"
2. Click "**+ ADD URI**"
3. Paste this (replace with YOUR extension ID):
   ```
   https://YOUR-EXTENSION-ID-HERE.chromiumapp.org/
   ```
   
   **Example**:
   ```
   https://phkdfghmjkliopasdfghjklzxcvbnm.chromiumapp.org/
   ```
   
   ⚠️ **Important**: 
   - Replace `YOUR-EXTENSION-ID-HERE` with your actual ID from Step 1
   - Keep the `https://` at start
   - Keep the `.chromiumapp.org/` at end
   - Keep the `/` at the very end!

4. Click "**CREATE**"

#### D. Copy Your Client ID:
A popup appears with:
- **Client ID**: `123456789-abc...xyz.apps.googleusercontent.com`
- **Client secret**: (ignore this)

📋 **COPY THE CLIENT ID** - You'll need it next!

---

### Step 6: Update Your Extension

#### Open these files and replace the Client ID:

#### File 1: `manifest.json`
Find this line:
```json
"client_id": "YOUR-CLIENT-ID-HERE.apps.googleusercontent.com",
```

Replace with YOUR client ID:
```json
"client_id": "123456789-abcdefg.apps.googleusercontent.com",
```

#### File 2: `options.js`
Find this line (around line 175):
```javascript
const clientId = '1077083917677-rmntmr1b2i7lq0e90kd0d8i2vkb8autc.apps.googleusercontent.com';
```

Replace with YOUR client ID:
```javascript
const clientId = '123456789-abcdefg.apps.googleusercontent.com';
```

---

### Step 7: Reload Extension

1. Go to `chrome://extensions/`
2. Find "Spoiler Shield"
3. Click the **🔄 Reload** button

---

### Step 8: Test Sign-In

1. Click extension icon
2. Click ⚙️ Settings
3. Look at "Account" section
4. Click "**Sign In with Google**"
5. Google OAuth screen should appear
6. Click "Continue"
7. ✅ **Success!** You're signed in!

---

## 📋 Quick Reference

### Your Extension ID:
```
Get from: chrome://extensions/
Format: abcdefghijklmnopqrstuvwxyz123456
```

### Your Client ID (after Step 5):
```
Format: 123456789-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

### Your Redirect URI:
```
Format: https://<extension-id>.chromiumapp.org/
Example: https://phkdfghmjkliopasdfghjklzxcvbnm.chromiumapp.org/
```

### Files to Update:
```
1. manifest.json (line ~11)
2. options.js (line ~175)
```

---

## 🐛 Common Issues

### "redirect_uri_mismatch"
- Make sure redirect URI in Google Console matches EXACTLY
- Format: `https://<extension-id>.chromiumapp.org/`
- Include the trailing `/`
- Use YOUR extension ID, not the example

### "invalid_client" still showing
- Double-check client ID in manifest.json
- Double-check client ID in options.js
- Reload extension after changes
- Clear extension storage: chrome://extensions/ > Details > Clear storage

### "Access denied"
- Make sure you added yourself as test user
- Check OAuth consent screen is configured
- Try signing in with the exact email you added

---

## ✅ Success Checklist

- [ ] Got extension ID from chrome://extensions/
- [ ] Created Google Cloud project
- [ ] Enabled Google+ API or People API  
- [ ] Configured OAuth consent screen
- [ ] Added krushna.patare@gmail.com as test user
- [ ] Created OAuth client ID (Web application)
- [ ] Added redirect URI: `https://<extension-id>.chromiumapp.org/`
- [ ] Copied client ID
- [ ] Updated manifest.json with client ID
- [ ] Updated options.js with client ID
- [ ] Reloaded extension
- [ ] Tested sign-in successfully

---

## 🎉 Done!

Once you complete these steps, Google Sign-In will work perfectly!

**Time needed**: 5-10 minutes
**Difficulty**: Easy
**Cost**: Free

---

## 💡 Pro Tips

1. **Save your Client ID** somewhere safe (like a password manager)
2. **Keep test users limited** - only add emails you trust
3. **Don't share your Client ID publicly** - keep it in your code
4. **For production**: Verify your OAuth consent screen with Google

---

## 📞 Still Need Help?

Check the detailed guide: `GOOGLE_OAUTH_SETUP_GUIDE.md`

Or search for these keywords:
- "Chrome extension OAuth setup"
- "Google Cloud Console OAuth"
- "Chrome extension identity API"
