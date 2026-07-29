/**
 * Command tiers must name real commands.
 *
 * `LOKASCRIPT_ONLY_COMMANDS` advertised `persist` (deleted in c8cd050e),
 * `transfer` (never existed anywhere in the repo), and `process-partials` (the
 * command is `process`). Nothing checked these lists against the engine, so the
 * LSP offered completions for commands the runtime rejects.
 *
 * Reads core's command set from source rather than importing it: the tier
 * lists are plain data and this keeps the check dependency-free (the same
 * approach as scripts/check-ci-build-order.cjs).
 *
 * The source is `commands/manifest.ts`, core's registry-of-record since Arc A.
 * It used to be `parser-constants.ts`'s `COMMANDS` literal, which Arc A step 3
 * turned into `new Set([...COMMAND_NAMES, 'for'])` — derived from the manifest,
 * and so no longer a list of quoted names for a regex to read. Reading the
 * manifest is the better anchor anyway: `COMMANDS` is the PARSER's set (it
 * carries `for`, which has no implementation) while the manifest is what the
 * engine registers and executes, which is what this file's title claims to
 * check.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { HYPERSCRIPT_COMMANDS, LOKASCRIPT_ONLY_COMMANDS } from './command-tiers';

const here = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.resolve(here, '../../core/src/commands/manifest.ts');
const PARSER_CONSTANTS = path.resolve(here, '../../core/src/parser/parser-constants.ts');

function namesIn(file: string, label: string, block: RegExp): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(block);
  if (!match) throw new Error(`Could not find ${label} in ${file}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/**
 * Everything the engine will execute by name. CONTROL_FLOW_COMMANDS is unioned
 * in because loop forms like `while` are control-flow keywords rather than
 * registered commands, yet the tiers legitimately advertise them.
 */
function coreCommands(): Set<string> {
  return new Set([
    ...namesIn(MANIFEST, 'COMMAND_NAMES', /export const COMMAND_NAMES[^=]*=\s*\[([\s\S]*?)\n\];/),
    ...namesIn(
      PARSER_CONSTANTS,
      'CONTROL_FLOW_COMMANDS',
      /export const CONTROL_FLOW_COMMANDS = new Set\(\[([\s\S]*?)\]\)/
    ),
  ]);
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
