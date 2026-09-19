/**
 * telemetry.js - Privacy-first, opt-in telemetry for Spoiler Shield
 * 
 * This module provides optional usage analytics that:
 * - Only sends data if user explicitly opts in
 * - Never collects page content, URLs, or personal data
 * - Uses pseudonymous session IDs (not linked to user identity)
 * - Can be fully disabled and deleted anytime
 * - Sends data to a privacy-respecting endpoint (if configured)
 */

class Telemetry {
  constructor() {
    this.enabled = false;
    this.sessionId = null;
    this.events = [];
    this.batchSize = 10;
    this.batchInterval = 60000; // 1 minute
    this.endpoint = null; // Configure in manifest/options if enabled
    this.initialized = false;
    
    this.load();
  }

  /**
   * Load telemetry settings from storage
   */
  async load() {
    try {
      const data = await chrome.storage.local.get(['telemetryEnabled', 'telemetrySessionId']);
      this.enabled = data.telemetryEnabled || false;
      this.sessionId = data.telemetrySessionId || this.generateSessionId();
      
      if (!data.telemetrySessionId) {
        await chrome.storage.local.set({ telemetrySessionId: this.sessionId });
      }
      
      this.initialized = true;
      
      if (this.enabled) {
        this.startBatchTimer();
      }
    } catch (e) {
      console.error('Telemetry: Failed to load settings', e);
      this.initialized = true;
    }
  }

  /**
   * Enable telemetry (user must opt-in explicitly)
   */
  async enable() {
    this.enabled = true;
    await chrome.storage.local.set({ telemetryEnabled: true });
    this.trackEvent('telemetry_enabled', { initialSession: false });
    this.startBatchTimer();
  }

  /**
   * Disable and delete all telemetry data
   */
  async disable() {
    this.enabled = false;
    await chrome.storage.local.remove(['telemetryEnabled', 'telemetryEvents']);
    this.events = [];
    if (this.batchTimer) clearInterval(this.batchTimer);
  }

  /**
   * Generate a new session ID (pseudonymous, not linked to user)
   */
  generateSessionId() {
    return 'ses_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Track a generic event
   * Only non-sensitive data should be tracked
   */
  trackEvent(eventName, data = {}) {
    if (!this.enabled || !this.initialized) return;

    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      extensionVersion: chrome.runtime.getManifest().version,
      data: data
    };

    this.events.push(event);

    // Send batch if we've reached batch size
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track extension initialization
   */
  trackInit() {
    this.trackEvent('extension_init', {
      platform: navigator.platform,
      language: chrome.i18n.getUILanguage()
    });
  }

  /**
   * Track feature usage (non-sensitive)
   */
  trackFeatureUsage(feature) {
    this.trackEvent('feature_used', { feature });
  }

  /**
   * Track keyword count (aggregate data only, not keywords themselves)
   */
  trackKeywordCount(count) {
    this.trackEvent('keyword_count', { count });
  }

  /**
   * Track settings changes (only event name, not values)
   */
  trackSettingsChange(settingName) {
    this.trackEvent('setting_changed', { setting: settingName });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName, duration) {
    this.trackEvent('performance', { metric: metricName, duration_ms: duration });
  }

  /**
   * Track errors (non-sensitive error categorization only)
   */
  trackError(errorCategory) {
    this.trackEvent('error', { category: errorCategory });
  }

  /**
   * Store events in local storage for batching
   */
  async persistEvents() {
    try {
      await chrome.storage.local.set({ telemetryEvents: this.events });
    } catch (e) {
      console.warn('Telemetry: Failed to persist events', e);
    }
  }

  /**
   * Send batched events (requires configured endpoint)
   */
  async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    await this.persistEvents();

    // Only send if endpoint is configured
    if (!this.endpoint) {
      console.debug('Telemetry: No endpoint configured, events stored locally only');
      return;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SpoilerShield/' + chrome.runtime.getManifest().version
        },
        body: JSON.stringify({
          events: eventsToSend,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('Telemetry: Failed to send events', response.status);
        // Re-add events to queue if send failed
        this.events = eventsToSend;
      }
    } catch (e) {
      console.warn('Telemetry: Network error sending events', e);
      // Re-add events to queue if send failed
      this.events = eventsToSend;
    }
  }

  /**
   * Start periodic batch timer
   */
  startBatchTimer() {
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.batchTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, this.batchInterval);
  }

  /**
   * Get telemetry status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      sessionId: this.sessionId,
      eventCount: this.events.length,
      initialized: this.initialized
    };
  }

  /**
   * Set custom endpoint for telemetry collection
   * Should only be called by admin/developer
   */
  setEndpoint(url) {
    this.endpoint = url;
  }
}

// Create singleton instance
const telemetry = new Telemetry();

// Initialize on load
telemetry.load().catch(e => console.error('Telemetry initialization failed:', e));

// Export as module if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { telemetry, Telemetry };
}
