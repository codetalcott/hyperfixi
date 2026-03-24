/**
 * GRAIL MCP Tools — 5 stable tools for Claude-native agent workflows.
 *
 * Tools operate against a grail.yaml configuration, evaluating conditions
 * via shell commands and executing affordances with precondition checks.
 *
 * Wire-compatible with grail-domains (GRAIL spec §7).
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { jsonResponse, errorResponse, getString, getBoolean } from './utils.js';
import { loadGrailConfig, findGrailYaml } from './grail-yaml-loader.js';
import { GrailRegistry } from './grail-registry.js';

// ---------- Tool Definitions ----------

export const grailTools: Tool[] = [
  {
    name: 'grail_check',
    description:
      'Evaluate GRAIL conditions and show available/blocked affordances. ' +
      'Returns passing conditions, failing conditions (with diagnostic output), ' +
      'available actions (preconditions met), and blocked actions (with unmet conditions).',
    inputSchema: {
      type: 'object',
      properties: {
        only: {
          type: 'string',
          description: 'Comma-separated condition names to evaluate (default: all)',
        },
      },
    },
  },
  {
    name: 'grail_plan',
    description:
      'Compute a dependency-ordered plan to make a goal affordance feasible. ' +
      'Returns ordered steps with phases, costs, and blocked-by links. ' +
      'Returns infeasible report if goal is unreachable.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The affordance name to plan for (e.g., "release-publish")',
        },
      },
      required: ['goal'],
    },
  },
  {
    name: 'grail_run',
    description:
      'Execute a GRAIL affordance. Checks preconditions first — blocks if unmet. ' +
      'Respects confirmation gates. Use dry_run=true to preview without executing.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The affordance name to execute (e.g., "run-lint")',
        },
        dry_run: {
          type: 'boolean',
          description: 'Preview the action without executing (default: false)',
        },
        confirmed: {
          type: 'boolean',
          description: 'Confirm execution for actions with confirmation gates (default: false)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'grail_info',
    description:
      'Return the full GRAIL workflow graph: conditions with descriptions, ' +
      'affordances with preconditions/effects/cost, and the enables graph.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'grail_list',
    description: 'List all condition names and affordance names in the GRAIL configuration.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ---------- Registry singleton ----------

let _registry: GrailRegistry | null = null;
let _cwd: string | null = null;

function getRegistry(): GrailRegistry {
  const cwd = process.env.GRAIL_CWD ?? process.cwd();

  // Reload if cwd changed
  if (_registry && _cwd === cwd) return _registry;

  const yamlPath = findGrailYaml(cwd);
  const config = loadGrailConfig(yamlPath);
  _registry = new GrailRegistry(config, cwd);
  _cwd = cwd;
  return _registry;
}

/** Reset for testing. */
export function _resetRegistry(): void {
  _registry = null;
  _cwd = null;
}

// ---------- Handlers ----------

async function handleCheck(
  args: Record<string, unknown>
): Promise<ReturnType<typeof jsonResponse>> {
  const registry = getRegistry();
  const only = getString(args, 'only');

  const results = await registry.evaluateAll();
  const cwd = process.env.GRAIL_CWD ?? process.cwd();

  // Filter if 'only' specified
  const conditionNames = only
    ? only
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : Object.keys(results);

  const passing: Array<{ name: string; description: string }> = [];
  const failing: Array<{ name: string; description: string; output: string }> = [];
  const errors: Array<{ name: string; description: string; error: string }> = [];

  for (const name of conditionNames) {
    const result = results[name];
    if (!result) continue;
    const cond = registry.conditions.get(name);
    const desc = cond?.description ?? '';

    if (result.error) {
      errors.push({ name, description: desc, error: result.error });
    } else if (result.passing) {
      passing.push({ name, description: desc });
    } else {
      failing.push({ name, description: desc, output: result.output });
    }
  }

  // Build truth vector for affordance availability
  const truth: Record<string, boolean> = {};
  for (const [name, result] of Object.entries(results)) {
    truth[name] = result.passing;
  }

  const available: Array<{ name: string; title: string; cost: number }> = [];
  const blocked: Array<{ name: string; title: string; unmet: string[] }> = [];

  for (const [name, aff] of registry.affordances) {
    const check = registry.checkPreconditions(name, truth);
    if (check.met) {
      available.push({ name, title: aff.title ?? name, cost: aff.cost ?? 1 });
    } else {
      blocked.push({ name, title: aff.title ?? name, unmet: check.unmet });
    }
  }

  return jsonResponse({
    cwd,
    passing,
    failing,
    errors: errors.length > 0 ? errors : undefined,
    summary: `${passing.length} passing, ${failing.length} failing`,
    available,
    blocked,
  });
}

async function handlePlan(args: Record<string, unknown>): Promise<ReturnType<typeof jsonResponse>> {
  const goal = getString(args, 'goal');
  if (!goal) return errorResponse('Missing required parameter: goal');

  const registry = getRegistry();
  const aff = registry.affordances.get(goal);
  if (!aff) {
    return jsonResponse({
      goal,
      feasible: false,
      reason: 'unknown affordance',
      unsatisfiable: [],
      steps: [],
    });
  }

  // Evaluate current state
  const results = await registry.evaluateAll();
  const truth: Record<string, boolean> = {};
  for (const [name, result] of Object.entries(results)) {
    truth[name] = result.passing;
  }

  // Check if goal is already feasible
  const check = registry.checkPreconditions(goal, truth);
  if (check.met) {
    const cmd = aff.action?.cmd ?? '';
    return jsonResponse({
      goal,
      feasible: true,
      phases: 1,
      totalCost: aff.cost ?? 1,
      steps: [
        {
          action: goal,
          cmd,
          resolves: aff.effects ?? [],
          phase: 0,
          cost: aff.cost ?? 1,
          blocked_by: [],
        },
      ],
    });
  }

  // Build plan using backward chaining from the condition map
  const conditionMap = registry.conditionMap();
  const enablesGraph = registry.enablesGraph();

  // Simple backward-chaining planner
  const steps: Array<{
    action: string;
    cmd: string;
    resolves: string[];
    phase: number;
    cost: number;
    blocked_by: Array<{ condition: string; needed_by: string }>;
  }> = [];
  const planned = new Set<string>();
  const unsatisfiable: string[] = [];

  function resolve(condition: string, visited: Set<string>): boolean {
    if (truth[condition]) return true;
    if (planned.has(condition)) return true;
    if (visited.has(condition)) return false; // cycle

    visited.add(condition);
    const entry = conditionMap[condition];
    if (!entry || entry.producedBy.length === 0) {
      unsatisfiable.push(condition);
      return false;
    }

    // Try each producer, prefer lowest cost
    const producers = entry.producedBy
      .map(name => registry.affordances.get(name))
      .filter(Boolean)
      .sort((a, b) => (a!.cost ?? 1) - (b!.cost ?? 1));

    for (const producer of producers) {
      if (!producer) continue;

      // Resolve producer's preconditions first
      const producerPreconditions = producer.preconditions ?? [];
      const allMet = producerPreconditions.every(
        p => truth[p] || planned.has(p) || resolve(p, new Set(visited))
      );

      if (allMet) {
        // Add producer to plan
        for (const effect of producer.effects ?? []) {
          planned.add(effect);
        }

        if (!steps.some(s => s.action === producer.name)) {
          steps.push({
            action: producer.name,
            cmd: producer.action?.cmd ?? '',
            resolves: producer.effects ?? [],
            phase: 0, // assigned below
            cost: producer.cost ?? 1,
            blocked_by: [],
          });
        }
        return true;
      }
    }

    unsatisfiable.push(condition);
    return false;
  }

  // Resolve each unmet precondition of the goal
  for (const precond of check.unmet) {
    resolve(precond, new Set());
  }

  if (unsatisfiable.length > 0) {
    return jsonResponse({
      goal,
      feasible: false,
      reason: 'unsatisfiable conditions',
      unsatisfiable: [...new Set(unsatisfiable)],
      steps: [],
    });
  }

  // Add goal as final step
  steps.push({
    action: goal,
    cmd: aff.action?.cmd ?? '',
    resolves: aff.effects ?? [],
    phase: 0,
    cost: aff.cost ?? 1,
    blocked_by: [],
  });

  // Assign phases (topological sort)
  const condProducer = new Map<string, number>();
  for (let i = 0; i < steps.length; i++) {
    for (const effect of steps[i].resolves) {
      condProducer.set(effect, i);
    }
  }

  for (let i = 0; i < steps.length; i++) {
    let depPhase = -1;
    const step = steps[i];
    const stepAff = registry.affordances.get(step.action);
    for (const precond of stepAff?.preconditions ?? []) {
      const producerIdx = condProducer.get(precond);
      if (producerIdx !== undefined && producerIdx !== i) {
        depPhase = Math.max(depPhase, steps[producerIdx].phase);
      }
    }
    step.phase = depPhase + 1;
  }

  // Compute blocked_by
  for (let i = 0; i < steps.length; i++) {
    for (const condition of steps[i].resolves) {
      for (let j = i + 1; j < steps.length; j++) {
        const laterAff = registry.affordances.get(steps[j].action);
        if ((laterAff?.preconditions ?? []).includes(condition)) {
          steps[i].blocked_by.push({ condition, needed_by: steps[j].action });
        }
      }
    }
  }

  const totalCost = steps.reduce((sum, s) => sum + s.cost, 0);
  const phases = Math.max(...steps.map(s => s.phase)) + 1;

  return jsonResponse({
    goal,
    feasible: true,
    phases,
    totalCost,
    steps,
  });
}

async function handleRun(args: Record<string, unknown>): Promise<ReturnType<typeof jsonResponse>> {
  const action = getString(args, 'action');
  if (!action) return errorResponse('Missing required parameter: action');

  const dryRun = getBoolean(args, 'dry_run');
  const confirmed = getBoolean(args, 'confirmed');

  const registry = getRegistry();
  const aff = registry.affordances.get(action);
  if (!aff) return errorResponse(`Unknown affordance: ${action}`);

  // Evaluate preconditions
  const results = await registry.evaluateAll();
  const truth: Record<string, boolean> = {};
  for (const [name, result] of Object.entries(results)) {
    truth[name] = result.passing;
  }

  const check = registry.checkPreconditions(action, truth);

  if (!check.met) {
    return jsonResponse({
      action,
      blocked: true,
      unmet: check.unmet,
      hint: `Run grail_plan('${action}') to see what's needed`,
      cmd: aff.action?.cmd ?? '',
    });
  }

  // Confirmation gate
  if (aff.confirm && !confirmed) {
    return jsonResponse({
      action,
      needsConfirmation: true,
      message:
        aff.confirm === 'true' || aff.confirm === (true as unknown)
          ? `Are you sure you want to run ${action}?`
          : aff.confirm,
      hint: `Re-run with confirmed=true to proceed: grail_run('${action}', confirmed=true)`,
      cmd: aff.action?.cmd ?? '',
      effects: aff.effects ?? [],
    });
  }

  // Dry run
  if (dryRun) {
    return jsonResponse({
      action,
      dry_run: true,
      preconditions_met: true,
      cmd: aff.action?.cmd ?? '',
      effects: aff.effects ?? [],
    });
  }

  // Execute
  const result = await registry.run(action);

  // Drift detection: check if declared effects are now true
  const driftWarnings: string[] = [];
  if (result.success && (aff.effects?.length ?? 0) > 0) {
    const postResults = await registry.evaluateAll();
    for (const effect of aff.effects ?? []) {
      if (!effect.includes('{') && postResults[effect] && !postResults[effect].passing) {
        driftWarnings.push(`Effect '${effect}' declared but not true after execution`);
      }
    }
  }

  return jsonResponse({
    action,
    success: result.success,
    cmd: result.cmd,
    exitCode: result.exitCode,
    duration_ms: result.duration_ms,
    output: result.output,
    driftWarnings: driftWarnings.length > 0 ? driftWarnings : undefined,
  });
}

function handleInfo(): ReturnType<typeof jsonResponse> {
  const registry = getRegistry();

  const conditions: Record<string, { description: string }> = {};
  for (const [name, cond] of registry.conditions) {
    conditions[name] = { description: cond.description };
  }

  const affordances: Record<
    string,
    {
      title: string;
      preconditions: string[];
      effects: string[];
      cost: number;
      cmd: string;
    }
  > = {};
  for (const [name, aff] of registry.affordances) {
    affordances[name] = {
      title: aff.title ?? name,
      preconditions: aff.preconditions ?? [],
      effects: aff.effects ?? [],
      cost: aff.cost ?? 1,
      cmd: aff.action?.cmd ?? '',
    };
  }

  return jsonResponse({
    domain: { name: 'hyperfixi' },
    conditions,
    affordances,
    enablesGraph: registry.enablesGraph(),
  });
}

function handleList(): ReturnType<typeof jsonResponse> {
  const registry = getRegistry();
  return jsonResponse({
    conditions: [...registry.conditions.keys()],
    affordances: [...registry.affordances.keys()],
  });
}

// ---------- Dispatcher ----------

export async function handleGrailTool(
  name: string,
  args: Record<string, unknown>
): Promise<ReturnType<typeof jsonResponse | typeof errorResponse>> {
  try {
    switch (name) {
      case 'grail_check':
        return await handleCheck(args);
      case 'grail_plan':
        return await handlePlan(args);
      case 'grail_run':
        return await handleRun(args);
      case 'grail_info':
        return handleInfo();
      case 'grail_list':
        return handleList();
      default:
        return errorResponse(`Unknown GRAIL tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`GRAIL tool error: ${message}`);
  }
}
