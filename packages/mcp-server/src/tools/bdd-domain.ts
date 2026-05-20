/**
 * BDD Domain MCP Tools
 *
 * Provides multilingual BDD specification parsing, compilation to Playwright
 * test code, and validation via the @lokascript/domain-bdd package.
 */

import { validateRequired, getString, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded BDD DSL instance
let bddDSL: any = null;
let bddScenarioParser: any = null;
let bddGenerator: any = null;
let bddRenderer: any = null;

async function getBDD() {
  if (bddDSL)
    return {
      dsl: bddDSL,
      parseScenario: bddScenarioParser,
      generator: bddGenerator,
      renderer: bddRenderer,
    };

  try {
    const mod = await import('@lokascript/domain-bdd');
    bddDSL = mod.createBDDDSL();
    bddScenarioParser = mod.parseBDDScenario;
    bddGenerator = mod.bddCodeGenerator;
    bddRenderer = mod.renderBDD ?? null;
    return {
      dsl: bddDSL,
      parseScenario: bddScenarioParser,
      generator: bddGenerator,
      renderer: bddRenderer,
    };
  } catch {
    throw new Error('@lokascript/domain-bdd not available. Install it to use BDD domain tools.');
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const bddDomainTools = [
  {
    name: 'parse_bdd',
    description:
      'Parse a BDD scenario into a semantic representation. Supports single steps ' +
      '(Given/When/Then) and multi-step scenarios separated by commas or newlines. ' +
      'Supports English (SVO), Spanish (SVO), Japanese (SOV), and Arabic (VSO).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description:
            'BDD scenario text. Single step (e.g., "given #button is exists") or ' +
            'multi-step (e.g., "given #button is exists, when click on #button, then #button has .active")',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar, ko, zh, tr, fr',
          default: 'en',
        },
      },
      required: ['scenario'],
    },
  },
  {
    name: 'compile_bdd',
    description:
      'Compile a BDD scenario to Playwright test code. Supports single steps ' +
      'and multi-step scenarios. Returns executable Playwright assertions and actions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description: 'BDD scenario text to compile',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar, ko, zh, tr, fr',
          default: 'en',
        },
      },
      required: ['scenario'],
    },
  },
  {
    name: 'validate_bdd',
    description:
      'Validate BDD scenario syntax. Returns whether each step parses successfully ' +
      'and any errors. Supports 8 languages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description: 'BDD scenario to validate',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar, ko, zh, tr, fr',
          default: 'en',
        },
      },
      required: ['scenario'],
    },
  },
  {
    name: 'translate_bdd',
    description:
      'Translate a BDD scenario between natural languages. Parses in the source ' +
      'language and renders in the target language (or compiles to Playwright).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          description: 'BDD scenario to translate',
        },
        from: {
          type: 'string',
          description: 'Source language code: en, es, ja, ar, ko, zh, tr, fr',
        },
        to: {
          type: 'string',
          description: 'Target language code: en, es, ja, ar, ko, zh, tr, fr',
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

export async function handleBDDDomainTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'parse_bdd':
        return await parseBdd(args);
      case 'compile_bdd':
        return await compileBdd(args);
      case 'validate_bdd':
        return await validateBdd(args);
      case 'translate_bdd':
        return await translateBdd(args);
      default:
        return errorResponse(`Unknown BDD tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`BDD tool error: ${message}`);
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

function isMultiStep(input: string): boolean {
  return /[,\n،、。]/.test(input);
}

// =============================================================================
// Tool Implementations
// =============================================================================

async function parseBdd(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const language = getString(args, 'language', 'en');

  const { dsl, parseScenario } = await getBDD();

  if (isMultiStep(scenario)) {
    const result = parseScenario(scenario, language);
    return jsonResponse({
      type: 'scenario',
      stepCount: result.steps.length,
      steps: result.steps.map((step: any) => ({
        action: step.action,
        roles: serializeRoles(step.roles),
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

async function compileBdd(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const language = getString(args, 'language', 'en');

  const { dsl, parseScenario, generator } = await getBDD();

  if (isMultiStep(scenario)) {
    const result = parseScenario(scenario, language);
    const code = generator.generate(result.scenario);

    return jsonResponse({
      ok: result.errors.length === 0,
      code,
      stepCount: result.steps.length,
      ...(result.name ? { scenarioName: result.name } : {}),
      errors: result.errors.length > 0 ? result.errors : undefined,
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

async function validateBdd(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const language = getString(args, 'language', 'en');

  const { dsl, parseScenario } = await getBDD();

  if (isMultiStep(scenario)) {
    const result = parseScenario(scenario, language);
    return jsonResponse({
      valid: result.errors.length === 0,
      stepCount: result.steps.length,
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

async function translateBdd(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['scenario', 'from', 'to']);
  if (error) return error;

  const scenario = getString(args, 'scenario');
  const from = getString(args, 'from');
  const to = getString(args, 'to');

  const { dsl, parseScenario, generator, renderer } = await getBDD();

  if (isMultiStep(scenario)) {
    const result = parseScenario(scenario, from);

    // Render each step to target language if renderer available
    let rendered: string | null = null;
    if (renderer) {
      const renderedSteps = result.steps.map((step: any) => renderer(step, to));
      rendered = renderedSteps.join('\n');
    }

    return jsonResponse({
      input: { scenario, language: from },
      translated: rendered,
      playwright: generator.generate(result.scenario),
      steps: result.steps.map((step: any) => ({
        action: step.action,
        roles: serializeRoles(step.roles),
      })),
      errors: result.errors,
    });
  }

  const node = dsl.parse(scenario, from);
  const compiled = dsl.compile(scenario, from);

  // Render to target language if renderer available
  const rendered = renderer ? renderer(node, to) : null;

  return jsonResponse({
    input: { scenario, language: from },
    translated: rendered,
    semantic: { action: node.action, roles: serializeRoles(node.roles) },
    playwright: compiled.ok ? compiled.code : null,
  });
}
