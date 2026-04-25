import { describe, it, expect } from 'vitest';
import {
  createPlanStep,
  createAffordanceDef,
  applyEffects,
  inferHeuristicMappings,
  inferConditions,
  parseConditionMap,
  buildDefsFromActions,
  plan,
  planWithCost,
  planForAction,
  planFromEntity,
} from '../planner.js';
import type { SirenAction, ConditionMapEntry } from '../types.js';

// ---------------------------------------------------------------------------
// Fixtures: order workflow (matches Go demo)
// ---------------------------------------------------------------------------

const ORDER_CONDITION_MAP: Record<string, ConditionMapEntry> = {
  'order.mutable': {
    description: 'Order is mutable',
    producedBy: [],
    requiredBy: ['add-item', 'update-order', 'delete-order'],
  },
  'order.status.pending': {
    description: 'Order status is pending',
    producedBy: ['update-order'],
    requiredBy: [],
  },
  'order.status.processing': {
    description: 'Order status is processing',
    producedBy: ['update-order'],
    requiredBy: ['ship-order'],
  },
  'order.status.shipped': {
    description: 'Order status is shipped',
    producedBy: ['ship-order'],
    requiredBy: [],
  },
  'order.items.nonempty': {
    description: 'Order has items',
    producedBy: ['add-item'],
    requiredBy: ['ship-order'],
  },
};

const ORDER_ACTIONS: SirenAction[] = [
  {
    name: 'add-item',
    href: '/orders/1/items',
    method: 'POST',
    preconditions: ['order.mutable'],
    effects: ['order.items.nonempty'],
    cost: 1,
  },
  {
    name: 'update-order',
    href: '/orders/1',
    method: 'PUT',
    preconditions: ['order.mutable'],
    effects: ['order.status.pending', 'order.status.processing', 'order.status.shipped'],
    cost: 1,
  },
  {
    name: 'ship-order',
    href: '/orders/1/ship',
    method: 'POST',
    preconditions: ['order.status.processing', 'order.items.nonempty'],
    effects: ['order.status.shipped'],
    cost: 2,
  },
  {
    name: 'delete-order',
    href: '/orders/1',
    method: 'DELETE',
    preconditions: ['order.mutable'],
    effects: [],
    cost: 1,
  },
];

// ---------------------------------------------------------------------------
// PlanStep
// ---------------------------------------------------------------------------

describe('PlanStep', () => {
  it('label() returns name without params', () => {
    const step = createPlanStep('ship-order');
    expect(step.label()).toBe('ship-order');
  });

  it('label() includes params', () => {
    const step = createPlanStep('update-order', { status: 'processing' });
    expect(step.label()).toBe('update-order(status=processing)');
  });

  it('key() is stable regardless of param insertion order', () => {
    const a = createPlanStep('action', { b: '2', a: '1' });
    const b = createPlanStep('action', { a: '1', b: '2' });
    expect(a.key()).toBe(b.key());
  });

  it('key() without params returns just name', () => {
    const step = createPlanStep('ship-order');
    expect(step.key()).toBe('ship-order');
  });
});

// ---------------------------------------------------------------------------
// AffordanceDef
// ---------------------------------------------------------------------------

describe('AffordanceDef', () => {
  it('defaults cost to 1 and preferred to false', () => {
    const def = createAffordanceDef({
      name: 'test',
      preconditions: [],
      effects: ['a'],
    });
    expect(def.cost).toBe(1);
    expect(def.preferred).toBe(false);
  });

  it('preserves cost and preferred', () => {
    const def = createAffordanceDef({
      name: 'test',
      preconditions: [],
      effects: [],
      cost: 5,
      preferred: true,
    });
    expect(def.cost).toBe(5);
    expect(def.preferred).toBe(true);
  });

  it('freezes arrays', () => {
    const def = createAffordanceDef({
      name: 'test',
      preconditions: ['a'],
      effects: ['b'],
    });
    expect(Object.isFrozen(def.preconditions)).toBe(true);
    expect(Object.isFrozen(def.effects)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyEffects
// ---------------------------------------------------------------------------

describe('applyEffects', () => {
  it('adds simple effect', () => {
    const def = createAffordanceDef({
      name: 'add-item',
      preconditions: [],
      effects: ['order.items.nonempty'],
    });
    const state = new Set(['order.mutable']);
    const result = applyEffects(state, def, {}, new Set());
    expect(result.has('order.items.nonempty')).toBe(true);
    expect(result.has('order.mutable')).toBe(true);
  });

  it('resolves template effect and clears mutex', () => {
    const def = createAffordanceDef({
      name: 'update-order',
      preconditions: [],
      effects: ['order.status.pending', 'order.status.processing'],
      templateEffect: 'order.status.{status}',
      paramName: 'status',
      validValues: ['pending', 'processing'],
    });
    const state = new Set(['order.status.pending', 'order.mutable']);
    const result = applyEffects(state, def, { status: 'processing' }, new Set(['order.status.']));
    expect(result.has('order.status.processing')).toBe(true);
    expect(result.has('order.status.pending')).toBe(false);
    expect(result.has('order.mutable')).toBe(true);
  });

  it('clears mutex prefix for non-template effects', () => {
    const def = createAffordanceDef({
      name: 'ship',
      preconditions: [],
      effects: ['order.status.shipped'],
    });
    const state = new Set(['order.status.processing']);
    const result = applyEffects(state, def, {}, new Set(['order.status.']));
    expect(result.has('order.status.shipped')).toBe(true);
    expect(result.has('order.status.processing')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// inferHeuristicMappings
// ---------------------------------------------------------------------------

describe('inferHeuristicMappings', () => {
  it('maps 3-segment eq condition', () => {
    const mappings = inferHeuristicMappings(new Set(['order.status.pending']));
    expect(mappings['order.status.pending']).toEqual({
      property: 'status',
      op: 'eq',
      value: 'pending',
    });
  });

  it('maps 3-segment nonempty condition', () => {
    const mappings = inferHeuristicMappings(new Set(['order.items.nonempty']));
    expect(mappings['order.items.nonempty']).toEqual({
      property: 'itemCount',
      op: 'gt',
      value: 0,
    });
  });

  it('maps 2-segment to derived', () => {
    const mappings = inferHeuristicMappings(new Set(['order.mutable']));
    expect(mappings['order.mutable'].property).toBe('_derived');
  });
});

// ---------------------------------------------------------------------------
// inferConditions
// ---------------------------------------------------------------------------

describe('inferConditions', () => {
  it('prefers x-conditions when present', () => {
    const entity = {
      properties: { status: 'pending' },
      'x-conditions': ['order.status.processing', 'order.items.nonempty'],
    };
    const result = inferConditions(
      entity,
      new Set(['order.status.pending', 'order.status.processing'])
    );
    expect(result.has('order.status.processing')).toBe(true);
    expect(result.has('order.status.pending')).toBe(false);
  });

  it('infers 3-segment eq from properties', () => {
    const entity = { properties: { status: 'pending' } };
    const result = inferConditions(
      entity,
      new Set(['order.status.pending', 'order.status.processing'])
    );
    expect(result.has('order.status.pending')).toBe(true);
    expect(result.has('order.status.processing')).toBe(false);
  });

  it('infers nonempty from count property', () => {
    const entity = { properties: { itemCount: 3 } };
    const result = inferConditions(entity, new Set(['order.items.nonempty']));
    expect(result.has('order.items.nonempty')).toBe(true);
  });

  it('infers derived condition from action presence', () => {
    const entity = { properties: {}, actions: [{ name: 'foo' }] };
    const result = inferConditions(entity, new Set(['order.mutable']));
    expect(result.has('order.mutable')).toBe(true);
  });

  it('does not infer derived when no actions', () => {
    const entity = { properties: {}, actions: [] };
    const result = inferConditions(entity, new Set(['order.mutable']));
    expect(result.has('order.mutable')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseConditionMap
// ---------------------------------------------------------------------------

describe('parseConditionMap', () => {
  it('produces correct AffordanceDefs from order condition map', () => {
    const { defs, conditionNames, mutexPrefixes } = parseConditionMap(ORDER_CONDITION_MAP);

    expect(conditionNames.size).toBe(5);
    expect(defs.length).toBe(4); // add-item, delete-order, ship-order, update-order

    const updateDef = defs.find(d => d.name === 'update-order')!;
    expect(updateDef.templateEffect).toBe('order.status.{status}');
    expect(updateDef.paramName).toBe('status');
    // update-order produces pending and processing (shipped is produced by ship-order)
    expect(updateDef.validValues).toContain('pending');
    expect(updateDef.validValues).toContain('processing');

    expect(mutexPrefixes.has('order.status.')).toBe(true);
  });

  it('handles empty condition map', () => {
    const { defs, conditionNames } = parseConditionMap({});
    expect(defs).toEqual([]);
    expect(conditionNames.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildDefsFromActions
// ---------------------------------------------------------------------------

describe('buildDefsFromActions', () => {
  it('builds defs from SirenAction array', () => {
    const { defs, conditionNames } = buildDefsFromActions(ORDER_ACTIONS);
    expect(defs.length).toBe(4);
    expect(conditionNames.has('order.mutable')).toBe(true);
    expect(conditionNames.has('order.status.shipped')).toBe(true);
  });

  it('preserves cost from SirenAction', () => {
    const { defs } = buildDefsFromActions(ORDER_ACTIONS);
    const shipDef = defs.find(d => d.name === 'ship-order')!;
    expect(shipDef.cost).toBe(2);
  });

  it('defaults cost to 1 when not specified', () => {
    const actions: SirenAction[] = [
      { name: 'test', href: '/test', preconditions: [], effects: ['a'] },
    ];
    const { defs } = buildDefsFromActions(actions);
    expect(defs[0].cost).toBe(1);
  });

  it('detects template effects', () => {
    const { defs } = buildDefsFromActions(ORDER_ACTIONS);
    const updateDef = defs.find(d => d.name === 'update-order')!;
    expect(updateDef.templateEffect).toBe('order.status.{status}');
  });

  it('handles actions without preconditions/effects', () => {
    const actions: SirenAction[] = [{ name: 'noop', href: '/noop' }];
    const { defs, conditionNames } = buildDefsFromActions(actions);
    expect(defs.length).toBe(1);
    expect(defs[0].preconditions).toEqual([]);
    expect(defs[0].effects).toEqual([]);
    expect(conditionNames.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// plan (BFS)
// ---------------------------------------------------------------------------

describe('plan (BFS)', () => {
  const { defs, mutexPrefixes } = parseConditionMap(ORDER_CONDITION_MAP);

  it('returns [[]] when goal already satisfied', () => {
    const start = new Set(['order.status.shipped']);
    const result = plan(start, 'order.status.shipped', defs, mutexPrefixes);
    expect(result).toEqual([[]]);
  });

  it('finds single-step path', () => {
    const start = new Set(['order.mutable']);
    const result = plan(start, 'order.items.nonempty', defs, mutexPrefixes);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].length).toBe(1);
    expect(result[0][0].name).toBe('add-item');
  });

  it('finds multi-step path to ship-order', () => {
    // Need: order.status.processing + order.items.nonempty
    // From: order.mutable + order.status.pending
    const start = new Set(['order.mutable', 'order.status.pending']);
    const result = plan(start, 'order.status.shipped', defs, mutexPrefixes);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Should be 3 steps: add-item, update-order(processing), ship-order
    const path = result[0];
    expect(path.length).toBe(3);
    const names = path.map(s => s.name);
    expect(names).toContain('add-item');
    expect(names).toContain('update-order');
    expect(names).toContain('ship-order');
  });

  it('returns [] when goal unreachable', () => {
    // No way to reach ship-order without order.mutable
    const start = new Set<string>();
    const result = plan(start, 'order.status.shipped', defs, mutexPrefixes);
    expect(result).toEqual([]);
  });

  it('respects blocked steps', () => {
    const start = new Set(['order.mutable']);
    const blocked = [createPlanStep('add-item')];
    const result = plan(start, 'order.items.nonempty', defs, mutexPrefixes, {
      blockedSteps: blocked,
    });
    // add-item is the only way to reach order.items.nonempty, so no path
    expect(result).toEqual([]);
  });

  it('respects maxDepth', () => {
    const start = new Set(['order.mutable', 'order.status.pending']);
    const result = plan(start, 'order.status.shipped', defs, mutexPrefixes, {
      maxDepth: 2,
    });
    // Needs 3 steps, but maxDepth is 2
    expect(result).toEqual([]);
  });

  it('returns all shortest paths', () => {
    // With the update-order template, there may be multiple paths of same length
    const start = new Set(['order.mutable', 'order.status.pending']);
    const result = plan(start, 'order.status.shipped', defs, mutexPrefixes);
    // All paths should be the same length
    if (result.length > 1) {
      const len = result[0].length;
      for (const path of result) {
        expect(path.length).toBe(len);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// planWithCost
// ---------------------------------------------------------------------------

describe('planWithCost', () => {
  it('selects lowest-cost path', () => {
    // Create two paths to the same goal with different costs
    const cheapDef = createAffordanceDef({
      name: 'cheap',
      preconditions: [],
      effects: ['goal'],
      cost: 1,
    });
    const expensiveDef = createAffordanceDef({
      name: 'expensive',
      preconditions: [],
      effects: ['goal'],
      cost: 10,
    });
    const start = new Set<string>();
    const result = planWithCost(start, 'goal', [cheapDef, expensiveDef], new Set());
    expect(result.steps.length).toBe(1);
    expect(result.steps[0].name).toBe('cheap');
    expect(result.totalCost).toBe(1);
    expect(result.alternativeCount).toBe(2);
  });

  it('prefers preferred steps at equal cost', () => {
    const regular = createAffordanceDef({
      name: 'regular',
      preconditions: [],
      effects: ['goal'],
      cost: 1,
      preferred: false,
    });
    const preferred = createAffordanceDef({
      name: 'preferred',
      preconditions: [],
      effects: ['goal'],
      cost: 1,
      preferred: true,
    });
    const start = new Set<string>();
    const result = planWithCost(start, 'goal', [regular, preferred], new Set());
    expect(result.steps[0].name).toBe('preferred');
  });

  it('returns empty result when no paths', () => {
    const def = createAffordanceDef({
      name: 'blocked',
      preconditions: ['impossible'],
      effects: ['goal'],
    });
    const result = planWithCost(new Set(), 'goal', [def], new Set());
    expect(result.steps).toEqual([]);
    expect(result.alternativeCount).toBe(0);
  });

  it('returns empty steps when already satisfied', () => {
    const def = createAffordanceDef({
      name: 'unused',
      preconditions: [],
      effects: ['goal'],
    });
    const result = planWithCost(new Set(['goal']), 'goal', [def], new Set());
    expect(result.steps).toEqual([]);
    expect(result.totalCost).toBe(0);
    expect(result.alternativeCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// planForAction (condition map path)
// ---------------------------------------------------------------------------

describe('planForAction', () => {
  it('returns just the goal when all preconditions met', () => {
    const entity = {
      'x-conditions': ['order.status.processing', 'order.items.nonempty'],
    };
    const result = planForAction(entity, 'ship-order', ORDER_CONDITION_MAP);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].name).toBe('ship-order');
  });

  it('plans prerequisite chain', () => {
    const entity = {
      'x-conditions': ['order.mutable', 'order.status.pending'],
    };
    const result = planForAction(entity, 'ship-order', ORDER_CONDITION_MAP);
    expect(result).not.toBeNull();
    // Should include add-item, update-order(status=processing), ship-order
    const names = result!.map(s => s.name);
    expect(names).toContain('add-item');
    expect(names).toContain('update-order');
    expect(names[names.length - 1]).toBe('ship-order');
  });

  it('produces parameterized steps from template effects', () => {
    const entity = {
      'x-conditions': ['order.mutable', 'order.items.nonempty'],
    };
    const result = planForAction(entity, 'ship-order', ORDER_CONDITION_MAP);
    expect(result).not.toBeNull();
    const updateStep = result!.find(s => s.name === 'update-order');
    expect(updateStep).toBeDefined();
    expect(updateStep!.params.status).toBe('processing');
  });

  it('returns null for unknown action', () => {
    const entity = { 'x-conditions': ['order.mutable'] };
    const result = planForAction(entity, 'nonexistent', ORDER_CONDITION_MAP);
    expect(result).toBeNull();
  });

  it('returns null when precondition unreachable', () => {
    // ship-order needs order.status.processing + order.items.nonempty
    // But order.mutable is not active, so add-item and update-order are blocked
    const entity = { 'x-conditions': [] as string[] };
    const result = planForAction(entity, 'ship-order', ORDER_CONDITION_MAP);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// planFromEntity (simple path)
// ---------------------------------------------------------------------------

describe('planFromEntity', () => {
  it('plans from entity actions directly', () => {
    const entity = {
      actions: ORDER_ACTIONS,
      'x-conditions': ['order.mutable', 'order.status.pending'] as string[],
    };
    const result = planFromEntity(entity, 'ship-order');
    expect(result).not.toBeNull();
    const names = result!.steps.map(s => s.name);
    expect(names).toContain('add-item');
    expect(names[names.length - 1]).toBe('ship-order');
    expect(result!.totalCost).toBeGreaterThan(0);
  });

  it('returns null when goal action not found', () => {
    const entity = { actions: ORDER_ACTIONS };
    const result = planFromEntity(entity, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when entity has no actions', () => {
    const entity = { actions: [] as SirenAction[] };
    const result = planFromEntity(entity, 'ship-order');
    expect(result).toBeNull();
  });

  it('returns single-step when all preconditions met', () => {
    const entity = {
      actions: ORDER_ACTIONS,
      'x-conditions': ['order.status.processing', 'order.items.nonempty'] as string[],
    };
    const result = planFromEntity(entity, 'ship-order');
    expect(result).not.toBeNull();
    expect(result!.steps.length).toBe(1);
    expect(result!.steps[0].name).toBe('ship-order');
    expect(result!.totalCost).toBe(2); // ship-order cost
  });

  it('returns null when preconditions unreachable', () => {
    // ship-order needs order.status.processing + order.items.nonempty
    // add-item and update-order need order.mutable which is not active
    const entity = {
      actions: ORDER_ACTIONS,
      'x-conditions': [] as string[],
    };
    const result = planFromEntity(entity, 'ship-order');
    expect(result).toBeNull();
  });

  it('includes cost in result', () => {
    const entity = {
      actions: ORDER_ACTIONS,
      'x-conditions': ['order.mutable', 'order.status.pending'] as string[],
    };
    const result = planFromEntity(entity, 'ship-order');
    expect(result).not.toBeNull();
    // add-item(1) + update-order(1) + ship-order(2) = 4
    expect(result!.totalCost).toBe(4);
  });
});
