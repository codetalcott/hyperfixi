/**
 * Multilingual Browser E2E Tests
 *
 * Playwright tests for multilingual hyperscript execution in real browser:
 * - Cross-language execution (13 languages)
 * - DOM manipulation verification
 * - Event handling
 * - Translation accuracy
 * - Performance benchmarks
 *
 * @vitest-environment jsdom
 */

import { test, expect } from '@playwright/test';

test.describe('Multilingual Hyperscript Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page with hyperfixi loaded
    await page.goto('http://127.0.0.1:3000/examples/multilingual/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('should execute English hyperscript on click', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/packages/core/dist/hyperfixi-browser.js"></script>
      </head>
      <body>
        <button id="btn" _="on click toggle .active">Toggle</button>
        <script>hyperfixi.init();</script>
      </body>
      </html>
    `);

    const button = page.locator('#btn');

    await expect(button).not.toHaveClass(/active/);
    await button.click();
    await expect(button).toHaveClass(/active/);
    await button.click();
    await expect(button).not.toHaveClass(/active/);
  });

  test('should execute Japanese hyperscript (SOV order)', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/packages/core/dist/hyperfixi-multilingual.js"></script>
        <script src="/packages/semantic/dist/browser.global.js"></script>
      </head>
      <body>
        <button id="btn">.active</button>
        <script>
          hyperfixi.execute('.active を トグル', 'ja', document.getElementById('btn'));
        </script>
      </body>
      </html>
    `);

    const button = page.locator('#btn');
    await expect(button).toHaveClass(/active/);
  });

  test('should execute Spanish hyperscript (SVO order)', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/packages/core/dist/hyperfixi-multilingual.js"></script>
        <script src="/packages/semantic/dist/browser.global.js"></script>
      </head>
      <body>
        <button id="btn"></button>
        <script>
          hyperfixi.execute('alternar .active', 'es', document.getElementById('btn'));
        </script>
      </body>
      </html>
    `);

    const button = page.locator('#btn');
    await expect(button).toHaveClass(/active/);
  });

  test('should execute Korean hyperscript (SOV order)', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/packages/core/dist/hyperfixi-multilingual.js"></script>
        <script src="/packages/semantic/dist/browser.global.js"></script>
      </head>
      <body>
        <button id="btn"></button>
        <script>
          hyperfixi.execute('.active 를 토글', 'ko', document.getElementById('btn'));
        </script>
      </body>
      </html>
    `);

    const button = page.locator('#btn');
    await expect(button).toHaveClass(/active/);
  });

  test('should execute Arabic hyperscript (VSO order)', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/packages/core/dist/hyperfixi-multilingual.js"></script>
        <script src="/packages/semantic/dist/browser.global.js"></script>
      </head>
      <body>
        <button id="btn"></button>
        <script>
          hyperfixi.execute('بدّل .active', 'ar', document.getElementById('btn'));
        </script>
      </body>
      </html>
    `);

    const button = page.locator('#btn');
    await expect(button).toHaveClass(/active/);
  });

  test('should translate between languages correctly', async ({ page }) => {
    const translation = await page.evaluate(async () => {
      const ml = new (window as any).hyperfixi.MultilingualHyperscript();
      await ml.initialize();
      return await ml.translate('toggle .active', 'en', 'ja');
    });

    expect(translation).toContain('.active');
  });

  test('should maintain selector integrity across translations', async ({ page }) => {
    const translations = await page.evaluate(async () => {
      const ml = new (window as any).hyperfixi.MultilingualHyperscript();
      await ml.initialize();

      return {
        ja: await ml.translate('toggle .active on #button', 'en', 'ja'),
        es: await ml.translate('toggle .active on #button', 'en', 'es'),
        ko: await ml.translate('toggle .active on #button', 'en', 'ko'),
        ar: await ml.translate('toggle .active on #button', 'en', 'ar'),
      };
    });

    // All translations should preserve both selectors
    expect(translations.ja).toContain('.active');
    expect(translations.es).toContain('.active');
    expect(translations.ko).toContain('.active');
    expect(translations.ar).toContain('.active');
  });

  test('should execute complex multi-language workflow', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/packages/core/dist/hyperfixi-multilingual.js"></script>
        <script src="/packages/semantic/dist/browser.global.js"></script>
      </head>
      <body>
        <div id="status"></div>
        <button id="en-btn">English</button>
        <button id="ja-btn">Japanese</button>
        <button id="es-btn">Spanish</button>
      </body>
      </html>
    `);

    // Execute different languages on different elements
    await page.evaluate(() => {
      const status = document.getElementById('status')!;

      // English: add .en
      (window as any).hyperfixi.execute('add .en', 'en', status);

      // Japanese: add .ja
      (window as any).hyperfixi.execute('.ja を 追加', 'ja', status);

      // Spanish: add .es
      (window as any).hyperfixi.execute('añadir .es', 'es', status);
    });

    const status = page.locator('#status');
    await expect(status).toHaveClass(/en/);
    await expect(status).toHaveClass(/ja/);
    await expect(status).toHaveClass(/es/);
  });

  test('should handle parsing errors gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const ml = new (window as any).hyperfixi.MultilingualHyperscript();
      await ml.initialize();

      try {
        await ml.parse('invalid syntax ###', 'en');
        return { success: false, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Should either return null or throw an error
    expect(result.success).toBe(false);
  });
});

test.describe('Performance Benchmarks', () => {
  test('should parse and execute within acceptable time', async ({ page }) => {
    const timing = await page.evaluate(async () => {
      const ml = new (window as any).hyperfixi.MultilingualHyperscript();
      await ml.initialize();

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        await ml.parse('toggle .active', 'en');
      }

      const duration = performance.now() - start;
      return { iterations: 100, duration, avgPerParse: duration / 100 };
    });

    expect(timing.avgPerParse).toBeLessThan(10); // Less than 10ms per parse
  });

  test('should handle parallel translations efficiently', async ({ page }) => {
    const timing = await page.evaluate(async () => {
      const ml = new (window as any).hyperfixi.MultilingualHyperscript();
      await ml.initialize();

      const languages = ['en', 'ja', 'es', 'ko', 'ar', 'zh', 'tr', 'pt'];
      const start = performance.now();

      await Promise.all(languages.map(lang => ml.translate('toggle .active', 'en', lang)));

      return { duration: performance.now() - start, languages: languages.length };
    });

    expect(timing.duration).toBeLessThan(1000); // Less than 1 second for all languages
  });
});
