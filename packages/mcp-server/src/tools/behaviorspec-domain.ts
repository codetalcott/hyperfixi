/**
 * BehaviorSpec Domain MCP Tools
 *
 * Provides multilingual interaction testing specification parsing,
 * compilation to Playwright test code, validation, and translation
 * via the @lokascript/domain-behaviorspec package.
 */

import { validateRequired, getString, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded BehaviorSpec DSL instance
let behaviorDSL: any = null;
let behaviorSpecParser: any = null;
let behaviorFeatureParser: any = null;
let behaviorCompiler: any = null;
let behaviorFeatureCompiler: any = null;
let behaviorRenderer: any = null;

async function getBehaviorSpec() {
  if (behaviorDSL)
    return {
      dsl: behaviorDSL,
      parseSpec: behaviorSpecParser,
      parseFeature: behaviorFeatureParser,
      compile: behaviorCompiler,
      compileFeature: behaviorFeatureCompiler,
      render: behaviorRenderer,
    };

  try {
    const mod = await import('@lokascript/domain-behaviorspec');
    behaviorDSL = mod.createBehaviorSpecDSL();
    behaviorSpecParser = mod.parseBehaviorSpec;
    behaviorFeatureParser = mod.parseFeatureSpec;
    behaviorCompiler = mod.compileBehaviorSpec;
    behaviorFeatureCompiler = mod.compileFeatureSpec;
    behaviorRenderer = mod.renderBehaviorSpec;
    return {
      dsl: behaviorDSL,
      parseSpec: behaviorSpecParser,
      parseFeature: behaviorFeatureParser,
      compile: behaviorCompiler,
      compileFeature: behaviorFeatureCompiler,
      render: behaviorRenderer,
    };
  } catch {
    throw new Error(
      '@lokascript/domain-behaviorspec not available. Install it to use BehaviorSpec domain tools.'
    );
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const behaviorspecDomainTools = [
  {
    name: 'parse_behaviorspec',
    description:
      'Parse a BehaviorSpec scenario into a semantic representation. Supports single steps ' +
      '(given/when/expect/after) and multi-line indented specs with test blocks. ' +
      'Supports 8 languages: English, Spanish, Japanese, Arabic, Korean, Chinese, French, Turkish.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description:
            'BehaviorSpec text. Single step (e.g., "given page /home") or ' +
            'multi-line spec (e.g., "test \\"Login\\"\\n  given page /login\\n  when user clicks on #submit\\n    #toast appears")',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar, ko, zh, fr, tr',
          default: 'en',
        },
      },
      required: ['scenario'],
    },
  },
  {
    name: 'compile_behaviorspec',
    description:
      'Compile a BehaviorSpec scenario to Playwright test code. Returns executable ' +
      'Playwright test file with imports, test blocks, and assertions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description: 'BehaviorSpec text to compile',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar, ko, zh, fr, tr',
          default: 'en',
        },
      },
      required: ['scenario'],
    },
  },
  {
    name: 'validate_behaviorspec',
    description:
      'Validate BehaviorSpec syntax. Returns whether the spec parses successfully ' +
      'and any errors. Supports 8 languages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description: 'BehaviorSpec scenario to validate',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar, ko, zh, fr, tr',
          default: 'en',
        },
      },
      required: ['scenario'],
    },
  },
  {
    name: 'translate_behaviorspec',
    description:
      'Translate a BehaviorSpec scenario between natural languages. Parses in the source ' +
      'language and renders in the target language.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description: 'BehaviorSpec scenario to translate',
        },
        from: {
          type: 'string',
          description: 'Source language code: en, es, ja, ar, ko, zh, fr, tr',
        },
        to: {
          type: 'string',
          description: 'Target language code: en, es, ja, ar, ko, zh, fr, tr',
        },
      },
      required: ['scenario', 'from', 'to'],
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

export async function handleBehaviorSpecDomainTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'parse_behaviorspec':
        return await parseBehaviorspec(args);
      case 'compile_behaviorspec':
        return await compileBehaviorspec(args);
      case 'validate_behaviorspec':
        return await validateBehaviorspec(args);
      case 'translate_behaviorspec':
        return await translateBehaviorspec(args);
      default:
        return errorResponse(`Unknown BehaviorSpec tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`BehaviorSpec tool error: ${message}`);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function serializeRoles(roles: Map<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of roles) {
    result[key] = value;
  }
  return result;
}

function isMultiLine(input: string): boolean {
  return input.includes('\n');
}

// =============================================================================
// Tool Implementations
// =============================================================================

async function parseBehaviorspec(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const language = getString(args, 'language', 'en');

  const { dsl, parseSpec } = await getBehaviorSpec();

  if (isMultiLine(scenario)) {
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

  const node = dsl.parse(scenario, language);
  return jsonResponse({
    type: 'step',
    action: node.action,
    roles: serializeRoles(node.roles),
    language,
    input: scenario,
  });
}

async function compileBehaviorspec(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const language = getString(args, 'language', 'en');

  const { dsl, compile } = await getBehaviorSpec();

  if (isMultiLine(scenario)) {
    const code = compile(scenario, language);
    return jsonResponse({
      ok: true,
      code,
      language,
    });
  }

  const result = dsl.compile(scenario, language);
  return jsonResponse({
    ok: result.ok,
    code: result.code,
    errors: result.errors,
    language,
    input: scenario,
  });
}

async function validateBehaviorspec(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const language = getString(args, 'language', 'en');

  const { dsl, parseSpec } = await getBehaviorSpec();

  if (isMultiLine(scenario)) {
    const result = parseSpec(scenario, language);
    return jsonResponse({
      valid: result.errors.length === 0,
      testCount: result.tests.length,
      errorCount: result.errors.length,
      errors: result.errors,
      language,
    });
  }

  const result = dsl.validate(scenario, language);
  return jsonResponse({
    valid: result.valid,
    errors: result.errors,
    language,
    scenario,
  });
}

async function translateBehaviorspec(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario', 'from', 'to']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const from = getString(args, 'from');
  const to = getString(args, 'to');

  const { dsl, parseSpec, compile, render } = await getBehaviorSpec();

  if (isMultiLine(scenario)) {
    const result = parseSpec(scenario, from);

    // Render each step of each test to the target language
    const renderedTests: string[] = [];
    for (const test of result.tests) {
      const lines: string[] = [];
      // Render test name (use a simple node)
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

  const node = dsl.parse(scenario, from);
  const compiled = dsl.compile(scenario, from);
  const translated = render(node, to);

  return jsonResponse({
    input: { scenario, language: from },
    translated,
    semantic: { action: node.action, roles: serializeRoles(node.roles) },
    playwright: compiled.ok ? compiled.code : null,
  });
}
