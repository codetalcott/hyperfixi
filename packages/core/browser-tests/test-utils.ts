/**
 * Shared test utilities for Playwright browser tests
 *
 * Provides condition-based wait functions to replace arbitrary waitForTimeout() calls.
 * Import these utilities instead of using fixed delays.
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for HyperFixi to be fully initialized
 * Replaces: await page.waitForTimeout(2000) after page load
 */
export async function waitForHyperfixi(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => (window as any).hyperfixi !== undefined, { timeout });
}

/**
 * Wait for HyperFixi with evalHyperScript function available
 * Use when tests need to evaluate expressions
 */
export async function waitForEvalHyperScript(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => typeof (window as any).evalHyperScript === 'function', {
    timeout,
  });
}

/**
 * Wait for behavior system to be initialized
 * Replaces: await page.waitForTimeout(1000) after behavior-heavy page loads
 */
export async function waitForBehaviors(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      const hs = (window as any)._hyperscript;
      return hs?.behaviors !== undefined || (window as any).hyperfixi !== undefined;
    },
    { timeout }
  );
}

/**
 * Wait for semantic bundle to load
 */
export async function waitForSemantic(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => (window as any).HyperFixiSemantic !== undefined, { timeout });
}

/**
 * Wait for multilingual bundle to load
 */
export async function waitForMultilingual(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      const hf = (window as any).hyperfixi;
      return hf?.execute !== undefined && hf?.parse !== undefined;
    },
    { timeout }
  );
}

/**
 * Wait for an element to have a specific class
 * Replaces: await page.waitForTimeout(500) after click + manual class check
 */
export async function waitForClass(
  page: Page,
  selector: string,
  className: string,
  timeout = 5000
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveClass(new RegExp(className), { timeout });
}

/**
 * Wait for an element to NOT have a specific class
 */
export async function waitForNoClass(
  page: Page,
  selector: string,
  className: string,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    ({ sel, cls }) => {
      const el = document.querySelector(sel);
      return el && !el.classList.contains(cls);
    },
    { sel: selector, cls: className },
    { timeout }
  );
}

/**
 * Wait for element text content to match
 * Replaces: await page.waitForTimeout(300) after content update + manual text check
 */
export async function waitForText(
  page: Page,
  selector: string,
  expectedText: string | RegExp,
  timeout = 5000
): Promise<void> {
  const locator = page.locator(selector);
  if (typeof expectedText === 'string') {
    await expect(locator).toHaveText(expectedText, { timeout });
  } else {
    await expect(locator).toHaveText(expectedText, { timeout });
  }
}

/**
 * Wait for element innerHTML to match
 */
export async function waitForInnerHTML(
  page: Page,
  selector: string,
  expectedHTML: string,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    ({ sel, html }) => {
      const el = document.querySelector(sel);
      return el?.innerHTML === html;
    },
    { sel: selector, html: expectedHTML },
    { timeout }
  );
}

/**
 * Wait for element to be visible
 */
export async function waitForVisible(page: Page, selector: string, timeout = 5000): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Wait for element to be hidden
 */
export async function waitForHidden(page: Page, selector: string, timeout = 5000): Promise<void> {
  await expect(page.locator(selector)).toBeHidden({ timeout });
}

/**
 * Error collector for capturing console errors and page errors
 * Use in beforeEach to attach, then check errors array in assertions
 */
export interface ErrorCollector {
  errors: string[];
  attach: () => void;
  clear: () => void;
  getCriticalErrors: () => string[];
}

export function createErrorCollector(page: Page): ErrorCollector {
  const errors: string[] = [];

  return {
    errors,
    attach: () => {
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      page.on('pageerror', err => {
        errors.push(`PageError: ${err.message}`);
      });
    },
    clear: () => {
      errors.length = 0;
    },
    getCriticalErrors: () => {
      // Filter out expected errors (network, favicon, etc.)
      return errors.filter(
        e =>
          !e.includes('net::') && !e.includes('Failed to load resource') && !e.includes('favicon')
      );
    },
  };
}

/**
 * Assert no critical console errors occurred
 */
export function expectNoCriticalErrors(collector: ErrorCollector): void {
  const critical = collector.getCriticalErrors();
  if (critical.length > 0) {
    throw new Error(`Critical errors found:\n${critical.join('\n')}`);
  }
}
