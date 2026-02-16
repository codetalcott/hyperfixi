/**
 * BehaviorSpec Domain Multi-Line Extensions
 *
 * Handles multi-line BehaviorSpec scenarios (indented test blocks) that go
 * beyond the DomainRegistry's single-step parse/compile/validate/translate.
 * Single-step operations are handled by the registry.
 */

import { getString, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded BehaviorSpec multi-line utilities
let behaviorSpecParser: any = null;
let behaviorCompiler: any = null;
let behaviorRenderer: any = null;

async function getBehaviorSpecExtras() {
  if (behaviorSpecParser)
    return { parseSpec: behaviorSpecParser, compile: behaviorCompiler, render: behaviorRenderer };

  try {
    const mod = await import('@lokascript/domain-behaviorspec');
    behaviorSpecParser = mod.parseBehaviorSpec;
    behaviorCompiler = mod.compileBehaviorSpec;
    behaviorRenderer = mod.renderBehaviorSpec;
    return { parseSpec: behaviorSpecParser, compile: behaviorCompiler, render: behaviorRenderer };
  } catch {
    throw new Error('@lokascript/domain-behaviorspec not available for multi-line parsing.');
  }
}

function serializeRoles(roles: Map<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of roles) {
    result[key] = value;
  }
  return result;
}

/**
 * Check if the BehaviorSpec input is multi-line.
 */
export function isMultiLineBehaviorSpec(args: Record<string, unknown>): boolean {
  const scenario = getString(args, 'scenario');
  return scenario.includes('\n');
}

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

/**
 * Handle multi-line BehaviorSpec operations.
 */
export async function handleBehaviorSpecMultiLine(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  const scenario = getString(args, 'scenario');
  if (!scenario) return errorResponse('Missing required parameter: scenario');

  try {
    const { parseSpec, compile, render } = await getBehaviorSpecExtras();
    const operation = name.replace('_behaviorspec', '');

    if (operation === 'parse') {
      const language = getString(args, 'language', 'en');
      const result = parseSpec(scenario, language);
      return jsonResponse({
        type: 'spec',
        testCount: result.tests.length,
        tests: result.tests.map((test: any) => ({
          name: test.name,
          givenCount: test.givens.length,
          interactionCount: test.interactions.length,
          givens: test.givens.map((g: any) => ({
            action: g.action,
            roles: serializeRoles(g.roles),
          })),
          interactions: test.interactions.map((i: any) => ({
            when: { action: i.when.action, roles: serializeRoles(i.when.roles) },
            expectationCount: i.expectations.length,
          })),
        })),
        errors: result.errors,
        language,
      });
    }

    if (operation === 'compile') {
      const language = getString(args, 'language', 'en');
      const code = compile(scenario, language);
      return jsonResponse({ ok: true, code, language });
    }

    if (operation === 'validate') {
      const language = getString(args, 'language', 'en');
      const result = parseSpec(scenario, language);
      return jsonResponse({
        valid: result.errors.length === 0,
        testCount: result.tests.length,
        errorCount: result.errors.length,
        errors: result.errors,
        language,
      });
    }

    if (operation === 'translate') {
      const from = getString(args, 'from');
      const to = getString(args, 'to');
      if (!from || !to) return errorResponse('Missing required parameter: from, to');

      const result = parseSpec(scenario, from);
      const renderedTests: string[] = [];
      for (const test of result.tests) {
        const lines: string[] = [];
        lines.push(`test "${test.name}"`);
        for (const given of test.givens) {
          lines.push(`  ${render(given, to)}`);
        }
        for (const interaction of test.interactions) {
          lines.push(`  ${render(interaction.when, to)}`);
          for (const exp of interaction.expectations) {
            lines.push(`    ${render(exp.node, to)}`);
          }
        }
        renderedTests.push(lines.join('\n'));
      }

      return jsonResponse({
        input: { scenario, language: from },
        translated: renderedTests.join('\n\n'),
        playwright: compile(scenario, from),
        errors: result.errors,
      });
    }

    return errorResponse(`Unknown BehaviorSpec operation: ${operation}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`BehaviorSpec multi-line error: ${message}`);
  }
}
