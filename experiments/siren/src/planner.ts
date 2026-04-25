/**
 * BFS planner — re-exported from @lokascript/planner.
 *
 * The canonical implementation lives in packages/planner/.
 * This file preserves backward compatibility for siren consumers.
 */

export {
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
} from '../../../packages/planner/src/planner.js';

export type {
  PlanStep,
  AffordanceDef,
  PlanResult,
  PlanOptions,
} from '../../../packages/planner/src/planner.js';
