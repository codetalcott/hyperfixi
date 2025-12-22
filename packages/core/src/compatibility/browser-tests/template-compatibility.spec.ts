/**
 * Template Compatibility Tests
 * Tests our render command implementation against official _hyperscript template.js patterns
 * Based on: official _hyperscript test/templates/templates.js
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Template Compatibility Tests (Official _hyperscript Patterns)', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Enable console logging for debugging
    page.on('console', msg => {
      console.log(`Browser: ${msg.text()}`);
    });

    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(2000);
  });

  test('can render basic template (Official Pattern #1)', async () => {
    const result = await page.evaluate(async () => {
      console.log('=== Testing Basic Template Rendering ===');

      // Create template exactly like official test: make("<template>render ${x}</template>")
      const tmpl = make('<template>render ${x}</template>');
      console.log('Created template:', tmpl);

      try {
        // Execute render command like official test:
        // _hyperscript("render tmpl with (x: x) then put it into window.res", {locals: {x: ":)", tmpl: tmpl}})
        const context = hyperfixi.createContext();
        context.locals = new Map<string, unknown>([
          ['x', ':)'],
          ['tmpl', tmpl],
        ]);

        console.log('Executing render command...');
        const renderResult = await hyperfixi.evalHyperScript('render tmpl with (x: x)', context);
        console.log('Render result:', renderResult);

        // Check if result contains expected content
        const expectedContent = 'render :)';
        let actualContent = '';

        if (renderResult && typeof renderResult.textContent === 'string') {
          actualContent = renderResult.textContent;
        } else if (renderResult && typeof renderResult.innerHTML === 'string') {
          actualContent = renderResult.innerHTML;
        } else if (typeof renderResult === 'string') {
          actualContent = renderResult;
        }

        console.log('Expected:', expectedContent);
        console.log('Actual:', actualContent);

        return {
          success: actualContent === expectedContent,
          expected: expectedContent,
          actual: actualContent,
          renderResult: renderResult,
        };
      } catch (error) {
        console.error('Template render failed:', error);
        return {
          success: false,
          error: (error as Error).message,
          expected: 'render :)',
          actual: '',
        };
      }
    });

    console.log('Basic template test result:', result);

    // The test should succeed if our render command works
    if (!result.success) {
      console.log(
        `❌ Basic template failed: expected "${result.expected}", got "${result.actual}"`
      );
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } else {
      console.log(`✅ Basic template passed: "${result.actual}"`);
    }

    expect(result.success).toBe(true);
  });

  test('escapes HTML with opt-out (Official Pattern #2)', async () => {
    const result = await page.evaluate(async () => {
      console.log('=== Testing HTML Escaping ===');

      // Official test: make("<template>render ${x} ${unescaped x}</template>")
      const tmpl = make('<template>render ${x} ${unescaped x}</template>');

      try {
        const context = hyperfixi.createContext();
        context.locals = new Map<string, unknown>([
          ['x', '<br>'],
          ['tmpl', tmpl],
        ]);

        const renderResult = await hyperfixi.evalHyperScript('render tmpl with (x: x)', context);

        // Expected: "render &lt;br&gt; <br>"
        let actualContent = '';
        if (renderResult && typeof renderResult.textContent === 'string') {
          actualContent = renderResult.textContent;
        } else if (renderResult && typeof renderResult.innerHTML === 'string') {
          actualContent = renderResult.innerHTML;
        } else if (typeof renderResult === 'string') {
          actualContent = renderResult;
        }

        const expectedContent = 'render &lt;br&gt; <br>';

        return {
          success: actualContent === expectedContent,
          expected: expectedContent,
          actual: actualContent,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          expected: 'render &lt;br&gt; <br>',
          actual: '',
        };
      }
    });

    console.log('HTML escaping test result:', result);

    if (!result.success) {
      console.log(`❌ HTML escaping failed: expected "${result.expected}", got "${result.actual}"`);
    } else {
      console.log(`✅ HTML escaping passed: "${result.actual}"`);
    }

    expect(result.success).toBe(true);
  });

  test('supports @repeat directive (Official Pattern #3)', async () => {
    const result = await page.evaluate(async () => {
      console.log('=== Testing @repeat Directive ===');

      // Official test template: "begin\n@repeat in [1, 2, 3]\n${it}\n@end\nend\n"
      const templateContent = 'begin\n@repeat in [1, 2, 3]\n${it}\n@end\nend\n';
      const tmpl = make(`<template>${templateContent}</template>`);

      try {
        const context = hyperfixi.createContext();
        context.locals = new Map<string, unknown>([
          ['x', ':)'],
          ['tmpl', tmpl],
        ]);

        const renderResult = await hyperfixi.evalHyperScript('render tmpl with (x: x)', context);

        let actualContent = '';
        if (renderResult && typeof renderResult.textContent === 'string') {
          actualContent = renderResult.textContent;
        } else if (renderResult && typeof renderResult.innerHTML === 'string') {
          actualContent = renderResult.innerHTML;
        } else if (typeof renderResult === 'string') {
          actualContent = renderResult;
        }

        const expectedContent = 'begin\n1\n2\n3\nend\n';

        return {
          success: actualContent === expectedContent,
          expected: expectedContent,
          actual: actualContent,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          expected: 'begin\n1\n2\n3\nend\n',
          actual: '',
        };
      }
    });

    console.log('@repeat directive test result:', result);

    if (!result.success) {
      console.log(
        `❌ @repeat directive failed: expected "${result.expected}", got "${result.actual}"`
      );
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } else {
      console.log(`✅ @repeat directive passed: "${result.actual}"`);
    }

    expect(result.success).toBe(true);
  });

  test('supports @if/@else directive (Official Pattern #4)', async () => {
    const result = await page.evaluate(async () => {
      console.log('=== Testing @if/@else Directive ===');

      // Official test: "begin\n@if true\na\n@else\nb\n@end\nend\n"
      const templateContent = 'begin\n@if true\na\n@else\nb\n@end\nend\n';
      const tmpl = make(`<template>${templateContent}</template>`);

      try {
        const context = hyperfixi.createContext();
        context.locals = new Map<string, unknown>([
          ['x', ':)'],
          ['tmpl', tmpl],
        ]);

        const renderResult = await hyperfixi.evalHyperScript('render tmpl with (x: x)', context);

        let actualContent = '';
        if (renderResult && typeof renderResult.textContent === 'string') {
          actualContent = renderResult.textContent;
        } else if (renderResult && typeof renderResult.innerHTML === 'string') {
          actualContent = renderResult.innerHTML;
        } else if (typeof renderResult === 'string') {
          actualContent = renderResult;
        }

        const expectedContent = 'begin\na\nend\n';

        return {
          success: actualContent === expectedContent,
          expected: expectedContent,
          actual: actualContent,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          expected: 'begin\na\nend\n',
          actual: '',
        };
      }
    });

    console.log('@if/@else directive test result:', result);

    if (!result.success) {
      console.log(
        `❌ @if/@else directive failed: expected "${result.expected}", got "${result.actual}"`
      );
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } else {
      console.log(`✅ @if/@else directive passed: "${result.actual}"`);
    }

    expect(result.success).toBe(true);
  });

  test('render command integration check', async () => {
    const result = await page.evaluate(async () => {
      console.log('=== Checking Render Command Integration ===');

      // Check if render command is available
      const hasRenderCommand =
        typeof hyperfixi !== 'undefined' && typeof hyperfixi.evalHyperScript === 'function';

      console.log('hyperfixi available:', typeof hyperfixi);
      console.log('evalHyperScript available:', typeof hyperfixi?.evalHyperScript);

      if (!hasRenderCommand) {
        return {
          success: false,
          error: 'hyperfixi.evalHyperScript not available',
        };
      }

      // Test simple render command parsing
      try {
        const simpleTemplate = make('<template>test</template>');
        const context = hyperfixi.createContext();
        context.locals = new Map([['tmpl', simpleTemplate]]);

        const result = await hyperfixi.evalHyperScript('render tmpl', context);

        return {
          success: true,
          message: 'Render command integration working',
          result: result,
        };
      } catch (error) {
        return {
          success: false,
          error: `Render command failed: ${(error as Error).message}`,
        };
      }
    });

    console.log('Render command integration check:', result);

    if (!result.success) {
      console.log(`❌ Integration check failed: ${result.error}`);
    } else {
      console.log(`✅ Integration check passed: ${result.message}`);
    }

    expect(result.success).toBe(true);
  });

  test.afterAll(async () => {
    console.log('\\n🎯 Template Compatibility Test Summary:');
    console.log('These tests mirror the official _hyperscript template.js test patterns');
    console.log('Success indicates our render command is compatible with official templates');
  });
});
