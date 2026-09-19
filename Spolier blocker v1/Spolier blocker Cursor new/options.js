// Common words to prevent users from accidentally blocking everyday words
// ~200+ most frequent English words that should not be added as spoiler keywords
const COMMON_WORD_WHITELIST = new Set([
  // Questions & relative pronouns
  'this', 'that', 'which', 'what', 'where', 'when', 'who', 'why', 'how', 'whom', 'whose',
  // Conjunctions
  'and', 'or', 'but', 'yet', 'nor', 'so', 'because', 'as', 'if', 'unless', 'until', 'while', 'since', 'although', 'though',
  // Prepositions
  'in', 'on', 'at', 'by', 'for', 'from', 'to', 'with', 'of', 'into', 'out', 'up', 'down', 'over', 'under', 'between', 'among',
  'before', 'after', 'during', 'through', 'within', 'without', 'across', 'along', 'around', 'behind', 'beside', 'beyond',
  'above', 'below', 'near', 'past', 'toward', 'against', 'about', 'except', 'including', 'among', 'throughout',
  // Articles & determiners
  'the', 'a', 'an', 'some', 'any', 'all', 'each', 'every', 'both', 'either', 'neither',
  // Verbs (be, have, do)
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing',
  // Modals
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'ought', 'need',
  // Common verbs
  'get', 'got', 'make', 'made', 'take', 'took', 'come', 'came', 'go', 'went', 'see', 'saw', 'know', 'knew',
  'think', 'thought', 'give', 'gave', 'find', 'found', 'tell', 'told', 'ask', 'asked', 'work', 'worked',
  'seem', 'seemed', 'help', 'helped', 'talk', 'talked', 'try', 'tried', 'leave', 'left', 'feel', 'felt',
  'show', 'showed', 'hear', 'heard', 'let', 'mean', 'meant', 'keep', 'kept', 'turn', 'turned', 'start', 'started',
  'love', 'loved', 'like', 'liked', 'use', 'used', 'meet', 'met', 'call', 'called', 'read', 'provide', 'provided',
  'say', 'said', 'put', 'bring', 'begin', 'seem', 'appear', 'become', 'continue', 'develop', 'force', 'produce',
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves',
  // Possessives
  'his', 'her', 'its', 'our', 'their', 'my', 'your', 'mine', 'yours', 'ours', 'theirs',
  // Adverbs & modifiers
  'very', 'just', 'only', 'even', 'also', 'more', 'most', 'less', 'least', 'longer',
  'quite', 'much', 'many', 'few', 'little', 'enough', 'too', 'such', 'rather', 'well',
  'here', 'there', 'now', 'then', 'today', 'tomorrow', 'yesterday', 'always', 'never', 'often',
  'usually', 'sometimes', 'ever', 'still', 'already', 'away', 'back', 'forward',
  // Adjectives
  'good', 'bad', 'big', 'small', 'large', 'little', 'high', 'low', 'long', 'short', 'new', 'old',
  'young', 'great', 'first', 'last', 'next', 'other', 'same', 'different', 'right', 'wrong',
  'true', 'false', 'happy', 'sad', 'angry', 'kind', 'strong', 'weak', 'fast', 'slow', 'hot', 'cold',
  'warm', 'cool', 'dark', 'light', 'bright', 'quiet', 'loud', 'full', 'empty', 'hard', 'soft',
  'public', 'private', 'male', 'female', 'human', 'natural', 'real',
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  // Common nouns (too generic)
  'thing', 'way', 'person', 'man', 'woman', 'child', 'people', 'life', 'world', 'day', 'time',
  'year', 'week', 'month', 'hour', 'minute', 'moment', 'place', 'group', 'family', 'friend',
  'house', 'room', 'door', 'hand', 'head', 'eye', 'face', 'body', 'heart', 'mind', 'soul',
  'reason', 'fact', 'case', 'point', 'example', 'type', 'kind', 'sort', 'form', 'part', 'piece',
  // Particles & others
  'yes', 'no', 'not', 'none', 'nothing', 'nobody', 'something', 'someone', 'somewhere', 'anywhere', 'nowhere',
  'else', 'almost', 'possibly', 'probably', 'certainly', 'absolutely', 'definitely', 'maybe'
]);

// Restore settings when the options page loads
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initGoogleSignIn();
  restore();
  initWatchedItems();
  initLivePreview();
});

// ===============================
// NAVIGATION
// ===============================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionName = item.dataset.section;
      
      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show corresponding section
      sections.forEach(section => section.classList.remove('active'));
      const targetSection = document.getElementById(`${sectionName}-section`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    });
  });
}

// ===============================
// GOOGLE SIGN-IN
// ===============================
function initGoogleSignIn() {
  const container = document.getElementById('google-signin-container');
  
  chrome.storage.sync.get(['userAccount'], (store) => {
    const userAccount = store.userAccount;
    
    if (userAccount && userAccount.email) {
      renderUserInfo(userAccount);
    } else {
      renderSignInButton();
    }
  });
}

function renderSignInButton() {
  const container = document.getElementById('google-signin-container');
  container.innerHTML = `
    <div class="google-signin">
      <div class="sidebar-logo" style="margin-bottom: 0;">
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>
      <button class="google-signin-btn" id="googleSignInBtn">
        <svg viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign In with Google
      </button>
      <div style="font-size: 12px; color: #98a2c8; text-align: center;">
        Sign in to sync your preferences across devices
      </div>
    </div>
  `;
  
  document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
}

function handleGoogleSignIn() {
  // Show loading state
  const container = document.getElementById('google-signin-container');
  const originalContent = container.innerHTML;
  container.innerHTML = '<div style="text-align: center; padding: 20px; color: #98a2c8;">Signing in...</div>';
  
  // Method 1: Try chrome.identity.getAuthToken (simplest, but limited scopes)
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      const error = chrome.runtime.lastError.message;
      console.error('getAuthToken error:', error);
      
      // If getAuthToken fails, try launchWebAuthFlow
      if (error.includes('OAuth2') || error.includes('not found')) {
        tryWebAuthFlow(container, originalContent);
      } else {
        showSignInError(container, originalContent, `Authentication failed: ${error}`);
      }
      return;
    }
    
    if (!token) {
      tryWebAuthFlow(container, originalContent);
      return;
    }
    
    // Try to fetch user info with the token
    fetchUserInfoWithToken(token, container, originalContent);
  });
}

function tryWebAuthFlow(container, originalContent) {
  // Method 2: Use launchWebAuthFlow for full OAuth control
  // This requires OAuth client ID, but we'll try a workaround first
  const redirectUrl = chrome.identity.getRedirectURL();
  
  // For testing: Use a public test client ID (replace with your own for production)
  // You can get one from: https://console.cloud.google.com/apis/credentials
  const clientId = '1077083917677-rmntmr1b2i7lq0e90kd0d8i2vkb8autc.apps.googleusercontent.com'; // Public test ID
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `response_type=token&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `scope=${encodeURIComponent('openid email profile')}`;
  
  chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  }, (responseUrl) => {
    if (chrome.runtime.lastError) {
      const error = chrome.runtime.lastError.message;
      console.error('Web auth flow error:', error);
      
      // If both methods fail, use local account fallback
      useLocalAccount(container, originalContent);
      return;
    }
    
    if (!responseUrl) {
      useLocalAccount(container, originalContent);
      return;
    }
    
    // Extract access token from response URL
    try {
      const url = new URL(responseUrl);
      const hash = url.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      
      if (token) {
        fetchUserInfoWithToken(token, container, originalContent);
      } else {
        useLocalAccount(container, originalContent);
      }
    } catch (e) {
      console.error('Error parsing response URL:', e);
      useLocalAccount(container, originalContent);
    }
  });
}

function fetchUserInfoWithToken(token, container, originalContent) {
  // Try to fetch user info from Google API
  fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error?.message || `HTTP ${response.status}`);
        });
      }
      return response.json();
    })
    .then(userInfo => {
      if (userInfo.error) {
        throw new Error(userInfo.error.message || userInfo.error);
      }
      
      if (!userInfo.email) {
        // Token doesn't have email scope - use local account
        useLocalAccount(container, originalContent, token);
        return;
      }
      
      const userAccount = {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture || null,
        token: token,
        id: userInfo.id || null
      };
      
      chrome.storage.sync.set({ userAccount }, () => {
        renderUserInfo(userAccount);
        loadUserPreferences(userAccount.email);
      });
    })
    .catch(error => {
      console.error('Error fetching user info:', error);
      // Fallback to local account if API call fails
      useLocalAccount(container, originalContent, token);
    });
}

function useLocalAccount(container, originalContent, token) {
  // Fallback: Create a local account that works without OAuth
  // This allows the extension to function even if Google OAuth isn't set up
  const timestamp = Date.now();
  const localAccount = {
    email: `user_${timestamp}@local`,
    name: 'Local User',
    picture: null,
    token: token || null,
    id: `local_${timestamp}`,
    isLocal: true
  };
  
  chrome.storage.sync.set({ userAccount: localAccount }, () => {
    renderUserInfo(localAccount);
    const status = document.getElementById('status');
    if (status) {
      status.textContent = 'Using local account. Preferences will be saved locally.';
      status.className = 'status';
      setTimeout(() => { status.textContent = ''; }, 5000);
    }
  });
}

function showSignInError(container, originalContent, message) {
  container.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="color: #f87171; margin-bottom: 12px; font-size: 14px;">${message}</div>
      <div style="color: #98a2c8; font-size: 12px; margin-bottom: 12px;">
        The extension will use a local account instead.
      </div>
      <button class="btn-primary" id="retrySignIn">Try Again</button>
      <button class="btn-secondary" id="useLocal" style="margin-left: 8px;">Use Local Account</button>
    </div>
  `;
  
  document.getElementById('retrySignIn').addEventListener('click', () => {
    renderSignInButton();
  });
  
  document.getElementById('useLocal').addEventListener('click', () => {
    useLocalAccount(container, originalContent);
  });
}

function renderUserInfo(userAccount) {
  const container = document.getElementById('google-signin-container');
  const initials = userAccount.name ? userAccount.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  
  container.innerHTML = `
    <div class="user-info">
      <div class="user-avatar">${initials}</div>
      <div class="user-details">
        <div class="user-name">${userAccount.name || userAccount.email}</div>
        <div class="user-email">${userAccount.email}</div>
      </div>
      <button class="sign-out-btn" id="signOutBtn">Sign Out</button>
    </div>
  `;
  
  document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
}

function handleSignOut() {
  chrome.storage.sync.get(['userAccount'], (store) => {
    const token = store.userAccount && store.userAccount.token;
    if (token) {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        completeSignOut();
      });
    } else {
      completeSignOut();
    }
  });
}

function completeSignOut() {
  chrome.storage.sync.remove(['userAccount'], () => {
    renderSignInButton();
    // Clear user-specific preferences
    chrome.storage.sync.get(null, (allData) => {
      const userData = Object.keys(allData).filter(key => 
        key.startsWith('user_') || key === 'watchedItems'
      );
      chrome.storage.sync.remove(userData);
    });
  });
}

// ===============================
// LOAD USER PREFERENCES
// ===============================
function loadUserPreferences(userEmail) {
  // Load user-specific preferences
  const userKey = `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  chrome.storage.sync.get([userKey], (store) => {
    if (store[userKey]) {
      // Apply user-specific settings
      const userPrefs = store[userKey];
      if (userPrefs.settings) {
        applySettings(userPrefs.settings);
      }
    }
  });
}

// ===============================
// WATCHED ITEMS
// ===============================
function initWatchedItems() {
  const mediaTabs = document.querySelectorAll('.media-tab');
  mediaTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mediaTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const type = tab.dataset.type;
      updateMediaTypeLabel(type);
      renderWatchedItems(type);
      renderWatchedKeywords(type);
    });
  });
  
  // Add keyword button handler
  document.getElementById('addWatchedKeyword').addEventListener('click', () => {
    const activeTab = document.querySelector('.media-tab.active');
    const type = activeTab ? activeTab.dataset.type : 'movie';
    addWatchedKeyword(type);
  });
  
  // Initial render
  updateMediaTypeLabel('movie');
  renderWatchedItems('movie');
  renderWatchedKeywords('movie');
}

function updateMediaTypeLabel(type) {
  const label = document.getElementById('currentMediaType');
  if (label) {
    const labels = { movie: 'Movies', tv: 'TV Shows', game: 'Games' };
    label.textContent = labels[type] || 'Movies';
  }
}

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
    
    const container = document.getElementById('watchedList');
    container.innerHTML = '';
    
    if (filtered.length === 0) {
      container.innerHTML = `<div style="color: #98a2c8; text-align: center; padding: 24px;">No ${type}s marked as watched</div>`;
      return;
    }
    
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'watched-item';
      const titleNode = document.createElement('div');
      titleNode.className = 'watched-item-title';
      titleNode.textContent = String(item.title || '');
      const metaNode = document.createElement('div');
      metaNode.className = 'watched-item-meta';
      metaNode.textContent = [item.year, item.director].filter(Boolean).join(' • ');
      const removeNode = document.createElement('button');
      removeNode.className = 'remove-watched';
      removeNode.textContent = 'Remove';
      div.replaceChildren(titleNode, metaNode, removeNode);
      
      div.querySelector('.remove-watched').addEventListener('click', () => {
        removeWatchedItem(item.id);
      });
      
      container.appendChild(div);
    });
  });
}

function renderWatchedKeywords(type) {
  chrome.storage.sync.get(['watchedKeywords', 'userAccount'], (store) => {
    const watchedKeywords = store.watchedKeywords || {};
    const userAccount = store.userAccount;
    const userEmail = userAccount ? userAccount.email : null;
    
    // Get keywords for this media type and user
    const key = userEmail ? `${type}_${userEmail}` : `${type}_local`;
    const keywords = watchedKeywords[key] || [];
    
    const container = document.getElementById('watchedKeywordList');
    container.innerHTML = '';
    
    if (keywords.length === 0) {
      container.innerHTML = '<div style="color: #98a2c8; font-size: 12px; padding: 8px;">No custom keywords added</div>';
      return;
    }
    
    keywords.forEach(keyword => {
      const pill = pillElement(keyword, () => {
        removeWatchedKeyword(type, keyword);
      });
      container.appendChild(pill);
    });
  });
}

function addWatchedKeyword(type) {
  const input = document.getElementById('watchedKeywordInput');
  const keyword = (input.value || '').trim();
  if (!keyword) return;

  // Check if it's a common word
  const lowerKeyword = keyword.toLowerCase();
  if (COMMON_WORD_WHITELIST.has(lowerKeyword)) {
    showStatus(`⚠️ "${keyword}" is a common word. Skipping to prevent false positives.`, false);
    input.value = '';
    return;
  }
  
  chrome.storage.sync.get(['watchedKeywords', 'userAccount'], (store) => {
    const watchedKeywords = store.watchedKeywords || {};
    const userAccount = store.userAccount;
    const userEmail = userAccount ? userAccount.email : null;
    const key = userEmail ? `${type}_${userEmail}` : `${type}_local`;
    
    const keywords = watchedKeywords[key] || [];
    if (keywords.includes(keyword)) {
      input.value = '';
      return; // Already exists
    }
    
    keywords.push(keyword);
    watchedKeywords[key] = keywords;
    
    // Also add to global custom keywords
    chrome.storage.sync.get(['customKeywords'], (store) => {
      const customKeywords = store.customKeywords || [];
      if (!customKeywords.includes(keyword)) {
        customKeywords.push(keyword);
        chrome.storage.sync.set({ customKeywords, watchedKeywords }, () => {
          input.value = '';
          renderWatchedKeywords(type);
        });
      } else {
        chrome.storage.sync.set({ watchedKeywords }, () => {
          input.value = '';
          renderWatchedKeywords(type);
        });
      }
    });
  });
}

function removeWatchedKeyword(type, keyword) {
  chrome.storage.sync.get(['watchedKeywords', 'userAccount'], (store) => {
    const watchedKeywords = store.watchedKeywords || {};
    const userAccount = store.userAccount;
    const userEmail = userAccount ? userAccount.email : null;
    const key = userEmail ? `${type}_${userEmail}` : `${type}_local`;
    
    const keywords = (watchedKeywords[key] || []).filter(k => k !== keyword);
    watchedKeywords[key] = keywords;
    
    chrome.storage.sync.set({ watchedKeywords }, () => {
      renderWatchedKeywords(type);
    });
  });
}

function removeWatchedItem(itemId) {
  chrome.storage.sync.get(['watchedItems'], (store) => {
    const watchedItems = (store.watchedItems || []).filter(item => item.id !== itemId);
    chrome.storage.sync.set({ watchedItems }, () => {
      const activeTab = document.querySelector('.media-tab.active');
      renderWatchedItems(activeTab.dataset.type);
    });
  });
}

// Add watched item (called from popup or elsewhere)
function addWatchedItem(title, type, year, director) {
  chrome.storage.sync.get(['watchedItems', 'userAccount'], (store) => {
    const watchedItems = store.watchedItems || [];
    const userAccount = store.userAccount;
    
    const newItem = {
      id: Date.now().toString(),
      title,
      type,
      year,
      director,
      userEmail: userAccount ? userAccount.email : null,
      timestamp: Date.now()
    };
    
    // Check if already exists
    const exists = watchedItems.some(item => 
      item.title === title && 
      item.type === type &&
      (userAccount ? item.userEmail === userAccount.email : !item.userEmail)
    );
    
    if (!exists) {
      watchedItems.push(newItem);
      chrome.storage.sync.set({ watchedItems }, () => {
        renderWatchedItems(type);
      });
    }
  });
}

// ===============================
// LIVE PREVIEW
// ===============================
function initLivePreview() {
  const slider = document.getElementById('blurRadius');
  const blurRadiusValue = document.getElementById('blurRadiusValue');
  const blurStyle = document.getElementById('blurStyle');
  const overlayColor = document.getElementById('overlayColor');
  const overlayTextColor = document.getElementById('overlayTextColor');
  const preview = document.getElementById('livePreview');
  
  console.log('[Options] Init live preview:', { slider, blurStyle, overlayColor, overlayTextColor, preview });
  
  if (!preview) {
    console.warn('[Options] Live preview element not found!');
    return;
  }
  
  function updatePreview() {
    const blurValue = slider ? parseInt(slider.value) || 6 : 6;
    const style = blurStyle ? blurStyle.value : 'gaussian';
    const overlayBg = overlayColor ? overlayColor.value : '#0b1020';
    const overlayText = overlayTextColor ? overlayTextColor.value : '#e7ecff';
    
    // Update value display
    if (blurRadiusValue) {
      blurRadiusValue.textContent = blurValue;
    }
    
    console.log('[Options] Updating preview:', { blurValue, style, overlayBg, overlayText });
    
    // Find the image inside preview
    const img = preview.querySelector('img');
    if (img) {
      // Apply blur to the image
      let filterCss = '';
      if (style === 'gaussian') {
        filterCss = `blur(${blurValue}px)`;
        img.style.opacity = '1';
      } else if (style === 'pixelate') {
        filterCss = `blur(${Math.max(1, Math.round(blurValue / 2))}px) contrast(1.2)`;
        img.style.opacity = '1';
      } else if (style === 'solid') {
        filterCss = 'none';
        img.style.opacity = '0.08';
      } else {
        filterCss = `blur(${blurValue}px)`;
        img.style.opacity = '1';
      }
      
      img.style.filter = filterCss;
    }
    
    // Update overlay if it exists, create if not
    let overlay = preview.querySelector('.preview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'preview-overlay';
      overlay.style.cssText = 'position:absolute; inset:auto 6px 6px auto; padding:4px 8px; border-radius:6px; pointer-events:none; opacity:.95; font:600 11px/1.2 system-ui; max-width:260px;';
      overlay.textContent = 'Potential Spoiler';
      preview.style.position = 'relative';
      preview.appendChild(overlay);
    }
    overlay.style.background = overlayBg;
    overlay.style.color = overlayText;
  }
  
  if (slider) {
    slider.addEventListener('input', updatePreview);
    console.log('[Options] Blur slider listener attached');
  }
  if (blurStyle) {
    blurStyle.addEventListener('change', updatePreview);
    console.log('[Options] Blur style listener attached');
  }
  if (overlayColor) {
    overlayColor.addEventListener('input', updatePreview);
    console.log('[Options] Overlay color listener attached');
  }
  if (overlayTextColor) {
    overlayTextColor.addEventListener('input', updatePreview);
    console.log('[Options] Text color listener attached');
  }
  
  // Set initial preview
  updatePreview();
  console.log('[Options] Initial preview update complete');
}

// ===============================
// RESTORE SETTINGS FROM STORAGE
// ===============================
function restore() {
  chrome.storage.sync.get({
    settings: {
      enabled: true,
      includeDomains: [],
      excludeDomains: [],
      blurRadiusPx: 6,
      blurImages: true,
      showOverlay: true,
      revealOnHover: true,
      revealOnClick: true,
      revealOnDblClick: true,
      matchWordBoundaries: true,
      reinforceLearning: false,
      aggressiveness: 2,
      overlayColor: '#0b1020',
      overlayTextColor: '#e7ecff',
      blurStyle: 'gaussian',
      reblurAfterMs: 0,
      rlThreshold: 0.3,
      wikipediaEnabled: true
    },
    selectedMedia: [],
    customKeywords: [],
    tmdbKey: '',
    tmdbProxy: '',
    wikipediaContact: ''
  }, store => {
    const s = store.settings || {};

    // Restore toggle switches
    setToggle('enabled-toggle', !!s.enabled);
    setToggle('blurImages-toggle', s.blurImages !== false);
    setToggle('showOverlay-toggle', s.showOverlay !== false);
    setToggle('revealHover-toggle', !!s.revealOnHover);
    setToggle('revealClick-toggle', !!s.revealOnClick);
    setToggle('revealDblClick-toggle', s.revealOnDblClick !== false);
    setToggle('wordBoundaries-toggle', !!s.matchWordBoundaries);
    setToggle('reinforce-toggle', !!s.reinforceLearning);

    // Restore values
    setValue('blurRadius', s.blurRadiusPx || 6);
    setValue('blurStyle', s.blurStyle || 'gaussian');
    setValue('overlayColor', s.overlayColor || '#0b1020');
    setValue('overlayTextColor', s.overlayTextColor || '#e7ecff');
    setValue('aggressiveness', s.aggressiveness == null ? 2 : s.aggressiveness);
    setValue('reblurAfterMs', s.reblurAfterMs == null ? 0 : s.reblurAfterMs);
    setValue('rlThreshold', s.rlThreshold == null ? 0.3 : s.rlThreshold);
    setToggle('wikipediaEnabled-toggle', s.wikipediaEnabled !== false);
    setValue('wikipediaContact', store.wikipediaContact || '');
    setValue('tmdbKey', store.tmdbKey || '');
    setValue('tmdbProxy', store.tmdbProxy || '');

    // Update aggressiveness display (only add listener once)
    const aggressivenessSlider = document.getElementById('aggressiveness');
    if (aggressivenessSlider && !aggressivenessSlider.dataset.listenerAdded) {
      aggressivenessSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('aggressivenessValue').textContent = value;
        updatePhrasePreview(parseInt(value));
      });
      aggressivenessSlider.dataset.listenerAdded = 'true';
    }
    document.getElementById('aggressivenessValue').textContent = s.aggressiveness == null ? 2 : s.aggressiveness;
    
    // Initial phrase preview
    updatePhrasePreview(s.aggressiveness == null ? 2 : s.aggressiveness);

    // Fill domain lists
    renderDomainList('includeList', s.includeDomains || [], 'include');
    renderDomainList('excludeList', s.excludeDomains || [], 'exclude');

    // Custom keywords
    renderKeywords(store.customKeywords || []);

    // Selected titles
    renderSelectedTitles(store.selectedMedia || []);

    // Diagnostics
    const tsEl = document.getElementById('diagTs');
    if (tsEl) {
      tsEl.textContent = store.diagTs || '–';
      document.getElementById('diagMatches').textContent = store.diagMatches == null ? 0 : store.diagMatches;
      document.getElementById('diagWhy').textContent = store.diagWhy || '–';
    }

    // TMDB inputs removed
  });
}

// ===============================
// SAVE SETTINGS TO STORAGE
// ===============================
document.getElementById('save').addEventListener('click', save);

function save() {
  chrome.storage.sync.get(['userAccount'], (store) => {
    const userAccount = store.userAccount;
    
  const settings = {
      enabled: getToggle('enabled-toggle'),
    includeDomains: getDomainList('includeList'),
    excludeDomains: getDomainList('excludeList'),
    blurRadiusPx: parseInt(getValue('blurRadius') || '6', 10),
      blurImages: getToggle('blurImages-toggle'),
      showOverlay: getToggle('showOverlay-toggle'),
      revealOnHover: getToggle('revealHover-toggle'),
      revealOnClick: getToggle('revealClick-toggle'),
      revealOnDblClick: getToggle('revealDblClick-toggle'),
      matchWordBoundaries: getToggle('wordBoundaries-toggle'),
      reinforceLearning: getToggle('reinforce-toggle'),
    aggressiveness: parseInt(getValue('aggressiveness') || '2', 10),
    blurStyle: getValue('blurStyle') || 'gaussian',
    overlayColor: getValue('overlayColor') || '#0b1020',
    overlayTextColor: getValue('overlayTextColor') || '#e7ecff',
    reblurAfterMs: parseInt(getValue('reblurAfterMs') || '0', 10) || 0,
    rlThreshold: Math.max(0, Math.min(1, parseFloat(getValue('rlThreshold') || '0.3'))),
    wikipediaEnabled: getToggle('wikipediaEnabled-toggle')
  };

  const customKeywords = getKeywords();
  const tmdbKey = getValue('tmdbKey') || '';
  const tmdbProxy = getValue('tmdbProxy') || '';
  const wikipediaContact = getValue('wikipediaContact') || '';

    // Save to sync storage
    chrome.storage.sync.set({ settings, customKeywords, tmdbKey, tmdbProxy, wikipediaContact }, () => {
      // If user is signed in, also save to user-specific storage
      if (userAccount && userAccount.email) {
        const userKey = `user_${userAccount.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        chrome.storage.sync.set({
          [userKey]: {
            settings,
            customKeywords,
            lastSync: Date.now()
          }
        });
      }
      
      const status = document.getElementById('status');
      status.textContent = 'Saved';
      status.className = 'status';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    });
  });
}


// ===============================
// DOMAIN MANAGEMENT
// ===============================
document.getElementById('addInclude').addEventListener('click', () => addDomain('include'));
document.getElementById('addExclude').addEventListener('click', () => addDomain('exclude'));

function addDomain(kind) {
  const inputId = kind === 'include' ? 'includeDomainInput' : 'excludeDomainInput';
  const listId = kind === 'include' ? 'includeList' : 'excludeList';

  const val = (document.getElementById(inputId).value || '').trim();
  if (!val) return;

  const host = normalizeDomain(val);
  if (!host) return;

  const list = document.getElementById(listId);
  const exists = Array.from(list.querySelectorAll('.pill')).some(el => el.dataset.value === host);
  if (exists) return;

  const pill = pillElement(host, () => { pill.remove(); });
  list.appendChild(pill);
  document.getElementById(inputId).value = '';
}

function renderDomainList(containerId, arr) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';

  (arr || []).forEach(d => {
    const pill = pillElement(d, () => { pill.remove(); });
    el.appendChild(pill);
  });
}

function getDomainList(containerId) {
  return Array.from(document.getElementById(containerId).querySelectorAll('.pill'))
    .map(el => el.dataset.value);
}

function normalizeDomain(input) {
  let s = input.toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/\/$/, '');

  try {
    return new URL('https://' + s).host;
  } catch {
    return '';
  }
}

function pillElement(value, onRemove) {
  const span = document.createElement('span');
  span.className = 'pill';
  span.dataset.value = value;
  span.textContent = value + ' ';

  const x = document.createElement('button');
  x.textContent = '×';
  x.addEventListener('click', onRemove);

  span.appendChild(x);
  return span;
}

// ===============================
// KEYWORDS MANAGEMENT
// ===============================
document.getElementById('addKeyword').addEventListener('click', addKeyword);

function renderKeywords(arr) {
  const list = document.getElementById('keywordList');
  list.innerHTML = '';

  (arr || []).forEach(k => {
    const pill = pillElement(k, () => { pill.remove(); });
    list.appendChild(pill);
  });
}

function addKeyword() {
  const input = document.getElementById('keywordInput');
  const val = (input.value || '').trim();
  if (!val) return;

  // Check if it's a common word
  const lowerVal = val.toLowerCase();
  if (COMMON_WORD_WHITELIST.has(lowerVal)) {
    showStatus(`⚠️ "${val}" is a common word. This may blur unrelated content. Use false positives to exclude it instead.`, false);
    return; // Don't add common words
  }

  const list = document.getElementById('keywordList');
  const exists = Array.from(list.querySelectorAll('.pill'))
    .some(el => el.dataset.value.toLowerCase() === val.toLowerCase());
  if (exists) {
    showStatus(`"${val}" already added.`, false);
    return;
  }

  const pill = pillElement(val, () => { pill.remove(); });
  list.appendChild(pill);
  input.value = '';
  showStatus(`Added "${val}"`, true);
}

function getKeywords() {
  return Array.from(document.getElementById('keywordList').querySelectorAll('.pill'))
    .map(el => el.dataset.value);
}

// ===============================
// SELECTED TITLES
// ===============================
function renderSelectedTitles(items) {
  const container = document.getElementById('selectedTitles');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<div style="color: #98a2c8; padding: 12px;">No titles selected</div>';
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'watched-item';
    const titleNode = document.createElement('div');
      titleNode.className = 'watched-item-title';
      titleNode.textContent = String(item.title || '');
      const metaNode = document.createElement('div');
      metaNode.className = 'watched-item-meta';
      metaNode.textContent = [item.year, item.director].filter(Boolean).join(' • ');
      const removeNode = document.createElement('button');
      removeNode.className = 'remove-watched';
      removeNode.textContent = 'Remove';
      div.replaceChildren(titleNode, metaNode, removeNode);
    
    div.querySelector('.remove-watched').addEventListener('click', () => {
      chrome.storage.sync.get({ selectedMedia: [] }, store => {
        const next = (store.selectedMedia || []).filter(s => s.title !== item.title);
        chrome.storage.sync.set({ selectedMedia: next }, () => {
          renderSelectedTitles(next);
        });
      });
    });
    
    container.appendChild(div);
  });
}

// ===============================
// EXPORT/IMPORT
// ===============================
document.getElementById('exportBtn').addEventListener('click', exportSettings);
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', importSettings);

function exportSettings() {
  chrome.storage.sync.get(null, data => {
    const blob = new Blob([JSON.stringify(sanitizeLegacyBackup(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spoiler-shield-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importSettings() {
  const input = document.getElementById('importFile');
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (file.size > 1000000) { alert('Backup exceeds 1 MB.'); return; }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = sanitizeLegacyBackup(JSON.parse(String(reader.result || '{}')));
      chrome.storage.sync.set(data, () => {
        const status = document.getElementById('status');
        status.textContent = 'Imported';
        status.className = 'status';
        setTimeout(() => {
          status.textContent = '';
          restore();
        }, 2000);
      });
    } catch (e) {
      const status = document.getElementById('status');
      status.textContent = 'Import failed';
      status.className = 'status error';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  };
  reader.readAsText(file);
}

// ===============================
// TOGGLE SWITCHES
// ===============================
function initToggles() {
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
    });
  });
}

function setToggle(id, value) {
  const toggle = document.getElementById(id);
  if (toggle) {
    if (value) {
      toggle.classList.add('active');
      toggle.setAttribute('aria-checked', 'true');
      toggle.setAttribute('aria-pressed', 'true');
    } else {
      toggle.classList.remove('active');
      toggle.setAttribute('aria-checked', 'false');
      toggle.setAttribute('aria-pressed', 'false');
    }
  }
}

function getToggle(id) {
  const toggle = document.getElementById(id);
  return toggle ? toggle.classList.contains('active') : false;
}

// Initialize toggles
document.addEventListener('DOMContentLoaded', () => {
  initToggles();
  
  // Add click and keyboard handlers for toggles
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const isActive = this.classList.contains('active');
      this.setAttribute('aria-checked', isActive ? 'true' : 'false');
      this.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    
    // Add keyboard support for toggle switches (Space and Enter keys)
    toggle.addEventListener('keydown', function(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.click();
      }
    });
  });
});

// ===============================
// HELPER FUNCTIONS
// ===============================

// ===============================
// TELEMETRY HANDLERS
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  // Load telemetry setting
  chrome.storage.local.get(['telemetryEnabled'], (data) => {
    if (data.telemetryEnabled) {
      const toggle = document.getElementById('telemetry-toggle');
      const status = document.getElementById('telemetry-status');
      if (toggle) toggle.classList.add('active');
      if (toggle) toggle.setAttribute('aria-checked', 'true');
      if (status) status.style.display = 'block';
    }
  });

  // Telemetry toggle handler
  const telemetryToggle = document.getElementById('telemetry-toggle');
  if (telemetryToggle) {
    telemetryToggle.addEventListener('click', async () => {
      const isEnabled = telemetryToggle.classList.contains('active');
      
      try {
        if (isEnabled) {
          // Disable telemetry
          await chrome.storage.local.set({ telemetryEnabled: false });
          telemetryToggle.classList.remove('active');
          telemetryToggle.setAttribute('aria-checked', 'false');
          document.getElementById('telemetry-status').style.display = 'none';
          showStatus('Analytics disabled', false);
        } else {
          // Enable telemetry
          await chrome.storage.local.set({ telemetryEnabled: true });
          telemetryToggle.classList.add('active');
          telemetryToggle.setAttribute('aria-checked', 'true');
          document.getElementById('telemetry-status').style.display = 'block';
          showStatus('Analytics enabled', true);
        }
      } catch (e) {
        console.error('Failed to update telemetry setting:', e);
        showStatus('Error updating analytics setting', false);
      }
    });

    // Keyboard support for toggle
    telemetryToggle.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        telemetryToggle.click();
      }
    });
  }

  // Clear data handler
  const clearDataBtn = document.getElementById('clear-data-btn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        try {
          await chrome.storage.sync.clear();
          await chrome.storage.local.clear();
          showStatus('All data cleared. Reloading...', true);
          setTimeout(() => location.reload(), 1000);
        } catch (e) {
          console.error('Failed to clear data:', e);
          showStatus('Error clearing data', false);
        }
      }
    });
  }
});

function setValue(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v;
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// Status message handler
function showStatus(message, isSuccess = true) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = isSuccess ? 'status' : 'status error';
    statusEl.style.display = 'block';
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

// TMDB helpers removed
// Make addWatchedItem available globally for popup.js
window.addWatchedItem = addWatchedItem;


// ===============================
// MEDIUM #10: Settings Export / Import
// ===============================

// Export all settings to JSON file
function exportSettings() {
  chrome.storage.sync.get(null, (data) => {
    const exportData = {
      version: '1.2.0',
      exportDate: new Date().toISOString(),
      settings: data.settings || {},
      selectedMedia: data.selectedMedia || [],
      customKeywords: data.customKeywords || [],
      watchedItems: data.watchedItems || [],
      falsePositives: data.falsePositives || [],
      rlWeights: data.rlWeights || {},
      watchedKeywords: data.watchedKeywords || {}
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spoiler-shield-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('✅ Settings exported successfully!', false);
  });
}

// Import settings from JSON file
function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  if (file.size > 1000000) { alert('Backup exceeds 1 MB.'); return; }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result);
        
        // Validate version compatibility
        if (!importData.version) {
          showStatus('❌ Invalid backup file format', true);
          return;
        }
        
        // Confirm import
        const confirm = window.confirm(
          `Import settings from backup dated ${new Date(importData.exportDate).toLocaleDateString()}?\n\n` +
          `This will replace your current settings.`
        );
        
        if (!confirm) return;
        
        // Import data (excluding version and exportDate)
        const dataToImport = {
          settings: importData.settings || {},
          selectedMedia: importData.selectedMedia || [],
          customKeywords: importData.customKeywords || [],
          watchedItems: importData.watchedItems || [],
          falsePositives: importData.falsePositives || [],
          rlWeights: importData.rlWeights || {},
          watchedKeywords: importData.watchedKeywords || {}
        };
        
        chrome.storage.sync.set(sanitizeLegacyBackup(dataToImport), () => {
          showStatus('✅ Settings imported successfully! Refreshing...', false);
          setTimeout(() => {
            location.reload();
          }, 1500);
        });
        
      } catch (error) {
        console.error('Import error:', error);
        showStatus('❌ Failed to import: Invalid file format', true);
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Add export/import buttons if they exist in HTML
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportSettings');
  const importBtn = document.getElementById('importSettings');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSettings);
  }
  
  if (importBtn) {
    importBtn.addEventListener('click', importSettings);
  }
});

// ===============================
// PHRASE EXPANSION PREVIEW
// ===============================
function updatePhrasePreview(level) {
  const previewContent = document.getElementById('phrasePreviewContent');
  if (!previewContent) return;
  
  // Example data based on what would be blocked for "Breaking Bad"
  const examples = {
    0: {
      description: 'Level 0: <strong>Minimal</strong> - Only the exact title and a few alternate titles',
      items: [
        '✓ Breaking Bad (title)',
        '✓ Metástasis (alternate title)',
        '✓ Во все тяжкие (alternate title)'
      ]
    },
    1: {
      description: 'Level 1: <strong>Light</strong> - Title, alternate titles, and major keywords',
      items: [
        '✓ Breaking Bad (title)',
        '✓ Metástasis, Во все тяжкие (5 alternate titles)',
        '✓ drug dealer, methamphetamine, cancer diagnosis (6 keywords)',
      ]
    },
    2: {
      description: 'Level 2: <strong>Balanced</strong> - Titles, keywords, and main cast/characters',
      items: [
        '✓ Breaking Bad (title)',
        '✓ 20+ alternate titles',
        '✓ 20+ keywords (DEA, New Mexico, chemistry teacher, etc.)',
        '✓ 6 main cast: Bryan Cranston, Aaron Paul, Anna Gunn...',
        '✓ 6 characters: Walter White, Jesse Pinkman, Skyler White...'
      ]
    },
    3: {
      description: 'Level 3: <strong>Aggressive</strong> - Everything: all titles, keywords, cast & characters',
      items: [
        '✓ Breaking Bad (title)',
        '✓ 20+ alternate titles in all languages',
        '✓ 20+ keywords and related terms',
        '✓ 14 cast members: all main and supporting actors',
        '✓ 14 character names including minor roles',
        '⚠️ Warning: May cause false positives with common names'
      ]
    }
  };
  
  const example = examples[level] || examples[2];
  
  previewContent.innerHTML = `
    <div style="margin-bottom: 8px; color: #7c8cff;">${example.description}</div>
    ${example.items.map(item => `<div style="padding: 2px 0;">${item}</div>`).join('')}
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); color: #8190c5; font-size: 11px;">
      💡 Higher levels provide better protection but may over-block. Start with level 2 (balanced).
    </div>
  `;
}


// ===============================
// STORAGE USAGE MONITORING
// ===============================
async function updateStorageUsage() {
  try {
    // Get bytes in use from sync storage
    const bytesInUse = await new Promise((resolve) => {
      chrome.storage.sync.getBytesInUse(null, resolve);
    });
    
    const maxBytes = 102400; // 100 KB Chrome sync limit
    const usedKB = (bytesInUse / 1024).toFixed(2);
    const maxKB = (maxBytes / 1024).toFixed(0);
    const percent = Math.round((bytesInUse / maxBytes) * 100);
    
    // Update UI
    const textEl = document.getElementById('storage-usage-text');
    const percentEl = document.getElementById('storage-usage-percent');
    const barEl = document.getElementById('storage-usage-bar');
    const warningEl = document.getElementById('storage-warning');
    const warningTextEl = document.getElementById('storage-warning-text');
    
    if (!textEl || !percentEl || !barEl) return;
    
    textEl.textContent = `${usedKB} KB / ${maxKB} KB used`;
    percentEl.textContent = `${percent}%`;
    barEl.style.width = `${percent}%`;
    
    // Color coding
    if (percent >= 95) {
      barEl.style.background = 'linear-gradient(90deg, #dc2626, #b91c1c)'; // Red
      percentEl.style.color = '#f87171';
      warningEl.style.display = 'block';
      warningTextEl.textContent = 'Storage critically full! Remove titles or clear data to continue.';
    } else if (percent >= 80) {
      barEl.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)'; // Orange
      percentEl.style.color = '#fbbf24';
      warningEl.style.display = 'block';
      warningTextEl.textContent = 'Storage is filling up. Consider removing old titles you\'ve finished watching.';
    } else if (percent >= 60) {
      barEl.style.background = 'linear-gradient(90deg, #eab308, #ca8a04)'; // Yellow
      percentEl.style.color = '#facc15';
      warningEl.style.display = 'none';
    } else {
      barEl.style.background = 'linear-gradient(90deg, #7c8cff, #667eea)'; // Blue (healthy)
      percentEl.style.color = '#7c8cff';
      warningEl.style.display = 'none';
    }
    
    // Log for debugging
    console.log(`[Storage] ${bytesInUse} bytes (${percent}%) of ${maxBytes} bytes used`);
    
  } catch (e) {
    console.error('[Storage] Failed to get storage usage:', e);
    const textEl = document.getElementById('storage-usage-text');
    if (textEl) textEl.textContent = 'Unable to calculate storage usage';
  }
}

// Update storage usage on page load and after saves
document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  setTimeout(updateStorageUsage, 500);
  
  // Update after save
  const originalSave = window.save;
  if (typeof originalSave === 'function') {
    window.save = function() {
      originalSave.apply(this, arguments);
      setTimeout(updateStorageUsage, 300);
    };
  }
});

// Listen for storage changes from other tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    updateStorageUsage();
  }
});


// ===============================
// PHASE 2: INDEXEDDB MIGRATION
// ===============================

// Auto-trigger migration on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if migration is needed
    const migrated = await getMetadata('migrationComplete').catch(() => null);
    
    if (!migrated) {
      console.log('[Options] Triggering IndexedDB migration...');
      const result = await migrateFromSyncStorage();
      
      if (result.success) {
        console.log('[Options] Migration successful:', result);
        // Update storage usage display
        setTimeout(updateStorageUsage, 500);
        
        // Show success message
        const status = document.getElementById('status');
        if (status && result.freedSpace) {
          status.textContent = '✓ Storage optimized! Freed up sync storage space.';
          status.className = 'status';
          setTimeout(() => { status.textContent = ''; }, 5000);
        }
      } else {
        console.error('[Options] Migration failed:', result.error);
      }
    }
  } catch (e) {
    console.error('[Options] Migration check failed:', e);
  }
});
// ===============================
// Additional Options.js functionality
// Add this to the end of options.js
// ===============================

// ===============================
// TELEMETRY / ANALYTICS TOGGLE
// ===============================
function initTelemetry() {
  const toggle = document.getElementById('telemetry-toggle');
  const statusDiv = document.getElementById('telemetry-status');
  
  if (!toggle) return;
  
  // Load current state
  chrome.storage.sync.get(['settings'], (store) => {
    const enabled = store.settings && store.settings.telemetryEnabled === true;
    setToggle('telemetry-toggle', enabled);
    
    // Show/hide status
    if (statusDiv) {
      statusDiv.style.display = enabled ? 'block' : 'none';
    }
  });
  
  // Listen for toggle changes
  toggle.addEventListener('click', () => {
    const newState = !toggle.classList.contains('active');
    
    chrome.storage.sync.get(['settings'], (store) => {
      const settings = store.settings || {};
      settings.telemetryEnabled = newState;
      
      chrome.storage.sync.set({ settings }, () => {
        setToggle('telemetry-toggle', newState);
        if (statusDiv) {
          statusDiv.style.display = newState ? 'block' : 'none';
        }
        
        showStatus(
          newState 
            ? '✅ Anonymous analytics enabled' 
            : '✅ Analytics disabled',
          false
        );
      });
    });
  });
}

// ===============================
// KEYBOARD SHORTCUTS
// ===============================
function initKeyboardShortcuts() {
  const openShortcutsBtn = document.getElementById('openShortcuts');
  
  if (openShortcutsBtn) {
    openShortcutsBtn.addEventListener('click', () => {
      // Open Chrome's keyboard shortcuts page
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }
}

// ===============================
// CLEAR DATA BUTTON
// ===============================
function initClearDataButton() {
  const clearBtn = document.getElementById('clear-data-btn');
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmed = confirm(
        '⚠️ WARNING: This will delete ALL your data including:\n\n' +
        '• All settings and preferences\n' +
        '• Blocked titles and keywords\n' +
        '• Watched items\n' +
        '• Learning data\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Are you sure you want to continue?'
      );
      
      if (confirmed) {
        // Clear sync storage
        chrome.storage.sync.clear(() => {
          // Clear local storage
          chrome.storage.local.clear(() => {
            showStatus('✅ All data cleared! Reloading...', false);
            setTimeout(() => {
              location.reload();
            }, 1500);
          });
        });
      }
    });
  }
}

// ===============================
// TOGGLE SWITCH HELPERS (if not already defined)
// ===============================
function setToggle(id, isActive) {
  const toggle = document.getElementById(id);
  if (!toggle) return;
  
  if (isActive) {
    toggle.classList.add('active');
    toggle.setAttribute('aria-checked', 'true');
  } else {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-checked', 'false');
  }
}

function getToggle(id) {
  const toggle = document.getElementById(id);
  if (!toggle) return false;
  return toggle.classList.contains('active');
}

// Initialize toggle click handlers
function initToggleSwitches() {
  const toggles = document.querySelectorAll('.toggle-switch');
  
  toggles.forEach(toggle => {
    // Skip if already has listener
    if (toggle.dataset.listenerAttached) return;
    toggle.dataset.listenerAttached = 'true';
    
    toggle.addEventListener('click', () => {
      const isActive = toggle.classList.contains('active');
      setToggle(toggle.id, !isActive);
    });
  });
}

// ===============================
// VALUE HELPERS (if not already defined)
// ===============================
function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  
  if (el.type === 'checkbox') {
    el.checked = !!value;
  } else {
    el.value = value;
  }
}

function getValue(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  
  if (el.type === 'checkbox') {
    return el.checked;
  }
  return el.value;
}

// ===============================
// DOMAIN LIST HELPERS (if not already defined)
// ===============================
function getDomainList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  
  const pills = container.querySelectorAll('.pill');
  return Array.from(pills).map(pill => pill.textContent.replace('×', '').trim());
}

function renderDomainList(containerId, domains, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  domains.forEach(domain => {
    const pill = pillElement(domain, () => {
      removeDomain(type, domain);
    });
    container.appendChild(pill);
  });
}

function removeDomain(type, domain) {
  chrome.storage.sync.get(['settings'], (store) => {
    const settings = store.settings || {};
    
    if (type === 'include') {
      settings.includeDomains = (settings.includeDomains || []).filter(d => d !== domain);
    } else {
      settings.excludeDomains = (settings.excludeDomains || []).filter(d => d !== domain);
    }
    
    chrome.storage.sync.set({ settings }, () => {
      restore();
    });
  });
}

// Add domain buttons
document.addEventListener('DOMContentLoaded', () => {
  const addIncludeBtn = document.getElementById('addInclude');
  const addExcludeBtn = document.getElementById('addExclude');
  
  if (addIncludeBtn) {
    addIncludeBtn.addEventListener('click', () => {
      const input = document.getElementById('includeDomainInput');
      const domain = (input.value || '').trim();
      if (!domain) return;
      
      chrome.storage.sync.get(['settings'], (store) => {
        const settings = store.settings || {};
        settings.includeDomains = settings.includeDomains || [];
        if (!settings.includeDomains.includes(domain)) {
          settings.includeDomains.push(domain);
          chrome.storage.sync.set({ settings }, () => {
            input.value = '';
            restore();
          });
        }
      });
    });
  }
  
  if (addExcludeBtn) {
    addExcludeBtn.addEventListener('click', () => {
      const input = document.getElementById('excludeDomainInput');
      const domain = (input.value || '').trim();
      if (!domain) return;
      
      chrome.storage.sync.get(['settings'], (store) => {
        const settings = store.settings || {};
        settings.excludeDomains = settings.excludeDomains || [];
        if (!settings.excludeDomains.includes(domain)) {
          settings.excludeDomains.push(domain);
          chrome.storage.sync.set({ settings }, () => {
            input.value = '';
            restore();
          });
        }
      });
    });
  }
});

// ===============================
// KEYWORD HELPERS (if not already defined)
// ===============================
function getKeywords() {
  const container = document.getElementById('keywordList');
  if (!container) return [];
  
  const pills = container.querySelectorAll('.pill');
  return Array.from(pills).map(pill => pill.textContent.replace('×', '').trim());
}

function renderKeywords(keywords) {
  const container = document.getElementById('keywordList');
  if (!container) return;
  
  container.innerHTML = '';
  
  keywords.forEach(keyword => {
    const pill = pillElement(keyword, () => {
      removeKeyword(keyword);
    });
    container.appendChild(pill);
  });
}

function removeKeyword(keyword) {
  chrome.storage.sync.get(['customKeywords'], (store) => {
    const customKeywords = (store.customKeywords || []).filter(k => k !== keyword);
    chrome.storage.sync.set({ customKeywords }, () => {
      restore();
    });
  });
}

// Add keyword button
document.addEventListener('DOMContentLoaded', () => {
  const addKeywordBtn = document.getElementById('addKeyword');
  
  if (addKeywordBtn) {
    addKeywordBtn.addEventListener('click', () => {
      const input = document.getElementById('keywordInput');
      const keyword = (input.value || '').trim();
      if (!keyword) return;
      
      chrome.storage.sync.get(['customKeywords'], (store) => {
        const customKeywords = store.customKeywords || [];
        if (!customKeywords.includes(keyword)) {
          customKeywords.push(keyword);
          chrome.storage.sync.set({ customKeywords }, () => {
            input.value = '';
            restore();
          });
        }
      });
    });
  }
});

// ===============================
// SELECTED TITLES HELPERS (if not already defined)
// ===============================
function renderSelectedTitles(selectedMedia) {
  const container = document.getElementById('selectedTitles');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!selectedMedia || selectedMedia.length === 0) {
    container.innerHTML = '<div style="color: #98a2c8; padding: 12px; text-align: center;">No titles selected</div>';
    return;
  }
  
  selectedMedia.forEach(item => {
    const pill = pillElement(item.title, () => {
      removeSelectedTitle(item.title);
    });
    container.appendChild(pill);
  });
}

function removeSelectedTitle(title) {
  chrome.storage.sync.get(['selectedMedia'], (store) => {
    const selectedMedia = (store.selectedMedia || []).filter(m => m.title !== title);
    chrome.storage.sync.set({ selectedMedia }, () => {
      restore();
    });
  });
}

// ===============================
// PILL ELEMENT HELPER (if not already defined)
// ===============================
function pillElement(text, onRemove) {
  const pill = document.createElement('span');
  pill.className = 'pill';
  pill.textContent = text;
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.style.cssText = 'background: none; border: none; color: #f87171; cursor: pointer; margin-left: 6px; padding: 0; font-size: 14px; font-weight: bold;';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove();
  });
  
  pill.appendChild(removeBtn);
  return pill;
}

// ===============================
// STATUS HELPER (if not already defined)
// ===============================
function showStatus(message, isError = false) {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = isError ? 'status error' : 'status';
  statusEl.style.display = 'inline-block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// ===============================
// INITIALIZE ALL
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  initToggleSwitches();
  initTelemetry();
  initKeyboardShortcuts();
  initClearDataButton();
  updateStorageUsage();
});

console.log('[Options] Additional functionality loaded');


// ===============================
// LOGO CLICK - Open Landing Page
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const optionsLogoLink = document.getElementById('optionsLogoLink');
  if (optionsLogoLink) {
    optionsLogoLink.addEventListener('click', () => {
      // Landing page URL - Update with your actual URL
      const landingPageUrl = chrome.runtime.getURL('spoiler-shield-landing.html') || 
                            'https://yourdomain.com/spoiler-shield-landing.html';
      
      // Open landing page in new tab
      chrome.tabs.create({ 
        url: landingPageUrl 
      });
    });
  }
});

console.log('[Options] Landing page link initialized');

// Compatibility hardening only. New releases are built from /extension.
function sanitizeLegacyBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid backup');
  const raw = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const settings = {};
  for (const key of ['enabled','blurImages','showOverlay','revealOnHover','revealOnClick','revealOnDblClick','matchWordBoundaries','reinforceLearning']) {
    if (typeof raw[key] === 'boolean') settings[key] = raw[key];
  }
  for (const [key,min,max] of [['blurRadiusPx',1,40],['reblurAfterMs',0,300000],['aggressiveness',0,3],['rlThreshold',0,1],['spoilerThreshold',0,1]]) {
    if (Number.isFinite(raw[key])) settings[key] = Math.max(min,Math.min(max,raw[key]));
  }
  for (const key of ['overlayColor','overlayTextColor']) if (typeof raw[key] === 'string' && /^#[0-9a-f]{6}$/i.test(raw[key])) settings[key] = raw[key];
  if (['gaussian','pixelate','redact'].includes(raw.blurStyle)) settings.blurStyle = raw.blurStyle;
  const strings = (value, limit=1000) => Array.isArray(value) ? value.filter(v => typeof v === 'string').map(v => v.slice(0,160)).slice(0,limit) : [];
  for (const key of ['includeDomains','excludeDomains']) settings[key] = strings(raw[key],200).filter(v => /^[a-z0-9.-]+$/i.test(v));
  settings.perSite = {};
  if (raw.perSite && typeof raw.perSite === 'object') for (const [key,value] of Object.entries(raw.perSite).slice(0,200)) {
    if (/^[a-z0-9.-]+$/i.test(key) && !['__proto__','constructor','prototype'].includes(key) && typeof value === 'boolean') settings.perSite[key] = value;
  }
  const selectedMedia = (Array.isArray(data.selectedMedia) ? data.selectedMedia : []).filter(x => x && typeof x.title === 'string').slice(0,200).map(x => ({title:x.title.slice(0,160),type:['movie','tv','game','anime','sports','awards'].includes(x.type)?x.type:'movie',phrases:strings(x.phrases,120),...(Number.isSafeInteger(x.tmdbId)?{tmdbId:x.tmdbId}:{})}));
  return {settings,selectedMedia,customKeywords:strings(data.customKeywords),falsePositives:strings(data.falsePositives)};
}
