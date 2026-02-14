import type { RouteDescriptor, GeneratorOptions, GenerateResult } from '../types.js';

/**
 * A route generator renders RouteDescriptor[] into framework-specific route files.
 * Follows the same pattern as TestRenderer in compilation-service.
 */
export interface RouteGenerator {
  /** Target framework name */
  readonly framework: string;
  /** Generate route files */
  generate(routes: RouteDescriptor[], options: GeneratorOptions): GenerateResult;
}
