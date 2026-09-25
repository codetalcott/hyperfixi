/**
 * Selecting patterns by the engine that runs them.
 *
 * `code_examples.engine` is mechanically verified (scripts/verify-engines.ts;
 * CI's `verify:engines:check`): 'both', 'lokascript' (hyperfixi only),
 * 'hyperscript' (upstream _hyperscript only) or NULL (verified on neither).
 */

import type { EngineCompat } from '../types';

/**
 * SQL for "the pattern runs on `engine`" over an engine column. A pattern
 * verified on both engines runs on either, so 'hyperscript' and 'lokascript'
 * include 'both'. `null` selects the patterns no engine runs.
 */
export function runsOn(
  column: string,
  engine: EngineCompat | null
): { sql: string; params: string[] } {
  if (engine === null) return { sql: `${column} IS NULL`, params: [] };
  if (engine === 'both') return { sql: `${column} = 'both'`, params: [] };
  return { sql: `${column} IN ('both', ?)`, params: [engine] };
}

/**
 * The condition for serving LLM examples. An example is code handed to a
 * generator as correct, so one whose pattern NO engine runs is never served;
 * `engine` narrows further to what a particular runtime accepts.
 */
export function exampleCondition(
  column: string,
  engine: EngineCompat | undefined
): { sql: string; params: string[] } {
  return engine === undefined
    ? { sql: `${column} IS NOT NULL`, params: [] }
    : runsOn(column, engine);
}
