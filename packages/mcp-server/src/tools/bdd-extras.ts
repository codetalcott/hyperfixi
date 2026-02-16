/**
 * BDD Domain Multi-Step Extensions
 *
 * Handles multi-step BDD scenarios (comma/newline-separated) that go beyond
 * the DomainRegistry's single-step parse/compile/validate/translate.
 * Single-step operations are handled by the registry.
 */

import { getString, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded BDD multi-step utilities
let bddScenarioParser: any = null;
let bddGenerator: any = null;
let bddRenderer: any = null;

async function getBDDExtras() {
  if (bddScenarioParser)
    return { parseScenario: bddScenarioParser, generator: bddGenerator, renderer: bddRenderer };

  try {
    const mod = await import('@lokascript/domain-bdd');
    bddScenarioParser = mod.parseBDDScenario;
    bddGenerator = mod.bddCodeGenerator;
    bddRenderer = mod.renderBDD ?? null;
    return { parseScenario: bddScenarioParser, generator: bddGenerator, renderer: bddRenderer };
  } catch {
    throw new Error('@lokascript/domain-bdd not available for multi-step parsing.');
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
 * Check if the BDD input is multi-step (contains delimiters).
 */
export function isMultiStepBDD(args: Record<string, unknown>): boolean {
  const scenario = getString(args, 'scenario');
  return /[,\n،、。]/.test(scenario);
}

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

/**
 * Handle multi-step BDD operations.
 */
export async function handleBDDMultiStep(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  const scenario = getString(args, 'scenario');
  if (!scenario) return errorResponse('Missing required parameter: scenario');

  try {
    const { parseScenario, generator, renderer } = await getBDDExtras();
    const operation = name.replace('_bdd', '');

    if (operation === 'parse') {
      const language = getString(args, 'language', 'en');
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

    if (operation === 'compile') {
      const language = getString(args, 'language', 'en');
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

    if (operation === 'validate') {
      const language = getString(args, 'language', 'en');
      const result = parseScenario(scenario, language);
      return jsonResponse({
        valid: result.errors.length === 0,
        stepCount: result.steps.length,
        errorCount: result.errors.length,
        errors: result.errors,
        language,
      });
    }

    if (operation === 'translate') {
      const from = getString(args, 'from');
      const to = getString(args, 'to');
      if (!from || !to) return errorResponse('Missing required parameter: from, to');

      const result = parseScenario(scenario, from);
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

    return errorResponse(`Unknown BDD operation: ${operation}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`BDD multi-step error: ${message}`);
  }
}
