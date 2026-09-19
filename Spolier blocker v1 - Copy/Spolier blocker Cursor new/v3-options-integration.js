/**
 * Spoiler Shield V4 - Options Page Integration
 */

(function() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4Options);
  } else {
    initV4Options();
  }

  function initV4Options() {
    const advancedSection = document.getElementById('advanced-section');
    if (!advancedSection) return;

    createV4SettingsSection(advancedSection);
    loadV4Stats();
    attachV4EventListeners();
  }

  function createV4SettingsSection(parentSection) {
    const existing = document.getElementById('v3-settings-group');
    if (existing) {
      updateV4Labels(existing);
      return;
    }
    createLegacySection(parentSection);
  }

  function updateV4Labels(group) {
    const title = group.querySelector('.setting-group-title');
    if (title) title.textContent = '🛡️ V4 Spoiler Intelligence';
    const badge = group.querySelector('.badge');
    if (badge) badge.textContent = 'ACTIVE';
    const desc = group.querySelector('.setting-item p');
    if (desc) {
      desc.innerHTML = 'V4 uses universal plot intelligence — twists, epic moments, deaths, sports results, and award winners. Works for <strong>any</strong> tracked title.';
    }
  }

  function createLegacySection(parentSection) {
    // Create V3 settings group
    const v3Group = document.createElement('div');
    v3Group.className = 'setting-group';
    v3Group.id = 'v3-settings-group';
    v3Group.innerHTML = `
      <div class="setting-group-title">
        🛡️ V4 Spoiler Intelligence
        <span class="badge" style="display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px; text-transform: uppercase;">ACTIVE</span>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span>Detection Threshold: <span id="v3-threshold-value">0.65</span></span>
        </div>
        <div class="slider-container">
          <div class="slider-wrapper">
            <input type="range" id="v3-threshold-slider" class="slider" 
                   min="0.40" max="0.85" step="0.05" value="0.65"
                   aria-label="Detection threshold">
          </div>
        </div>
        <div style="font-size: 11px; color: #98a2c8; margin-top: 6px; display: flex; justify-content: space-between;">
          <span>0.40 (More sensitive)</span>
          <span>0.65 (Balanced)</span>
          <span>0.85 (More conservative)</span>
        </div>
        <p style="font-size: 12px; color: #98a2c8; margin: 8px 0 0 0;">
          V4 detects plot twists, epic moments, deaths, sports results, and award winners for any tracked title.
          Lower = more blurring. Also controlled by Aggressiveness on the main settings tab.
        </p>
      </div>

      <!-- Confidence Threshold -->
      <div class="setting-item">
        <div class="setting-label">
          <span>Minimum Confidence: <span id="v3-confidence-value">0.50</span></span>
        </div>
        <div class="slider-container">
          <div class="slider-wrapper">
            <input type="range" id="v3-confidence-slider" class="slider" 
                   min="0.30" max="0.70" step="0.05" value="0.50"
                   aria-label="Minimum confidence threshold">
          </div>
        </div>
        <p style="font-size: 12px; color: #98a2c8; margin: 8px 0 0 0;">
          Only blur spoilers when confidence is above this threshold.
        </p>
      </div>

      <!-- V3 Statistics -->
      <div class="setting-item" id="v3-stats-container">
        <div class="setting-label">
          <span>V3 Performance Statistics</span>
        </div>
        <div style="background: #0b1020; border: 1px solid rgba(255, 255, 255, 0.08); 
                    border-radius: 8px; padding: 16px; margin-top: 12px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div>
              <div style="font-size: 11px; color: #98a2c8; margin-bottom: 4px;">Total Analyzed</div>
              <div style="font-size: 20px; font-weight: 600; color: #e7ecff;" id="v3-stat-analyzed">0</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #98a2c8; margin-bottom: 4px;">Spoilers Detected</div>
              <div style="font-size: 20px; font-weight: 600; color: #7c8cff;" id="v3-stat-detected">0</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #98a2c8; margin-bottom: 4px;">Avg Processing Time</div>
              <div style="font-size: 20px; font-weight: 600; color: #10b981;" id="v3-stat-time">0ms</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #98a2c8; margin-bottom: 4px;">Cache Hit Rate</div>
              <div style="font-size: 20px; font-weight: 600; color: #f59e0b;" id="v3-stat-cache">0%</div>
            </div>
          </div>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
            <div style="font-size: 11px; color: #98a2c8; margin-bottom: 8px;">Detection Methods</div>
            <div style="display: flex; gap: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; color: #98a2c8;">Pattern-based</div>
                <div style="font-size: 16px; font-weight: 600; color: #e7ecff;" id="v3-stat-pattern">0</div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 11px; color: #98a2c8;">Cached</div>
                <div style="font-size: 16px; font-weight: 600; color: #e7ecff;" id="v3-stat-cached">0</div>
              </div>
            </div>
          </div>
          <button class="btn-secondary" id="v3-refresh-stats" style="width: 100%; margin-top: 12px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right: 6px;">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh Stats
          </button>
        </div>
      </div>

      <!-- Test V3 Detection -->
      <div class="setting-item">
        <div class="setting-label">
          <span>Test V3 Detection</span>
        </div>
        <div style="margin-top: 12px;">
          <textarea id="v3-test-input" 
                    placeholder="Enter text to test spoiler detection... 
Example: 'Walter White dies in the finale'"
                    style="width: 100%; min-height: 80px; padding: 12px; background: #0b1020; 
                           border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; 
                           color: #e7ecff; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
          <button class="btn-primary" id="v3-test-button" style="width: 100%; margin-top: 8px;">
            Test Detection
          </button>
          <div id="v3-test-result" style="margin-top: 12px; display: none; 
                                           padding: 12px; background: #0b1020; 
                                           border: 1px solid rgba(255, 255, 255, 0.08); 
                                           border-radius: 8px;"></div>
        </div>
      </div>

      <!-- Clear Cache -->
      <div class="setting-item">
        <div class="setting-label">
          <span>Cache Management</span>
        </div>
        <p style="font-size: 12px; color: #98a2c8; margin: 8px 0;">
          V3 caches detection results to improve performance. Clear cache if you notice stale results.
        </p>
        <button class="btn-secondary" id="v3-clear-cache" style="margin-top: 8px;">
          Clear V3 Cache
        </button>
      </div>
    `;

    // Insert before the last setting-group in advanced section
    const lastGroup = parentSection.querySelector('.setting-group:last-of-type');
    if (lastGroup) {
      parentSection.insertBefore(v3Group, lastGroup);
    } else {
      parentSection.appendChild(v3Group);
    }
  }

  function attachV4EventListeners() {
    attachV3EventListeners();
  }

  function attachV3EventListeners() {
    // V3 Enable/Disable toggle
    const v3Toggle = document.getElementById('v3-enabled-toggle');
    if (v3Toggle) {
      v3Toggle.addEventListener('click', toggleV3Enabled);
      // Load initial state
      chrome.storage.sync.get({ v3Enabled: true }, (result) => {
        setToggleState(v3Toggle, result.v3Enabled);
      });
    }

    // Threshold slider
    const thresholdSlider = document.getElementById('v3-threshold-slider');
    const thresholdValue = document.getElementById('v3-threshold-value');
    if (thresholdSlider && thresholdValue) {
      thresholdSlider.addEventListener('input', (e) => {
        thresholdValue.textContent = parseFloat(e.target.value).toFixed(2);
      });
      thresholdSlider.addEventListener('change', saveV3Settings);
      
      // Load initial value
      chrome.storage.sync.get({ settings: { aggressiveness: 2, spoilerThreshold: null } }, (result) => {
        const s = result.settings || {};
        const byLevel = [0.75, 0.70, 0.65, 0.55];
        const level = typeof s.aggressiveness === 'number' ? s.aggressiveness : 2;
        const threshold = typeof s.spoilerThreshold === 'number'
          ? s.spoilerThreshold
          : byLevel[Math.max(0, Math.min(3, level))];
        thresholdSlider.value = threshold;
        thresholdValue.textContent = threshold.toFixed(2);
      });
    }

    // Confidence slider
    const confidenceSlider = document.getElementById('v3-confidence-slider');
    const confidenceValue = document.getElementById('v3-confidence-value');
    if (confidenceSlider && confidenceValue) {
      confidenceSlider.addEventListener('input', (e) => {
        confidenceValue.textContent = parseFloat(e.target.value).toFixed(2);
      });
      confidenceSlider.addEventListener('change', saveV3Settings);
      
      // Load initial value
      chrome.storage.sync.get({ minConfidence: 0.50 }, (result) => {
        confidenceSlider.value = result.minConfidence;
        confidenceValue.textContent = result.minConfidence.toFixed(2);
      });
    }

    // Refresh stats button
    const refreshBtn = document.getElementById('v3-refresh-stats');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadV3Stats);
    }

    // Test detection button
    const testBtn = document.getElementById('v3-test-button');
    if (testBtn) {
      testBtn.addEventListener('click', testV3Detection);
    }

    // Clear cache button
    const clearCacheBtn = document.getElementById('v3-clear-cache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', clearV3Cache);
    }
  }

  function toggleV3Enabled(e) {
    const toggle = e.currentTarget;
    const isEnabled = !toggle.classList.contains('active');
    
    setToggleState(toggle, isEnabled);
    
    chrome.storage.sync.set({ v3Enabled: isEnabled }, () => {
      showStatus(isEnabled ? 'V3 detection enabled' : 'V3 detection disabled');
      
      // Notify content scripts to reload
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'spoiler-reprocess' }).catch(() => {});
        });
      });
    });
  }

  function setToggleState(toggle, isActive) {
    if (isActive) {
      toggle.classList.add('active');
      toggle.setAttribute('aria-checked', 'true');
    } else {
      toggle.classList.remove('active');
      toggle.setAttribute('aria-checked', 'false');
    }
  }

  function saveV3Settings() {
    const threshold = parseFloat(document.getElementById('v3-threshold-slider').value);

    chrome.storage.sync.get({ settings: {} }, (data) => {
      const settings = { ...(data.settings || {}), spoilerThreshold: threshold };
      chrome.storage.sync.set({ settings }, () => {
        showStatus('V4 detection threshold saved');
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'spoiler-reprocess' }).catch(() => {});
          });
        });
      });
    });
  }

  function loadV4Stats() {
    loadV3Stats();
  }

  function loadV3Stats() {
    // Get stats from active tab's V3 instance
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'v4-get-stats' }, (response) => {
          if (response && response.stats) {
            displayV3Stats(response.stats);
          } else {
            displayV3Stats(getDefaultStats());
          }
        });
      } else {
        displayV3Stats(getDefaultStats());
      }
    });
  }

  function displayV3Stats(stats) {
    document.getElementById('v3-stat-analyzed').textContent = stats.totalAnalyzed || 0;
    document.getElementById('v3-stat-detected').textContent = stats.spoilersBlocked || stats.blurred || 0;
    document.getElementById('v3-stat-time').textContent = 
      (stats.avgProcessingTime || 0).toFixed(2) + 'ms';
    document.getElementById('v3-stat-cache').textContent = 
      ((stats.cacheHitRate || 0) * 100).toFixed(0) + '%';
    document.getElementById('v3-stat-pattern').textContent = 
      stats.detectionMethod?.pattern || 0;
    document.getElementById('v3-stat-cached').textContent = 
      stats.detectionMethod?.cache || 0;
  }

  function getDefaultStats() {
    return {
      totalAnalyzed: 0,
      blurred: 0,
      avgProcessingTime: 0,
      cacheHitRate: 0,
      detectionMethod: { pattern: 0, cache: 0 }
    };
  }

  async function testV3Detection() {
    const input = document.getElementById('v3-test-input');
    const resultDiv = document.getElementById('v3-test-result');
    const testBtn = document.getElementById('v3-test-button');

    const text = input.value.trim();
    if (!text) {
      alert('Please enter text to test');
      return;
    }

    // Disable button during test
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    try {
      const storage = await chrome.storage.sync.get({ selectedMedia: [], settings: {} });
      const trackedMedia = (storage.selectedMedia || []).map(item => ({
        title: item.title,
        phrases: item.phrases || [],
        type: item.type || 'movie'
      }));

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'v4-test-detection',
            text: text,
            trackedMedia: trackedMedia
          }, (response) => {
            if (response && response.result) {
              displayTestResult(response.result);
            } else {
              resultDiv.innerHTML = `
                <div style="color: #f87171;">
                  ❌ Test failed. Open a regular webpage tab with the extension active.
                </div>
              `;
              resultDiv.style.display = 'block';
            }
            testBtn.disabled = false;
            testBtn.textContent = 'Test Detection';
          });
        }
      });
    } catch (error) {
      resultDiv.innerHTML = `<div style="color: #f87171;">Error: ${error.message}</div>`;
      resultDiv.style.display = 'block';
      testBtn.disabled = false;
      testBtn.textContent = 'Test Detection';
    }
  }

  function displayTestResult(result) {
    const resultDiv = document.getElementById('v3-test-result');
    
    const isSpoiler = result.isSpoiler;
    const probability = (result.probability * 100).toFixed(1);
    const confidence = (result.confidence * 100).toFixed(1);
    const severity = result.severity || 'unknown';
    const signals = result.signals || [];
    const reasoning = result.reasoning || [];

    const statusColor = isSpoiler ? '#f87171' : '#10b981';
    const statusIcon = isSpoiler ? '⚠️' : '✅';
    const statusText = isSpoiler ? 'SPOILER DETECTED' : 'NOT A SPOILER';

    resultDiv.innerHTML = `
      <div style="border-left: 3px solid ${statusColor}; padding-left: 12px;">
        <div style="font-size: 16px; font-weight: 600; color: ${statusColor}; margin-bottom: 12px;">
          ${statusIcon} ${statusText}
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-size: 10px; color: #98a2c8; text-transform: uppercase; margin-bottom: 4px;">Probability</div>
            <div style="font-size: 18px; font-weight: 600; color: #e7ecff;">${probability}%</div>
          </div>
          <div>
            <div style="font-size: 10px; color: #98a2c8; text-transform: uppercase; margin-bottom: 4px;">Confidence</div>
            <div style="font-size: 18px; font-weight: 600; color: #e7ecff;">${confidence}%</div>
          </div>
          <div>
            <div style="font-size: 10px; color: #98a2c8; text-transform: uppercase; margin-bottom: 4px;">Severity</div>
            <div style="font-size: 18px; font-weight: 600; color: #e7ecff; text-transform: capitalize;">${severity}</div>
          </div>
        </div>

        ${signals.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11px; color: #98a2c8; margin-bottom: 6px;">Detected Signals:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${signals.map(s => `
                <span style="background: rgba(124, 140, 255, 0.2); color: #7c8cff; padding: 4px 8px; 
                             border-radius: 4px; font-size: 11px; font-weight: 500;">
                  ${s.name} (${(s.weight * 100).toFixed(0)}%)
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${reasoning.length > 0 ? `
          <div>
            <div style="font-size: 11px; color: #98a2c8; margin-bottom: 6px;">Reasoning:</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #e7ecff;">
              ${reasoning.map(r => `<li style="margin-bottom: 4px;">${r}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    resultDiv.style.display = 'block';
  }

  function clearV3Cache() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'v4-clear-cache' }, () => {
          showStatus('Analysis cache cleared');
          loadV3Stats();
        });
      }
    });
  }

  function showStatus(message) {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = message;
      status.className = 'status';
      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    }
  }

  console.log('[Spoiler Shield V3] Options integration loaded');
})();
