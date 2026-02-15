/**
 * Playwright Code Generator
 *
 * Transforms BDD semantic AST nodes into Playwright test code.
 * Generates individual assertion/action lines for single steps,
 * or a complete test() block for compound scenario nodes.
 */

import type { SemanticNode, SemanticValue, CodeGenerator } from '@lokascript/framework';

function extractValue(value: SemanticValue): string {
  if ('raw' in value && value.raw !== undefined) return String(value.raw);
  if ('value' in value && value.value !== undefined) return String(value.value);
  return '';
}

// =============================================================================
// Step Generators
// =============================================================================

function generateGiven(node: SemanticNode): string {
  const target = node.roles.get('target');
  const state = node.roles.get('state');

  const targetStr = target ? extractValue(target) : 'page';
  const stateStr = state ? extractValue(state) : 'visible';

  switch (stateStr.toLowerCase()) {
    case 'exists':
      return `  await expect(page.locator('${targetStr}')).toBeAttached();`;
    case 'visible':
      return `  await expect(page.locator('${targetStr}')).toBeVisible();`;
    case 'hidden':
      return `  await expect(page.locator('${targetStr}')).toBeHidden();`;
    case 'loaded':
      return `  await page.waitForLoadState('domcontentloaded');`;
    default:
      return `  // Given: ${targetStr} ${stateStr}`;
  }
}

function generateWhen(node: SemanticNode): string {
  const actionType = node.roles.get('action_type');
  const target = node.roles.get('target');
  const value = node.roles.get('value');

  const actionStr = actionType ? extractValue(actionType) : 'click';
  const targetStr = target ? extractValue(target) : '';
  const valueStr = value ? extractValue(value) : '';

  switch (actionStr.toLowerCase()) {
    case 'click':
    case 'clicked':
    case 'clic': // ES
    case 'クリック': // JA
    case 'نقر': // AR
      return `  await page.locator('${targetStr}').click();`;
    case 'type':
    case 'typed':
    case 'escribir': // ES
    case '入力': // JA
    case 'كتابة': // AR
      return `  await page.locator('${targetStr}').fill('${valueStr}');`;
    case 'hover':
    case 'ホバー': // JA
    case 'تحويم': // AR
      return `  await page.locator('${targetStr}').hover();`;
    case 'navigate':
    case 'navegar': // ES
    case '移動': // JA
    case 'انتقال': // AR
      return `  await page.goto('${valueStr}');`;
    case 'submit':
    case 'enviar': // ES
    case '送信': // JA
    case 'إرسال': // AR
      return `  await page.locator('${targetStr}').press('Enter');`;
    default:
      return `  // When: ${actionStr} ${targetStr}`;
  }
}

function generateThen(node: SemanticNode): string {
  const target = node.roles.get('target');
  const assertion = node.roles.get('assertion');
  const expectedValue = node.roles.get('expected_value');

  const targetStr = target ? extractValue(target) : '';
  const assertionStr = assertion ? extractValue(assertion) : '';
  const expectedStr = expectedValue ? extractValue(expectedValue) : '';

  // Handle CSS class assertions (.active, .hidden, etc.)
  if (assertionStr.startsWith('.')) {
    return `  await expect(page.locator('${targetStr}')).toHaveClass(/${assertionStr.slice(1)}/);`;
  }

  switch (assertionStr.toLowerCase()) {
    case 'visible':
      return `  await expect(page.locator('${targetStr}')).toBeVisible();`;
    case 'hidden':
      return `  await expect(page.locator('${targetStr}')).toBeHidden();`;
    case 'text':
      return `  await expect(page.locator('${targetStr}')).toHaveText('${expectedStr}');`;
    case 'count':
      return `  await expect(page.locator('${targetStr}')).toHaveCount(${expectedStr});`;
    default:
      return `  // Then: ${targetStr} ${assertionStr} ${expectedStr}`;
  }
}

// =============================================================================
// Compound Scenario Generator
// =============================================================================

function generateScenario(node: SemanticNode): string {
  // Access statements from compound node
  const compound = node as SemanticNode & { statements?: SemanticNode[] };
  const statements = compound.statements ?? [];

  const lines: string[] = [`test('scenario', async ({ page }) => {`];

  for (const step of statements) {
    lines.push(bddCodeGenerator.generate(step));
  }

  lines.push(`});`);
  return lines.join('\n');
}

// =============================================================================
// Code Generator Export
// =============================================================================

export const bddCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'given':
        return generateGiven(node);
      case 'when':
        return generateWhen(node);
      case 'then':
        return generateThen(node);
      case 'scenario':
        return generateScenario(node);
      default:
        throw new Error(`Unknown BDD command: ${node.action}`);
    }
  },
};
