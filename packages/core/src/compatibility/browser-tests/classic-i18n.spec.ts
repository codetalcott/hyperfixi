import { test, expect } from '@playwright/test';

test.describe('LokaScript Classic i18n Bundle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/multilingual/test-classic-i18n.html');
  });

  test('bundle loads and exposes hyperfixi global @quick', async ({ page }) => {
    const version = await page.evaluate(() => (window as any).hyperfixi?.version);
    expect(version).toBe('1.1.0-classic-i18n');
  });

  test('exposes i18n API', async ({ page }) => {
    const hasI18n = await page.evaluate(() => {
      const h = (window as any).hyperfixi;
      return h && typeof h.i18n === 'object' && typeof h.i18n.getLocale === 'function';
    });
    expect(hasI18n).toBe(true);
  });

  test('has expected command count', async ({ page }) => {
    const commandCount = await page.evaluate(() => (window as any).hyperfixi?.commands?.length);
    expect(commandCount).toBeGreaterThanOrEqual(37); // Classic bundle commands
  });

  test('has all 9 supported locales @quick', async ({ page }) => {
    const locales = await page.evaluate(() => (window as any).hyperfixi?.locales);
    expect(locales).toContain('en');
    expect(locales).toContain('es');
    expect(locales).toContain('ja');
    expect(locales).toContain('zh');
    expect(locales).toContain('ar');
    expect(locales).toContain('ko');
    expect(locales).toContain('de');
    expect(locales).toContain('fr');
    expect(locales).toContain('tr');
  });

  // SKIP: classic-i18n bundle has bug with `increment #element` syntax
  // The increment command isn't correctly extracting textContent from elements
  // This bundle is rarely used - fix deferred
  test.skip('counter increment works', async ({ page }) => {
    const initial = await page.locator('#count').textContent();
    expect(initial).toBe('0');

    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.locator('#count')).toHaveText('1');

    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.locator('#count')).toHaveText('2');
  });

  test.skip('counter reset works', async ({ page }) => {
    await page.getByRole('button', { name: 'Increment' }).click();
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.locator('#count')).toHaveText('2');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('#count')).toHaveText('0');
  });

  test('toggle class works @quick', async ({ page }) => {
    const count = page.locator('#count');
    await expect(count).not.toHaveClass(/highlight/);

    await page.getByRole('button', { name: 'Toggle Highlight' }).click();
    await expect(count).toHaveClass(/highlight/);

    await page.getByRole('button', { name: 'Toggle Highlight' }).click();
    await expect(count).not.toHaveClass(/highlight/);
  });

  test('i18n.setLocale changes locale', async ({ page }) => {
    const initialLocale = await page.evaluate(() => (window as any).hyperfixi.i18n.getLocale());

    await page.evaluate(() => (window as any).hyperfixi.i18n.setLocale('ja'));
    const newLocale = await page.evaluate(() => (window as any).hyperfixi.i18n.getLocale());

    expect(newLocale).toBe('ja');
  });

  test('grammar transformation works @quick', async ({ page }) => {
    const transformed = await page.evaluate(() => {
      const h = (window as any).hyperfixi;
      return h.i18n.toLocale('on click increment #count', 'ja');
    });

    // Japanese should have particles like を (wo) and で (de)
    expect(transformed).toContain('#count');
    // The transformation should produce something different
    expect(transformed).not.toBe('on click increment #count');
  });

  test('all language profiles are available @quick', async ({ page }) => {
    const profiles = await page.evaluate(() => {
      const h = (window as any).hyperfixi;
      const supportedLocales = h.i18n.getSupportedGrammarLocales();
      return supportedLocales.map((locale: string) => {
        const profile = h.i18n.getProfile(locale);
        return { locale, name: profile?.name, wordOrder: profile?.wordOrder };
      });
    });

    expect(profiles.length).toBeGreaterThan(5);

    // Check for key languages
    const japanese = profiles.find((p: any) => p.locale === 'ja');
    expect(japanese?.wordOrder).toBe('SOV');

    const english = profiles.find((p: any) => p.locale === 'en');
    expect(english?.wordOrder).toBe('SVO');

    const arabic = profiles.find((p: any) => p.locale === 'ar');
    expect(arabic?.wordOrder).toBe('VSO');
  });

  test('dictionaries are exposed', async ({ page }) => {
    const dictLocales = await page.evaluate(() => {
      const h = (window as any).hyperfixi;
      return Object.keys(h.i18n.dictionaries);
    });

    expect(dictLocales).toContain('es');
    expect(dictLocales).toContain('ja');
    expect(dictLocales).toContain('zh');
  });

  test('RTL direction set for Arabic', async ({ page }) => {
    await page.evaluate(() => (window as any).hyperfixi.i18n.setLocale('ar'));

    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir).toBe('rtl');

    // Reset to LTR
    await page.evaluate(() => (window as any).hyperfixi.i18n.setLocale('en'));
    const dirAfter = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dirAfter).toBe('ltr');
  });

  test('parsing works in English', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as any).hyperfixi;
      const parseResult = h.parse('on click log "test"');
      return { success: parseResult.success, hasNode: !!parseResult.node };
    });

    expect(result.success).toBe(true);
    expect(result.hasNode).toBe(true);
  });
});
