/**
 * Capability lists must not name commands that do not exist.
 *
 * `FULL_RUNTIME_ONLY_COMMANDS` listed `bind`, `persist`, and `process-partials`
 * long after `bind`/`persist` were deleted (c8cd050e, 2026-02) and while the
 * real command name was `process`. Nothing failed: these lists are hand-written
 * prose about the command set, never checked against it, so they rot silently
 * and then mislead whoever reads them next.
 */

import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_COMMANDS,
  FULL_RUNTIME_ONLY_COMMANDS,
  resolveCommandKey,
} from '../template-capabilities';
import { COMMANDS } from '../../parser/parser-constants';

/**
 * Names the generator understands that are not entries in the parser's COMMANDS
 * set. Each needs a reason — this is the escape hatch, not a dumping ground.
 * (Advertised aliases like `push-url` are NOT listed here: they resolve through
 * COMMAND_ALIASES to a real command, so `resolveCommandKey` handles them.)
 */
const NON_COMMAND_CAPABILITIES = new Set([
  // Generator-only spelling for removing a class rather than an element;
  // resolved to the `remove` template.
  'removeClass',
]);

/** A capability name is real if it, or the command it aliases, is in COMMANDS. */
function isGhost(name: string): boolean {
  if (NON_COMMAND_CAPABILITIES.has(name)) return false;
  return !COMMANDS.has(name) && !COMMANDS.has(resolveCommandKey(name));
}

describe('capability lists reference real commands', () => {
  it('every FULL_RUNTIME_ONLY_COMMANDS entry is a real command', () => {
    const ghosts = FULL_RUNTIME_ONLY_COMMANDS.filter(isGhost);
    expect(ghosts, `not in the parser COMMANDS set: ${ghosts.join(', ')}`).toEqual([]);
  });

  it('every AVAILABLE_COMMANDS entry is a real command', () => {
    const ghosts = AVAILABLE_COMMANDS.filter(isGhost);
    expect(ghosts, `not in the parser COMMANDS set: ${ghosts.join(', ')}`).toEqual([]);
  });

  it('the two lists are disjoint', () => {
    const available = new Set<string>(AVAILABLE_COMMANDS);
    const overlap = FULL_RUNTIME_ONLY_COMMANDS.filter(name => available.has(name));
    expect(overlap, `listed as both generatable and full-runtime-only`).toEqual([]);
  });
});
