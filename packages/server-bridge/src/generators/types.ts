import type { RouteDescriptor, GeneratorOptions, GenerateResult } from '../types.js';

/**
 * A route generator renders RouteDescriptor[] into framework-specific route files.
 */
export interface RouteGenerator {
  /** Target framework name */
  readonly framework: string;
  /** Generate route files */
  generate(routes: RouteDescriptor[], options: GeneratorOptions): GenerateResult;
}
