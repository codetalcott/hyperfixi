/**
 * Can the generator actually emit what `template-capabilities.ts` advertises?
 *
 * `capability-ghosts.test.ts` asks whether each entry names a REAL command.
 * Nothing asked the question this file exists for: whether a command listed as
 * available can be emitted into a bundle and then reached by that bundle's
 * parser. Arc A step 4.2 measured it and the answer was no for 14 of 38.
 *
 * The oracle is the generator itself — `templates.ts` (which case labels get
 * emitted), `parser/hybrid/parser-core.ts` (the parser `generateBundle()`
 * points every bundle at), and `parser-templates.ts`'s `HYBRID_PARSER_TEMPLATE`
 * (the copy the vite-plugin embeds instead). Deliberately NOT upstream
 * _hyperscript: what upstream accepts is a different question, answered by the
 * LSP tier lists (step 4.1).
 *
 * See `docs-internal/HANDOFF-command-arch-manifest.md`, Finding 13.
 */

import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  COMMAND_ALIASES,
  resolveCommandKey,
} from '../template-capabilities';
import { COMMAND_IMPLEMENTATIONS, BLOCK_IMPLEMENTATIONS } from '../templates';
import { HYBRID_PARSER_TEMPLATE } from '../parser-templates';
import { HybridParser } from '../../parser/hybrid/parser-core';

// ===========================================================================
// 1. The lists mirror the implementation maps, both directions
// ===========================================================================

describe('the capability lists mirror the generator implementation maps', () => {
  it('AVAILABLE_COMMANDS is exactly the template keys plus the advertised aliases', () => {
    // The equality that makes AVAILABLE_COMMANDS a checked mirror rather than a
    // third hand-maintained copy of the same fact. Set equality both ways: an
    // advertised name with no template is a phantom capability, and a template
    // nobody advertises is dead weight the scanner never routes to.
    const expected = [...Object.keys(COMMAND_IMPLEMENTATIONS), ...Object.keys(COMMAND_ALIASES)];
    expect([...AVAILABLE_COMMANDS].sort()).toEqual(expected.sort());
  });

  it('AVAILABLE_BLOCKS is exactly the block template keys', () => {
    expect([...AVAILABLE_BLOCKS].sort()).toEqual(Object.keys(BLOCK_IMPLEMENTATIONS).sort());
  });

  it('nothing full-runtime-only has a template — that is what the label means', () => {
    const emittable = FULL_RUNTIME_ONLY_COMMANDS.filter(
      name => COMMAND_IMPLEMENTATIONS[resolveCommandKey(name)]
    );
    expect(emittable).toEqual([]);
  });

  it('every advertised alias resolves to a real template key', () => {
    for (const [advertised, key] of Object.entries(COMMAND_ALIASES)) {
      expect(COMMAND_IMPLEMENTATIONS[key], `${advertised} → ${key}`).toBeDefined();
    }
  });
});

// ===========================================================================
// 2. Reachability: is the emitted case label ever executed?
// ===========================================================================

/**
 * A representative surface per advertised command. These are the probes step
 * 4.2 ran; they are recorded rather than reduced to a boolean so the next
 * reader re-verifies instead of trusting.
 */
const SURFACES: Record<string, string[]> = {
  toggle: ['toggle .x on #t'],
  add: ['add .x to #t'],
  remove: ['remove me', 'remove #t'],
  removeClass: ['remove .x from #t'],
  show: ['show #t'],
  hide: ['hide #t'],
  put: ['put "hi" into #t'],
  append: ['append "hi" to #t'],
  prepend: ['prepend "hi" to #t'],
  take: ['take .x from .p'],
  empty: ['empty #t', 'empty me', 'on click empty #t'],
  set: ['set :v to 1'],
  get: ['get "v"'],
  increment: ['increment :v'],
  decrement: ['decrement :v'],
  wait: ['wait 1ms'],
  transition: ["transition #t's opacity to 0.5"],
  send: ['send foo to #t'],
  trigger: ['trigger foo on #t'],
  log: ['log "hi"'],
  call: ['call foo()'],
  copy: ['copy "hi"', 'copy #t', 'on click copy "x"'],
  beep: ['beep "x"', 'beep! me', 'beep'],
  go: ['go to url "/x"'],
  push: ['push url "/p"', 'push "/p"'],
  'push-url': ['push url "/p"', 'push-url "/p"'],
  replace: ['replace url "/r"', 'replace "/r"'],
  'replace-url': ['replace url "/r"', 'replace-url "/r"'],
  focus: ['focus #t'],
  blur: ['blur #t'],
  return: ['return 1'],
  break: ['break', 'repeat 3 times break end'],
  continue: ['continue', 'repeat 3 times continue end'],
  halt: ['halt'],
  exit: ['exit', 'on click exit'],
  throw: ['throw "e"', 'on click throw "e"'],
  js: ['js return 1 end'],
  morph: ['morph #t to "<p></p>"', 'morph me to "<p></p>"'],
};

/**
 * Advertised commands whose emitted `case` label the bundle parser can NEVER
 * reach. Requesting one produces a bundle that carries its implementation as
 * dead code while the user's source silently no-ops — the parser's unknown-command
 * fallback advances one token and returns null (`parser-core.ts`, end of
 * `parseCommand()`), so there is no error either.
 *
 * Two distinct causes, both measured:
 *
 *  - NOT IN THE PARSER'S `cmdMap` at all (12): `copy`, `beep`, `push`,
 *    `push-url`, `replace`, `replace-url`, `break`, `continue`, `exit`,
 *    `throw`, `js`, `morph`. `parseCommand()` has 24 entries; these are not
 *    among them.
 *  - PARSED UNDER ANOTHER NAME (2): `trigger` is mapped to `parseSend()`, which
 *    emits a node named `send`; `empty` is absent from `parser-core.ts` (though
 *    present in the embedded template — see §3).
 *
 * NOT fixed by reclassifying them full-runtime-only. Every one has a working
 * template, so the remedy that keeps the capability is a parser rule (or, for
 * `trigger`, a `COMMAND_ALIASES` entry pointing it at the `send` template the
 * way `push-url` points at `push`). Reclassification would delete a working
 * feature and bump every project using `trigger`/`break`/`continue` from ~8 KB
 * to the full runtime. That trade is a behavior change wanting its own PR —
 * the treatment Findings 7, 10 and 12's deferred half got.
 *
 * Tolerance 0 in both directions: a NEW dead label is a regression, and a name
 * that becomes reachable must be deleted from this list in the same change.
 */
const UNREACHABLE_CASE_LABELS = new Set([
  'beep',
  'break',
  'continue',
  'copy',
  'empty',
  'exit',
  'js',
  'morph',
  'push',
  'push-url',
  'replace',
  'replace-url',
  'throw',
  'trigger',
]);

/** Every command-node name anywhere in a parse tree. */
const commandNamesIn = (node: unknown, acc: string[] = []): string[] => {
  if (!node || typeof node !== 'object') return acc;
  const n = node as { type?: string; name?: string };
  if (n.type === 'command' && typeof n.name === 'string') acc.push(n.name);
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) value.forEach(item => commandNamesIn(item, acc));
    else if (value && typeof value === 'object') commandNamesIn(value, acc);
  }
  return acc;
};

/** Can the bundle parser produce a node named `key` for any listed surface? */
const isReachable = (advertised: string): boolean => {
  const key = resolveCommandKey(advertised);
  return (SURFACES[advertised] ?? []).some(code => {
    try {
      return commandNamesIn(new HybridParser(code).parse()).includes(key);
    } catch {
      return false;
    }
  });
};

describe('every advertised command can be reached by the bundle parser', () => {
  it('has a probe surface for every advertised command', () => {
    // Guards the gate itself: a command added to AVAILABLE_COMMANDS without a
    // surface here would otherwise score as unreachable for the wrong reason.
    expect(AVAILABLE_COMMANDS.filter(name => !SURFACES[name])).toEqual([]);
  });

  it('the unreachable set is exactly the documented allowlist', () => {
    const unreachable = AVAILABLE_COMMANDS.filter(name => !isReachable(name));
    expect(unreachable.sort()).toEqual([...UNREACHABLE_CASE_LABELS].sort());
  });

  it('24 of 38 advertised commands are reachable', () => {
    // A count as well as a list, so a change has to move a number too — the
    // discipline the audit's §8 headline counts use.
    expect(AVAILABLE_COMMANDS.length).toBe(38);
    expect(UNREACHABLE_CASE_LABELS.size).toBe(14);
  });

  it('trigger parses, but as send — so a trigger-only bundle dispatches nothing', () => {
    // The sharpest of the 14, and the reason this is a correctness defect and
    // not a tidiness one: the user's code is valid and the generator reports no
    // error, yet the emitted bundle carries `case 'trigger'` and the parser
    // hands it a node named `send`.
    expect(commandNamesIn(new HybridParser('trigger foo on #t').parse())).toEqual(['send']);
    expect(COMMAND_IMPLEMENTATIONS.trigger).toContain("case 'trigger'");
    expect(COMMAND_IMPLEMENTATIONS.trigger).not.toContain("case 'send'");
  });

  it('an unknown command is skipped silently, which is why this is invisible', () => {
    // The mechanism behind all 14. No throw, no warning, no node.
    expect(commandNamesIn(new HybridParser('copy "hi"').parse())).toEqual([]);
  });
});

// ===========================================================================
// 3. The two bundle parsers do not agree on their command set
// ===========================================================================

/** The `cmdMap` keys of the embedded template, read from its source text. */
const templateCommandKeys = (): string[] => {
  const block = HYBRID_PARSER_TEMPLATE.match(/const cmdMap = \{([\s\S]*?)\n {4}\};/);
  if (!block) return [];
  return [...block[1].matchAll(/^\s{6}([A-Za-z_][\w]*):/gm)].map(m => m[1]);
};

describe('parser-core and the embedded parser template classify the same commands', () => {
  it('differ on exactly empty and halt', () => {
    // `generateBundle()` in core imports `parser/hybrid/parser-core`, but the
    // vite-plugin's own generator embeds HYBRID_PARSER_TEMPLATE instead, so the
    // two paths have different reachable sets. Measured: the template handles
    // `empty` and parser-core does not; parser-core handles `halt` and the
    // template does not. `parser-template-drift.test.ts` compares the two on
    // catch/finally only and cannot see this.
    const inTemplate = new Set(templateCommandKeys());
    expect(inTemplate.size, 'cmdMap regex found nothing — the template shape changed').toBe(24);

    expect(inTemplate.has('empty')).toBe(true);
    expect(isReachable('empty')).toBe(false); // parser-core lacks it

    expect(inTemplate.has('halt')).toBe(false);
    expect(isReachable('halt')).toBe(true); // parser-core has it
  });
});
