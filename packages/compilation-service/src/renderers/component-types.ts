/**
 * Component Renderer Types
 *
 * Interface for pluggable component renderers. Each renderer takes a BehaviorSpec
 * and produces a complete framework-specific component file.
 * Parallel to TestRenderer (test generation) — this is for code generation.
 */

import type { AbstractOperation, BehaviorSpec } from '../operations/types.js';

// =============================================================================
// Renderer Interface
// =============================================================================

/**
 * A component renderer converts a BehaviorSpec into framework-specific component code.
 */
export interface ComponentRenderer {
  /** The framework this renderer targets */
  readonly framework: string;
  /** Render a behavior spec into a complete component */
  render(spec: BehaviorSpec, options?: ComponentRenderOptions): GeneratedComponent;
}

// =============================================================================
// Options
// =============================================================================

export interface ComponentRenderOptions {
  /** Override auto-generated component name */
  componentName?: string;
  /** TypeScript output (default true) */
  typescript?: boolean;
}

// =============================================================================
// Output
// =============================================================================

/**
 * A generated component file.
 */
export interface GeneratedComponent {
  /** Component name (e.g., "ToggleActiveButton") */
  name: string;
  /** Full component file content */
  code: string;
  /** Target framework */
  framework: string;
  /** Abstract operations for introspection */
  operations: AbstractOperation[];
  /** Framework-specific reactive primitives (React hooks, Vue composables, Svelte runes) */
  hooks: string[];
}
