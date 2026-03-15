/**
 * HyperFixi Bundle Loader
 *
 * Dynamically loads the correct bundle based on URL parameter.
 * Include this INSTEAD of the bundle script directly.
 *
 * Usage:
 *   <script src="../bundle-loader.js"></script>
 *   <!-- No need to include lokascript-browser.js -->
 *
 * URL Parameters:
 *   ?bundle=browser   - Full bundle (default)
 *   ?bundle=hybrid    - Mid-size hybrid bundle
 *   ?bundle=lite      - Minimal lite bundle
 *   ?bundle=standard  - Standard bundle
 *   ?bundle=minimal   - Minimal bundle
 *   ?bundle=multilingual - Multilingual bundle
 *   ?bundle=dev       - Development bundle
 *   ?bundle=prod      - Production bundle
 */

(function () {
  'use strict';

  // Bundle configurations
  const BUNDLES = {
    'browser': 'lokascript-browser.js',
    'hybrid-complete': 'lokascript-hybrid-complete.js',
    'hybrid-hx': 'lokascript-hybrid-hx.js',
    'lite': 'lokascript-lite.js',
    'lite-plus': 'hyperfixi-lite-plus.js',
    'standard': 'hyperfixi-browser-standard.js',
    'minimal': 'hyperfixi-browser-minimal.js',
    'multilingual': 'hyperfixi-multilingual.js',
    'semantic-complete': 'hyperfixi-semantic-complete.js',
    'dev': 'hyperfixi-browser.dev.js',
    'prod': 'hyperfixi-browser.prod.js'
  };

  // Get bundle from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let bundleKey = urlParams.get('bundle');

  // Fall back to localStorage preference
  if (!bundleKey) {
    bundleKey = localStorage.getItem('hyperfixi:bundle');
  }

  // Default to browser bundle
  if (!bundleKey || !BUNDLES[bundleKey]) {
    bundleKey = 'browser';
  }

  // Save preference
  if (urlParams.has('bundle')) {
    localStorage.setItem('hyperfixi:bundle', bundleKey);
  }

  // Calculate path based on current location
  function getBundlePath() {
    const path = window.location.pathname;
    const bundleFile = BUNDLES[bundleKey];

    // Docs site: examples served under /examples/ on hyperfixi.org or lokascript.org
    // The site already provides hyperfixi.js at /js/hyperfixi.js
    const host = window.location.hostname;
    const isDocsSite = host.includes('hyperfixi') || host.includes('lokascript') || host.includes('fly.dev');
    const isLocalDocsSite = host === 'localhost' && path.startsWith('/examples/');
    if (isDocsSite || isLocalDocsSite) {
      return '/js/hyperfixi.js';
    }

    // Local development: relative path to packages/core/dist/
    if (path.includes('/examples/')) {
      const afterExamples = path.split('/examples/')[1] || '';
      const depth = (afterExamples.match(/\//g) || []).length;

      if (depth === 0) {
        return '../packages/core/dist/' + bundleFile;
      } else if (depth === 1) {
        return '../../packages/core/dist/' + bundleFile;
      } else {
        return '../'.repeat(depth + 1) + 'packages/core/dist/' + bundleFile;
      }
    }

    return '/packages/core/dist/' + bundleFile;
  }

  // Create and inject script
  const script = document.createElement('script');
  script.src = getBundlePath();
  script.async = false;

  script.onerror = function () {
    console.error(`[HyperFixi] Failed to load bundle: ${bundleKey} (${BUNDLES[bundleKey]})`);
    console.error(`[HyperFixi] Attempted path: ${script.src}`);

    // IMPORTANT: Only fall back if we're not already trying to load the browser bundle.
    // If the browser bundle itself fails (e.g., server not ready, file missing),
    // attempting fallback would just try to load the same file again, causing an
    // infinite loop of errors. Instead, we provide diagnostic information.
    if (bundleKey !== 'browser') {
      console.error('[HyperFixi] Falling back to browser bundle...');

      // Fallback to default bundle
      const fallback = document.createElement('script');
      const browserPath = getBundlePath().replace(BUNDLES[bundleKey], BUNDLES['browser']);
      fallback.src = browserPath;

      fallback.onerror = function () {
        console.error('[HyperFixi] CRITICAL: Failed to load fallback browser bundle!');
        console.error(`[HyperFixi] Attempted fallback path: ${browserPath}`);
        console.error('[HyperFixi] Please check that packages/core/dist/lokascript-browser.js exists');
      };

      fallback.onload = function () {
        console.log('[HyperFixi] Successfully loaded fallback browser bundle');
        window.dispatchEvent(new CustomEvent('hyperfixi:bundle-loaded', {
          detail: { bundle: 'browser', file: BUNDLES['browser'], fallback: true }
        }));
      };

      document.head.appendChild(fallback);
    } else {
      console.error('[HyperFixi] CRITICAL: Browser bundle failed to load - no fallback available!');
      console.error('[HyperFixi] Please verify:');
      console.error('  1. Server is running from project root');
      console.error('  2. packages/core/dist/lokascript-browser.js exists');
      console.error('  3. File permissions are correct');
    }
  };

  script.onload = function () {
    console.log(`[HyperFixi] Loaded bundle: ${bundleKey} (${BUNDLES[bundleKey]})`);

    // Dispatch event for other scripts to know bundle is ready
    window.dispatchEvent(new CustomEvent('hyperfixi:bundle-loaded', {
      detail: { bundle: bundleKey, file: BUNDLES[bundleKey] }
    }));
  };

  // Insert script
  document.head.appendChild(script);

  // Expose loader info
  window.HyperFixiBundleLoader = {
    activeBundle: bundleKey,
    bundleFile: BUNDLES[bundleKey],
    allBundles: { ...BUNDLES }
  };
})();
