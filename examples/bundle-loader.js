/**
 * HyperFixi Bundle Loader
 *
 * Dynamically loads the correct bundle based on URL parameter.
 * Include this INSTEAD of the bundle script directly.
 *
 * Usage:
 *   <script src="../bundle-loader.js"></script>
 *   <!-- No need to include hyperfixi.js -->
 *
 * URL Parameters:
 *   ?bundle=browser   - hyperfixi.js, core's name for hyperfixi-hs.js (default, unless the script tag has data-default)
 *   ?bundle=hs        - hyperfixi-hs.js: hyperscript only, on the new engine
 */

(function () {
  'use strict';

  // Bundle configurations.
  // `browser` points at core's `hyperfixi.js`, which since Phase C3 (C-R4b) is
  // the engine's hyperfixi-hs.js copied under core's name: the same file as
  // `hs`, served from packages/core/dist/.
  const BUNDLES = {
    'browser': 'hyperfixi.js',
    'hs': 'hyperfixi-hs.js'
    // multilingual, semantic-complete, dev and prod retired with their core
    // bundles in Phase C3 (C-R3); a page runs non-English hyperscript on hs
    // with @lokascript/hyperscript-adapter.
  };

  // Get bundle from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let bundleKey = urlParams.get('bundle');

  // Fall back to localStorage preference
  if (!bundleKey) {
    bundleKey = localStorage.getItem('hyperfixi:bundle');
  }

  // A page can name its own default: <script src="../bundle-loader.js" data-default="hs">
  if (!bundleKey || !BUNDLES[bundleKey]) {
    bundleKey = document.currentScript && document.currentScript.dataset.default;
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
    // (hyperfixi-hs.js is built by packages/engine, into its own dist/).
    const dist = bundleKey === 'hs' ? 'packages/engine/dist/' : 'packages/core/dist/';
    if (path.includes('/examples/')) {
      const afterExamples = path.split('/examples/')[1] || '';
      const depth = (afterExamples.match(/\//g) || []).length;

      if (depth === 0) {
        return '../' + dist + bundleFile;
      } else if (depth === 1) {
        return '../../' + dist + bundleFile;
      } else {
        return '../'.repeat(depth + 1) + dist + bundleFile;
      }
    }

    return '/' + dist + bundleFile;
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
      const browserPath = getBundlePath()
        .replace('packages/engine/dist/', 'packages/core/dist/')
        .replace(BUNDLES[bundleKey], BUNDLES['browser']);
      fallback.src = browserPath;

      fallback.onerror = function () {
        console.error('[HyperFixi] CRITICAL: Failed to load fallback browser bundle!');
        console.error(`[HyperFixi] Attempted fallback path: ${browserPath}`);
        console.error('[HyperFixi] Please check that packages/core/dist/hyperfixi.js exists');
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
      console.error('  2. packages/core/dist/hyperfixi.js exists');
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
