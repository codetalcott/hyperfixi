/**
 * Playwright Test Renderer
 *
 * Generates complete Playwright test files from BehaviorSpecs.
 * Each generated test creates an HTML fixture, triggers the behavior,
 * and asserts the expected DOM changes.
 */

import type { AbstractOperation, BehaviorSpec, TargetRef } from '../operations/types.js';
import type { TestRenderer, TestRenderOptions, GeneratedTest } from './types.js';
import { generateFixture } from './html-fixture.js';

// =============================================================================
// Renderer
// =============================================================================

export class PlaywrightRenderer implements TestRenderer {
  readonly framework = 'playwright';

  render(spec: BehaviorSpec, options: TestRenderOptions = {}): GeneratedTest {
    const testName = options.testName ?? generateTestName(spec);
    const html = generateFixture(spec, options.hyperscript);

    const lines: string[] = [];

    // Import
    lines.push("import { test, expect } from '@playwright/test';");
    lines.push('');

    // Test
    lines.push(`test('${escapeString(testName)}', async ({ page }) => {`);

    // Setup fixture
    lines.push(`  await page.setContent(\`${escapeTemplate(wrapHtml(html))}\`);`);

    // Load runtime or compiled JS
    if (options.executionMode === 'compiled' && options.compiledJs) {
      lines.push(
        `  await page.addScriptTag({ content: \`${escapeTemplate(options.compiledJs)}\` });`
      );
    } else {
      const bundlePath =
        options.bundlePath ?? './node_modules/@hyperfixi/core/dist/lokascript-browser.js';
      lines.push(`  await page.addScriptTag({ path: '${escapeString(bundlePath)}' });`);
      lines.push("  await page.waitForFunction(() => document.querySelector('[_]') !== null);");
      // Wait for LokaScript to process attributes
      lines.push('  await page.waitForTimeout(100);');
    }
    lines.push('');

    // Determine trigger locator
    const triggerLocator = getTriggerLocator(spec);

    // Generate assertions for each operation
    for (const op of spec.operations) {
      const assertions = generateAssertions(op, spec, triggerLocator);
      lines.push(...assertions.map(l => `  ${l}`));
    }

    lines.push('});');
    lines.push('');

    return {
      name: testName,
      code: lines.join('\n'),
      html,
      framework: 'playwright',
      operations: spec.operations,
    };
  }
}

// =============================================================================
// Assertion Generation
// =============================================================================

function generateAssertions(
  op: AbstractOperation,
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  switch (op.op) {
    case 'toggleClass':
      return generateToggleClassAssertions(op, spec, triggerLocator);
    case 'addClass':
      return generateAddClassAssertions(op, spec, triggerLocator);
    case 'removeClass':
      return generateRemoveClassAssertions(op, spec, triggerLocator);
    case 'setContent':
      return generateSetContentAssertions(op, spec, triggerLocator);
    case 'appendContent':
      return generateAppendContentAssertions(op, spec, triggerLocator);
    case 'show':
      return generateShowAssertions(op, spec, triggerLocator);
    case 'hide':
      return generateHideAssertions(op, spec, triggerLocator);
    case 'navigate':
      return generateNavigateAssertions(op, spec, triggerLocator);
    case 'focus':
      return generateFocusAssertions(op, spec, triggerLocator);
    case 'blur':
      return generateBlurAssertions(op, spec, triggerLocator);
    case 'triggerEvent':
      return generateTriggerEventAssertions(op, spec, triggerLocator);
    case 'fetch':
      return generateFetchAssertions(op, spec, triggerLocator);
    case 'wait':
      return generateWaitAssertions(op);
    case 'setVariable':
    case 'increment':
    case 'decrement':
      return generateVariableAssertions(op, spec, triggerLocator);
    case 'log':
      return generateLogAssertions(op, spec, triggerLocator);
    default:
      return [`// Unsupported operation: ${(op as AbstractOperation).op}`];
  }
}

// --- DOM Class ---

function generateToggleClassAssertions(
  op: { className: string; target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  const lines: string[] = [];

  lines.push(`// Toggle .${op.className}`);
  lines.push(`await ${triggerLocator}.${triggerAction(spec)};`);
  if (spec.async) lines.push('await page.waitForTimeout(100);');
  lines.push(`await expect(${locator}).toHaveClass(/${op.className}/);`);
  lines.push('');
  lines.push(`// Toggle back`);
  lines.push(`await ${triggerLocator}.${triggerAction(spec)};`);
  if (spec.async) lines.push('await page.waitForTimeout(100);');
  lines.push(`await expect(${locator}).not.toHaveClass(/${op.className}/);`);

  return lines;
}

function generateAddClassAssertions(
  op: { className: string; target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    `// Add .${op.className}`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).toHaveClass(/${op.className}/);`,
  ];
}

function generateRemoveClassAssertions(
  op: { className: string; target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    `// Remove .${op.className} (should have it initially)`,
    `await expect(${locator}).toHaveClass(/${op.className}/);`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).not.toHaveClass(/${op.className}/);`,
  ];
}

// --- DOM Content ---

function generateSetContentAssertions(
  op: { content: string; target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    `// Put "${op.content}" into element`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).toContainText('${escapeString(op.content)}');`,
  ];
}

function generateAppendContentAssertions(
  op: { content: string; target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    `// Append "${op.content}"`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).toContainText('${escapeString(op.content)}');`,
  ];
}

// --- DOM Visibility ---

function generateShowAssertions(
  op: { target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    '// Show element (initially hidden)',
    `await expect(${locator}).not.toBeVisible();`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).toBeVisible();`,
  ];
}

function generateHideAssertions(
  op: { target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    '// Hide element (initially visible)',
    `await expect(${locator}).toBeVisible();`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).not.toBeVisible();`,
  ];
}

// --- Navigation ---

function generateNavigateAssertions(
  op: { url: string },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  return [
    `// Navigate to ${op.url}`,
    `// Note: Navigation will change the page URL`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    `await page.waitForURL('**${op.url}**');`,
  ];
}

// --- Focus ---

function generateFocusAssertions(
  op: { target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    '// Focus element',
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).toBeFocused();`,
  ];
}

function generateBlurAssertions(
  op: { target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const locator = targetToLocator(op.target, spec);
  return [
    '// Blur element',
    `await ${locator}.focus();`,
    `await expect(${locator}).toBeFocused();`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    `await expect(${locator}).not.toBeFocused();`,
  ];
}

// --- Events ---

function generateTriggerEventAssertions(
  op: { eventName: string; target: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  return [
    `// Trigger '${op.eventName}' event`,
    `const eventReceived = page.evaluate((sel) => {`,
    `  return new Promise<boolean>((resolve) => {`,
    `    const el = document.querySelector(sel) ?? document.body;`,
    `    el.addEventListener('${escapeString(op.eventName)}', () => resolve(true), { once: true });`,
    `    setTimeout(() => resolve(false), 2000);`,
    `  });`,
    `}, '${escapeString(targetToCssSelector(op.target))}');`,
    `await ${triggerLocator}.${triggerAction(spec)};`,
    `expect(await eventReceived).toBe(true);`,
  ];
}

// --- Async ---

function generateFetchAssertions(
  op: { url: string; format: string; target?: TargetRef },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  const lines: string[] = [];

  lines.push(`// Fetch ${op.url} as ${op.format}`);

  // Mock the network request
  if (op.format === 'json') {
    lines.push(`await page.route('**${op.url}**', route => {`);
    lines.push(`  route.fulfill({`);
    lines.push(`    contentType: 'application/json',`);
    lines.push(`    body: JSON.stringify({ data: 'mock' }),`);
    lines.push(`  });`);
    lines.push(`});`);
  } else if (op.format === 'html') {
    lines.push(`await page.route('**${op.url}**', route => {`);
    lines.push(`  route.fulfill({`);
    lines.push(`    contentType: 'text/html',`);
    lines.push(`    body: '<div>Mock HTML</div>',`);
    lines.push(`  });`);
    lines.push(`});`);
  } else {
    lines.push(`await page.route('**${op.url}**', route => {`);
    lines.push(`  route.fulfill({`);
    lines.push(`    contentType: 'text/plain',`);
    lines.push(`    body: 'Mock response',`);
    lines.push(`  });`);
    lines.push(`});`);
  }

  lines.push(`await ${triggerLocator}.${triggerAction(spec)};`);
  lines.push('await page.waitForTimeout(500);');

  // If there's a target, verify content was placed
  if (op.target) {
    const locator = targetToLocator(op.target, spec);
    lines.push(`await expect(${locator}).not.toBeEmpty();`);
  }

  return lines;
}

function generateWaitAssertions(op: { durationMs: number }): string[] {
  return [`// Wait ${op.durationMs}ms`, `// (no assertion — wait is a timing operation)`];
}

// --- Variables ---

function generateVariableAssertions(
  op: AbstractOperation,
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  // Variable operations don't have direct DOM assertions
  // but we can verify the behavior executed without errors
  return [
    `// ${op.op} (variable operation — verify no errors)`,
    'const errors: string[] = [];',
    "page.on('pageerror', (err) => errors.push(err.message));",
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    'expect(errors).toHaveLength(0);',
  ];
}

// --- Utility ---

function generateLogAssertions(
  op: { values: string[] },
  spec: BehaviorSpec,
  triggerLocator: string
): string[] {
  return [
    `// Log: ${op.values.join(', ')}`,
    'const logs: string[] = [];',
    "page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });",
    `await ${triggerLocator}.${triggerAction(spec)};`,
    ...(spec.async ? ['await page.waitForTimeout(100);'] : []),
    'expect(logs.length).toBeGreaterThan(0);',
  ];
}

// =============================================================================
// Helpers
// =============================================================================

function generateTestName(spec: BehaviorSpec): string {
  if (spec.source) return spec.source;

  const parts: string[] = [];
  parts.push(`on ${spec.trigger.event}`);

  for (const op of spec.operations) {
    parts.push(describeOp(op));
  }

  return parts.join(' ');
}

function describeOp(op: AbstractOperation): string {
  switch (op.op) {
    case 'toggleClass':
      return `toggle .${op.className}${describeTarget(op.target)}`;
    case 'addClass':
      return `add .${op.className}${describeTarget(op.target)}`;
    case 'removeClass':
      return `remove .${op.className}${describeTarget(op.target)}`;
    case 'setContent':
      return `put "${op.content}"${describeTarget(op.target)}`;
    case 'appendContent':
      return `append "${op.content}"${describeTarget(op.target)}`;
    case 'show':
      return `show${describeTarget(op.target)}`;
    case 'hide':
      return `hide${describeTarget(op.target)}`;
    case 'navigate':
      return `go to ${op.url}`;
    case 'focus':
      return `focus${describeTarget(op.target)}`;
    case 'blur':
      return `blur${describeTarget(op.target)}`;
    case 'fetch':
      return `fetch ${op.url} as ${op.format}`;
    case 'wait':
      return `wait ${op.durationMs}ms`;
    case 'setVariable':
      return `set ${op.name} to ${op.value}`;
    case 'increment':
      return `increment${describeTarget(op.target)}`;
    case 'decrement':
      return `decrement${describeTarget(op.target)}`;
    case 'triggerEvent':
      return `trigger ${op.eventName}${describeTarget(op.target)}`;
    case 'log':
      return `log ${op.values.join(', ')}`;
    case 'historyBack':
      return 'go back';
    case 'historyForward':
      return 'go forward';
    default:
      return (op as AbstractOperation).op;
  }
}

function describeTarget(target: TargetRef): string {
  if (target.kind === 'self') return '';
  if (target.kind === 'selector') return ` on ${target.value}`;
  if (target.kind === 'variable') return ` on ${target.value}`;
  return '';
}

function getTriggerLocator(spec: BehaviorSpec): string {
  if (spec.triggerTarget.kind === 'selector') {
    return `page.locator('${escapeString(spec.triggerTarget.value)}')`;
  }

  // Self — find the element with the _="..." attribute
  // If operations have a target, use that; otherwise use a generic trigger
  for (const op of spec.operations) {
    if ('target' in op && (op as { target: TargetRef }).target.kind === 'selector') {
      const t = (op as { target: TargetRef }).target;
      if (t.kind === 'selector') {
        return `page.locator('${escapeString(t.value)}')`;
      }
    }
  }

  return "page.locator('[_]')";
}

function targetToLocator(target: TargetRef, spec: BehaviorSpec): string {
  if (target.kind === 'selector') {
    return `page.locator('${escapeString(target.value)}')`;
  }
  if (target.kind === 'self') {
    return getTriggerLocator(spec);
  }
  // Variable target — fall back to trigger
  return getTriggerLocator(spec);
}

function targetToCssSelector(target: TargetRef): string {
  if (target.kind === 'selector') return target.value;
  if (target.kind === 'self') return '[_]';
  return 'body';
}

function triggerAction(spec: BehaviorSpec): string {
  const event = spec.trigger.event;
  switch (event) {
    case 'click':
      return 'click()';
    case 'dblclick':
      return 'dblclick()';
    case 'mouseenter':
      return 'hover()';
    case 'mouseover':
      return 'hover()';
    case 'focus':
      return 'focus()';
    case 'blur':
      return 'blur()';
    case 'keydown':
    case 'keyup':
    case 'keypress':
      return "press('Enter')";
    case 'input':
    case 'change':
      return "fill('test')";
    case 'submit':
      return 'click()';
    default:
      return `dispatchEvent(new Event('${escapeString(event)}'))`;
  }
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>\n<html>\n<body>\n${body}\n</body>\n</html>`;
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeTemplate(s: string): string {
  return s.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
