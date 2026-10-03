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
  default?: string | number | boolean;
  /** Allowed values for constrained parameters */
  enum?: string[];
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
 * Runtime behavior module interface: a behavior's source, its schema, and the function that
 * defines it on a hyperscript host.
 */
export interface BehaviorModule {
  source: string;
  metadata: BehaviorSchema;
  register: (host?: HyperscriptHost) => Promise<void>;
}

/**
 * A hyperscript host, in upstream `_hyperscript`'s shape: `@hyperfixi/engine` (the
 * `hyperfixi-hs.js` bundle, `window.hyperfixi` / `window._hyperscript`) or upstream itself.
 * `evaluate(source)` of a `behavior … end` program defines the behavior; `processNode`
 * initialises the scripted elements under a node.
 */
export interface HyperscriptHost {
  evaluate: (source: string) => unknown;
  processNode?: (node: Node) => void;
}

/** The window globals a host installs itself as. */
export interface HyperscriptWindow {
  hyperfixi?: HyperscriptHost;
  _hyperscript?: HyperscriptHost;
}

/** The host on `window`: `hyperfixi` (the engine's bundle) or `_hyperscript` (upstream's name). */
export function resolveRuntime(): HyperscriptHost | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as HyperscriptWindow;
  const host = win.hyperfixi ?? win._hyperscript;
  return host && typeof host.evaluate === 'function' ? host : null;
}

/**
 * Define a behavior on a host from its schema's source, as a page's
 * `<script type="text/hyperscript">` would. Throws when there is no host or the source
 * does not parse.
 */
export function defineBehavior(schema: BehaviorSchema, host?: HyperscriptHost): void {
  const hf = host ?? resolveRuntime();
  if (!hf) {
    throw new Error(
      `No hyperscript host found: load @hyperfixi/engine (hyperfixi-hs.js) before defining ${schema.name}.`
    );
  }
  try {
    hf.evaluate(schema.source);
  } catch (e) {
    throw new Error(`Failed to define ${schema.name} behavior: ${(e as Error).message}`);
  }
}
