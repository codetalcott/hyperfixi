/**
 * Behavior Loader — Load and register hyperscript behaviors from patterns-reference
 *
 * Queries the patterns database for behavior definitions, compiles them,
 * and registers them with a LokaScript runtime instance.
 *
 * @example
 * ```typescript
 * import { loadBehaviors } from '@hyperfixi/patterns-reference';
 *
 * // Load all behaviors
 * const result = await loadBehaviors(window.hyperfixi);
 * console.log('Loaded:', result.loaded);
 *
 * // Load specific behaviors
 * const result = await loadBehaviors(runtime, { names: ['Toggleable', 'Draggable'] });
 * ```
 */

import { getBehaviorPatterns } from './patterns';
import type { ConnectionOptions } from '../types';

/**
 * Minimal runtime interface required for behavior loading.
 * Compatible with both HyperscriptAPI and the window.hyperfixi global.
 */
export interface BehaviorRuntime {
  compileSync(
    code: string,
    options?: { traditional?: boolean }
  ): { ok: boolean; ast?: unknown; errors?: unknown[] };
  execute(ast: unknown, ctx: unknown): Promise<void>;
  createContext?(): { locals: Map<string, unknown>; globals: Map<string, unknown> };
}

export interface LoadBehaviorsOptions {
  /** Only load behaviors matching these names (e.g., ['Toggleable', 'Draggable']) */
  names?: string[];
  /** Database connection options */
  connectionOptions?: ConnectionOptions;
}

export interface LoadBehaviorsResult {
  /** IDs of successfully loaded behavior patterns */
  loaded: string[];
  /** Error messages for behaviors that failed to compile */
  errors: string[];
}

/**
 * Load behavior definitions from patterns-reference and register them
 * with a LokaScript runtime instance.
 */
export async function loadBehaviors(
  runtime: BehaviorRuntime,
  options?: LoadBehaviorsOptions
): Promise<LoadBehaviorsResult> {
  const patterns = await getBehaviorPatterns(options?.connectionOptions);

  const filtered = options?.names
    ? patterns.filter(p => options.names!.some(name => p.rawCode.includes(`behavior ${name}(`)))
    : patterns;

  const loaded: string[] = [];
  const errors: string[] = [];

  for (const pattern of filtered) {
    const result = runtime.compileSync(pattern.rawCode, { traditional: true });
    if (result.ok && result.ast) {
      try {
        const ctx = runtime.createContext?.() ?? {
          locals: new Map(),
          globals: new Map(),
        };
        await runtime.execute(result.ast, ctx);
        loaded.push(pattern.id);
      } catch (err) {
        errors.push(
          `${pattern.id}: execute failed — ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      errors.push(`${pattern.id}: compile failed — ${JSON.stringify(result.errors)}`);
    }
  }

  return { loaded, errors };
}
