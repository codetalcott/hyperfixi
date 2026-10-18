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
    const mod = await import('@lokascript/domains/behaviorspec');
    behaviorSpecParser = mod.parseBehaviorSpec;
    behaviorCompiler = mod.compileBehaviorSpec;
    behaviorRenderer = mod.renderBehaviorSpec;
    return { parseSpec: behaviorSpecParser, compile: behaviorCompiler, render: behaviorRenderer };
  } catch {
    throw new Error('@lokascript/domains/behaviorspec not available for multi-line parsing.');
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

type CompileOutcome =
  { ok: true; code: string } | { ok: false; errors: string[]; partial?: string };

/**
 * `compileBehaviorSpec` throws instead of returning a test that skips a line (domains 5.0.2,
 * lokascript-domains #54): a `BehaviorSpecError` names each line it could not read and keeps
 * the rest as `partial`, never returned as `code`. Before 5.0.2 it returned that partial file,
 * and `compile_behaviorspec` answered `ok: true` with the lines gone.
 */
function compileOrRefuse(
  compile: (scenario: string, language: string) => string,
  scenario: string,
  language: string
): CompileOutcome {
  try {
    return { ok: true, code: compile(scenario, language) };
  } catch (e) {
    const errors = Array.isArray((e as { errors?: unknown }).errors)
      ? (e as { errors: unknown[] }).errors.map(String)
      : [e instanceof Error ? e.message : String(e)];
    const partial = (e as { partial?: unknown }).partial;
    return { ok: false, errors, ...(typeof partial === 'string' && partial ? { partial } : {}) };
  }
}

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
      const outcome = compileOrRefuse(compile, scenario, language);
      return jsonResponse(
        outcome.ok
          ? { ok: true, code: outcome.code, language }
          : { ok: false, errors: outcome.errors, partial: outcome.partial, language }
      );
    }

    if (operation === 'validate') {
      const language = getString(args, 'language', 'en');
      const result = parseSpec(scenario, language);
      // A spec every line of which parses can still be one the compiler refuses
      // (`given page /login when …`): validate says what compile would.
      if (result.errors.length === 0) {
        const outcome = compileOrRefuse(compile, scenario, language);
        if (!outcome.ok) result.errors.push(...outcome.errors);
      }
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
      // A spec with a line that did not parse is refused whole: the translation and the test
      // would both leave that line out.
      const compiled = result.errors.length === 0 ? compileOrRefuse(compile, scenario, from) : null;
      if (!compiled?.ok) {
        return jsonResponse({
          input: { scenario, language: from },
          translated: null,
          playwright: null,
          errors: compiled ? compiled.errors : result.errors,
        });
      }
      const renderedTests: string[] = [];
      // renderBehaviorSpec returns null for a node it cannot render. Interpolating
      // that would write the literal "null" into the spec, so one unrenderable
      // line makes the whole translation unavailable.
      let complete = true;
      const renderLine = (node: unknown, indent: string): void => {
        const line = render(node, to);
        if (line == null) {
          complete = false;
          return;
        }
        lines.push(`${indent}${line}`);
      };
      let lines: string[] = [];

      for (const test of result.tests) {
        lines = [`test "${test.name}"`];
        for (const given of test.givens) {
          renderLine(given, '  ');
        }
        for (const interaction of test.interactions) {
          renderLine(interaction.when, '  ');
          for (const exp of interaction.expectations) {
            renderLine(exp.node, '    ');
          }
        }
        renderedTests.push(lines.join('\n'));
      }

      return jsonResponse({
        input: { scenario, language: from },
        translated: complete ? renderedTests.join('\n\n') : null,
        playwright: compiled.code,
        errors: result.errors,
      });
    }

    return errorResponse(`Unknown BehaviorSpec operation: ${operation}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`BehaviorSpec multi-line error: ${message}`);
  }
}
