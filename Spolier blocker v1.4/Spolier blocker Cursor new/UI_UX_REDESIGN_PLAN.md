# UI/UX Redesign & Google Account Implementation Plan

## Issues to Fix

### 1. Google Account Login ✅ (Partially Implemented)
- Already has basic Google sign-in framework in options.js
- Needs: Full integration with sync, proper error handling
- Status: Working but needs polish

### 2. Popup UI Reorganization
**Current Issues:**
- Auto-Reblur Timer in popup (should be in settings)
- Keyboard Shortcuts display in popup (should be in settings)
- Cluttered interface

**Required Changes:**
- Move timer to settings → Advanced → Timing section
- Move keyboard shortcut display to settings → new "Shortcuts" section
- Simplify popup to focus on: Toggle, Search, Quick actions

### 3. Settings UI Issues
**Visual Options Section (not working):**
- Blur strength slider exists but preview may not update
- Blur style dropdown exists
- Overlay colors exist
- Issue: Live preview not functioning correctly

**Permissions Section (labeled wrong):**
- Currently contains "Blur Options" which is confusing
- Should be reorganized

**Blur Options (not working):**
- Toggles exist but may not be saving/applying correctly
- Need to verify event listeners and save logic

### 4. Optional Analytics (not working)
- Toggle exists in Privacy section
- Missing: Actual telemetry implementation
- Need: Consent tracking, data collection (anonymous), opt-out mechanism

## Implementation Strategy

### Phase 1: Fix Existing Functionality (Priority 1)
1. Fix Visual Options preview
2. Fix Blur Options toggles
3. Implement Optional Analytics
4. Fix Google Account sync

### Phase 2: UI Reorganization (Priority 2)  
1. Redesign popup (remove timer, remove shortcuts display)
2. Add Shortcuts section to settings
3. Move timer controls to Advanced section
4. Polish permissions/blur options organization

### Phase 3: Complete Google Integration (Priority 3)
1. Account sync with cloud (use existing spec)
2. Sync status indicators
3. Manual sync button
4. Conflict resolution

### Phase 4: UX Polish (Priority 4)
1. Animations and transitions
2. Loading states
3. Error messages
4. Accessibility improvements

## File Changes Required

### Popup Changes
- `popup.html` - Remove timer, remove shortcuts, simplify
- `popup.js` - Remove timer handlers, keep core functionality
- Keep: Search, Toggle, Quick add keyword, Reveal/Hide buttons

### Options Changes
- `options.html` - Add Shortcuts section, reorganize permissions
- `options.js` - Fix toggle handlers, add telemetry, fix preview

### New/Modified Files
- `telemetry.js` - New file for anonymous analytics
- `sync-manager.js` - Cloud sync orchestration (from spec)
- `styles.css` - Update for new UI structure

## Next Steps
1. Start with Phase 1 (fixing existing features)
2. Test each fix individually
3. Move to Phase 2 (UI reorganization)
4. Complete Google sync integration
5. Polish and test

---
**Created:** June 16, 2026
**Status:** Planning Complete - Ready for implementation
