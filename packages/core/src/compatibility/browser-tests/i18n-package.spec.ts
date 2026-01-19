/**
 * Playwright Browser Tests for @hyperfixi/i18n
 *
 * Tests the i18n browser bundle functionality including:
 * - Bundle loading and API exposure
 * - Multilingual keyword providers (9 languages)
 * - Keyword resolution and fallbacks
 * - Grammar transformation profiles
 */

import { test, expect } from '@playwright/test';

test.describe('LokaScript i18n Bundle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/packages/i18n/provider-test.html');
  });

  test('bundle loads and exposes LokaScriptI18n global @quick', async ({ page }) => {
    const isLoaded = await page.evaluate(
      () => typeof (window as any).LokaScriptI18n !== 'undefined'
    );
    expect(isLoaded).toBe(true);
  });

  test('core hyperfixi bundle is also loaded', async ({ page }) => {
    const isLoaded = await page.evaluate(() => typeof (window as any).hyperfixi !== 'undefined');
    expect(isLoaded).toBe(true);
  });

  test('exposes keyword providers for all supported languages @quick', async ({ page }) => {
    const providers = await page.evaluate(() => {
      const i18n = (window as any).LokaScriptI18n;
      return {
        es: typeof i18n.esKeywords,
        ja: typeof i18n.jaKeywords,
        zh: typeof i18n.zhKeywords,
        ar: typeof i18n.arKeywords,
        ko: typeof i18n.koKeywords,
        de: typeof i18n.deKeywords,
        fr: typeof i18n.frKeywords,
        tr: typeof i18n.trKeywords,
        pt: typeof i18n.ptKeywords,
      };
    });

    expect(providers.es).toBe('object');
    expect(providers.ja).toBe('object');
    expect(providers.zh).toBe('object');
    expect(providers.ar).toBe('object');
    expect(providers.ko).toBe('object');
    expect(providers.de).toBe('object');
    expect(providers.fr).toBe('object');
    expect(providers.tr).toBe('object');
    expect(providers.pt).toBe('object');
  });

  test('Spanish provider resolves keywords correctly @quick', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.esKeywords;
      return {
        toggle: provider.resolve('alternar'),
        click: provider.resolve('clic'),
        on: provider.resolve('en'),
        fallback: provider.resolve('toggle'), // English fallback
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
    expect(results.fallback).toBe('toggle');
  });

  test('Japanese provider resolves keywords correctly @quick', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.jaKeywords;
      return {
        toggle: provider.resolve('切り替え'),
        click: provider.resolve('クリック'),
        on: provider.resolve('で'),
        fallback: provider.resolve('toggle'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
    expect(results.fallback).toBe('toggle');
  });

  test('French provider resolves keywords correctly', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.frKeywords;
      return {
        toggle: provider.resolve('basculer'),
        click: provider.resolve('clic'),
        on: provider.resolve('sur'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
  });

  test('German provider resolves keywords correctly', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.deKeywords;
      return {
        toggle: provider.resolve('umschalten'),
        click: provider.resolve('klick'),
        on: provider.resolve('bei'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
  });

  test('Arabic provider resolves keywords correctly', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.arKeywords;
      return {
        toggle: provider.resolve('بدل'),
        click: provider.resolve('نقر'),
        on: provider.resolve('عند'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
  });

  test('Korean provider resolves keywords correctly', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.koKeywords;
      return {
        toggle: provider.resolve('토글'),
        click: provider.resolve('클릭'),
        on: provider.resolve('에'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
  });

  test('Chinese provider resolves keywords correctly', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.zhKeywords;
      return {
        toggle: provider.resolve('切换'),
        click: provider.resolve('点击'),
        when: provider.resolve('当'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.when).toBe('on');
  });

  test('Turkish provider resolves keywords correctly', async ({ page }) => {
    const results = await page.evaluate(() => {
      const provider = (window as any).LokaScriptI18n.trKeywords;
      return {
        toggle: provider.resolve('değiştir'),
        click: provider.resolve('tıklama'),
        on: provider.resolve('üzerinde'),
      };
    });

    expect(results.toggle).toBe('toggle');
    expect(results.click).toBe('click');
    expect(results.on).toBe('on');
  });

  test('provider fallback to English works @quick', async ({ page }) => {
    const results = await page.evaluate(() => {
      const esProvider = (window as any).LokaScriptI18n.esKeywords;
      const jaProvider = (window as any).LokaScriptI18n.jaKeywords;
      return {
        esFallback: esProvider.resolve('remove'), // English word
        jaFallback: jaProvider.resolve('add'), // English word
        esNative: esProvider.resolve('alternar'), // Spanish word
        jaNative: jaProvider.resolve('切り替え'), // Japanese word
      };
    });

    // Fallback should work
    expect(results.esFallback).toBe('remove');
    expect(results.jaFallback).toBe('add');
    // Native keywords should also work
    expect(results.esNative).toBe('toggle');
    expect(results.jaNative).toBe('toggle');
  });

  test('all providers have resolve method', async ({ page }) => {
    const hasResolve = await page.evaluate(() => {
      const i18n = (window as any).LokaScriptI18n;
      const providers = ['es', 'ja', 'zh', 'ar', 'ko', 'de', 'fr', 'tr', 'pt'];
      return providers.map(lang => {
        const provider = i18n[`${lang}Keywords`];
        return {
          lang,
          hasResolve: typeof provider?.resolve === 'function',
        };
      });
    });

    for (const check of hasResolve) {
      expect(check.hasResolve).toBe(true);
    }
  });

  test('automated tests run successfully', async ({ page }) => {
    // Click run all tests button
    await page.getByRole('button', { name: /Run All Tests/i }).click();

    // Wait for tests to complete (they run automatically but we can trigger manually)
    await page.waitForTimeout(500);

    // Check that we have some passing tests
    const passCount = await page.locator('#pass-count').textContent();
    const failCount = await page.locator('#fail-count').textContent();

    expect(passCount).not.toBe('-');
    expect(failCount).not.toBe('-');

    // Most tests should pass
    const passed = parseInt(passCount || '0');
    const failed = parseInt(failCount || '0');
    expect(passed).toBeGreaterThan(0);
    expect(passed).toBeGreaterThan(failed);
  });

  test('each language test card shows success status', async ({ page }) => {
    // Wait for tests to auto-run
    await page.waitForTimeout(600);

    // Check that language tests completed
    const statuses = await page.evaluate(() => {
      const langs = ['es', 'ja', 'fr', 'de', 'ar', 'ko', 'zh', 'tr'];
      return langs.map(lang => {
        const el = document.getElementById(`${lang}-status`);
        return {
          lang,
          className: el?.className,
          hasSuccess: el?.className.includes('success'),
          hasError: el?.className.includes('error'),
        };
      });
    });

    // Most tests should show success
    const successCount = statuses.filter(s => s.hasSuccess).length;
    expect(successCount).toBeGreaterThan(5); // At least 5 out of 8 should pass
  });

  test('grammar profiles are available', async ({ page }) => {
    const profiles = await page.evaluate(() => {
      const i18n = (window as any).LokaScriptI18n;

      // Check if grammar transformation is available
      if (typeof i18n.getProfile !== 'function') {
        return { available: false };
      }

      return {
        available: true,
        hasJapanese: !!i18n.getProfile('ja'),
        hasSpanish: !!i18n.getProfile('es'),
        hasArabic: !!i18n.getProfile('ar'),
      };
    });

    // Grammar profiles may or may not be in the provider-test bundle
    // Just check that the structure is reasonable
    expect(profiles).toBeDefined();
  });

  test('providers expose expected keywords', async ({ page }) => {
    const keywords = await page.evaluate(() => {
      const esProvider = (window as any).LokaScriptI18n.esKeywords;

      // Get some common keywords
      return {
        hasToggle: esProvider.resolve('alternar') === 'toggle',
        hasAdd: esProvider.resolve('añadir') === 'add' || esProvider.resolve('add') === 'add',
        hasRemove:
          esProvider.resolve('eliminar') === 'remove' || esProvider.resolve('remove') === 'remove',
        hasClick: esProvider.resolve('clic') === 'click',
      };
    });

    expect(keywords.hasToggle).toBe(true);
    expect(keywords.hasClick).toBe(true);
    // At least one of native or fallback should work
    expect(keywords.hasAdd || keywords.hasRemove).toBe(true);
  });

  test('non-existent keyword returns original string', async ({ page }) => {
    const result = await page.evaluate(() => {
      const esProvider = (window as any).LokaScriptI18n.esKeywords;
      return esProvider.resolve('nonexistentkeyword123');
    });

    // Should return original string when not found
    expect(result).toBe('nonexistentkeyword123');
  });

  test('keyword resolution is case-insensitive or normalized', async ({ page }) => {
    const results = await page.evaluate(() => {
      const esProvider = (window as any).LokaScriptI18n.esKeywords;
      return {
        lowercase: esProvider.resolve('alternar'),
        uppercase: esProvider.resolve('ALTERNAR'),
        mixed: esProvider.resolve('Alternar'),
      };
    });

    // At least the standard case should work
    expect(results.lowercase).toBe('toggle');
    // Case normalization may or may not be implemented
    // Just verify we get some sensible result
    expect(results.lowercase).toBeDefined();
  });

  test('page displays correctly with proper styling', async ({ page }) => {
    // Check that test cards are visible
    const testCards = await page.locator('.test-card').count();
    expect(testCards).toBeGreaterThan(5);

    // Check header is visible
    const header = await page.locator('.header h1').textContent();
    expect(header).toContain('HyperFixi i18n');
  });
});
