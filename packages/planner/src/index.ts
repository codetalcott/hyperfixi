/**
 * @lokascript/planner — BFS planner over affordance graphs.
 *
 * Pure module — no DOM, no fetch, no side effects.
 * Used by GRAIL MCP tools and Siren hypermedia clients.
 */

// Types (Siren/GRAIL primitives)
export type {
  SirenEntity,
  SirenAction,
  SirenField,
  SirenLink,
  SirenSubEntity,
  BlockedProperties,
  BlockedResponse,
  ConditionMapEntry,
} from './types.js';

// Planner types
export type { PlanStep, AffordanceDef, PlanResult, PlanOptions } from './planner.js';

// Planner functions
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
} from './planner.js';
