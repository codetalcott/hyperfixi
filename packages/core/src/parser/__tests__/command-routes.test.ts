/**
 * Every command has exactly one parse route
 *
 * Arc 3 step 4. A command is parsed either by a DEDICATED parser (a keyword
 * branch in `parseCommandCore`, or `COMPOUND_COMMAND_NAMES` membership) or by
 * `parseDeclaredCommand` reading its `COMMAND_GRAMMAR` row. There is no third
 * route any more — the generic tail loop is gone — so a command that has
 * neither would fail to parse at all, and one that has both would be parsed by
 * whichever the dispatcher checks first, silently. This pins the partition at
 * tolerance 0, the way `compound-command-coverage` pins the compound switch.
 */

import { describe, it, expect } from 'vitest';
import { COMMAND_NAMES } from '../../commands/manifest';
import { COMPOUND_COMMAND_NAMES } from '../command-parsers/utility-commands';
import { COMMAND_GRAMMAR, DEDICATED_PARSER_COMMANDS, grammarOf } from '../command-grammar';

describe('command parse routes partition the manifest', () => {
  const grammarKeys = Object.keys(COMMAND_GRAMMAR).filter(k => k !== 'beep!');

  it('every manifest command has exactly one route', () => {
    const twice = COMMAND_NAMES.filter(
      n => DEDICATED_PARSER_COMMANDS.has(n) && grammarOf(n) !== null
    );
    const none = COMMAND_NAMES.filter(
      n => !DEDICATED_PARSER_COMMANDS.has(n) && grammarOf(n) === null
    );
    expect({ twice, none }).toEqual({ twice: [], none: [] });
  });

  it('no route names a command the manifest does not have', () => {
    const manifest = new Set<string>(COMMAND_NAMES);
    expect([...DEDICATED_PARSER_COMMANDS].filter(n => !manifest.has(n))).toEqual([]);
    expect(grammarKeys.filter(n => !manifest.has(n))).toEqual([]);
  });

  it('every COMPOUND_COMMAND_NAMES member is in the dedicated set, and every dedicated non-compound command has a keyword branch', () => {
    // The compound half is the whole set; the keyword half is hand-listed,
    // and the plan's dispatch map names exactly these ten.
    for (const name of COMPOUND_COMMAND_NAMES) {
      expect(DEDICATED_PARSER_COMMANDS.has(name), name).toBe(true);
    }
    const keywordBranches = [...DEDICATED_PARSER_COMMANDS].filter(
      n => !COMPOUND_COMMAND_NAMES.has(n)
    );
    expect(keywordBranches.sort()).toEqual(
      // `add` has a keyword branch too, but it is ALSO a COMPOUND_COMMAND_NAMES
      // member (with no case in the switch — harmless only because its branch
      // runs first), so it is filtered out above.
      [
        'decrement',
        'fetch',
        'if',
        'increment',
        'install',
        'repeat',
        'transition',
        'unless',
        'wait',
      ].sort()
    );
  });

  it('`beep!` is the same row as `beep` — the dispatcher folds the `!` before it looks the grammar up', () => {
    expect(grammarOf('beep!')).toBe(grammarOf('beep'));
  });
});
