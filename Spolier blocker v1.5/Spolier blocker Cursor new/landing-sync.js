// ═══════════════════════════════════════════════════════════════
// LANDING PAGE SYNC - Content Script
// Injects extension ID into landing page for communication
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';
  
  // Only run on landing page
  if (!document.URL.includes('spoiler-shield-landing') &&
      !document.URL.includes('localhost') &&
      !document.URL.includes('127.0.0.1')) {
    return;
  }
  
  console.log('[Spoiler Shield] Landing page sync script loaded');
  
  // Inject extension ID into page
  window.postMessage({
    type: 'spoilerShieldExtensionId',
    extensionId: chrome.runtime.id
  }, '*');
  
  // Listen for messages from landing page
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) return;
    
    // Forward certain messages to background script
    if (event.data.type === 'getUserAccount' ||
        event.data.type === 'openOptions' ||
        event.data.type === 'signOut') {
      
      chrome.runtime.sendMessage(event.data, (response) => {
        // Send response back to page
        window.postMessage({
          type: event.data.type + 'Response',
          data: response
        }, '*');
      });
    }
  });
  
  // Listen for messages from background (user account updates)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'spoilerShieldExtensionId' ||
        message.type === 'userAccountUpdated') {
      // Forward to page
      window.postMessage(message, '*');
    }
  });
  
  console.log('[Spoiler Shield] Extension ID injected, sync active');
})();
