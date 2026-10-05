/**
 * Test Renderer Types
 *
 * Interface for pluggable test renderers. Each renderer takes a BehaviorSpec
 * and produces a complete test file in a specific framework format.
 */

import type { AbstractOperation, BehaviorSpec } from '../operations/types.js';

// =============================================================================
// Renderer Interface
// =============================================================================

/**
 * A test renderer converts a BehaviorSpec into a framework-specific test file.
 */
export interface TestRenderer {
  /** The framework this renderer targets */
  readonly framework: string;
  /** Render a behavior spec into a complete test */
  render(spec: BehaviorSpec, options: TestRenderOptions): GeneratedTest;
}

// =============================================================================
// Options
// =============================================================================

export interface TestRenderOptions {
  /** Override auto-generated test name */
  testName?: string;
  /** Path to the hyperscript bundle (default: @hyperfixi/engine's hyperfixi-hs.js) */
  bundlePath?: string;
  /** Original hyperscript source (for embedding in fixture) */
  hyperscript?: string;
}

// =============================================================================
// Output
// =============================================================================

/**
 * A generated test file.
 */
export interface GeneratedTest {
  /** Test name (e.g., "on click toggle .active on #btn") */
  name: string;
  /** Full test file content */
  code: string;
  /** HTML fixture embedded in the test */
  html: string;
  /** Target framework */
  framework: string;
  /** Abstract operations for introspection */
  operations: AbstractOperation[];
}
