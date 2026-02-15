/**
 * Playwright Code Generator
 *
 * Transforms BehaviorSpec semantic AST nodes into Playwright test code.
 * Generates individual lines for single steps, or complete test() blocks
 * for compound spec nodes.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractValue } from '@lokascript/framework';
import { SETUP_MAPPINGS, INTERACTION_MAPPINGS, ASSERTION_MAPPINGS } from './mappings.js';
import type { SpecParseResult, TestBlock, ExpectationNode } from '../parser/spec-parser.js';

// =============================================================================
// Helpers
// =============================================================================

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
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    const val = vars[key] ?? '';
    // Don't escape numeric values (for viewport dimensions)
    if (/^\d+$/.test(val)) return val;
    return escapeForString(val);
  });
}

/** Parse a duration string to milliseconds */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s*(ms|s|seconds?|milliseconds?)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'ms' || unit.startsWith('millisecond')) return num;
  return num * 1000;
}

/** Parse viewport dimensions "WxH" */
function parseDimensions(value: string): { width: string; height: string } | null {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: match[1], height: match[2] };
}

// =============================================================================
// Step Generators
// =============================================================================

function generateGiven(node: SemanticNode): string {
  const subject = node.roles.get('subject');
  const value = node.roles.get('value');

  const subjectStr = subject ? extractValue(subject) : 'page';
  const valueStr = value ? extractValue(value) : '';

  const mapping = findMapping(SETUP_MAPPINGS, subjectStr);
  if (mapping) {
    if (mapping.type === 'viewport') {
      const dims = parseDimensions(valueStr);
      if (dims) {
        return interpolate(mapping.template, dims);
      }
    }
    return interpolate(mapping.template, { value: valueStr });
  }

  return `  // Given: ${subjectStr} ${valueStr}`.trim();
}

function generateWhen(node: SemanticNode): string {
  const action = node.roles.get('action');
  const target = node.roles.get('target');
  const destination = node.roles.get('destination');

  const actionStr = action ? extractValue(action) : 'click';
  const targetStr = target ? extractValue(target) : '';
  const destStr = destination ? extractValue(destination) : '';

  // For "types X into Y", the target is what's typed (value), destination is where
  // Use destination as the locator target, and the original target as the value
  const mapping = findMapping(INTERACTION_MAPPINGS, actionStr);
  if (mapping) {
    if (destStr && mapping.template.includes('${value}')) {
      // "types hello into #search" -> fill('#search', 'hello')
      return interpolate(mapping.template, { target: destStr, value: targetStr });
    }
    return interpolate(mapping.template, { target: targetStr, value: destStr });
  }

  return `  // When: ${actionStr} ${targetStr} ${destStr}`.trim();
}

function generateExpect(node: SemanticNode, negated?: boolean): string {
  const target = node.roles.get('target');
  const assertion = node.roles.get('assertion');
  const value = node.roles.get('value');

  const targetStr = target ? extractValue(target) : '';
  const assertionStr = assertion ? extractValue(assertion) : '';
  const valueStr = value ? extractValue(value) : '';

  // Handle CSS class assertions: "has class .active" or "has .active"
  if (assertionStr === 'has' && valueStr.startsWith('.')) {
    const className = valueStr.startsWith('.') ? valueStr.slice(1) : valueStr;
    const template = negated
      ? `  await expect(page.locator('\${target}')).not.toHaveClass(/${escapeForRegex(className)}/);`
      : `  await expect(page.locator('\${target}')).toHaveClass(/${escapeForRegex(className)}/);`;
    return interpolate(template, { target: targetStr });
  }

  const mapping = findMapping(ASSERTION_MAPPINGS, assertionStr);
  if (mapping) {
    if (negated && mapping.negationTemplate) {
      return interpolate(mapping.negationTemplate, { target: targetStr, value: valueStr });
    }
    return interpolate(mapping.template, { target: targetStr, value: valueStr });
  }

  return `  // Expect: ${targetStr} ${assertionStr} ${valueStr}`.trim();
}

function generateAfter(node: SemanticNode): string {
  const duration = node.roles.get('duration');
  const durationStr = duration ? extractValue(duration) : '0ms';
  const ms = parseDuration(durationStr);
  return `  await page.waitForTimeout(${ms});`;
}

// =============================================================================
// Compound Spec Generator
// =============================================================================

/**
 * Generate a complete Playwright test file from a SpecParseResult.
 */
export function generateSpec(spec: SpecParseResult): string {
  const lines: string[] = [];
  lines.push("import { test, expect } from '@playwright/test';");
  lines.push('');

  for (const testBlock of spec.tests) {
    lines.push(generateTestBlock(testBlock));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Generate a single test() block from a TestBlock.
 */
export function generateTestBlock(block: TestBlock): string {
  const lines: string[] = [];
  lines.push(`test('${escapeForString(block.name)}', async ({ page }) => {`);

  // Given section
  for (const given of block.givens) {
    lines.push(behaviorspecCodeGenerator.generate(given));
  }

  // When/Expect sections
  for (const interaction of block.interactions) {
    lines.push('');
    lines.push(`  // ${extractWhenComment(interaction.when)}`);
    lines.push(behaviorspecCodeGenerator.generate(interaction.when));

    for (const expectation of interaction.expectations) {
      if (expectation.timing) {
        lines.push(generateAfter(expectation.timing));
      }
      lines.push(generateExpect(expectation.node, expectation.negated));
    }
  }

  lines.push(`});`);
  return lines.join('\n');
}

/** Extract a human-readable comment from a when node */
function extractWhenComment(node: SemanticNode): string {
  const actor = node.roles.get('actor');
  const action = node.roles.get('action');
  const target = node.roles.get('target');
  const parts: string[] = [];
  if (actor) parts.push(extractValue(actor));
  if (action) parts.push(extractValue(action));
  if (target) parts.push(extractValue(target));
  return `When ${parts.join(' ')}`;
}

// =============================================================================
// Code Generator Export
// =============================================================================

export const behaviorspecCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'test':
        return `// test: ${extractValue(node.roles.get('name')!)}`;
      case 'given':
        return generateGiven(node);
      case 'when':
        return generateWhen(node);
      case 'expect':
        return generateExpect(node);
      case 'after':
        return generateAfter(node);
      case 'not':
        return `  // not: ${extractValue(node.roles.get('content')!)}`;
      default:
        throw new Error(`Unknown BehaviorSpec command: ${node.action}`);
    }
  },
};
