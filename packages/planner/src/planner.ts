/**
 * BFS planner over the affordance graph.
 *
 * Port of siren-grail/packages/siren-agent/planner.js to TypeScript,
 * extended with cost-aware path selection, preferred tiebreaker (GRAIL spec §5.4),
 * and a buildDefsFromActions() path for client-side planning without a condition map.
 *
 * Pure module — no DOM, no fetch, no side effects.
 */

import type { SirenAction, SirenEntity, ConditionMapEntry } from './types.js';

// ---------- Types ----------

export interface PlanStep {
  readonly name: string;
  readonly params: Readonly<Record<string, string>>;
  key(): string;
  label(): string;
}

export interface AffordanceDef {
  readonly name: string;
  readonly preconditions: readonly string[];
  readonly effects: readonly string[];
  readonly templateEffect: string | null;
  readonly paramName: string | null;
  readonly validValues: readonly string[];
  readonly cost: number;
  readonly preferred: boolean;
}

export interface PlanResult {
  /** Ordered steps to reach the goal (empty if already satisfied) */
  steps: PlanStep[];
  /** Total cost of all steps */
  totalCost: number;
  /** Number of alternative equal-length paths found */
  alternativeCount: number;
}

export interface PlanOptions {
  maxDepth?: number;
  maxQueueSize?: number;
  blockedSteps?: PlanStep[];
}

interface HeuristicMapping {
  property: string;
  op: string;
  value: string | number;
}

// ---------- Factories ----------

export function createPlanStep(name: string, params: Record<string, string> = {}): PlanStep {
  const frozenParams = Object.freeze({ ...params });
  return Object.freeze({
    name,
    params: frozenParams,
    key() {
      const entries = Object.entries(frozenParams).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      if (entries.length === 0) return name;
      return `${name}(${entries.map(([k, v]) => `${k}=${v}`).join(',')})`;
    },
    label() {
      const entries = Object.entries(frozenParams);
      if (entries.length === 0) return name;
      const p = entries.map(([k, v]) => `${k}=${v}`).join(', ');
      return `${name}(${p})`;
    },
  });
}

export function createAffordanceDef(opts: {
  name: string;
  preconditions: string[];
  effects: string[];
  templateEffect?: string | null;
  paramName?: string | null;
  validValues?: string[];
  cost?: number;
  preferred?: boolean;
}): AffordanceDef {
  return Object.freeze({
    name: opts.name,
    preconditions: Object.freeze([...opts.preconditions]),
    effects: Object.freeze([...opts.effects]),
    templateEffect: opts.templateEffect ?? null,
    paramName: opts.paramName ?? null,
    validValues: Object.freeze([...(opts.validValues ?? [])]),
    cost: opts.cost ?? 1,
    preferred: opts.preferred ?? false,
  });
}

// ---------- State helpers ----------

function stateKey(state: Set<string>): string {
  return [...state].sort().join(',');
}

/**
 * Forward simulation: apply affordance effects, return new state.
 * Handles template effect resolution and mutex prefix clearing.
 */
export function applyEffects(
  state: Set<string>,
  affDef: AffordanceDef,
  params: Record<string, string>,
  mutexPrefixes: Set<string>
): Set<string> {
  const next = new Set(state);

  if (affDef.templateEffect && params && Object.keys(params).length > 0) {
    let resolved = affDef.templateEffect;
    for (const [k, v] of Object.entries(params)) {
      resolved = resolved.replace(`{${k}}`, v);
    }
    const prefix = affDef.templateEffect.slice(0, affDef.templateEffect.indexOf('{'));
    for (const c of next) {
      if (c.startsWith(prefix)) next.delete(c);
    }
    next.add(resolved);
  } else {
    for (const effect of affDef.effects) {
      for (const prefix of mutexPrefixes) {
        if (effect.startsWith(prefix)) {
          for (const c of next) {
            if (c.startsWith(prefix)) next.delete(c);
          }
          break;
        }
      }
      next.add(effect);
    }
  }

  return next;
}

// ---------- Condition inference ----------

/**
 * Infer heuristic condition mappings from condition name structure.
 *
 * - "x.y.z" (3 segments): property=y, op=eq, value=z
 * - "x.y.z" where z="nonempty": property=yCount (singular), op=gt, value=0
 * - "x.y" (2 segments): derived from action-presence
 */
export function inferHeuristicMappings(
  conditionNames: Set<string>
): Record<string, HeuristicMapping> {
  const mappings: Record<string, HeuristicMapping> = {};
  for (const name of conditionNames) {
    const parts = name.split('.');
    if (parts.length === 3) {
      const [, prop, value] = parts;
      if (value === 'nonempty') {
        const singular = prop.endsWith('s') ? prop.slice(0, -1) : prop;
        mappings[name] = { property: `${singular}Count`, op: 'gt', value: 0 };
      } else {
        mappings[name] = { property: prop, op: 'eq', value };
      }
    } else if (parts.length === 2) {
      mappings[name] = { property: '_derived', op: 'action-presence', value: '' };
    }
  }
  return mappings;
}

/**
 * Infer active conditions from a Siren entity.
 * Prefers server-provided x-conditions when available.
 */
export function inferConditions(
  entity: { properties?: Record<string, unknown>; actions?: unknown[]; 'x-conditions'?: string[] },
  conditionNames: Set<string>,
  mappings?: Record<string, HeuristicMapping>
): Set<string> {
  const xc = entity['x-conditions'];
  if (Array.isArray(xc)) {
    return new Set(xc);
  }

  if (!mappings) {
    mappings = inferHeuristicMappings(conditionNames);
  }

  const props = entity.properties || {};
  const actions = entity.actions || [];
  const conds = new Set<string>();

  // First pass: non-derived
  for (const name of conditionNames) {
    const m = mappings[name];
    if (!m || m.property === '_derived') continue;
    const val = props[m.property];
    if (val === undefined || val === null) continue;
    if (m.op === 'eq' && String(val) === String(m.value)) conds.add(name);
    else if (m.op === 'gt') {
      try {
        if (Number(val) > Number(m.value)) conds.add(name);
      } catch {
        /* skip */
      }
    }
  }

  // Second pass: derived (action-presence)
  for (const name of conditionNames) {
    const m = mappings[name];
    if (!m || m.property !== '_derived') continue;
    if (actions.length > 0) conds.add(name);
  }

  return conds;
}

// ---------- Template detection ----------

/**
 * Detect parameterized template in a list of effect condition names.
 * Returns [template, paramName, validValues] or [null, null, effects].
 */
function detectTemplate(effects: string[]): [string | null, string | null, string[]] {
  if (effects.length < 2) return [null, null, effects];

  let prefix = effects[0];
  for (let i = 1; i < effects.length; i++) {
    while (!effects[i].startsWith(prefix)) {
      const dot = prefix.lastIndexOf('.');
      if (dot === -1) return [null, null, effects];
      prefix = prefix.slice(0, dot + 1);
    }
  }

  if (!prefix.endsWith('.')) return [null, null, effects];

  const values: string[] = [];
  for (const e of effects) {
    if (!e.startsWith(prefix)) return [null, null, effects];
    values.push(e.slice(prefix.length));
  }

  const parts = prefix.replace(/\.$/, '').split('.');
  const paramName = parts.length > 0 ? parts[parts.length - 1] : 'value';
  const template = `${prefix}{${paramName}}`;

  return [template, paramName, values];
}

// ---------- Condition map parsing ----------

/**
 * Parse a condition map (from /conditions endpoint) into AffordanceDef objects.
 * Input shape: { conditionName: { description, producedBy: string[], requiredBy: string[] } }
 */
export function parseConditionMap(conditionMap: Record<string, ConditionMapEntry>): {
  defs: AffordanceDef[];
  conditionNames: Set<string>;
  mutexPrefixes: Set<string>;
} {
  const conditionNames = new Set(Object.keys(conditionMap));

  const affNames = new Set<string>();
  for (const info of Object.values(conditionMap)) {
    for (const a of info.producedBy || []) affNames.add(a);
    for (const a of info.requiredBy || []) affNames.add(a);
  }

  const defs: AffordanceDef[] = [];
  for (const affName of [...affNames].sort()) {
    const preconditions: string[] = [];
    const effects: string[] = [];

    for (const [condName, info] of Object.entries(conditionMap)) {
      if ((info.requiredBy || []).includes(affName)) preconditions.push(condName);
      if ((info.producedBy || []).includes(affName)) effects.push(condName);
    }

    preconditions.sort();
    effects.sort();

    const [templateEffect, paramName, validValues] = detectTemplate(effects);

    defs.push(
      createAffordanceDef({
        name: affName,
        preconditions,
        effects,
        templateEffect,
        paramName,
        validValues,
      })
    );
  }

  const mutexPrefixes = new Set<string>();
  for (const d of defs) {
    if (d.templateEffect) {
      mutexPrefixes.add(d.templateEffect.slice(0, d.templateEffect.indexOf('{')));
    }
  }

  return { defs, conditionNames, mutexPrefixes };
}

// ---------- Build defs from entity actions (simple path) ----------

/**
 * Build AffordanceDefs directly from SirenAction[].
 * This is the "simple path" — no condition map or server endpoint required.
 * Reads preconditions, effects, and cost from each action.
 */
export function buildDefsFromActions(actions: SirenAction[]): {
  defs: AffordanceDef[];
  conditionNames: Set<string>;
  mutexPrefixes: Set<string>;
} {
  const conditionNames = new Set<string>();
  const defs: AffordanceDef[] = [];

  for (const action of actions) {
    const preconditions = action.preconditions ?? [];
    const effects = action.effects ?? [];

    for (const c of preconditions) conditionNames.add(c);
    for (const c of effects) conditionNames.add(c);

    const [templateEffect, paramName, validValues] = detectTemplate([...effects]);

    defs.push(
      createAffordanceDef({
        name: action.name,
        preconditions: [...preconditions],
        effects: [...effects],
        templateEffect,
        paramName,
        validValues,
        cost: action.cost ?? 1,
      })
    );
  }

  const mutexPrefixes = new Set<string>();
  for (const d of defs) {
    if (d.templateEffect) {
      mutexPrefixes.add(d.templateEffect.slice(0, d.templateEffect.indexOf('{')));
    }
  }

  return { defs, conditionNames, mutexPrefixes };
}

// ---------- BFS planner ----------

function availableSteps(
  state: Set<string>,
  defs: AffordanceDef[],
  blockedKeys: Set<string>
): PlanStep[] {
  const steps: PlanStep[] = [];
  for (const d of defs) {
    if (!d.preconditions.every(p => state.has(p))) continue;
    if (d.paramName) {
      for (const v of d.validValues) {
        const step = createPlanStep(d.name, { [d.paramName]: v });
        if (!blockedKeys.has(step.key())) steps.push(step);
      }
    } else {
      const step = createPlanStep(d.name);
      if (!blockedKeys.has(step.key())) steps.push(step);
    }
  }
  return steps;
}

/**
 * BFS: find ALL shortest action sequences from start state to goal condition.
 */
export function plan(
  start: Set<string>,
  goalCondition: string,
  defs: AffordanceDef[],
  mutexPrefixes: Set<string>,
  opts: PlanOptions = {}
): PlanStep[][] {
  const { maxDepth = 5, maxQueueSize = 10000, blockedSteps = [] } = opts;

  if (start.has(goalCondition)) return [[]];

  const blockedKeys = new Set(blockedSteps.map(s => s.key()));
  const queue: Array<{ state: Set<string>; path: PlanStep[] }> = [{ state: start, path: [] }];
  const visited = new Set([stateKey(start)]);
  const solutions: PlanStep[][] = [];
  let solutionDepth: number | null = null;

  while (queue.length > 0) {
    if (queue.length > maxQueueSize) return solutions;

    const { state, path } = queue.shift()!;
    if (solutionDepth !== null && path.length >= solutionDepth) continue;

    for (const step of availableSteps(state, defs, blockedKeys)) {
      const affDef = defs.find(d => d.name === step.name)!;
      const newState = applyEffects(state, affDef, step.params, mutexPrefixes);
      const newPath = [...path, step];

      if (newState.has(goalCondition)) {
        solutions.push(newPath);
        solutionDepth = newPath.length;
        continue;
      }

      const key = stateKey(newState);
      if (!visited.has(key) && newPath.length < maxDepth) {
        visited.add(key);
        queue.push({ state: newState, path: newPath });
      }
    }
  }

  return solutions;
}

// ---------- Cost-aware planning ----------

function pathCost(path: PlanStep[], defs: AffordanceDef[]): number {
  return path.reduce((sum, step) => {
    const def = defs.find(d => d.name === step.name);
    return sum + (def?.cost ?? 1);
  }, 0);
}

function pathPreferredCount(path: PlanStep[], defs: AffordanceDef[]): number {
  return path.reduce((count, step) => {
    const def = defs.find(d => d.name === step.name);
    return count + (def?.preferred ? 1 : 0);
  }, 0);
}

/**
 * Find the lowest-cost shortest path.
 * Among equal-cost paths, prefer ones with more preferred steps (spec §5.4).
 */
export function planWithCost(
  start: Set<string>,
  goalCondition: string,
  defs: AffordanceDef[],
  mutexPrefixes: Set<string>,
  opts: PlanOptions = {}
): PlanResult {
  const paths = plan(start, goalCondition, defs, mutexPrefixes, opts);

  if (paths.length === 0) {
    return { steps: [], totalCost: 0, alternativeCount: 0 };
  }

  // Already-satisfied case: plan() returns [[]]
  if (paths.length === 1 && paths[0].length === 0) {
    return { steps: [], totalCost: 0, alternativeCount: 1 };
  }

  let bestPath = paths[0];
  let bestCost = pathCost(bestPath, defs);
  let bestPreferred = pathPreferredCount(bestPath, defs);

  for (let i = 1; i < paths.length; i++) {
    const cost = pathCost(paths[i], defs);
    const preferred = pathPreferredCount(paths[i], defs);
    if (cost < bestCost || (cost === bestCost && preferred > bestPreferred)) {
      bestPath = paths[i];
      bestCost = cost;
      bestPreferred = preferred;
    }
  }

  return {
    steps: bestPath,
    totalCost: bestCost,
    alternativeCount: paths.length,
  };
}

// ---------- Action-level planning ----------

/**
 * Plan prerequisite chain for a goal action using a condition map.
 * Uses BFS for each unmet precondition with forward state simulation.
 */
export function planForAction(
  entity: { properties?: Record<string, unknown>; actions?: unknown[]; 'x-conditions'?: string[] },
  goalActionName: string,
  conditionMap: Record<string, ConditionMapEntry>,
  opts: PlanOptions = {}
): PlanStep[] | null {
  const { defs, conditionNames, mutexPrefixes } = parseConditionMap(conditionMap);
  const goalDef = defs.find(d => d.name === goalActionName);
  if (!goalDef) return null;

  let state = inferConditions(entity, conditionNames);

  const unmet = goalDef.preconditions.filter(p => !state.has(p));
  if (unmet.length === 0) return [createPlanStep(goalActionName)];

  const steps: PlanStep[] = [];
  const usedKeys = new Set<string>();

  for (const precond of unmet) {
    if (state.has(precond)) continue;
    const paths = plan(state, precond, defs, mutexPrefixes, opts);
    if (paths.length === 0) return null;
    for (const step of paths[0]) {
      if (usedKeys.has(step.key())) continue;
      usedKeys.add(step.key());
      steps.push(step);
      const affDef = defs.find(d => d.name === step.name);
      if (affDef) state = applyEffects(state, affDef, step.params, mutexPrefixes);
    }
  }

  steps.push(createPlanStep(goalActionName));
  return steps;
}

// ---------- Entity-level planning (simple path) ----------

/**
 * Plan from entity actions directly — no condition map required.
 * Builds AffordanceDefs from the entity's actions, infers current state,
 * and runs cost-aware BFS for the goal action's unmet preconditions.
 */
export function planFromEntity(
  entity: SirenEntity & { 'x-conditions'?: string[] },
  goalActionName: string,
  opts: PlanOptions = {}
): PlanResult | null {
  const actions = entity.actions ?? [];
  if (actions.length === 0) return null;

  const goalAction = actions.find(a => a.name === goalActionName);
  if (!goalAction) return null;

  const goalPreconditions = goalAction.preconditions ?? [];

  const { defs, conditionNames, mutexPrefixes } = buildDefsFromActions(actions);

  const state = inferConditions(entity, conditionNames);

  const unmet = goalPreconditions.filter(p => !state.has(p));
  if (unmet.length === 0) {
    return {
      steps: [createPlanStep(goalActionName)],
      totalCost: goalAction.cost ?? 1,
      alternativeCount: 1,
    };
  }

  // Plan each unmet precondition with cost-aware selection, forward-simulating state
  let currentState = state;
  const steps: PlanStep[] = [];
  const usedKeys = new Set<string>();
  let totalCost = 0;

  for (const precond of unmet) {
    if (currentState.has(precond)) continue;
    const result = planWithCost(currentState, precond, defs, mutexPrefixes, opts);
    if (result.steps.length === 0 && !currentState.has(precond)) return null;
    for (const step of result.steps) {
      if (usedKeys.has(step.key())) continue;
      usedKeys.add(step.key());
      steps.push(step);
      const affDef = defs.find(d => d.name === step.name);
      if (affDef) {
        totalCost += affDef.cost;
        currentState = applyEffects(currentState, affDef, step.params, mutexPrefixes);
      }
    }
  }

  steps.push(createPlanStep(goalActionName));
  totalCost += goalAction.cost ?? 1;

  return { steps, totalCost, alternativeCount: 1 };
}
