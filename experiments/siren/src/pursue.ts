/**
 * Pursuit logic for the Cooperative Affordance Protocol (GRAIL).
 *
 * Port of siren-grail/packages/siren-agent/pursuit.js to TypeScript.
 * Supports reactive (409 backward-chaining) and proactive (pre-computed plan) modes.
 *
 * Uses fetchSiren for successful responses and a low-level executeSirenAction
 * for pursuit steps (needs raw 409 body, not the siren:blocked event path).
 */

import type {
  SirenEntity,
  SirenAction,
  BlockedResponse,
  ConditionMapEntry,
} from './types';
import type { PlanStep } from './planner';
import {
  getCurrentEntity,
  getCurrentUrl,
  setCurrentEntity,
  getConditionState,
} from './siren-client';
import {
  entityKeyFromUrl,
  dispatchConditionsChanged,
} from './condition-state';
import { resolveUrl, reconcileFields } from './util';

// ---------- Types ----------

export interface PursuitStep {
  action: string;
  status: 'success' | 'blocked' | 'terminal' | 'cycle' | 'depth-exceeded' | 'error';
  offeredAction?: string;
  blockedCondition?: string;
  error?: string;
}

export interface PursuitResult {
  status: 'success' | 'failure';
  reason?: string;
  result?: SirenEntity | null;
  steps: PursuitStep[];
}

export interface PursuitOptions {
  /** Maximum pursuit depth. Default: 5. */
  maxDepth?: number;
  /** Default data for specific actions by name. */
  actionDefaults?: Record<string, Record<string, unknown>>;
  /** Use proactive planning before reactive pursuit. Default: false. */
  proactive?: boolean;
  /** Condition map for proactive planning. Fetched from /conditions endpoint. */
  conditionMap?: Record<string, ConditionMapEntry>;
}

// ---------- Low-level action execution ----------

interface ActionResult {
  entity: SirenEntity | null;
  blocked: BlockedResponse | null;
}

/**
 * Execute a Siren action at a lower level than fetchSiren.
 * Returns the parsed entity on success, or the parsed 409 body on block.
 * Does NOT dispatch siren:blocked (pursuit handles that internally).
 * DOES update entity state and condition tracking on success.
 */
async function executeSirenAction(
  action: SirenAction,
  data?: Record<string, unknown>,
): Promise<ActionResult> {
  const baseUrl = getCurrentUrl();
  if (!baseUrl) throw new Error('pursue: no current URL');

  const url = resolveUrl(action.href, baseUrl);
  const method = (action.method ?? 'GET').toUpperCase();

  const requestInit: RequestInit = { method, headers: {} };

  if (method !== 'GET' && method !== 'HEAD') {
    const body = reconcileFields(data, action.fields);
    (requestInit.headers as Record<string, string>)['Content-Type'] =
      action.type ?? 'application/json';
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestInit);

  // 409 Conflict — return blocked body for pursuit stack
  if (response.status === 409) {
    let blocked: BlockedResponse | undefined;
    try {
      blocked = (await response.json()) as BlockedResponse;
    } catch {
      // Not valid JSON
    }

    // Track conditions from 409 body
    if (blocked?.['x-conditions']) {
      const conditionState = getConditionState();
      const entityKey = entityKeyFromUrl(url);
      const { added, removed } = conditionState.update(entityKey, blocked['x-conditions']);
      if (added.length > 0 || removed.length > 0) {
        dispatchConditionsChanged(conditionState, {
          entity: entityKey,
          conditions: blocked['x-conditions'],
          added,
          removed,
        });
      }
    }

    return { entity: null, blocked: blocked ?? null };
  }

  // Non-2xx error
  if (!response.ok) {
    throw new Error(`pursue: action ${action.name} returned ${response.status} ${response.statusText}`);
  }

  // 204 No Content
  if (response.status === 204) {
    return { entity: null, blocked: null };
  }

  // 2xx success
  const entity = (await response.json()) as SirenEntity;
  setCurrentEntity(entity, response.url || url);
  return { entity, blocked: null };
}

// ---------- Reactive pursuit ----------

/**
 * Stack-based reactive pursuit: attempt goal action, on 409 push offered
 * prerequisite, retry, pop on success. Cycle detection + depth limit.
 */
export async function pursueReactive(
  goalAction: SirenAction,
  goalData?: Record<string, unknown>,
  opts: PursuitOptions = {},
): Promise<PursuitResult> {
  const { maxDepth = 5, actionDefaults = {} } = opts;

  const stack: Array<{ action: SirenAction; data: Record<string, unknown>; name: string }> = [
    { action: goalAction, data: goalData ?? {}, name: goalAction.name },
  ];
  const seen = new Set([goalAction.name]);
  const steps: PursuitStep[] = [];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    let result: ActionResult;
    try {
      result = await executeSirenAction(current.action, current.data);
    } catch (err) {
      steps.push({
        action: current.name,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      return { status: 'failure', reason: String(err), steps };
    }

    if (!result.blocked) {
      // Success — pop and continue
      steps.push({ action: current.name, status: 'success' });
      stack.pop();
      seen.delete(current.name);

      if (stack.length === 0) {
        return { status: 'success', result: result.entity, steps };
      }
      continue;
    }

    // 409 — handle blocked
    const body = result.blocked;
    const isGrail = body.class?.includes('blocked');

    if (!isGrail || !body.actions?.length) {
      steps.push({
        action: current.name,
        status: 'terminal',
        blockedCondition: body.properties?.blockedCondition,
      });
      return {
        status: 'failure',
        reason: body.properties?.message ?? 'Terminal block: no offered actions',
        steps,
      };
    }

    // Take first offered action
    const offered = body.actions[0];

    // Cycle detection
    if (seen.has(offered.name)) {
      steps.push({
        action: current.name,
        status: 'cycle',
        offeredAction: offered.name,
      });
      return {
        status: 'failure',
        reason: `Cycle detected: ${offered.name}`,
        steps,
      };
    }

    // Depth limit
    if (stack.length >= maxDepth) {
      steps.push({ action: current.name, status: 'depth-exceeded' });
      return {
        status: 'failure',
        reason: `Max pursuit depth (${maxDepth}) exceeded`,
        steps,
      };
    }

    seen.add(offered.name);

    // Build data from defaults + pre-filled field values
    const offeredData: Record<string, unknown> = {
      ...(actionDefaults[offered.name] ?? {}),
    };
    if (offered.fields) {
      for (const field of offered.fields) {
        if (field.value !== undefined && !(field.name in offeredData)) {
          offeredData[field.name] = field.value;
        }
      }
    }

    steps.push({
      action: current.name,
      status: 'blocked',
      offeredAction: offered.name,
      blockedCondition: body.properties?.blockedCondition,
    });

    stack.push({ action: offered, data: offeredData, name: offered.name });
  }

  return { status: 'success', steps };
}

// ---------- Proactive plan execution ----------

/**
 * Execute a pre-computed plan step by step. Falls back to reactive
 * pursuit if any step returns 409 or becomes unfindable.
 */
export async function executeProactivePlan(
  planSteps: PlanStep[],
  goalData?: Record<string, unknown>,
  opts: PursuitOptions = {},
): Promise<PursuitResult> {
  const { actionDefaults = {} } = opts;
  const steps: PursuitStep[] = [];

  const goalEntry = planSteps[planSteps.length - 1];
  const goalActionName = goalEntry.name;

  // Capture action descriptors before execution (entity may change during navigation)
  const entity = getCurrentEntity();
  if (!entity) {
    return { status: 'failure', reason: 'No current entity', steps };
  }

  const actionMap = new Map<string, SirenAction>();
  for (const action of entity.actions ?? []) {
    actionMap.set(action.name, action);
  }

  for (let i = 0; i < planSteps.length; i++) {
    const planStep = planSteps[i];
    const isGoal = i === planSteps.length - 1;

    // Look up action — try current entity first (may have changed), then captured map
    const currentEntity = getCurrentEntity();
    let action = currentEntity?.actions?.find(a => a.name === planStep.name)
      ?? actionMap.get(planStep.name);

    if (!action) {
      // Action not found — fall back to reactive for goal
      const goalAction = currentEntity?.actions?.find(a => a.name === goalActionName)
        ?? actionMap.get(goalActionName);
      if (goalAction) {
        const reactiveResult = await pursueReactive(goalAction, goalData, opts);
        reactiveResult.steps = [...steps, ...reactiveResult.steps];
        return reactiveResult;
      }
      return { status: 'failure', reason: `Action ${planStep.name} not found`, steps };
    }

    const data = isGoal
      ? (goalData ?? {})
      : { ...(actionDefaults[planStep.name] ?? {}), ...planStep.params };

    let result: ActionResult;
    try {
      result = await executeSirenAction(action, data);
    } catch (err) {
      steps.push({
        action: planStep.name,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      return { status: 'failure', reason: String(err), steps };
    }

    if (result.blocked) {
      // 409 during proactive execution — fall back to reactive
      steps.push({ action: planStep.name, status: 'blocked' });
      const goalAction = getCurrentEntity()?.actions?.find(a => a.name === goalActionName)
        ?? actionMap.get(goalActionName);
      if (goalAction) {
        const reactiveResult = await pursueReactive(goalAction, goalData, opts);
        reactiveResult.steps = [...steps, ...reactiveResult.steps];
        return reactiveResult;
      }
      return { status: 'failure', reason: `Blocked at ${planStep.name}, goal action not found for fallback`, steps };
    }

    steps.push({ action: planStep.name, status: 'success' });

    if (isGoal) {
      return { status: 'success', result: result.entity, steps };
    }
  }

  return { status: 'success', steps };
}

// ---------- Entry point ----------

/**
 * Pursue a goal action: attempt it, and if blocked, resolve prerequisites.
 *
 * When `opts.proactive` is true and a condition map is available, computes
 * a BFS plan first and executes it step-by-step. Falls back to reactive
 * pursuit (stack-based 409 chaining) if planning fails or a step returns 409.
 */
export async function pursue(
  goalActionName: string,
  goalData?: Record<string, unknown>,
  opts: PursuitOptions = {},
): Promise<PursuitResult> {
  const entity = getCurrentEntity();
  if (!entity) {
    return { status: 'failure', reason: 'No current entity', steps: [] };
  }

  const goalAction = entity.actions?.find(a => a.name === goalActionName);
  if (!goalAction) {
    return { status: 'failure', reason: `Action '${goalActionName}' not found`, steps: [] };
  }

  // Proactive mode: plan first, then execute
  if (opts.proactive && opts.conditionMap) {
    try {
      const { planForAction } = await import('./planner');
      const planOpts = opts.maxDepth != null ? { maxDepth: opts.maxDepth } : {};
      const plan = planForAction(entity, goalActionName, opts.conditionMap, planOpts);
      if (plan && plan.length > 1) {
        return executeProactivePlan(plan, goalData, opts);
      }
    } catch {
      // Planning failed — fall through to reactive
    }
  }

  return pursueReactive(goalAction, goalData, opts);
}
