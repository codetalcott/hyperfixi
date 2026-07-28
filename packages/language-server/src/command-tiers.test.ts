/**
 * Command tiers must name real commands.
 *
 * `LOKASCRIPT_ONLY_COMMANDS` advertised `persist` (deleted in c8cd050e),
 * `transfer` (never existed anywhere in the repo), and `process-partials` (the
 * command is `process`). Nothing checked these lists against the engine, so the
 * LSP offered completions for commands the runtime rejects.
 *
 * Reads core's COMMANDS set from source rather than importing it: the tier
 * lists are plain data and this keeps the check dependency-free (the same
 * approach as scripts/check-ci-build-order.cjs).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { HYPERSCRIPT_COMMANDS, LOKASCRIPT_ONLY_COMMANDS } from './command-tiers';

const here = path.dirname(fileURLToPath(import.meta.url));
const PARSER_CONSTANTS = path.resolve(here, '../../core/src/parser/parser-constants.ts');

function namesIn(source: string, constant: string): string[] {
  const block = source.match(
    new RegExp(`export const ${constant} = new Set\\(\\[([\\s\\S]*?)\\]\\)`)
  );
  if (!block) throw new Error(`Could not find ${constant} in ${PARSER_CONSTANTS}`);
  return [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/**
 * Everything the engine will execute by name. CONTROL_FLOW_COMMANDS is unioned
 * in because loop forms like `while` are control-flow keywords rather than
 * entries in COMMANDS, yet the tiers legitimately advertise them.
 */
function coreCommands(): Set<string> {
  const source = fs.readFileSync(PARSER_CONSTANTS, 'utf8');
  return new Set([...namesIn(source, 'COMMANDS'), ...namesIn(source, 'CONTROL_FLOW_COMMANDS')]);
}

/**
 * Hyperscript FEATURES, not commands: they open a declaration block rather than
 * executing inside one, so they are absent from the parser's COMMANDS set by
 * design. The tier lists cover both, hence this allowlist.
 */
const FEATURES = new Set(['behavior', 'def', 'init', 'on', 'eventsource', 'socket', 'worker']);

describe('command tiers name real commands', () => {
  const commands = coreCommands();

  it('core COMMANDS parsed successfully (guards the regex)', () => {
    expect(commands.size).toBeGreaterThan(40);
    expect(commands.has('toggle')).toBe(true);
    expect(commands.has('append')).toBe(true);
  });

  for (const [label, list] of [
    ['HYPERSCRIPT_COMMANDS', HYPERSCRIPT_COMMANDS],
    ['LOKASCRIPT_ONLY_COMMANDS', LOKASCRIPT_ONLY_COMMANDS],
  ] as const) {
    it(`every ${label} entry exists in the engine`, () => {
      const ghosts = list.filter(name => !commands.has(name) && !FEATURES.has(name));
      expect(ghosts, `named by ${label} but unknown to the engine: ${ghosts.join(', ')}`).toEqual(
        []
      );
    });
  }

  it('the tiers are disjoint', () => {
    const upstream = new Set<string>(HYPERSCRIPT_COMMANDS);
    const overlap = LOKASCRIPT_ONLY_COMMANDS.filter(name => upstream.has(name));
    expect(overlap, 'listed as both upstream and LokaScript-only').toEqual([]);
  });

  it('prepend is a LokaScript extension, not upstream', () => {
    // Upstream _hyperscript has no `prepend` keyword — only
    // `put <content> at the start of <target>`.
    expect(LOKASCRIPT_ONLY_COMMANDS).toContain('prepend');
    expect(HYPERSCRIPT_COMMANDS as readonly string[]).not.toContain('prepend');
  });
});
