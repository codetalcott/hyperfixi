/**
 * HyperFixi Semantic Parsing Debug Panel
 *
 * A reusable debug panel that shows semantic parsing decisions in real-time.
 * Include this script in any example page to enable debug visualization.
 *
 * Usage:
 *   <script src="../debug-panel.js"></script>
 *
 * Or enable via URL param: ?debug=semantic
 *
 * API:
 *   HyperFixiDebugPanel.show()   - Show the panel
 *   HyperFixiDebugPanel.hide()   - Hide the panel
 *   HyperFixiDebugPanel.toggle() - Toggle visibility
 */

(function () {
  'use strict';

  // Check if we should auto-enable from URL param
  const urlParams = new URLSearchParams(window.location.search);
  const autoEnable = urlParams.has('debug') && urlParams.get('debug') === 'semantic';

  // Panel state
  let panelVisible = false;
  let panelElement = null;
  let eventLog = [];
  const MAX_LOG_ENTRIES = 50;

  // CSS styles for the panel
  const styles = `
    .hf-debug-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 420px;
      max-height: 500px;
      background: #1a1a2e;
      border: 1px solid #3d3d5c;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      font-size: 13px;
      color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 99999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .hf-debug-panel.visible {
      display: flex;
    }

    .hf-debug-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      cursor: move;
    }

    .hf-debug-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hf-debug-header-actions {
      display: flex;
      gap: 8px;
    }

    .hf-debug-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .hf-debug-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .hf-debug-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 12px 16px;
      background: #16162a;
      border-bottom: 1px solid #3d3d5c;
    }

    .hf-debug-stat {
      text-align: center;
    }

    .hf-debug-stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }

    .hf-debug-stat-value.success { color: #4caf50; }
    .hf-debug-stat-value.fallback { color: #ff9800; }
    .hf-debug-stat-value.traditional { color: #9e9e9e; }

    .hf-debug-stat-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .hf-debug-log {
      flex: 1;
      overflow-y: auto;
      max-height: 300px;
    }

    .hf-debug-entry {
      padding: 10px 16px;
      border-bottom: 1px solid #2d2d4a;
      transition: background 0.2s;
    }

    .hf-debug-entry:hover {
      background: #22223a;
    }

    .hf-debug-entry.semantic {
      border-left: 3px solid #4caf50;
    }

    .hf-debug-entry.fallback {
      border-left: 3px solid #ff9800;
    }

    .hf-debug-entry.traditional {
      border-left: 3px solid #9e9e9e;
    }

    .hf-debug-entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .hf-debug-entry-method {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .hf-debug-entry-method.semantic { color: #4caf50; }
    .hf-debug-entry-method.fallback { color: #ff9800; }
    .hf-debug-entry-method.traditional { color: #9e9e9e; }

    .hf-debug-entry-time {
      font-size: 10px;
      color: #666;
    }

    .hf-debug-entry-input {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      color: #a0a0ff;
      background: #12121f;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 8px;
      word-break: break-all;
    }

    .hf-debug-entry-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      font-size: 11px;
    }

    .hf-debug-entry-detail {
      display: flex;
      gap: 6px;
    }

    .hf-debug-entry-detail-label {
      color: #888;
    }

    .hf-debug-entry-detail-value {
      color: #e0e0e0;
    }

    .hf-debug-confidence-bar {
      height: 6px;
      background: #2d2d4a;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 8px;
    }

    .hf-debug-confidence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    .hf-debug-confidence-fill.high { background: linear-gradient(90deg, #4caf50, #8bc34a); }
    .hf-debug-confidence-fill.medium { background: linear-gradient(90deg, #ff9800, #ffc107); }
    .hf-debug-confidence-fill.low { background: linear-gradient(90deg, #f44336, #ff5722); }

    .hf-debug-roles {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .hf-debug-role {
      background: #2d2d4a;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
    }

    .hf-debug-role-name {
      color: #888;
    }

    .hf-debug-role-value {
      color: #a0a0ff;
    }

    .hf-debug-empty {
      padding: 40px;
      text-align: center;
      color: #666;
    }

    .hf-debug-toggle-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      z-index: 99998;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .hf-debug-toggle-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
    }

    .hf-debug-toggle-btn.hidden {
      display: none;
    }
  `;

  /**
   * Create and inject styles
   */
  function injectStyles() {
    if (document.getElementById('hf-debug-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'hf-debug-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  /**
   * Create the debug panel HTML
   */
  function createPanel() {
    if (panelElement) return panelElement;

    injectStyles();

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'hf-debug-toggle-btn';
    toggleBtn.innerHTML = '🔬';
    toggleBtn.title = 'Toggle Semantic Debug Panel';
    toggleBtn.onclick = () => HyperFixiDebugPanel.toggle();
    document.body.appendChild(toggleBtn);

    // Create panel
    panelElement = document.createElement('div');
    panelElement.className = 'hf-debug-panel';
    panelElement.innerHTML = `
      <div class="hf-debug-header">
        <div class="hf-debug-header-title">
          <span>🔬</span>
          <span>Semantic Parsing Debug</span>
        </div>
        <div class="hf-debug-header-actions">
          <button class="hf-debug-btn" onclick="HyperFixiDebugPanel.clear()">Clear</button>
          <button class="hf-debug-btn" onclick="HyperFixiDebugPanel.hide()">×</button>
        </div>
      </div>
      <div class="hf-debug-stats">
        <div class="hf-debug-stat">
          <div class="hf-debug-stat-value" id="hf-stat-total">0</div>
          <div class="hf-debug-stat-label">Total</div>
        </div>
        <div class="hf-debug-stat">
          <div class="hf-debug-stat-value success" id="hf-stat-semantic">0</div>
          <div class="hf-debug-stat-label">Semantic</div>
        </div>
        <div class="hf-debug-stat">
          <div class="hf-debug-stat-value fallback" id="hf-stat-fallback">0</div>
          <div class="hf-debug-stat-label">Fallback</div>
        </div>
        <div class="hf-debug-stat">
          <div class="hf-debug-stat-value" id="hf-stat-confidence">-</div>
          <div class="hf-debug-stat-label">Avg Conf</div>
        </div>
      </div>
      <div class="hf-debug-log" id="hf-debug-log">
        <div class="hf-debug-empty">
          Waiting for parse events...<br>
          <small>Interact with hyperscript elements to see parsing details</small>
        </div>
      </div>
    `;

    document.body.appendChild(panelElement);
    return panelElement;
  }

  /**
   * Format a timestamp
   */
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
  }

  /**
   * Get confidence level class
   */
  function getConfidenceClass(confidence) {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Render a log entry
   */
  function renderEntry(event) {
    const method = event.semanticSuccess ? 'semantic' : (event.fallbackTriggered ? 'fallback' : 'traditional');
    const confidencePercent = Math.round(event.confidence * 100);
    const confidenceClass = getConfidenceClass(event.confidence);

    let rolesHtml = '';
    if (event.roles && Object.keys(event.roles).length > 0) {
      rolesHtml = '<div class="hf-debug-roles">';
      for (const [role, value] of Object.entries(event.roles)) {
        rolesHtml += `<span class="hf-debug-role"><span class="hf-debug-role-name">${role}:</span> <span class="hf-debug-role-value">${value}</span></span>`;
      }
      rolesHtml += '</div>';
    }

    return `
      <div class="hf-debug-entry ${method}">
        <div class="hf-debug-entry-header">
          <span class="hf-debug-entry-method ${method}">
            ${method === 'semantic' ? '✓ Semantic' : method === 'fallback' ? '↩ Fallback' : '○ Traditional'}
          </span>
          <span class="hf-debug-entry-time">${formatTime(event.timestamp)}</span>
        </div>
        <div class="hf-debug-entry-input">${escapeHtml(event.input)}</div>
        <div class="hf-debug-entry-details">
          <div class="hf-debug-entry-detail">
            <span class="hf-debug-entry-detail-label">Confidence:</span>
            <span class="hf-debug-entry-detail-value">${confidencePercent}%</span>
          </div>
          <div class="hf-debug-entry-detail">
            <span class="hf-debug-entry-detail-label">Threshold:</span>
            <span class="hf-debug-entry-detail-value">${Math.round(event.threshold * 100)}%</span>
          </div>
          ${event.command ? `
          <div class="hf-debug-entry-detail">
            <span class="hf-debug-entry-detail-label">Command:</span>
            <span class="hf-debug-entry-detail-value">${event.command}</span>
          </div>
          ` : ''}
          <div class="hf-debug-entry-detail">
            <span class="hf-debug-entry-detail-label">Language:</span>
            <span class="hf-debug-entry-detail-value">${event.language}</span>
          </div>
        </div>
        <div class="hf-debug-confidence-bar">
          <div class="hf-debug-confidence-fill ${confidenceClass}" style="width: ${confidencePercent}%"></div>
        </div>
        ${rolesHtml}
      </div>
    `;
  }

  /**
   * Update the log display
   */
  function updateLog() {
    const logEl = document.getElementById('hf-debug-log');
    if (!logEl) return;

    if (eventLog.length === 0) {
      logEl.innerHTML = `
        <div class="hf-debug-empty">
          Waiting for parse events...<br>
          <small>Interact with hyperscript elements to see parsing details</small>
        </div>
      `;
      return;
    }

    logEl.innerHTML = eventLog.map(renderEntry).join('');
    logEl.scrollTop = 0; // Scroll to top (newest entries)
  }

  /**
   * Update statistics display
   */
  function updateStats() {
    if (typeof window.hyperfixi === 'undefined' || !window.hyperfixi.semanticDebug) return;

    const stats = window.hyperfixi.semanticDebug.getStats();

    const totalEl = document.getElementById('hf-stat-total');
    const semanticEl = document.getElementById('hf-stat-semantic');
    const fallbackEl = document.getElementById('hf-stat-fallback');
    const confidenceEl = document.getElementById('hf-stat-confidence');

    if (totalEl) totalEl.textContent = stats.totalParses;
    if (semanticEl) semanticEl.textContent = stats.semanticSuccesses;
    if (fallbackEl) fallbackEl.textContent = stats.semanticFallbacks;
    if (confidenceEl) {
      confidenceEl.textContent = stats.totalParses > 0
        ? Math.round(stats.averageConfidence * 100) + '%'
        : '-';
    }
  }

  /**
   * Escape HTML
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Handle semantic parse events
   */
  function handleParseEvent(e) {
    const detail = e.detail;

    // Add to log (newest first)
    eventLog.unshift(detail);

    // Trim log if too long
    if (eventLog.length > MAX_LOG_ENTRIES) {
      eventLog.pop();
    }

    updateLog();
    updateStats();
  }

  /**
   * Initialize the debug panel
   */
  function init() {
    // Wait for hyperfixi to be available
    if (typeof window.hyperfixi === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    // Enable debug events
    window.hyperfixi.semanticDebug.enable();

    // Listen for future parse events
    window.addEventListener('hyperfixi:semantic:parse', handleParseEvent);

    // Replay any events that occurred before panel initialized
    if (window.hyperfixi.semanticDebug.getEventHistory) {
      const history = window.hyperfixi.semanticDebug.getEventHistory();
      history.forEach(event => {
        eventLog.unshift(event);
      });
      // Trim if too long
      while (eventLog.length > MAX_LOG_ENTRIES) {
        eventLog.pop();
      }
    }

    // Create panel
    createPanel();

    // Update display with replayed events
    updateLog();
    updateStats();

    // Auto-show if URL param is set
    if (autoEnable) {
      HyperFixiDebugPanel.show();
    }

    console.log('[HyperFixi Debug] Semantic debug panel initialized. Use HyperFixiDebugPanel.show() to open.');
  }

  // Public API
  window.HyperFixiDebugPanel = {
    show() {
      createPanel();
      panelElement.classList.add('visible');
      panelVisible = true;
      document.querySelector('.hf-debug-toggle-btn')?.classList.add('hidden');
    },

    hide() {
      if (panelElement) {
        panelElement.classList.remove('visible');
        panelVisible = false;
        document.querySelector('.hf-debug-toggle-btn')?.classList.remove('hidden');
      }
    },

    toggle() {
      if (panelVisible) {
        this.hide();
      } else {
        this.show();
      }
    },

    clear() {
      eventLog = [];
      if (window.hyperfixi?.semanticDebug) {
        window.hyperfixi.semanticDebug.resetStats();
      }
      updateLog();
      updateStats();
    },

    isVisible() {
      return panelVisible;
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
