/**
 * i18n.js - Internationalization utilities for Spoiler Shield
 * Provides localization support for UI text across multiple languages
 */

/**
 * Translate a message key to the user's browser language
 * Falls back to English if language is not supported
 * @param {string} messageKey - The message key from _locales/{lang}/messages.json
 * @param {array} substitutions - Optional array of substitution strings
 * @returns {string} The translated message
 */
function i18n(messageKey, substitutions = []) {
  try {
    const message = chrome.i18n.getMessage(messageKey, substitutions);
    return message || messageKey; // Fallback to key if translation not found
  } catch (e) {
    console.warn('i18n: Translation key not found:', messageKey);
    return messageKey;
  }
}

/**
 * Get the current UI language
 * @returns {string} The language code (e.g., 'en', 'es', 'ja')
 */
function getLanguage() {
  return chrome.i18n.getUILanguage()?.split('-')?.[0] || 'en';
}

/**
 * Localize all elements with data-i18n attribute
 * Usage in HTML: <button data-i18n="addButton">Add</button>
 * The button text will be replaced with the translated message
 */
function localizeDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = i18n(key);
    
    // Check if this is a form element or has children
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      if (el.hasAttribute('placeholder')) {
        el.placeholder = translated;
      } else if (el.hasAttribute('title')) {
        el.title = translated;
      } else {
        el.value = translated;
      }
    } else if (el.tagName === 'LABEL' || el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'BUTTON' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
      // Only replace text for label/span/div/button/heading elements
      el.textContent = translated;
    }
  });
}

/**
 * Localize ARIA labels and other attributes
 * Usage in HTML: <button aria-label="openSettings" data-i18n-aria="openSettings">⚙️</button>
 */
function localizeARIA() {
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    const translated = i18n(key);
    el.setAttribute('aria-label', translated);
  });
}

/**
 * Get all available languages supported by the extension
 * @returns {array} Array of language codes
 */
function getSupportedLanguages() {
  return ['en', 'es', 'ja']; // Add more as translations are added
}

/**
 * Initialize i18n on page load
 * Call this in a DOMContentLoaded event listener
 */
function initializeI18n() {
  localizeDOM();
  localizeARIA();
  document.documentElement.lang = getLanguage();
}

/**
 * Update document language attribute
 * Useful if user changes language preference
 */
function setDocumentLanguage(langCode) {
  document.documentElement.lang = langCode;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18n, getLanguage, localizeDOM, localizeARIA, getSupportedLanguages, initializeI18n, setDocumentLanguage };
}
