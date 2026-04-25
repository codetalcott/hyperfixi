/**
 * @lokascript/siren — Siren hypermedia plugin for LokaScript.
 *
 * Makes Siren API responses drive DOM behavior declaratively.
 * The server's affordances (actions, links, entities) become the engine of UI state.
 */

// Plugin
export { sirenPlugin, _resetProbe } from './plugin';

// Types
export type {
  SirenEntity,
  SirenAction,
  SirenField,
  SirenLink,
  SirenSubEntity,
  SirenEntityEventDetail,
  SirenBlockedEventDetail,
  SirenErrorEventDetail,
  BlockedResponse,
  BlockedProperties,
  ConditionsChangedDetail,
  ConditionsSSEData,
  SirenPlanEventDetail,
  ConditionMapEntry,
} from './types';

// Client
export {
  fetchSiren,
  getCurrentEntity,
  getCurrentUrl,
  getConditionState,
  setCurrentEntity,
  resetClient,
} from './siren-client';

// Conditions
export { ConditionState } from './condition-state';
export { connectConditionSSE } from './condition-sse';

// Planner
export {
  createPlanStep,
  createAffordanceDef,
  plan,
  planWithCost,
  planForAction,
  planFromEntity,
  buildDefsFromActions,
  parseConditionMap,
  applyEffects,
  inferConditions,
  inferHeuristicMappings,
} from './planner';
export type {
  PlanStep,
  AffordanceDef,
  PlanResult,
  PlanOptions,
} from './planner';

// Wait for condition
export { waitForCondition } from './wait-for-condition';
export type { WaitForConditionOptions } from './wait-for-condition';

// Pursuit
export { pursue, pursueReactive, executeProactivePlan } from './pursue';
export type { PursuitResult, PursuitStep, PursuitOptions } from './pursue';

// Condition map
export { fetchConditionMap } from './fetch-condition-map';

// Context
export { sirenContextProvider } from './siren-context';
export type { SirenContextValue } from './siren-context';

// Commands
export { followCommand } from './commands/follow';
export { executeActionCommand } from './commands/execute-action';

// Behaviors
export {
  createSirenAffordance,
  type SirenAffordanceConfig,
  type SirenAffordanceInstance,
} from './behaviors/siren-affordance';
export {
  createSirenPlanUI,
  type SirenPlanUIConfig,
  type SirenPlanUIInstance,
} from './behaviors/siren-plan-ui';

// Utilities
export { resolveUrl, reconcileFields, classifyError } from './util';

// Auto-register for script tag usage
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (win.lokascript?.registry) {
    import('./plugin').then(({ sirenPlugin }) => {
      win.lokascript.registry.use(sirenPlugin);
    });
  }
}
