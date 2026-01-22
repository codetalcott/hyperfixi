import { test, expect } from '@playwright/test';

/**
 * Sanity Check: Basic expression tests
 * This is a minimal test to verify the test infrastructure is working.
 */

test.describe('Math Operator Sanity Check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      if (typeof window.lokascript === 'undefined') {
        throw new Error('HyperFixi not loaded');
      }
    });
  });

  test('addition works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 + 1');
      return r;
    });
    expect(result).toBe(2);
  });

  test('string concat works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript("'a' + 'b'");
      return r;
    });
    expect(result).toBe('ab');
  });

  test('subtraction works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 - 1');
      return r;
    });
    expect(result).toBe(0);
  });

  test('multiplication works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 * 2');
      return r;
    });
    expect(result).toBe(2);
  });

  test('division works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 / 2');
      return r;
    });
    expect(result).toBe(0.5);
  });

  test('mod works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('3 mod 2');
      return r;
    });
    expect(result).toBe(1);
  });

  test('addition with multiple values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 + 2 + 3');
      return r;
    });
    expect(result).toBe(6);
  });

  test('array literal empty', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('[]');
      return r;
    });
    expect(result).toEqual([]);
  });

  test('array literal with values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('[1, 2, 3]');
      return r;
    });
    expect(result).toEqual([1, 2, 3]);
  });

  test('boolean true', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('true');
      return r;
    });
    expect(result).toBe(true);
  });

  test('boolean false', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('false');
      return r;
    });
    expect(result).toBe(false);
  });

  test('string literal', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('"hello"');
      return r;
    });
    expect(result).toBe('hello');
  });

  test('comparison equals', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 == 1');
      return r;
    });
    expect(result).toBe(true);
  });

  test('comparison not equals', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 != 2');
      return r;
    });
    expect(result).toBe(true);
  });

  test('comparison less than', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('1 < 2');
      return r;
    });
    expect(result).toBe(true);
  });

  test('comparison greater than', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('2 > 1');
      return r;
    });
    expect(result).toBe(true);
  });

  test('logical and', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('true and true');
      return r;
    });
    expect(result).toBe(true);
  });

  test('logical or', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('true or false');
      return r;
    });
    expect(result).toBe(true);
  });

  test('logical not', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await (window as any).evalHyperScript('not false');
      return r;
    });
    expect(result).toBe(true);
  });
});
