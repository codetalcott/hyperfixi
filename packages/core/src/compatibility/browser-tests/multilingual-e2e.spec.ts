/**
 * Multilingual Bundle End-to-End Tests
 *
 * Tests the complete multilingual bundle path in a real browser environment:
 * semantic bundle + multilingual bundle → parse → execute → DOM effect
 *
 * This is the ultimate integration test for the multilingual use case.
 */

import { test, expect } from '@playwright/test';

test.describe('Multilingual Bundle E2E', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Navigate to the test page that loads both bundles
    await page.goto(`${baseURL}/packages/core/test-multilingual-e2e.html`);

    // Wait for both bundles to load
    await page.waitForFunction(
      () => {
        return (
          typeof (window as any).LokaScriptSemantic !== 'undefined' &&
          typeof (window as any).hyperfixi !== 'undefined'
        );
      },
      { timeout: 10000 }
    );
  });

  test('bundles load correctly @quick', async ({ page }) => {
    const bundles = await page.evaluate(() => ({
      semantic: typeof (window as any).LokaScriptSemantic !== 'undefined',
      multilingual: typeof (window as any).hyperfixi !== 'undefined',
    }));

    expect(bundles.semantic).toBe(true);
    expect(bundles.multilingual).toBe(true);
  });

  test('execute function exists on hyperfixi', async ({ page }) => {
    const hasExecute = await page.evaluate(() => {
      return typeof (window as any).hyperfixi.execute === 'function';
    });
    expect(hasExecute).toBe(true);
  });

  test('parse function exists on hyperfixi', async ({ page }) => {
    const hasParse = await page.evaluate(() => {
      return typeof (window as any).hyperfixi.parse === 'function';
    });
    expect(hasParse).toBe(true);
  });

  // =============================================================================
  // English Execution Tests
  // =============================================================================

  test.describe('English Execution', () => {
    test('toggle command adds class @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('toggle .active', 'en', { me: el });
        return el.classList.contains('active');
      });

      expect(result).toBe(true);
    });

    test('toggle command removes class on second call', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('toggle .active', 'en', { me: el });
        await (window as any).hyperfixi.execute('toggle .active', 'en', { me: el });
        return el.classList.contains('active');
      });

      expect(result).toBe(false);
    });

    test('add command adds class @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('add .highlight', 'en', { me: el });
        return el.classList.contains('highlight');
      });

      expect(result).toBe(true);
    });

    test('remove command removes class', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        el.classList.add('existing');
        await (window as any).hyperfixi.execute('remove .existing', 'en', { me: el });
        return el.classList.contains('existing');
      });

      expect(result).toBe(false);
    });

    test('hide command hides element', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('hide me', 'en', { me: el });
        return el.style.display;
      });

      expect(result).toBe('none');
    });

    test('show command shows hidden element', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        el.style.display = 'none';
        await (window as any).hyperfixi.execute('show me', 'en', { me: el });
        return el.style.display !== 'none';
      });

      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Japanese Execution Tests (SOV word order)
  // =============================================================================

  test.describe('Japanese Execution', () => {
    test('toggle in Japanese (SOV order) @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('.active を トグル', 'ja', { me: el });
        return el.classList.contains('active');
      });

      expect(result).toBe(true);
    });

    test('add in Japanese', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('.highlight を 追加', 'ja', { me: el });
        return el.classList.contains('highlight');
      });

      expect(result).toBe(true);
    });

    test('remove in Japanese', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        el.classList.add('existing');
        await (window as any).hyperfixi.execute('.existing を 削除', 'ja', { me: el });
        return el.classList.contains('existing');
      });

      expect(result).toBe(false);
    });
  });

  // =============================================================================
  // Korean Execution Tests (SOV word order)
  // =============================================================================

  test.describe('Korean Execution', () => {
    test('toggle in Korean (SOV order) @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('.active 를 토글', 'ko', { me: el });
        return el.classList.contains('active');
      });

      expect(result).toBe(true);
    });

    test('add in Korean', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('.highlight 를 추가', 'ko', { me: el });
        return el.classList.contains('highlight');
      });

      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Spanish Execution Tests (SVO word order)
  // =============================================================================

  test.describe('Spanish Execution', () => {
    test('toggle in Spanish @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('alternar .active', 'es', { me: el });
        return el.classList.contains('active');
      });

      expect(result).toBe(true);
    });

    test('add in Spanish', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('añadir .highlight', 'es', { me: el });
        return el.classList.contains('highlight');
      });

      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Arabic Execution Tests (VSO word order)
  // =============================================================================

  test.describe('Arabic Execution', () => {
    test('toggle in Arabic @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const el = document.getElementById('test-element')!;
        await (window as any).hyperfixi.execute('بدّل .active', 'ar', { me: el });
        return el.classList.contains('active');
      });

      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Translation Tests
  // =============================================================================

  test.describe('Translation', () => {
    test('translate from English to Japanese @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).hyperfixi.translate('toggle .active', 'en', 'ja');
      });

      // Either katakana トグル or native Japanese 切り替え are valid translations
      expect(result).toMatch(/トグル|切り替え/);
    });

    test('translate from Japanese to English', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).hyperfixi.translate('.active を トグル', 'ja', 'en');
      });

      expect(result.toLowerCase()).toContain('toggle');
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  test.describe('Error Handling', () => {
    test('throws on unsupported language', async ({ page }) => {
      const error = await page.evaluate(async () => {
        try {
          await (window as any).hyperfixi.execute('toggle .active', 'xx', {});
          return null;
        } catch (e: any) {
          return e.message;
        }
      });

      expect(error).not.toBeNull();
    });

    test('throws on unparseable command', async ({ page }) => {
      const error = await page.evaluate(async () => {
        try {
          await (window as any).hyperfixi.execute('foobar baz', 'en', {});
          return null;
        } catch (e: any) {
          return e.message;
        }
      });

      expect(error).not.toBeNull();
      expect(error).toContain('Failed to parse');
    });
  });
});
