/**
 * HyperFixi Bundle Loader
 *
 * Dynamically loads the correct bundle based on URL parameter.
 * Include this INSTEAD of the bundle script directly.
 *
 * Usage:
 *   <script src="../bundle-loader.js"></script>
 *   <!-- No need to include hyperfixi-browser.js -->
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
    'browser': 'hyperfixi-browser.js',
    'hybrid-complete': 'hyperfixi-hybrid-complete.js',
    'lite': 'hyperfixi-lite.js',
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

    // Determine depth from examples folder
    if (path.includes('/examples/')) {
      const afterExamples = path.split('/examples/')[1] || '';
      const depth = (afterExamples.match(/\//g) || []).length;

      if (depth === 0) {
        // examples/index.html
        return '../packages/core/dist/' + bundleFile;
      } else if (depth === 1) {
        // examples/basics/01-hello.html
        return '../../packages/core/dist/' + bundleFile;
      } else {
        // deeper nesting
        return '../'.repeat(depth + 1) + 'packages/core/dist/' + bundleFile;
      }
    }

    // Fallback for other locations
    return '/packages/core/dist/' + bundleFile;
  }

  // Create and inject script
  const script = document.createElement('script');
  script.src = getBundlePath();
  script.async = false;

  script.onerror = function () {
    console.error(`[HyperFixi] Failed to load bundle: ${bundleKey}`);
    console.error('Falling back to browser bundle...');

    // Fallback to default bundle
    const fallback = document.createElement('script');
    fallback.src = getBundlePath().replace(BUNDLES[bundleKey], BUNDLES['browser']);
    document.head.appendChild(fallback);
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
