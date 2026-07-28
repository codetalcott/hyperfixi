/**
 * The command manifest audit — Arc A's gate (step 1)
 *
 * Arc A of `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`; the brief is
 * `docs-internal/HANDOFF-command-arch-manifest.md`. Modelled on Arc C's
 * `command-output-contract.test.ts`: an explicit audit of current behavior,
 * including the wrong parts, with every wrong row commented with the step that
 * fixes it.
 *
 * ## Why this exists
 *
 * The command set is described in ~20 hand-maintained places. The existing list
 * gates (`capability-ghosts.test.ts`, `command-tiers.test.ts`) are
 * ONE-directional: they compute `list.filter(isGhost)` and assert `[]`, so they
 * catch a list naming a command that does not exist but are structurally blind
 * to a list OMITTING a command that does — which is the failure mode a list
 * migration actually produces. Measured by mutation (see the brief's Claim 3):
 * dropping `trigger` from `AVAILABLE_COMMANDS` or `toggle` from the tier lists
 * leaves every gate in the repo green.
 *
 * This audit scores every hand-maintained command list against the live
 * registry in BOTH directions. Every divergence is an explicit, commented
 * allowlist entry — never a snapshot blob, because a snapshot gets re-blessed
 * on first failure while a hand-edited row has to be moved deliberately. The
 * headline counts are asserted at the bottom so a later step must flip rows in
 * the diff, which is the review artifact.
 *
 * This file absorbs `lsp-metadata.test.ts` (the Finding 5 ghost-fix gate): the
 * `COMMAND_KEYWORDS` section below carries its allowlists and its
 * history-command rename pin.
 *
 * ## Ordering constraint (Finding 6)
 *
 * `command-adapter.ts`'s `register()` does `COMMANDS.add(name)`, so the parser's
 * static seed grows from 59 to 60 entries the moment a Runtime is constructed.
 * The seed snapshot below is taken BEFORE the Runtime that derives the registry,
 * and the mutation itself is pinned as a test — step 3 must account for it.
 *
 * ## Cross-package reads
 *
 * The LSP tier lists live in `packages/language-server/src/command-tiers.ts`,
 * which depends on core — importing it here would be a package cycle. They are
 * read from source text instead, the same approach `scripts/verify-reference-data.ts`
 * uses for `commands/index.ts`. Monorepo-only, by design.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { COMMANDS } from '../../parser/parser-constants';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  resolveCommandKey,
} from '../../bundle-generator/template-capabilities';
import { COMMAND_KEYWORDS, ALL_KEYWORDS } from '../../lsp-metadata';
import { commands as referenceCommands } from '../../reference/index';

/** Finding 6: snapshot the static parser seed BEFORE any Runtime exists. */
const STATIC_SEED = new Set<string>(COMMANDS);

import { Runtime } from '../runtime';

/** The arc's source of truth: what the engine will actually execute by name. */
const REGISTRY = [...new Runtime().getRegistry().getCommandNames()].sort();
const REGISTERED = new Set(REGISTRY);

const DIR = dirname(fileURLToPath(import.meta.url));

/** Extract the single-quoted string literals from a source-text block. */
function stringsIn(block: string): string[] {
  return (block.match(/'[^']+'/g) ?? []).map(s => s.slice(1, -1));
}

/** Entries of `list` the registry does not have, sorted. */
function ghostsIn(list: Iterable<string>): string[] {
  return [...new Set([...list].filter(name => !REGISTERED.has(name)))].sort();
}

/** Registered commands `list` does not have, sorted. */
function gapsIn(list: Iterable<string>): string[] {
  const present = new Set(list);
  return REGISTRY.filter(name => !present.has(name));
}

/**
 * The four alias-name spellings. `commands/index.ts`, `reference/index.ts`, and
 * the `runtime.ts` registration block all spell four commands differently from
 * their registered names (`createPushUrlCommand` registers `push`, etc.). One
 * map, applied after lowercasing, normalizes all three lists.
 */
const SPELLINGS: Record<string, string> = {
  processpartials: 'process',
  pushurl: 'push',
  replaceurl: 'replace',
  pseudo: 'pseudo-command',
  startviewtransition: 'start', // registration stem only; the export alias is already `start`
};

function normalize(name: string): string {
  const lower = name.replace(/_$/, '').replace(/Cmd$/, '').toLowerCase();
  return SPELLINGS[lower] ?? lower;
}

// ===========================================================================
// 1. The registry — the arc's source of truth
// ===========================================================================

describe('the registry', () => {
  it('registers exactly the 59 documented commands', () => {
    // Adding or removing a command must edit this list deliberately, the same
    // way command-output-contract.test.ts demands a row per command.
    expect(REGISTRY).toEqual([
      'add',
      'append',
      'async',
      'beep',
      'blur',
      'break',
      'breakpoint',
      'call',
      'clear',
      'close',
      'continue',
      'copy',
      'decrement',
      'default',
      'empty',
      'exit',
      'fetch',
      'focus',
      'get',
      'go',
      'halt',
      'hide',
      'if',
      'increment',
      'install',
      'js',
      'log',
      'make',
      'measure',
      'morph',
      'open',
      'pick',
      'prepend',
      'process',
      'pseudo-command',
      'push',
      'put',
      'remove',
      'render',
      'repeat',
      'replace',
      'reset',
      'return',
      'scroll',
      'select',
      'send',
      'set',
      'settle',
      'show',
      'start',
      'swap',
      'take',
      'tell',
      'throw',
      'toggle',
      'transition',
      'trigger',
      'unless',
      'wait',
    ]);
  });

  it('registration mutates the parser static seed (Finding 6)', () => {
    // The seed is a static list the parser uses standalone; registration then
    // augments it (`COMMANDS.add` in command-adapter.ts). Step 3 must treat the
    // seed and the registration-time add as two halves of one mechanism, not as
    // an independent hand-maintained copy.
    expect(STATIC_SEED.has('pseudo-command')).toBe(false);
    expect(COMMANDS.has('pseudo-command')).toBe(true);
  });
});

// ===========================================================================
// 2. The four core lists (Claim 2 — already in sync; step 3's targets)
// ===========================================================================

describe('the four core lists agree with the registry', () => {
  it('parser-constants COMMANDS: the static seed differs only by for / pseudo-command', () => {
    // `for` is a control-flow keyword with no command implementation, extra in
    // the seed by design; `pseudo-command` is added at registration time (see
    // the Finding 6 test above). Neither is rot.
    expect(ghostsIn(STATIC_SEED)).toEqual(['for']);
    expect(gapsIn(STATIC_SEED)).toEqual(['pseudo-command']);
  });

  it('commands/index.ts exports one tree-shakeable factory per registered command', () => {
    const source = readFileSync(resolve(DIR, '../../commands/index.ts'), 'utf-8');
    const cut = source.indexOf('// BACKWARD-COMPATIBLE');
    expect(cut, 'the BACKWARD-COMPATIBLE section marker moved').toBeGreaterThan(0);
    const aliases = [...source.slice(0, cut).matchAll(/create\w+Command\s+as\s+(\w+)/g)].map(m =>
      normalize(m[1])
    );
    expect(aliases.length).toBe(59);
    expect([...aliases].sort()).toEqual(REGISTRY);
  });

  it('reference/index.ts documents exactly the registered set', () => {
    const documented = Object.keys(referenceCommands).map(normalize);
    expect(documented.length).toBe(59);
    expect([...documented].sort()).toEqual(REGISTRY);
  });

  it('runtime.ts registers every command with a uniform factory call', () => {
    const source = readFileSync(resolve(DIR, '../runtime.ts'), 'utf-8');
    const uniform = [...source.matchAll(/registry\.register\(create(\w+)Command\(\)\);/g)].map(m =>
      normalize(m[1])
    );
    const anyRegister = [...source.matchAll(/registry\.register\(/g)];
    // Claim 1: all registration calls have the exact `register(createXCommand())`
    // shape — no arguments, no conditionals. This uniformity is what makes the
    // block step 3's most mechanical migration target.
    expect(anyRegister.length).toBe(uniform.length);
    expect(uniform.length).toBe(59);
    expect([...uniform].sort()).toEqual(REGISTRY);
  });
});

// ===========================================================================
// 3. The LSP tier lists (language-server/src/command-tiers.ts)
// ===========================================================================

const tiersSource = readFileSync(
  resolve(DIR, '../../../../language-server/src/command-tiers.ts'),
  'utf-8'
);
const HYPERSCRIPT_TIER = stringsIn(tiersSource.match(/HYPERSCRIPT_COMMANDS = \[([\s\S]*?)\]/)![1]);
const LOKASCRIPT_TIER = stringsIn(
  tiersSource.match(/LOKASCRIPT_ONLY_COMMANDS = \[([\s\S]*?)\]/)![1]
);

/**
 * In the tier lists but not registered commands, legitimately: the seven
 * feature definitions and the two loop keywords. Same set the ghost test
 * (`command-tiers.test.ts`) allowlists as FEATURES.
 */
const TIER_NOT_COMMANDS = new Set([
  'behavior',
  'def',
  'init',
  'on',
  'eventsource',
  'socket',
  'worker',
  'for',
  'while',
]);

/**
 * Registered commands in NEITHER tier list — unclassified against a file whose
 * own doc comment defines a partition ("which features are hyperscript … [or]
 * LokaScript extensions"). This is the arc's LIVE defect:
 * `detectLokascriptFeatures()` warns only for commands in
 * `LOKASCRIPT_ONLY_COMMANDS`, so a LokaScript-only command missing here
 * produces NO compatibility warning. Several of these (`empty`, `clear`,
 * `open`, `close`, `select`, `reset`, `swap`, `push`, `replace`, `focus`,
 * `blur`, `copy`, `unless`) read as extensions on the Arc C upstream survey.
 *
 * Every entry is fixed by step 4.1 — a per-command classification against the
 * upstream _hyperscript checkout, not a mechanical migration.
 */
const TIER_UNCLASSIFIED = new Set([
  'async',
  'beep',
  'blur',
  'break',
  'breakpoint',
  'clear',
  'close',
  'continue',
  'copy',
  'empty',
  'focus',
  'open',
  'pick',
  'pseudo-command',
  'push',
  'render',
  'replace',
  'reset',
  'scroll',
  'select',
  'start',
  'swap',
  'unless',
]);

describe('the LSP tier lists', () => {
  it('every tier entry is a registered command or an allowlisted feature', () => {
    // Set equality, not filter-and-assert-empty: a TIER_NOT_COMMANDS entry that
    // becomes a registered command (or leaves the lists) goes stale loudly.
    expect(ghostsIn([...HYPERSCRIPT_TIER, ...LOKASCRIPT_TIER])).toEqual(
      [...TIER_NOT_COMMANDS].sort()
    );
  });

  it('23 registered commands are unclassified — the live false negative (step 4.1)', () => {
    expect(gapsIn([...HYPERSCRIPT_TIER, ...LOKASCRIPT_TIER])).toEqual(
      [...TIER_UNCLASSIFIED].sort()
    );
  });
});

// ===========================================================================
// 4. The bundle-generator capability lists (template-capabilities.ts)
// ===========================================================================

/**
 * In the capability lists but not registered commands, legitimately: the
 * generator-only `removeClass` spelling and the two advertised aliases, which
 * resolve through COMMAND_ALIASES to real commands (asserted below).
 */
const CAPABILITY_NOT_COMMANDS = new Set(['removeClass', 'push-url', 'replace-url']);

/**
 * Registered commands in NEITHER capability list, but present in
 * AVAILABLE_BLOCKS — classified as blocks rather than commands. Whether that
 * satisfies the file's partition ("available in generated lite bundles versus
 * … the full runtime") is step 4.2's decision to make explicit.
 */
const CAPABILITY_BLOCK_ONLY = new Set(['fetch', 'if', 'repeat']);

/**
 * Registered commands with NO classification anywhere in the capability file.
 * Latent rather than live: `vite-plugin/src/generator.ts` treats an
 * unclassified command as unsupported and falls back to the full runtime, so
 * these cost bundle size, not correctness. All fixed by step 4.2 (which must
 * also decide the COMMAND_IMPLEMENTATIONS second-list overlap).
 *
 * NOTE: the brief's Claim 3 table says 12 gaps for this file. Measured, it is
 * 13 = these 10 + the 3 block-only rows above — the table counted `if` as
 * classified, but `if` appears in neither command list, exactly like `repeat`
 * and `fetch` which it did count.
 */
const CAPABILITY_UNCLASSIFIED = new Set([
  'breakpoint',
  'clear',
  'close',
  'open',
  'pseudo-command',
  'render',
  'reset',
  'scroll',
  'select',
  'start',
]);

describe('the capability lists', () => {
  it('every capability entry is a registered command or an allowlisted generator name', () => {
    expect(ghostsIn([...AVAILABLE_COMMANDS, ...FULL_RUNTIME_ONLY_COMMANDS])).toEqual(
      [...CAPABILITY_NOT_COMMANDS].sort()
    );
  });

  it('the advertised aliases resolve to registered commands', () => {
    expect(resolveCommandKey('push-url')).toBe('push');
    expect(resolveCommandKey('replace-url')).toBe('replace');
    expect(REGISTERED.has(resolveCommandKey('push-url'))).toBe(true);
    expect(REGISTERED.has(resolveCommandKey('replace-url'))).toBe(true);
  });

  it('13 registered commands are outside the command partition (step 4.2)', () => {
    expect(gapsIn([...AVAILABLE_COMMANDS, ...FULL_RUNTIME_ONLY_COMMANDS])).toEqual(
      [...CAPABILITY_BLOCK_ONLY, ...CAPABILITY_UNCLASSIFIED].sort()
    );
  });

  it('the block-only rows really are classified as blocks', () => {
    // Keeps CAPABILITY_BLOCK_ONLY honest: if one of the three leaves
    // AVAILABLE_BLOCKS it must move to CAPABILITY_UNCLASSIFIED, not linger.
    for (const name of CAPABILITY_BLOCK_ONLY) {
      expect(AVAILABLE_BLOCKS, `${name} left AVAILABLE_BLOCKS`).toContain(name);
    }
  });
});

// ===========================================================================
// 5. COMMAND_KEYWORDS (lsp-metadata.ts) — absorbs lsp-metadata.test.ts
// ===========================================================================

/**
 * In COMMAND_KEYWORDS but not an executable command, legitimately. `else` is a
 * block keyword — it continues an `if`, it is never dispatched as a command;
 * `for` and `while` are loop keywords the LSP should still complete.
 */
const KEYWORD_NOT_COMMANDS = new Set(['else', 'for', 'while']);

/**
 * Registered commands COMMAND_KEYWORDS does not yet advertise, so the LSP
 * offers no completion for them. Was six before the Finding 5 ghost fix
 * renamed `pushUrl`/`replaceUrl` to `push`/`replace` (#810). Adding these is a
 * docs + completions decision — step 4.3.
 */
const KEYWORD_GAPS = new Set([
  'process', // htmx-like: process partials in <content>
  'pseudo-command', // method-call-as-command; absent from the static seed too (Finding 6)
  'scroll', // upstream _hyperscript 0.9.90 `scroll to <target>`
  'start', // start view transition ... end
]);

describe('COMMAND_KEYWORDS', () => {
  it('every keyword names a registered command or an allowlisted block keyword', () => {
    expect(ghostsIn(COMMAND_KEYWORDS)).toEqual([...KEYWORD_NOT_COMMANDS].sort());
  });

  it('4 registered commands are not advertised (step 4.3)', () => {
    expect(gapsIn(COMMAND_KEYWORDS)).toEqual([...KEYWORD_GAPS].sort());
  });

  it('advertises the history command under its parsing names', () => {
    // `push url "/x"` and `replace url "/x"` parse; `pushUrl` / `replaceUrl` do
    // not — the ghost pair the LSP offered for months (fixed in #810).
    expect(COMMAND_KEYWORDS).toContain('push');
    expect(COMMAND_KEYWORDS).toContain('replace');
    expect(COMMAND_KEYWORDS as readonly string[]).not.toContain('pushUrl');
    expect(COMMAND_KEYWORDS as readonly string[]).not.toContain('replaceUrl');
    expect(ALL_KEYWORDS as readonly string[]).not.toContain('pushUrl');
    expect(ALL_KEYWORDS as readonly string[]).not.toContain('replaceUrl');
  });
});

// ===========================================================================
// 6. The per-bundle commands arrays (compatibility/browser-bundle-*.ts)
// ===========================================================================

/**
 * Every browser-bundle entry file that publishes a `commands: [...]` array,
 * with the number of distinct command names it advertises. These are subsets
 * by design, so there is no omission direction to score — the pinned counts
 * make a silent drop (the 2026-07-20 `trigger` no-op class) visible in the
 * diff, and the ghost check below covers the other direction.
 *
 * A new bundle file with a commands array must be added here; a deleted one
 * must be removed.
 */
const BUNDLE_COMMAND_COUNTS: Record<string, number> = {
  'browser-bundle-classic-i18n.ts': 43,
  'browser-bundle-classic.ts': 52,
  'browser-bundle-hybrid-complete.ts': 24,
  'browser-bundle-lite-plus.ts': 19,
  'browser-bundle-lite.ts': 8,
  'browser-bundle-minimal-v2.ts': 10,
  'browser-bundle-standard-v2.ts': 25,
  'browser-bundle-textshelf-minimal.ts': 10,
  'browser-bundle-textshelf-profile.ts': 10,
};

/** Distinct quoted names across every `commands: [...]` array in each file. */
function bundleCommandArrays(): Record<string, string[]> {
  const compatDir = resolve(DIR, '../../compatibility');
  const arrays: Record<string, string[]> = {};
  for (const file of readdirSync(compatDir).filter(
    f => f.startsWith('browser-bundle-') && f.endsWith('.ts')
  )) {
    const source = readFileSync(resolve(compatDir, file), 'utf-8');
    const names = new Set<string>();
    for (const match of source.matchAll(/commands:\s*\[([\s\S]*?)\]/g)) {
      for (const name of stringsIn(match[1])) names.add(name);
    }
    if (names.size) arrays[file] = [...names].sort();
  }
  return arrays;
}

describe('the per-bundle commands arrays', () => {
  const arrays = bundleCommandArrays();

  it('audits every bundle file that publishes a commands array', () => {
    expect(Object.keys(arrays).sort()).toEqual(Object.keys(BUNDLE_COMMAND_COUNTS).sort());
  });

  it('no bundle advertises a command the registry does not have', () => {
    for (const [file, names] of Object.entries(arrays)) {
      expect(ghostsIn(names), `${file} advertises unregistered commands`).toEqual([]);
    }
  });

  it('per-bundle counts move only deliberately', () => {
    const counts = Object.fromEntries(Object.entries(arrays).map(([f, n]) => [f, n.length]));
    expect(counts).toEqual(BUNDLE_COMMAND_COUNTS);
  });
});

// ===========================================================================
// 7. The headline counts
// ===========================================================================

describe('the classification debt, counted', () => {
  it('40 rows await deliberate classification (steps 4.1–4.3)', () => {
    // The numbers the arc exists to burn down. A step that classifies a
    // command flips its allowlist row AND moves the count here, so the diff
    // shows both the decision and its scope. Do not adjust a count without
    // moving the rows that justify it.
    expect(TIER_UNCLASSIFIED.size).toBe(23); // step 4.1 — live LSP false negative
    expect(CAPABILITY_UNCLASSIFIED.size).toBe(10); // step 4.2 — latent, costs bundle size
    expect(CAPABILITY_BLOCK_ONLY.size).toBe(3); // step 4.2 — decide blocks-as-classification
    expect(KEYWORD_GAPS.size).toBe(4); // step 4.3 — missing LSP completions
  });
});
