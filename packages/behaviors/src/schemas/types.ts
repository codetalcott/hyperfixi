/**
 * Behavior Schema Types
 *
 * Defines the structure for behavior metadata used for:
 * - Code generation (TypeScript types, documentation)
 * - Runtime categorization and lazy loading
 * - Tooling and IDE integration
 */

/**
 * Behavior categories for organization.
 * - ui: Visual interaction behaviors (drag, resize, sort)
 * - data: Data manipulation behaviors (remove, transform)
 * - animation: Animation and transition behaviors
 * - form: Form-related behaviors (validation, toggle states)
 * - layout: Layout behaviors (sticky, scrollspy)
 */
export type BehaviorCategory = 'ui' | 'data' | 'animation' | 'form' | 'layout';

/**
 * Loading tiers for lazy loading optimization.
 * - core: Always loaded (essential behaviors)
 * - common: High usage (loaded for typical apps)
 * - optional: Low usage (loaded on demand)
 */
export type BehaviorTier = 'core' | 'common' | 'optional';

/**
 * Schema for a behavior parameter.
 */
export interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'selector' | 'element';
  optional?: boolean;
  default?: string;
  description: string;
}

/**
 * Schema for a behavior event.
 */
export interface EventSchema {
  name: string;
  description: string;
}

/**
 * Complete schema for a behavior.
 * This is the source of truth for all behavior metadata.
 */
export interface BehaviorSchema {
  /** Behavior name (PascalCase) */
  name: string;
  /** Category for organization */
  category: BehaviorCategory;
  /** Loading tier for lazy loading */
  tier: BehaviorTier;
  /** Semantic version */
  version: string;
  /** Human-readable description */
  description: string;
  /** Parameter definitions */
  parameters: ParameterSchema[];
  /** Event definitions */
  events: EventSchema[];
  /** The hyperscript behavior source code */
  source: string;
  /** Optional requirements or notes */
  requirements?: string[];
}

/**
 * Runtime behavior module interface.
 * This is what gets registered with the hyperfixi runtime.
 */
export interface BehaviorModule {
  source: string;
  metadata: BehaviorSchema;
  register: (hyperfixi?: LokaScriptInstance) => Promise<void>;
}

/**
 * Minimal LokaScript instance interface for behavior registration.
 */
export interface LokaScriptInstance {
  compileSync: (
    code: string,
    options?: { traditional?: boolean; language?: string }
  ) => {
    ok: boolean;
    ast?: unknown;
    errors?: Array<{ message: string; line?: number; column?: number }>;
  };
  execute: (ast: unknown, ctx: unknown) => Promise<unknown>;
  createContext?: () => { locals: Map<string, unknown>; globals: Map<string, unknown> };
}
