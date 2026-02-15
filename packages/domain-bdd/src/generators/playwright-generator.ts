/**
 * Playwright Code Generator
 *
 * Transforms BDD semantic AST nodes into Playwright test code.
 * Generates individual assertion/action lines for single steps,
 * or a complete test() block for compound scenario nodes.
 *
 * Uses declarative mappings from ./mappings.ts for extensibility.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractValue } from '@lokascript/framework';
import { STATE_MAPPINGS, ACTION_MAPPINGS, ASSERTION_MAPPINGS } from './mappings.js';

/** Escape single quotes and backslashes for JS string literals */
function escapeForString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Escape special characters for use inside a RegExp literal */
function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find a mapping by keyword (case-insensitive) */
function findMapping<T extends { keywords: string[] }>(
  mappings: T[],
  keyword: string
): T | undefined {
  const kw = keyword.toLowerCase();
  return mappings.find(m => m.keywords.includes(kw));
}

/** Interpolate template variables with escaping */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => escapeForString(vars[key] ?? ''));
}

// =============================================================================
// Step Generators
// =============================================================================

function generateGiven(node: SemanticNode): string {
  const target = node.roles.get('target');
  const state = node.roles.get('state');

  const targetStr = target ? extractValue(target) : 'page';
  const stateStr = state ? extractValue(state) : 'visible';

  const mapping = findMapping(STATE_MAPPINGS, stateStr);
  if (mapping) {
    return interpolate(mapping.template, { target: targetStr });
  }

  return `  // Given: ${targetStr} ${stateStr}`;
}

function generateWhen(node: SemanticNode): string {
  const actionType = node.roles.get('action_type');
  const target = node.roles.get('target');
  const value = node.roles.get('value');

  const actionStr = actionType ? extractValue(actionType) : 'click';
  const targetStr = target ? extractValue(target) : '';
  const valueStr = value ? extractValue(value) : '';

  const mapping = findMapping(ACTION_MAPPINGS, actionStr);
  if (mapping) {
    return interpolate(mapping.template, { target: targetStr, value: valueStr });
  }

  return `  // When: ${actionStr} ${targetStr}`;
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
    return `  await expect(page.locator('${escapeForString(targetStr)}')).toHaveClass(/${escapeForRegex(assertionStr.slice(1))}/);`;
  }

  // Handle count separately (numeric, no string escaping)
  if (
    assertionStr.toLowerCase() === 'count' ||
    ASSERTION_MAPPINGS.find(
      m => m.keywords.includes(assertionStr.toLowerCase()) && m.template.includes('toHaveCount')
    )
  ) {
    const count = Number.isFinite(Number(expectedStr)) ? expectedStr : '0';
    return `  await expect(page.locator('${escapeForString(targetStr)}')).toHaveCount(${count});`;
  }

  const mapping = findMapping(ASSERTION_MAPPINGS, assertionStr);
  if (mapping) {
    return interpolate(mapping.template, { target: targetStr, expected: expectedStr });
  }

  return `  // Then: ${targetStr} ${assertionStr} ${expectedStr}`;
}

// =============================================================================
// Compound Scenario Generator
// =============================================================================

function generateScenario(node: SemanticNode): string {
  // Access statements and name from compound node
  const compound = node as SemanticNode & { statements?: SemanticNode[]; name?: string };
  const statements = compound.statements ?? [];
  const scenarioName = compound.name ?? 'scenario';

  const lines: string[] = [`test('${escapeForString(scenarioName)}', async ({ page }) => {`];

  for (const step of statements) {
    lines.push(bddCodeGenerator.generate(step));
  }

  lines.push(`});`);
  return lines.join('\n');
}

// =============================================================================
// Feature Generator
// =============================================================================

import type { FeatureParseResult } from '../parser/scenario-parser.js';

/**
 * Generate a Playwright test.describe block from a FeatureParseResult.
 */
export function generateFeature(feature: FeatureParseResult): string {
  const lines: string[] = [];
  lines.push(`test.describe('${escapeForString(feature.name)}', () => {`);

  // Background → beforeEach
  if (feature.background && feature.background.steps.length > 0) {
    lines.push(`  test.beforeEach(async ({ page }) => {`);
    for (const step of feature.background.steps) {
      lines.push(`  ${bddCodeGenerator.generate(step)}`);
    }
    lines.push(`  });`);
    lines.push('');
  }

  // Scenarios → test blocks
  for (const scenario of feature.scenarios) {
    const name = scenario.name ?? 'scenario';
    lines.push(`  test('${escapeForString(name)}', async ({ page }) => {`);
    for (const step of scenario.steps) {
      lines.push(`  ${bddCodeGenerator.generate(step)}`);
    }
    lines.push(`  });`);
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
