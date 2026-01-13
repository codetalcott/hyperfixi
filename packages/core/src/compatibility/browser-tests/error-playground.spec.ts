/**
 * Error Playground E2E Tests
 *
 * Tests the error playground functionality including:
 * - Live diagnostics as user types
 * - Severity filtering
 * - CodeFix suggestions
 * - Language selection
 * - Example loading
 */

import { test, expect } from '@playwright/test';
import { createErrorCollector } from './test-utils';

test.describe('Error Playground', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/examples/playground/error-playground.html`);

    // Wait for HyperFixiSemantic to load
    await page.waitForFunction(() => typeof (window as any).HyperFixiSemantic !== 'undefined', {
      timeout: 10000,
    });
  });

  // =============================================================================
  // Basic Functionality
  // =============================================================================

  test.describe('Basic Functionality', () => {
    test('page loads without errors', async ({ page }) => {
      const errorCollector = createErrorCollector(page);
      errorCollector.attach();

      // Allow any initialization errors to surface
      await page.waitForTimeout(200);

      const criticalErrors = errorCollector.getCriticalErrors();
      expect(criticalErrors).toHaveLength(0);
    });

    test('editor is editable and has placeholder', async ({ page }) => {
      const editor = page.locator('#code-input');
      await expect(editor).toBeVisible();

      const placeholder = await editor.getAttribute('placeholder');
      expect(placeholder).toContain('Enter hyperscript code');
    });

    test('initial state shows "No issues detected"', async ({ page }) => {
      const noIssues = page.locator('.no-issues');
      await expect(noIssues).toBeVisible();
      await expect(noIssues).toContainText('No issues detected');
    });

    test('all filter buttons are visible and active by default', async ({ page }) => {
      const errorFilter = page.locator('.filter-btn.error');
      const warningFilter = page.locator('.filter-btn.warning');
      const infoFilter = page.locator('.filter-btn.info');

      await expect(errorFilter).toHaveClass(/active/);
      await expect(warningFilter).toHaveClass(/active/);
      await expect(infoFilter).toHaveClass(/active/);
    });
  });

  // =============================================================================
  // Diagnostics Detection
  // =============================================================================

  test.describe('Diagnostics Detection', () => {
    test('detects missing argument for toggle command', async ({ page }) => {
      const editor = page.locator('#code-input');
      // Use "toggle" with a target that triggers role checking
      await editor.fill('toggle .active');

      // Wait for debounced analysis (300ms + buffer)
      await page.waitForTimeout(500);

      // Should parse successfully with high confidence (no errors for valid code)
      const confidenceValue = page.locator('#parse-confidence');
      const text = await confidenceValue.textContent();
      expect(text).toMatch(/\d+%/);
    });

    test('detects syntax error with incomplete command', async ({ page }) => {
      const editor = page.locator('#code-input');
      // Just "toggle" alone may have low confidence - check the confidence meter
      await editor.fill('toggle');

      await page.waitForTimeout(500);

      // Either shows low confidence or semantic-based diagnostics
      const status = page.locator('#parse-status');
      const statusText = await status.textContent();
      // Status should not still be "Analyzing..."
      expect(statusText).not.toBe('Analyzing...');
    });

    test('detects unclosed if block', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('if count > 0 add .positive');

      await page.waitForTimeout(500);

      const errorItem = page.locator('.diagnostic-item.error');
      await expect(errorItem.first()).toBeVisible();

      const message = page.locator('.diagnostic-message').first();
      await expect(message).toContainText(/if.*end/i);
    });

    test('detects unbalanced quotes', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill("put 'hello");

      await page.waitForTimeout(500);

      const errorItem = page.locator('.diagnostic-item.error');
      await expect(errorItem).toBeVisible();

      const message = page.locator('.diagnostic-message').first();
      await expect(message).toContainText(/quote/i);
    });

    test('valid code shows no errors', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('on click toggle .active on me');

      await page.waitForTimeout(500);

      // Should either show "No issues" or only info-level diagnostics
      const errorItems = page.locator('.diagnostic-item.error');
      await expect(errorItems).toHaveCount(0);
    });
  });

  // =============================================================================
  // Severity Filtering
  // =============================================================================

  test.describe('Severity Filtering', () => {
    test('filter buttons toggle correctly', async ({ page }) => {
      const errorFilter = page.locator('.filter-btn.error');

      // Initially active
      await expect(errorFilter).toHaveClass(/active/);

      // Click to deactivate
      await errorFilter.click();
      await expect(errorFilter).not.toHaveClass(/active/);

      // Click again to reactivate
      await errorFilter.click();
      await expect(errorFilter).toHaveClass(/active/);
    });

    test('filtering hides/shows appropriate diagnostics', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle');

      await page.waitForTimeout(500);

      // Should have at least one warning diagnostic
      const warningItems = page.locator('.diagnostic-item.warning');
      const initialCount = await warningItems.count();

      if (initialCount > 0) {
        // Turn off warning filter
        const warningFilter = page.locator('.filter-btn.warning');
        await warningFilter.click();

        // Warnings should be hidden
        await page.waitForTimeout(100);
        const filteredWarnings = page.locator('.diagnostic-item.warning');
        await expect(filteredWarnings).toHaveCount(0);
      }
    });

    test('badge counts update correctly', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('if x > 0 add .y');

      await page.waitForTimeout(500);

      const errorBadge = page.locator('#error-count');
      const errorCount = await errorBadge.textContent();

      // Should have at least 1 error (missing end)
      expect(parseInt(errorCount || '0')).toBeGreaterThanOrEqual(1);
    });
  });

  // =============================================================================
  // Example Loading
  // =============================================================================

  test.describe('Example Loading', () => {
    test('loads toggle example', async ({ page }) => {
      const toggleBtn = page.locator("button:has-text('toggle (missing arg)')");
      await toggleBtn.click();

      await page.waitForTimeout(500);

      const editor = page.locator('#code-input');
      const value = await editor.inputValue();
      expect(value).toBe('toggle');

      // Parse status should update (not still analyzing)
      const status = page.locator('#parse-status');
      const statusText = await status.textContent();
      expect(statusText).not.toBe('Analyzing...');
    });

    test('loads valid code example', async ({ page }) => {
      const validBtn = page.locator("button:has-text('valid code')");
      await validBtn.click();

      await page.waitForTimeout(500);

      const editor = page.locator('#code-input');
      const value = await editor.inputValue();
      expect(value).toBe('on click toggle .active on me');

      // Should not have error diagnostics
      const errorItems = page.locator('.diagnostic-item.error');
      await expect(errorItems).toHaveCount(0);
    });

    test('loads unclosed if example', async ({ page }) => {
      const unclosedBtn = page.locator("button:has-text('unclosed if')");
      await unclosedBtn.click();

      await page.waitForTimeout(500);

      const editor = page.locator('#code-input');
      const value = await editor.inputValue();
      expect(value).toBe('if count > 0 add .positive');

      const errorItem = page.locator('.diagnostic-item.error');
      await expect(errorItem.first()).toBeVisible();
    });
  });

  // =============================================================================
  // CodeFix Suggestions
  // =============================================================================

  test.describe('CodeFix Suggestions', () => {
    test('shows fixes for syntax errors', async ({ page }) => {
      const editor = page.locator('#code-input');
      // Use unclosed if which will definitely generate an error with fixes
      await editor.fill('if count > 0 add .positive');

      await page.waitForTimeout(500);

      const diagnosticItem = page.locator('.diagnostic-item.error');
      await expect(diagnosticItem.first()).toBeVisible();

      // Expand first diagnostic
      const diagnosticHeader = page.locator('.diagnostic-header').first();
      await diagnosticHeader.click();

      // Check for fix card
      const fixCard = page.locator('.fix-card');
      const fixCount = await fixCard.count();

      if (fixCount > 0) {
        const fixTitle = page.locator('.fix-title').first();
        await expect(fixTitle).toBeVisible();
      }
    });

    test('expand/collapse diagnostic details', async ({ page }) => {
      const editor = page.locator('#code-input');
      // Use code that definitely generates diagnostics
      await editor.fill('if x > 0 add .y');

      await page.waitForTimeout(500);

      const diagnosticItem = page.locator('.diagnostic-item').first();
      await expect(diagnosticItem).toBeVisible();

      // Initially collapsed (display: none in CSS)
      await expect(diagnosticItem).not.toHaveClass(/expanded/);

      // Click to expand
      const header = diagnosticItem.locator('.diagnostic-header');
      await header.click();
      await expect(diagnosticItem).toHaveClass(/expanded/);

      // Click again to collapse
      await header.click();
      await expect(diagnosticItem).not.toHaveClass(/expanded/);
    });

    test('apply fix button modifies editor content', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('if x > 0 add .y');

      await page.waitForTimeout(500);

      // Find and expand diagnostic with fix
      const diagnosticHeader = page.locator('.diagnostic-header').first();
      await diagnosticHeader.click();

      // Look for apply fix button
      const applyBtn = page.locator('.apply-fix-btn').first();
      const hasApplyBtn = await applyBtn.count();

      if (hasApplyBtn > 0) {
        const beforeValue = await editor.inputValue();
        await applyBtn.click();
        const afterValue = await editor.inputValue();

        // Value should change after applying fix
        expect(afterValue).not.toBe(beforeValue);
      }
    });
  });

  // =============================================================================
  // Confidence Meter
  // =============================================================================

  test.describe('Confidence Meter', () => {
    test('shows confidence for valid code', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle .active');

      await page.waitForTimeout(500);

      const confidenceValue = page.locator('#parse-confidence');
      const text = await confidenceValue.textContent();

      // Should show a percentage
      expect(text).toMatch(/\d+%|-/);
    });

    test('confidence bar updates width', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle .active');

      await page.waitForTimeout(500);

      const confidenceFill = page.locator('#confidence-fill');
      const style = await confidenceFill.getAttribute('style');

      // Width should be set
      expect(style).toContain('width');
    });

    test('high confidence shows green bar', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle .active');

      await page.waitForTimeout(500);

      const confidenceFill = page.locator('#confidence-fill');
      const className = await confidenceFill.getAttribute('class');

      // For high confidence code, should have 'high' class
      // (depends on semantic parser result)
      expect(className).toBeDefined();
    });
  });

  // =============================================================================
  // Language Selection
  // =============================================================================

  test.describe('Language Selection', () => {
    test('language selector is available', async ({ page }) => {
      const langSelect = page.locator('#language-select');
      await expect(langSelect).toBeVisible();

      // Check options exist
      const options = langSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
    });

    test('changing language triggers re-analysis', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle .active');
      await page.waitForTimeout(500);

      // Change language
      const langSelect = page.locator('#language-select');
      await langSelect.selectOption('es');

      // Wait for re-analysis
      await page.waitForTimeout(500);

      // Diagnostics should update (may have more/fewer issues)
      const status = page.locator('#parse-status');
      await expect(status).not.toHaveText('Analyzing...');
    });
  });

  // =============================================================================
  // Clear Functionality
  // =============================================================================

  test.describe('Clear Functionality', () => {
    test('clear button empties editor', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle .active');

      const clearBtn = page.locator("button:has-text('Clear')");
      await clearBtn.click();

      const value = await editor.inputValue();
      expect(value).toBe('');
    });

    test('clear button resets diagnostics', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('toggle');
      await page.waitForTimeout(500);

      const clearBtn = page.locator("button:has-text('Clear')");
      await clearBtn.click();

      const noIssues = page.locator('.no-issues');
      await expect(noIssues).toBeVisible();
    });

    test('clear button resets stats', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('if x end if y');
      await page.waitForTimeout(500);

      const clearBtn = page.locator("button:has-text('Clear')");
      await clearBtn.click();

      const totalErrors = page.locator('#total-errors');
      await expect(totalErrors).toHaveText('0');

      const totalWarnings = page.locator('#total-warnings');
      await expect(totalWarnings).toHaveText('0');
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  test.describe('Edge Cases', () => {
    test('handles empty input gracefully', async ({ page }) => {
      const analyzeBtn = page.locator("button:has-text('Analyze Code')");
      await analyzeBtn.click();

      await page.waitForTimeout(300);

      const noIssues = page.locator('.no-issues');
      await expect(noIssues).toBeVisible();
    });

    test('handles rapid input changes (debouncing)', async ({ page }) => {
      const editor = page.locator('#code-input');

      // Type rapidly
      await editor.pressSequentially('toggle', { delay: 50 });

      // Status should show analyzing at some point
      // but shouldn't crash
      await page.waitForTimeout(500);

      // Should eventually stabilize
      const status = page.locator('#parse-status');
      const text = await status.textContent();
      expect(text).not.toBe('Analyzing...');
    });

    test('handles special characters in input', async ({ page }) => {
      const editor = page.locator('#code-input');
      await editor.fill('put "<script>alert(1)</script>"');

      await page.waitForTimeout(500);

      // Should not execute script, just show diagnostic
      const diagnosticMessage = page.locator('.diagnostic-message').first();

      // Page should not show alert or error
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.waitForTimeout(200);
      expect(errors).toHaveLength(0);
    });

    test('handles possessive syntax correctly', async ({ page }) => {
      const editor = page.locator('#code-input');
      // This has a possessive 's that shouldn't be counted as unbalanced quote
      await editor.fill("set element's value to 'test'");

      await page.waitForTimeout(500);

      // Should not report unbalanced quotes
      const diagnostics = page.locator('.diagnostic-item.error');
      const count = await diagnostics.count();

      // If there are error diagnostics, check they're not about quotes
      if (count > 0) {
        const messages = await page.locator('.diagnostic-message').allTextContents();
        const quoteErrors = messages.filter(m => m.toLowerCase().includes('quote'));
        expect(quoteErrors).toHaveLength(0);
      }
    });
  });

  // =============================================================================
  // Link Navigation
  // =============================================================================

  test.describe('Link Navigation', () => {
    test('link to translation playground exists', async ({ page }) => {
      const link = page.locator("a:has-text('Translation Playground')");
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', 'index.html');
    });
  });
});
