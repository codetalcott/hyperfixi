/**
 * Siren hypermedia type definitions.
 * Standalone — no external dependencies.
 * See: https://github.com/kevinswiber/siren
 */

export interface SirenEntity {
  class?: string[];
  properties?: Record<string, unknown>;
  actions?: SirenAction[];
  links?: SirenLink[];
  entities?: SirenSubEntity[];
}

export interface SirenAction {
  name: string;
  title?: string;
  method?: string;
  href: string;
  type?: string;
  fields?: SirenField[];
  /** Cooperative affordance: preconditions that must be met */
  preconditions?: string[];
  /** Cooperative affordance: effects of this action */
  effects?: string[];
  /** Cooperative affordance: relative effort weight for planning */
  cost?: number;
}

export interface SirenField {
  name: string;
  type?: string;
  value?: unknown;
  title?: string;
  description?: string;
  options?: unknown[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
}

export interface SirenLink {
  rel: string[];
  href: string;
  title?: string;
}

export interface SirenSubEntity {
  class?: string[];
  rel?: string[];
  href?: string;
  properties?: Record<string, unknown>;
}

/** Detail payload for siren:entity CustomEvent */
export interface SirenEntityEventDetail {
  entity: SirenEntity;
  url: string;
  previousUrl: string | null;
}

/**
 * The properties block in a GRAIL 409 Blocked response body.
 */
export interface BlockedProperties {
  status: 409;
  message: string;
  blockedAction: string;
  blockedCondition: string;
  unmetConditions?: string[];
}

/**
 * A 409 Conflict response body from a GRAIL server.
 * Contains the blocked action info and offered affordances.
 */
export interface BlockedResponse {
  class: string[];
  properties: BlockedProperties;
  actions?: SirenAction[];
  /** Active conditions on this entity (also sent as x-conditions header) */
  'x-conditions'?: string[];
}

/** Detail payload for siren:blocked CustomEvent */
export interface SirenBlockedEventDetail {
  message: string;
  blockedAction: string | null;
  /** The specific condition that blocked execution */
  blockedCondition: string | null;
  /** All conditions that are not met */
  unmetConditions: string[];
  offeredActions: SirenAction[];
  /** The raw 409 response body (present when body is valid GRAIL blocked response) */
  raw: BlockedResponse | null;
}

/** Detail payload for siren:conditions CustomEvent */
export interface ConditionsChangedDetail {
  /** The entity URL path whose conditions changed */
  entity: string;
  /** Current active conditions */
  conditions: string[];
  /** Conditions that were added since last update */
  added: string[];
  /** Conditions that were removed since last update */
  removed: string[];
}

/**
 * Data payload for a GRAIL SSE `conditions` event.
 * Matches the wire format: event: conditions / data: JSON
 */
export interface ConditionsSSEData {
  /** Entity URL path */
  entity: string;
  /** Full set of active conditions */
  conditions: string[];
  /** Conditions that became true */
  added: string[];
  /** Conditions that became false */
  removed: string[];
  /** The action that caused the change (optional) */
  trigger?: string;
}

/** Detail payload for siren:plan CustomEvent */
export interface SirenPlanEventDetail {
  /** The action that was blocked (from 409 response) */
  blockedAction: string;
  /** Ordered steps to unblock the action */
  steps: Array<{ name: string; params: Record<string, string> }>;
  /** Total cost of the plan */
  totalCost: number;
  /** Number of alternative equal-length paths found */
  alternativeCount: number;
  /** Whether the plan was generated from entity actions (true) or condition map (false) */
  fromEntityActions: boolean;
}

/** Entry in a condition map from the /conditions endpoint */
export interface ConditionMapEntry {
  description?: string;
  producedBy: string[];
  requiredBy: string[];
}

/** Detail payload for siren:error CustomEvent */
export interface SirenErrorEventDetail {
  status: number;
  message: string;
  transient: boolean;
  url: string;
}
