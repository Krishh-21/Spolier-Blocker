# Comprehensive Fixes - June 16, 2026

## Status: 🔧 IN PROGRESS

## Issues & Solutions

### ✅ Issue 1: Missing extractHost Function (FIXED)
**Status:** COMPLETE
**File:** background.js
**Fix:** Added missing function at line 418

### ✅ Issue 2: Syntax Error in popup.js (FIXED)
**Status:** COMPLETE  
**File:** popup.js
**Fix:** Removed orphaned code after line 403

---

## NEW ISSUES TO FIX

### 🔧 Issue 3: Google Account Login (Needs Polish)
**Status:** PARTIALLY WORKING - Needs completion
**Files:** options.js, options.html
**Current State:** Basic framework exists, needs:
- Better error handling
- Sync functionality
- Token refresh
- Cloud storage integration

**Solution:** Complete the Google Account spec implementation
- Add sync-manager.js
- Implement cloud data storage
- Add sync status indicators

---

### 🔧 Issue 4: Auto-Reblur Timer in Popup (Wrong Location)
**Status:** WORKING but in wrong place
**Files:** popup.html, popup.js, options.html, options.js

**Current Location:** popup.html lines 94-112
**Target Location:** options.html → Advanced Section → Timing

**Changes Required:**
1. Remove from popup.html (lines 94-112)
2. Remove from popup.js `initReblurTimer()` function
3. Add to options.html in Advanced section
4. Add handler to options.js

---

### 🔧 Issue 5: Keyboard Shortcuts Display in Popup (Wrong Location)
**Status:** WORKING but in wrong place
**Files:** popup.html, options.html, options.js

**Current Location:** popup.html lines 125-133
**Target Location:** options.html → New "Shortcuts" section

**Changes Required:**
1. Remove from popup.html (lines 125-133)
2. Create new "Shortcuts" section in options.html
3. Make shortcuts editable in settings
4. Add keyboard shortcut customization

---

### 🔧 Issue 6: Visual Options Not Working
**Status:** BROKEN - Live preview not updating
**Files:** options.js, options.html

**Root Cause:** Function `initLivePreview()` is correctly implemented but may have timing issues

**Diagnosis:**
- Function exists and is called (line 63)
- HTML elements exist (livePreview, blurRadius, etc.)
- Event listeners attached
- updatePreview() called on init

**Possible Issues:**
1. Preview image not loading (data URI)
2. Styles not applying due to CSP
3. Timing - called before elements ready

**Solution:**
1. Add console.log() to debug
2. Verify elements exist when function runs
3. Check if preview updates on manual interaction
4. Fix any CSP issues

**Test Steps:**
1. Open options page
2. Move blur slider
3. Check if preview blurs
4. Change blur style dropdown
5. Change overlay colors

---

### 🔧 Issue 7: Permissions/Blur Options Not Working
**Status:** BROKEN - Toggles not saving/applying
**Files:** options.js, options.html

**Current State:**
- Toggles exist in HTML (Permissions section)
- Toggle functions exist: `setToggle()`, `getToggle()`
- Save button exists

**Possible Issues:**
1. Event listeners not attached to toggles
2. Save function not reading toggle values
3. Restore function not setting toggles
4. Toggle CSS class not toggling

**Solution:**
1. Verify toggle event listeners
2. Check save() function reads all toggles
3. Check restore() function sets all toggles
4. Test toggle animation/functionality

**Toggles to Fix:**
- blurImages-toggle
- showOverlay-toggle
- revealHover-toggle
- revealClick-toggle
- revealDblClick-toggle
- wordBoundaries-toggle
- reinforce-toggle

---

### 🔧 Issue 8: Optional Analytics Not Working
**Status:** NOT IMPLEMENTED
**Files:** options.js, options.html, telemetry.js (NEW)

**Current State:**
- UI exists in Privacy section
- Toggle exists: `telemetry-toggle`
- No backend implementation

**Required Implementation:**
1. Create telemetry.js module
2. Implement anonymous data collection
3. Add opt-in consent tracking
4. Add data transmission to analytics endpoint
5. Add opt-out mechanism (delete all data)
6. Update privacy policy

**Data to Collect (Anonymous):**
- Extension version
- Chrome version
- Number of watched items
- Number of custom keywords
- Number of spoilers blocked per session
- Settings configuration (anonymized)
- Error events

**What NOT to Collect:**
- URLs visited
- Page content
- User identity
- Personal information

**Solution:**
1. Create telemetry.js with privacy-first design
2. Implement consent UI
3. Add toggle handler in options.js
4. Send anonymous events
5. Respect opt-out immediately

---

## Implementation Order

### Phase 1: Critical Fixes (DO FIRST) ⚡
1. Fix Visual Options preview ← START HERE
2. Fix Blur Options toggles
3. Implement Optional Analytics

**Time Estimate:** 1-2 hours

### Phase 2: UI Reorganization 🎨
1. Move timer to settings
2. Move keyboard shortcuts display to settings
3. Simplify popup
4. Add new Shortcuts section

**Time Estimate:** 1 hour

### Phase 3: Google Account Completion 🔐
1. Complete sync implementation
2. Add sync status indicators
3. Add manual sync button
4. Test cross-device sync

**Time Estimate:** 2-3 hours

---

## Testing Checklist

### Visual Options
- [ ] Blur slider updates preview in real-time
- [ ] Blur style dropdown changes preview effect
- [ ] Overlay color picker updates preview overlay
- [ ] Text color picker updates preview text
- [ ] Preview shows "Blocked" label
- [ ] Changes persist after save

### Blur Options Toggles
- [ ] All 7 toggles clickable
- [ ] Toggle animations work
- [ ] Toggles save to storage
- [ ] Toggles restore from storage
- [ ] Changes apply to content script
- [ ] Visual feedback on toggle

### Optional Analytics
- [ ] Toggle enables/disables telemetry
- [ ] Consent stored in storage
- [ ] Anonymous events sent when enabled
- [ ] No events sent when disabled
- [ ] Opt-out deletes all data
- [ ] Privacy policy updated

### UI Reorganization
- [ ] Popup simplified (no timer, no shortcuts)
- [ ] Timer in Advanced → Timing
- [ ] Shortcuts in new Shortcuts section
- [ ] All features still functional
- [ ] UI responsive and clean

### Google Account
- [ ] Sign in works
- [ ] Profile displays correctly
- [ ] Sign out works
- [ ] Sync triggers on change
- [ ] Sync status shows correctly
- [ ] Manual sync button works
- [ ] Conflicts resolve correctly

---

**Next Step:** Start with Phase 1, Issue 6 (Visual Options)
