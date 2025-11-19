import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Disable all caching
    bypassCSP: true
  });
  const page = await context.newPage();

  // Disable cache completely
  await page.route('**/*', route => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  });

  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  console.log('Loading compound-examples.html with cache disabled...');
  await page.goto(`http://localhost:3000/compound-examples.html?v=${Date.now()}`, {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(3000);

  console.log('\n=== ALL CONSOLE LOGS ===');
  logs.forEach((log, i) => {
    if (log.includes('SCRIPT') || log.includes('behavior') || log.includes('Draggable')) {
      console.log(`[${i}] ${log}`);
    }
  });

  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log(e));
  }

  console.log('\n=== CHECKING STATE ===');
  const result = await page.evaluate(() => {
    // Check if hyperfixi is loaded
    if (typeof hyperfixi === 'undefined') {
      return { error: 'hyperfixi not loaded' };
    }

    // Check script tags
    const scriptTags = document.querySelectorAll('script[type="text/hyperscript"]');

    return {
      hyperfixiLoaded: true,
      scriptTagCount: scriptTags.length,
      scriptContent: scriptTags.length > 0 ? scriptTags[0].textContent.substring(0, 100) : null,
      hasBehaviorRegistry: !!hyperfixi._runtime,
      behaviorCount: hyperfixi._runtime && hyperfixi._runtime._behaviors ? hyperfixi._runtime._behaviors.size : 'N/A',
      item1HasAttr: !!document.querySelector('#item1')?.getAttribute('_')
    };
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
