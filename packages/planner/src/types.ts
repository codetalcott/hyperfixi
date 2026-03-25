/**
 * Type definitions for the BFS planner.
 *
 * These are the subset of Siren/GRAIL types that the planner depends on.
 * Standalone — no external dependencies.
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

/** Entry in a condition map from the /conditions endpoint */
export interface ConditionMapEntry {
  description?: string;
  producedBy: string[];
  requiredBy: string[];
}
