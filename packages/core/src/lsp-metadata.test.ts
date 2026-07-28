/**
 * COMMAND_KEYWORDS must name real commands — in BOTH directions.
 *
 * `COMMAND_KEYWORDS` advertised `pushUrl` and `replaceUrl`. Neither parses: the
 * command is one `HistoryCommand` registered as `push` with a `replace` alias,
 * and only `push url <url>` / `replace url <url>` are accepted. The list feeds
 * `ALL_KEYWORDS` (below it in this module), which `language-server/src/server.ts`
 * uses as its canonical keyword list — so the LSP offered two completions the
 * engine rejects. Same class as the `persist`/`transfer`/`process-partials`
 * ghosts that motivated `language-server/src/command-tiers.test.ts`, alive in a
 * sibling list that had no gate.
 *
 * Unlike that test, this one checks the OMISSION direction too. A list gate that
 * only computes `list.filter(isGhost)` is structurally blind to a real command
 * being dropped from the list, which is the failure mode a list edit actually
 * produces — measured, and the reason `docs-internal/HANDOFF-command-arch-manifest.md`
 * exists. Both allowlists below are explicit and commented rather than snapshots,
 * so a change has to be made deliberately.
 *
 * This file deliberately constructs NO Runtime: `command-adapter.ts`'s
 * `register()` does `COMMANDS.add(name)`, so the imported Set grows from 59 to 60
 * the moment one is built, and a later test in the same file would score against
 * a different set than an earlier one.
 */

import { describe, it, expect } from 'vitest';
import { COMMAND_KEYWORDS, ALL_KEYWORDS } from './lsp-metadata';
import { COMMANDS, CONTROL_FLOW_COMMANDS } from './parser/parser-constants';

/** Everything the engine will execute by name, as seeded statically. */
const engine = new Set<string>([...COMMANDS, ...CONTROL_FLOW_COMMANDS]);

/**
 * In `COMMAND_KEYWORDS` but not an executable command, legitimately.
 *
 * `else` is a block keyword — it continues an `if`, it is never dispatched as a
 * command — so it is absent from `COMMANDS` by design while still being a
 * keyword the LSP should complete.
 */
const NOT_A_COMMAND = new Set(['else']);

/**
 * Registered commands `COMMAND_KEYWORDS` does not yet advertise.
 *
 * Tracked as step 4.3 of the command-manifest arc
 * (`docs-internal/HANDOFF-command-arch-manifest.md`); adding them is a docs +
 * completions decision, not part of the ghost fix. Was six before the
 * `pushUrl`/`replaceUrl` ghosts became `push`/`replace`.
 */
const KEYWORD_GAPS = new Set([
  'process', // htmx-like: process partials in <content>
  'scroll', // upstream _hyperscript 0.9.90 `scroll to <target>`
  'start', // start view transition ... end
  // 'pseudo-command' is not in the static COMMANDS seed either — it is added at
  // registration time by command-adapter.ts, so it never reaches `engine` here.
]);

describe('lsp-metadata COMMAND_KEYWORDS', () => {
  it('the engine sets loaded (guards the imports)', () => {
    expect(engine.size).toBeGreaterThan(40);
    expect(engine.has('toggle')).toBe(true);
    expect(engine.has('push')).toBe(true);
    expect(engine.has('replace')).toBe(true);
  });

  it('every keyword names something the engine knows', () => {
    const ghosts = COMMAND_KEYWORDS.filter(k => !engine.has(k) && !NOT_A_COMMAND.has(k));
    expect(
      ghosts,
      `advertised by COMMAND_KEYWORDS but unknown to the engine: ${ghosts.join(', ')}`
    ).toEqual([]);
  });

  it('every engine command is advertised, except the tracked gaps', () => {
    const advertised = new Set<string>(COMMAND_KEYWORDS);
    const missing = [...engine].filter(c => !advertised.has(c) && !KEYWORD_GAPS.has(c));
    expect(missing, `registered but absent from COMMAND_KEYWORDS: ${missing.join(', ')}`).toEqual(
      []
    );
  });

  it('the tracked gaps are still gaps (prune them when they close)', () => {
    const advertised = new Set<string>(COMMAND_KEYWORDS);
    const stale = [...KEYWORD_GAPS].filter(c => advertised.has(c));
    expect(stale, `now advertised — remove from KEYWORD_GAPS: ${stale.join(', ')}`).toEqual([]);
  });

  it('advertises the history command under its parsing names', () => {
    // `push url "/x"` and `replace url "/x"` parse; `pushUrl` / `replaceUrl` do not.
    expect(COMMAND_KEYWORDS).toContain('push');
    expect(COMMAND_KEYWORDS).toContain('replace');
    expect(COMMAND_KEYWORDS as readonly string[]).not.toContain('pushUrl');
    expect(COMMAND_KEYWORDS as readonly string[]).not.toContain('replaceUrl');
    expect(ALL_KEYWORDS as readonly string[]).not.toContain('pushUrl');
    expect(ALL_KEYWORDS as readonly string[]).not.toContain('replaceUrl');
  });
});
