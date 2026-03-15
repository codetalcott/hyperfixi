/**
 * HyperFixi Bundle Selector
 *
 * A reusable panel for testing different bundle configurations against examples.
 * Include this script in any example page to enable bundle switching.
 *
 * Usage:
 *   <script src="../bundle-selector.js"></script>
 *
 * Or specify bundle via URL param: ?bundle=hybrid
 *
 * API:
 *   HyperFixiBundleSelector.show()   - Show the selector
 *   HyperFixiBundleSelector.hide()   - Hide the selector
 *   HyperFixiBundleSelector.toggle() - Toggle visibility
 *   HyperFixiBundleSelector.getActiveBundle() - Get current bundle name
 */

(function () {
  'use strict';

  // Bundle configurations (sizes are gzipped)
  const BUNDLES = {
    'browser': {
      name: 'Full Bundle',
      file: 'lokascript-browser.js',
      size: '203 KB',
      description: 'Complete bundle with semantic parser, all commands, i18n support',
      features: ['43 commands', 'semantic parser', 'i18n', 'debug tools'],
      color: '#667eea'
    },
    'hybrid-complete': {
      name: 'Hybrid Complete',
      file: 'lokascript-hybrid-complete.js',
      size: '7.3 KB',
      description: 'Full AST parser with blocks, expressions, event modifiers',
      features: ['21 commands', 'full parser', 'blocks', 'i18n aliases'],
      color: '#10b981'
    },
    'hybrid-hx': {
      name: 'Hybrid HX',
      file: 'lokascript-hybrid-hx.js',
      size: '9.5 KB',
      description: 'Hybrid Complete + htmx attribute compatibility',
      features: ['21 commands', 'htmx attrs', 'hx-on:*', 'lifecycle events'],
      color: '#3b82f6'
    },
    'lite': {
      name: 'Lite Bundle',
      file: 'lokascript-lite.js',
      size: '1.9 KB',
      description: 'Minimal bundle for simple interactions',
      features: ['8 commands', 'regex parser', 'basic events'],
      color: '#f59e0b'
    },
    'lite-plus': {
      name: 'Lite Plus',
      file: 'hyperfixi-lite-plus.js',
      size: '2.6 KB',
      description: 'Basic apps with more commands and i18n aliases',
      features: ['14 commands', 'regex parser', 'i18n aliases'],
      color: '#fb923c'
    },
    'standard': {
      name: 'Standard Bundle',
      file: 'hyperfixi-browser-standard.js',
      size: '63 KB',
      description: 'Standard features without semantic parser',
      features: ['43 commands', 'traditional parser'],
      color: '#8b5cf6'
    },
    'minimal': {
      name: 'Minimal Bundle',
      file: 'hyperfixi-browser-minimal.js',
      size: '58 KB',
      description: 'Minimal feature set',
      features: ['core commands', 'traditional parser'],
      color: '#ec4899'
    },
    'multilingual': {
      name: 'Multilingual Bundle',
      file: 'hyperfixi-multilingual.js',
      size: '64 KB',
      description: 'Requires semantic package loaded separately!',
      features: ['needs semantic.js', 'i18n', '13 languages'],
      color: '#f59e0b'
    }
  };

  // Get current bundle from URL or default
  const urlParams = new URLSearchParams(window.location.search);
  const currentBundle = urlParams.get('bundle') || 'browser';

  // Panel state
  let panelVisible = false;
  let panelElement = null;
  let testResults = {};

  // CSS styles
  const styles = `
    .hf-bundle-panel {
      position: fixed;
      top: 20px;
      left: 20px;
      width: 360px;
      max-height: calc(100vh - 40px);
      background: #1a1a2e;
      border: 1px solid #3d3d5c;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 99999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .hf-bundle-panel.visible {
      display: flex;
    }

    .hf-bundle-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      font-weight: 600;
    }

    .hf-bundle-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hf-bundle-header-actions {
      display: flex;
      gap: 8px;
    }

    .hf-bundle-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .hf-bundle-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .hf-bundle-current {
      padding: 16px;
      background: #16162a;
      border-bottom: 1px solid #3d3d5c;
    }

    .hf-bundle-current-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .hf-bundle-current-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hf-bundle-current-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .hf-bundle-current-name {
      font-weight: 600;
      font-size: 16px;
    }

    .hf-bundle-current-size {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      margin-left: auto;
    }

    .hf-bundle-current-desc {
      color: #888;
      font-size: 12px;
      margin-top: 8px;
    }

    .hf-bundle-features {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 10px;
    }

    .hf-bundle-feature {
      background: #2d2d4a;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      color: #a0a0ff;
    }

    .hf-bundle-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
      padding: 8px;
    }

    .hf-bundle-option {
      padding: 12px;
      margin: 4px 0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hf-bundle-option:hover {
      background: #22223a;
    }

    .hf-bundle-option.active {
      background: #22223a;
      border-color: #059669;
    }

    .hf-bundle-option-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .hf-bundle-option-info {
      flex: 1;
      min-width: 0;
    }

    .hf-bundle-option-name {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hf-bundle-option-size {
      font-size: 11px;
      color: #888;
      background: rgba(255, 255, 255, 0.05);
      padding: 1px 6px;
      border-radius: 8px;
    }

    .hf-bundle-option-desc {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hf-bundle-option-status {
      flex-shrink: 0;
    }

    .hf-bundle-status-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 12px;
    }

    .hf-bundle-status-icon.pass {
      background: #22c55e;
      color: white;
    }

    .hf-bundle-status-icon.fail {
      background: #ef4444;
      color: white;
    }

    .hf-bundle-status-icon.unknown {
      background: #6b7280;
      color: white;
    }

    .hf-bundle-toggle-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
      z-index: 99998;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .hf-bundle-toggle-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(5, 150, 105, 0.5);
    }

    .hf-bundle-toggle-btn.hidden {
      display: none;
    }

    .hf-bundle-footer {
      padding: 12px 16px;
      background: #16162a;
      border-top: 1px solid #3d3d5c;
      display: flex;
      gap: 8px;
    }

    .hf-bundle-footer-btn {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .hf-bundle-footer-btn.primary {
      background: #059669;
      color: white;
    }

    .hf-bundle-footer-btn.primary:hover {
      background: #047857;
    }

    .hf-bundle-footer-btn.secondary {
      background: #2d2d4a;
      color: #e0e0e0;
    }

    .hf-bundle-footer-btn.secondary:hover {
      background: #3d3d5c;
    }

    .hf-bundle-comparison {
      padding: 12px 16px;
      background: #12121f;
      border-top: 1px solid #3d3d5c;
    }

    .hf-bundle-comparison-title {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .hf-bundle-bars {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hf-bundle-bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hf-bundle-bar-label {
      font-size: 10px;
      color: #888;
      width: 60px;
      text-align: right;
    }

    .hf-bundle-bar-track {
      flex: 1;
      height: 8px;
      background: #2d2d4a;
      border-radius: 4px;
      overflow: hidden;
    }

    .hf-bundle-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .hf-bundle-bar-value {
      font-size: 10px;
      color: #888;
      width: 50px;
    }
  `;

  /**
   * Inject styles
   */
  function injectStyles() {
    if (document.getElementById('hf-bundle-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'hf-bundle-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  /**
   * Get bundle path relative to current page
   */
  function getBundlePath(bundleKey) {
    const bundle = BUNDLES[bundleKey];
    if (!bundle) return null;

    // Determine the correct path based on current location
    const path = window.location.pathname;
    let prefix = '../packages/core/dist/';

    // If we're at examples/index.html, use relative path
    if (path.includes('/examples/')) {
      const depth = (path.match(/\//g) || []).length;
      if (depth <= 3) {
        prefix = '../packages/core/dist/';
      } else {
        prefix = '../../packages/core/dist/';
      }
    }

    return prefix + bundle.file;
  }

  /**
   * Parse size string to bytes for comparison
   */
  function parseSize(sizeStr) {
    const match = sizeStr.match(/(\d+)\s*KB/i);
    return match ? parseInt(match[1]) * 1024 : 0;
  }

  /**
   * Create comparison bars
   */
  function createComparisonBars() {
    const maxSize = Math.max(...Object.values(BUNDLES).map(b => parseSize(b.size)));
    const currentSize = parseSize(BUNDLES[currentBundle]?.size || '0 KB');

    const bars = Object.entries(BUNDLES)
      .sort((a, b) => parseSize(a[1].size) - parseSize(b[1].size))
      .slice(0, 4) // Show top 4 smallest
      .map(([key, bundle]) => {
        const size = parseSize(bundle.size);
        const percent = (size / maxSize) * 100;
        const isActive = key === currentBundle;

        return `
          <div class="hf-bundle-bar-row">
            <span class="hf-bundle-bar-label">${bundle.name.split(' ')[0]}</span>
            <div class="hf-bundle-bar-track">
              <div class="hf-bundle-bar-fill" style="width: ${percent}%; background: ${bundle.color}; opacity: ${isActive ? 1 : 0.6}"></div>
            </div>
            <span class="hf-bundle-bar-value">${bundle.size}</span>
          </div>
        `;
      }).join('');

    return `
      <div class="hf-bundle-comparison">
        <div class="hf-bundle-comparison-title">Size Comparison (smallest bundles)</div>
        <div class="hf-bundle-bars">${bars}</div>
      </div>
    `;
  }

  /**
   * Create the panel
   */
  function createPanel() {
    if (panelElement) return panelElement;

    injectStyles();

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'hf-bundle-toggle-btn';
    toggleBtn.innerHTML = '📦';
    toggleBtn.title = 'Toggle Bundle Selector';
    toggleBtn.onclick = () => HyperFixiBundleSelector.toggle();
    document.body.appendChild(toggleBtn);

    // Create panel
    panelElement = document.createElement('div');
    panelElement.className = 'hf-bundle-panel';

    const bundle = BUNDLES[currentBundle] || BUNDLES['browser'];

    const optionsHtml = Object.entries(BUNDLES).map(([key, b]) => {
      const isActive = key === currentBundle;
      const status = testResults[key];
      const statusIcon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '?';
      const statusClass = status || 'unknown';

      return `
        <div class="hf-bundle-option ${isActive ? 'active' : ''}" data-bundle="${key}" onclick="HyperFixiBundleSelector.select('${key}')">
          <div class="hf-bundle-option-dot" style="background: ${b.color}"></div>
          <div class="hf-bundle-option-info">
            <div class="hf-bundle-option-name">
              ${b.name}
              <span class="hf-bundle-option-size">${b.size}</span>
            </div>
            <div class="hf-bundle-option-desc">${b.description}</div>
          </div>
          <div class="hf-bundle-option-status">
            <div class="hf-bundle-status-icon ${statusClass}">${statusIcon}</div>
          </div>
        </div>
      `;
    }).join('');

    panelElement.innerHTML = `
      <div class="hf-bundle-header">
        <div class="hf-bundle-header-title">
          <span>📦</span>
          <span>Bundle Selector</span>
        </div>
        <div class="hf-bundle-header-actions">
          <button class="hf-bundle-btn" onclick="HyperFixiBundleSelector.runTest()">Test</button>
          <button class="hf-bundle-btn" onclick="HyperFixiBundleSelector.hide()">×</button>
        </div>
      </div>
      <div class="hf-bundle-current">
        <div class="hf-bundle-current-label">Currently Active</div>
        <div class="hf-bundle-current-info">
          <div class="hf-bundle-current-dot" style="background: ${bundle.color}"></div>
          <span class="hf-bundle-current-name">${bundle.name}</span>
          <span class="hf-bundle-current-size">${bundle.size}</span>
        </div>
        <div class="hf-bundle-current-desc">${bundle.description}</div>
        <div class="hf-bundle-features">
          ${bundle.features.map(f => `<span class="hf-bundle-feature">${f}</span>`).join('')}
        </div>
      </div>
      ${createComparisonBars()}
      <div class="hf-bundle-list">
        ${optionsHtml}
      </div>
      <div class="hf-bundle-footer">
        <button class="hf-bundle-footer-btn secondary" onclick="HyperFixiBundleSelector.openGallery()">Gallery</button>
        <button class="hf-bundle-footer-btn primary" onclick="HyperFixiBundleSelector.copyUrl()">Copy URL</button>
      </div>
    `;

    document.body.appendChild(panelElement);
    return panelElement;
  }

  /**
   * Check if current page works with current bundle
   */
  function runBasicTest() {
    try {
      // Check if hyperfixi loaded
      if (typeof window.lokascript === 'undefined') {
        return 'fail';
      }

      // Check if basic methods exist
      if (typeof window.lokascript.init !== 'function') {
        return 'fail';
      }

      // Check for any console errors (basic check)
      return 'pass';
    } catch (e) {
      return 'fail';
    }
  }

  /**
   * Initialize
   */
  function init() {
    // Don't show bundle selector on production docs sites
    const host = window.location.hostname;
    if (host.includes('hyperfixi') || host.includes('lokascript') || host.includes('fly.dev')) {
      return;
    }

    createPanel();

    // Run basic test after a delay
    setTimeout(() => {
      testResults[currentBundle] = runBasicTest();
      // Update UI if panel exists
      const option = panelElement?.querySelector(`[data-bundle="${currentBundle}"]`);
      if (option) {
        const statusIcon = option.querySelector('.hf-bundle-status-icon');
        if (statusIcon) {
          statusIcon.className = `hf-bundle-status-icon ${testResults[currentBundle]}`;
          statusIcon.textContent = testResults[currentBundle] === 'pass' ? '✓' : '✗';
        }
      }
    }, 1000);

    console.log(`[HyperFixi Bundle] Active: ${BUNDLES[currentBundle]?.name || currentBundle} (${BUNDLES[currentBundle]?.size})`);
  }

  // Public API
  window.HyperFixiBundleSelector = {
    show() {
      createPanel();
      panelElement.classList.add('visible');
      panelVisible = true;
      document.querySelector('.hf-bundle-toggle-btn')?.classList.add('hidden');
    },

    hide() {
      if (panelElement) {
        panelElement.classList.remove('visible');
        panelVisible = false;
        document.querySelector('.hf-bundle-toggle-btn')?.classList.remove('hidden');
      }
    },

    toggle() {
      if (panelVisible) {
        this.hide();
      } else {
        this.show();
      }
    },

    select(bundleKey) {
      if (!BUNDLES[bundleKey]) {
        console.error(`Unknown bundle: ${bundleKey}`);
        return;
      }

      // Update URL and reload
      const url = new URL(window.location.href);
      url.searchParams.set('bundle', bundleKey);
      window.location.href = url.toString();
    },

    getActiveBundle() {
      return currentBundle;
    },

    getBundleInfo(bundleKey) {
      return BUNDLES[bundleKey || currentBundle];
    },

    getAllBundles() {
      return { ...BUNDLES };
    },

    runTest() {
      testResults[currentBundle] = runBasicTest();
      alert(`Bundle test: ${testResults[currentBundle].toUpperCase()}\n\nBundle: ${BUNDLES[currentBundle]?.name}\nSize: ${BUNDLES[currentBundle]?.size}`);
    },

    copyUrl() {
      const url = new URL(window.location.href);
      url.searchParams.set('bundle', currentBundle);
      navigator.clipboard.writeText(url.toString()).then(() => {
        alert('URL copied to clipboard!');
      });
    },

    openGallery() {
      const url = new URL(window.location.origin + '/examples/index.html');
      url.searchParams.set('bundle', currentBundle);
      window.location.href = url.toString();
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
