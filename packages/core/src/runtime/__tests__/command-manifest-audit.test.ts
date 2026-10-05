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
 * It no longer scores `reference/index.ts` or `lsp-metadata.ts`: since Phase C5
 * of the engine cutover they document `@hyperfixi/engine`, and
 * `scripts/verify-reference-data.ts` (`npm run verify:reference`) checks them
 * against the engine's grammar and parses their examples on it. The sections
 * that compared them with this registry (§2's reference row, §5, and §7's
 * category and tier rows) left then.
 *
 * ## Ordering constraint (Finding 6)
 *
 * `command-adapter.ts`'s `register()` does `COMMANDS.add(name)`, so the parser's
 * command set is mutable and grows whenever anything is registered. The seed
 * snapshot below is therefore still taken BEFORE the Runtime that derives the
 * registry: a snapshot taken after would be measuring the runtime, not the
 * seed. Step 3 made the seed manifest-derived, so the built-in 59 no longer
 * arrive by mutation — but the mutation itself remains live for commands from
 * outside the manifest, and §2 pins it on a synthetic command.
 *
 * ## What is still independent, post-step-3
 *
 * The registry is now DERIVED from the manifest (`runtime.ts` loops it), so
 * "the manifest names equal the registry names" no longer compares two
 * independently-authored lists. Two things carry that weight instead, and
 * neither may be softened into a derivation: the hardcoded 58-name list in §1,
 * and the per-command factory identity check in §2 (each factory builds a
 * command that calls itself what the manifest calls it).
 *
 * ## No cross-package reads any more
 *
 * §3 used to read the LSP tier lists (`packages/language-server/src/command-tiers.ts`)
 * as source text. Since Phase C5 of the engine cutover they list the engine's
 * keywords, checked against its grammar by `command-tiers.test.ts`; core's own
 * extension set (below) is what §3 and §9 still need.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { COMMANDS } from '../../parser/parser-constants';
import { COMPOUND_COMMAND_NAMES } from '../../parser/command-parsers/utility-commands';
import { COMMAND_MANIFEST, COMMAND_NAMES, toRegisteredName } from '../../commands/manifest';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  resolveCommandKey,
} from '../../bundle-generator/template-capabilities';

/** Finding 6: snapshot the static parser seed BEFORE any Runtime exists. */
const STATIC_SEED = new Set<string>(COMMANDS);

import { Runtime } from '../runtime';

/** The arc's source of truth: what the engine will actually execute by name. */
const REGISTRY = [...new Runtime().getRegistry().getCommandNames()].sort();
const REGISTERED = new Set(REGISTRY);

const DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Extract the single-quoted string literals from a source-text block.
 *
 * Line comments are stripped FIRST. The lists this reads are annotated data —
 * step 4.1 put the upstream-parity probe for each command in a trailing `//`
 * comment — and prose contains apostrophes, which would otherwise pair up
 * across lines and yield a multi-line "name" that no registry has. Command
 * names never contain `//`, so removing it to end-of-line cannot eat one.
 */
function stringsIn(block: string): string[] {
  const code = block.replace(/\/\/[^\n]*/g, '');
  return (code.match(/'[^'\n]+'/g) ?? []).map(s => s.slice(1, -1));
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
 * `commands/index.ts` and `reference/index.ts` spell four commands differently
 * from their registered names (`createPushUrlCommand as pushUrl` registers
 * `push`, etc.). Both spellings are published API, so they are normalized
 * rather than renamed.
 *
 * The map lives in `commands/manifest.ts` as `COMMAND_LIST_SPELLINGS` rather
 * than here, because `scripts/verify-reference-data.ts` needs the identical
 * normalization and two copies of it would be one more hand-maintained place
 * (step 3). A local copy previously also carried `startviewtransition` for the
 * `runtime.ts` registration block; that block is now a manifest-driven loop
 * keyed on registered names, so the entry has no reader left.
 */
const normalize = toRegisteredName;

// ===========================================================================
// 1. The registry — the arc's source of truth
// ===========================================================================

describe('the registry', () => {
  it('registers exactly the 58 documented commands', () => {
    // Adding or removing a command must edit this list deliberately, the same
    // way command-output-contract.test.ts demands a row per command.
    //
    // Since step 3 this is also the arc's LAST independently-authored copy of
    // the command set — everything else is derived from or checked against the
    // manifest, and the manifest is what this list holds to account. Do not
    // replace it with `COMMAND_MANIFEST.map(e => e.name)`; that would make the
    // whole file self-confirming.
    expect(REGISTRY).toEqual([
      'add',
      'append',
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

  it('registration still teaches the parser about non-manifest commands (Finding 6)', () => {
    // `command-adapter.ts`'s register() does `COMMANDS.add(name)`, so the
    // parser's command set grows at runtime. Before step 3 this was measurable
    // on a BUILT-IN: `pseudo-command` was absent from the static seed and
    // appeared only once a Runtime existed, so the standalone parser and the
    // post-Runtime parser disagreed about a shipped command. The manifest now
    // feeds both halves (see the seed test below), so that particular symptom
    // is gone — but the mechanism itself is still load-bearing for commands
    // the manifest never names: plugins, custom bundles, commands a test
    // registers. Pinned here on a synthetic command so it cannot be deleted as
    // dead code.
    const name = 'audit-synthetic-command';
    expect(COMMANDS.has(name)).toBe(false);

    const registry = new Runtime().getRegistry();
    // No `execute`: the row is about the `COMMANDS.add(name)` side effect, which
    // fires before any execution could. `register` is typed since 2026-08-01, so
    // the stub needs the cast.
    registry.register({ name, metadata: { name, aliases: ['audit-synthetic-alias'] } } as never);

    expect(COMMANDS.has(name)).toBe(true);
    expect(COMMANDS.has('audit-synthetic-alias')).toBe(true);

    // Leave the module-level Set as it was found — it is shared process state
    // and later assertions in this file read it.
    COMMANDS.delete(name);
    COMMANDS.delete('audit-synthetic-alias');
  });
});

// ===========================================================================
// 2. The four core lists (Claim 2 — already in sync; step 3's targets)
// ===========================================================================

describe('the four core lists agree with the registry', () => {
  it('parser-constants COMMANDS: the static seed is the manifest plus `for`', () => {
    // Step 3 made this DERIVED, not merely agreeing. The one remaining
    // divergence is `for`: a control-flow keyword the parser accepts in command
    // position (parseForCommand) with no command implementation and so no
    // manifest row. `pseudo-command` used to be the gap in the other direction
    // — the seed lacked it and only registration supplied it — and deriving the
    // seed closed that by construction.
    expect(ghostsIn(STATIC_SEED)).toEqual(['for']);
    expect(gapsIn(STATIC_SEED)).toEqual([]);
    expect(STATIC_SEED.size).toBe(REGISTRY.length + 1);

    // Derivation, asserted rather than assumed: reverting the seed to a
    // hand-written copy that happens to match today would pass the two checks
    // above, so pin the source text too. `COMMAND_NAMES` and not
    // `COMMAND_MANIFEST` — see the manifest's note; the rich array would ship
    // into every bundle that reaches the parser constants.
    const source = readFileSync(resolve(DIR, '../../parser/parser-constants.ts'), 'utf-8');
    expect(source).toMatch(/import \{ COMMAND_NAMES \} from '\.\.\/commands\/manifest'/);
    expect(source).toMatch(/new Set<string>\(\[\s*\.\.\.COMMAND_NAMES,/);
  });

  it('commands/index.ts exports one tree-shakeable factory per registered command', () => {
    const source = readFileSync(resolve(DIR, '../../commands/index.ts'), 'utf-8');
    const cut = source.indexOf('// BACKWARD-COMPATIBLE');
    expect(cut, 'the BACKWARD-COMPATIBLE section marker moved').toBeGreaterThan(0);
    const aliases = [...source.slice(0, cut).matchAll(/create\w+Command\s+as\s+(\w+)/g)].map(m =>
      normalize(m[1])
    );
    expect(aliases.length).toBe(58);
    expect([...aliases].sort()).toEqual(REGISTRY);
  });

  it('runtime.ts has exactly one registration site, and it loops the manifest', () => {
    // Claim 1 was "59 flat, perfectly uniform `register(createXCommand())`
    // calls", which is what made the block step 3's most mechanical target.
    // They are now one loop. Pinning the count at 1 is strictly stronger than
    // pinning uniformity at 59: a hand-added registration outside the loop —
    // the way a command would once again come to exist without a manifest row
    // — fails here.
    const source = readFileSync(resolve(DIR, '../runtime.ts'), 'utf-8');
    // Anchored at statement position so the prose in the file header, which
    // quotes the old `registry.register(createXCommand())` shape, is not
    // counted as a second site.
    expect([...source.matchAll(/^\s*registry\.register\(/gm)]).toHaveLength(1);
    expect(source).toMatch(/for \(const entry of COMMAND_MANIFEST\)/);
  });

  it('runtime.ts supplies a factory for every manifest command that needs one', () => {
    // The COMMAND_FACTORIES map is module-private (exporting it would publish
    // an internal and, worse, invite a slim bundle to import it — the map is
    // Finding 9's whole hazard), so it is read from source text, the same way
    // the LSP tier lists are.
    const source = readFileSync(resolve(DIR, '../runtime.ts'), 'utf-8');
    const block = source.match(/const COMMAND_FACTORIES[\s\S]*?= \{([\s\S]*?)\n\};/);
    expect(block, 'the COMMAND_FACTORIES literal moved or changed shape').not.toBeNull();

    // Keys are bare identifiers or quoted (`'pseudo-command'`), values are the
    // factory identifier — never a call, since the map holds factories, not
    // instances. A trailing `// + the \`send\` alias` note is allowed.
    const keys = [
      ...block![1].matchAll(/^\s{2}'?([\w-]+)'?:\s*create\w+Command,\s*(?:\/\/.*)?$/gm),
    ].map(m => m[1]);

    // 58 commands, 54 factories: the four consolidation-alias rows are
    // registered from their primary's metadata.aliases, not from a factory of
    // their own. Set equality both ways, so a factory for a command the
    // manifest does not name fails just as loudly as a missing one.
    const needsFactory = COMMAND_MANIFEST.filter(e => !e.consolidationAliasOf).map(e => e.name);
    expect(needsFactory).toHaveLength(54);
    expect([...keys].sort()).toEqual([...needsFactory].sort());
  });

  it('each factory builds a command that registers under its manifest name', () => {
    // The check that keeps the loop honest. With registration manifest-driven,
    // "the manifest names equal the registry names" is very nearly a tautology
    // — this is not. A map entry pointing at the wrong factory (`toggle:
    // createAddCommand`) would register `add` twice and leave `toggle` absent,
    // and the identity below is what names the mistake instead of leaving it
    // to the hardcoded 58-name list above to report as a bare diff.
    const registered = new Runtime().getRegistry();
    for (const entry of COMMAND_MANIFEST) {
      const impl = registered.getImplementation(entry.name) as
        { name: string; metadata?: { aliases?: string[] } } | undefined;
      expect(impl, `${entry.name} has no implementation`).toBeDefined();

      if (entry.consolidationAliasOf) {
        // An alias row resolves to its PRIMARY's implementation, and that
        // implementation is what declares the alias — i.e. the row exists
        // because `command-adapter.ts` acted on `metadata.aliases`, not
        // because something registered it directly.
        expect(impl!.name.toLowerCase(), `${entry.name} primary`).toBe(entry.consolidationAliasOf);
        expect(impl!.metadata?.aliases ?? [], `${entry.name} alias declaration`).toContain(
          entry.name
        );
      } else {
        expect(impl!.name.toLowerCase(), `${entry.name} self-name`).toBe(entry.name);
      }
    }
  });
});

// ===========================================================================
// 3. Core's extension commands (the LSP tier lists' partition until C5)
// ===========================================================================

/**
 * Registered commands in NEITHER tier list/**
 * Registered commands in NEITHER tier list — **empty since step 4.1**, and the
 * assertion below keeps it that way.
 *
 * It held 23 names. That was the arc's one LIVE defect rather than a latent
 * one: `detectLokascriptFeatures()` scans only `LOKASCRIPT_ONLY_COMMANDS`, and
 * `language-server/src/server.ts` turns each hit into a
 * `DiagnosticSeverity.Error`, so an unclassified extension produced NO
 * diagnostic — a user writing non-portable code was told nothing.
 *
 * Step 4.1 classified all 23 against the published original engine
 * (`hyperscript.org@0.9.93` from this repo's node_modules, cross-checked
 * against an 0.9.91 checkout): **17 upstream, 6 extension**. The per-command
 * probe that decided each row is recorded beside it in `command-tiers.ts`.
 *
 * Worth keeping as a named empty set rather than deleting: a command added
 * later without a tier row lands here, and the failure message says
 * "unclassified" instead of reporting a bare set difference.
 */
const TIER_UNCLASSIFIED = new Set<string>([]);

/**
 * The classification, counted. Step 4.1's judgment calls are only reviewable
 * if a later change has to move a number as well as a row — the same
 * discipline as §8's headline counts. 51 + 7 = the 58 registered commands (`async` left in Arc 6b).
 */
const TIER_COUNTS = { upstream: 51, extension: 7 };

/**
 * The seven extensions, named. A count alone would let two rows swap sides
 * unnoticed, and this list is what `detectLokascriptFeatures()` raises editor
 * ERRORS from, so moving a command into or out of it is a user-visible change
 * that should never be incidental to another edit.
 */
const EXTENSIONS = new Set([
  'beep', // upstream spells it `beep!`; the bare spelling is ours
  'copy',
  'prepend',
  'process',
  'push',
  'replace',
  'unless', // upstream has `unless` only as a TRAILING statement modifier
]);

describe("core's extension commands", () => {
  it('are registered, and split the registry 51 / 7', () => {
    // The LSP tiers held this partition until C5; core's registry still has it, and
    // §7 and §9 read it from here.
    expect([...EXTENSIONS].filter(name => !REGISTERED.has(name))).toEqual([]);
    expect({
      upstream: REGISTRY.length - EXTENSIONS.size,
      extension: EXTENSIONS.size,
    }).toEqual(TIER_COUNTS);
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
 * AVAILABLE_BLOCKS — classified as blocks rather than commands.
 *
 * **Step 4.2 decided this DOES satisfy the file's partition, and that these
 * three must stay out of `FULL_RUNTIME_ONLY_COMMANDS`.** The generator
 * dispatches them through `BLOCK_IMPLEMENTATIONS`, not
 * `COMMAND_IMPLEMENTATIONS`, and lite bundles execute them correctly today;
 * `vite-plugin`'s `getUnsupportedCommands()` checks the full-runtime list
 * first, so listing them there would force a full-runtime fallback for working
 * `if`/`repeat`/`fetch` code. The reason they look unclassified is that they
 * are commands in the ENGINE and blocks in the GENERATOR — one name, two
 * dispatch surfaces.
 */
const CAPABILITY_BLOCK_ONLY = new Set(['fetch', 'if', 'repeat']);

/**
 * Registered commands with NO classification anywhere in the capability file.
 *
 * **Emptied by step 4.2** — all ten moved into `FULL_RUNTIME_ONLY_COMMANDS`.
 * Measured against the generator (this file's oracle): none has a
 * `COMMAND_IMPLEMENTATIONS` key, so `generateBundle()` rejects each as
 * `unknown-command`, and none is reachable in the generated parser.
 * Behavior-preserving for bundle selection, and it makes them scannable so
 * their use routes to a tier that runs them.
 *
 * NOTE: the brief's Claim 3 table says 12 gaps for this file. Measured, it was
 * 13 = those 10 + the 3 block-only rows above — the table counted `if` as
 * classified, but `if` appears in neither command list, exactly like `repeat`
 * and `fetch` which it did count.
 *
 * The mirror defect the same oracle run exposed — 14 of the 38 ADVERTISED
 * commands emitted a case label the bundle parser could never reach — was
 * closed by the Finding 13 PR with parser rules rather than a reclassification,
 * so nothing moved in or out of these lists. It is gated in
 * `bundle-generator/__tests__/capability-emission.test.ts`, which now EXECUTES
 * a generated bundle per advertised command instead of parsing one.
 */
const CAPABILITY_UNCLASSIFIED = new Set<string>([]);

describe('the capability lists', () => {
  it('every capability entry is a registered command or an allowlisted generator name', () => {
    expect(ghostsIn([...AVAILABLE_COMMANDS, ...FULL_RUNTIME_ONLY_COMMANDS])).toEqual(
      [...CAPABILITY_NOT_COMMANDS].sort()
    );
  });

  it('the advertised aliases resolve to registered commands', () => {
    expect(resolveCommandKey('push-url')).toBe('push');
    expect(resolveCommandKey('replace-url')).toBe('replace');
    // `trigger` joined them when Finding 13 was closed. Unlike the other two it
    // IS a registered command and a real source spelling; what it shares with
    // them is having no template of its own, because `trigger foo on #t` and
    // `send foo to #t` yield the same node — mirroring the registry, where
    // `trigger` is a consolidation alias sharing `send`'s implementation.
    expect(resolveCommandKey('trigger')).toBe('send');
    expect(REGISTERED.has(resolveCommandKey('push-url'))).toBe(true);
    expect(REGISTERED.has(resolveCommandKey('replace-url'))).toBe(true);
    expect(REGISTERED.has('trigger')).toBe(true);
    expect(REGISTERED.has(resolveCommandKey('trigger'))).toBe(true);
  });

  it('only the 3 block-only rows are outside the command partition (step 4.2)', () => {
    // Was 13 before step 4.2 (10 unclassified + these 3).
    expect(gapsIn([...AVAILABLE_COMMANDS, ...FULL_RUNTIME_ONLY_COMMANDS])).toEqual(
      [...CAPABILITY_BLOCK_ONLY, ...CAPABILITY_UNCLASSIFIED].sort()
    );
    expect(CAPABILITY_UNCLASSIFIED.size, 'a command lost its classification').toBe(0);
  });

  it('the block-only rows really are classified as blocks', () => {
    // Keeps CAPABILITY_BLOCK_ONLY honest: if one of the three leaves
    // AVAILABLE_BLOCKS it must move to CAPABILITY_UNCLASSIFIED, not linger.
    for (const name of CAPABILITY_BLOCK_ONLY) {
      expect(AVAILABLE_BLOCKS, `${name} left AVAILABLE_BLOCKS`).toContain(name);
    }
  });

  it('the block-only rows are NOT full-runtime-only (step 4.2 decision)', () => {
    // The decision, pinned as an assertion rather than only as prose: adding
    // one of these to FULL_RUNTIME_ONLY_COMMANDS would bump every project using
    // an `if` block to the full runtime, because getUnsupportedCommands()
    // consults that list before anything else.
    for (const name of CAPABILITY_BLOCK_ONLY) {
      expect(FULL_RUNTIME_ONLY_COMMANDS as readonly string[]).not.toContain(name);
    }
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
  // classic (51), classic-i18n (42) and the two textshelf profiles (10 each)
  // retired in Phase C3 (C-R3). lite's file stays: the regex parser imports it.
  'browser-bundle-lite.ts': 8,
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
    // Names resolve through the registry's alias map first, so an advertised
    // alias is not a ghost but a name resolving to an UNREGISTERED target still
    // fails. (hybrid-complete's array, the generation input until Phase C3,
    // also carried `push-url`/`replace-url` aliases and the parser node name
    // `removeClass`; no remaining array does.)
    for (const [file, names] of Object.entries(arrays)) {
      const unresolved = names.map(name => resolveCommandKey(name));
      expect(ghostsIn(unresolved), `${file} advertises unregistered commands`).toEqual([]);
    }
  });

  it('per-bundle counts move only deliberately', () => {
    const counts = Object.fromEntries(Object.entries(arrays).map(([f, n]) => [f, n.length]));
    expect(counts).toEqual(BUNDLE_COMMAND_COUNTS);
  });

  // `metadata.ts`'s commandCount for an array-publishing bundle was compared
  // with its array here until the last one it lists (hybrid-complete) retired
  // in Phase C3; `verify:reference` compared the factory-list bundles until
  // the last of those (multilingual) retired in C-R3.
});

// ===========================================================================
// 7. The manifest (commands/manifest.ts) — Arc A step 2
// ===========================================================================

/**
 * The manifest is a **checked mirror**, never an independent copy: every field
 * is asserted against the source it mirrors, so it cannot drift into being the
 * twenty-first hand-maintained place. It lives here rather than beside
 * `manifest.ts` because the coupling assertion below needs `TIER_UNCLASSIFIED`,
 * and re-deriving the registry in a second file is the duplication this arc
 * exists to remove.
 */
const MANIFEST_BY_NAME = new Map(COMMAND_MANIFEST.map(e => [e.name, e]));

/**
 * The only keys a manifest entry may carry. A `factory` field defeats
 * tree-shaking (Finding 9: 177 B → 38,395 B for a names-only consumer at four
 * commands), and this asserts the shape structurally so the bundle-size
 * snapshot is a second line of defence rather than the only one.
 */
const ALLOWED_KEYS = new Set([
  'name',
  'category',
  'tier',
  'upstreamOrExtension',
  'consolidationAliasOf',
  'multiword',
]);

describe('the command manifest', () => {
  it('names exactly the registered set, both directions', () => {
    const names = COMMAND_MANIFEST.map(e => e.name);
    expect(ghostsIn(names)).toEqual([]);
    expect(gapsIn(names)).toEqual([]);
    // A duplicated entry satisfies both checks above and COLLAPSES in the Map,
    // so the Map's size cannot see it — the array length is what rules it out.
    expect(COMMAND_MANIFEST.length).toBe(58);
    expect(MANIFEST_BY_NAME.size).toBe(58);
  });

  it('is sorted in registry order, so the diff of an added command is one line', () => {
    expect(COMMAND_MANIFEST.map(e => e.name)).toEqual(REGISTRY);
  });

  it('COMMAND_NAMES is the same list, in the same order', () => {
    // The names are a second literal in the manifest module rather than
    // `COMMAND_MANIFEST.map(e => e.name)`, because a `.map()` references the
    // rich entries and drags all of them into names-only bundles (measured:
    // +4.8 KB raw in hyperfixi-hx.js, past the ±5% size gate). Equality as
    // ORDERED lists, not as sets, so the two cannot drift in either content or
    // order — which is what makes the split a shape change rather than a
    // second hand-maintained copy.
    expect(COMMAND_NAMES).toEqual(COMMAND_MANIFEST.map(e => e.name));
  });

  it('carries no factory field, and no field the schema does not name (Finding 9)', () => {
    for (const entry of COMMAND_MANIFEST) {
      const extra = Object.keys(entry).filter(k => !ALLOWED_KEYS.has(k));
      expect(extra, `${entry.name} carries unexpected keys`).toEqual([]);
    }
    // The specific field the measurement rules out, named so a future edit that
    // reintroduces it fails against the reason rather than a generic schema.
    expect(COMMAND_MANIFEST.some(e => 'factory' in e)).toBe(false);
  });

  it('category mirrors what the registry serves', () => {
    const registered = new Runtime().getRegistry();
    for (const name of REGISTRY) {
      const served = registered.getImplementation(name)?.metadata?.category;
      expect(MANIFEST_BY_NAME.get(name)!.category, `${name} category`).toBe(served);
    }
  });

  it('multiword mirrors COMPOUND_COMMAND_NAMES', () => {
    const manifestMultiword = COMMAND_MANIFEST.filter(e => e.multiword)
      .map(e => e.name)
      .sort();
    expect(manifestMultiword).toEqual([...COMPOUND_COMMAND_NAMES].sort());
    expect(manifestMultiword.length).toBe(23);
  });

  it('consolidationAliasOf names the 4 shared implementations, and only those', () => {
    // Derived by implementation IDENTITY, not by re-reading metadata.aliases:
    // two registered names backed by one instance IS the consolidation, and
    // that is the property `command-adapter.ts` actually establishes.
    const registered = new Runtime().getRegistry();
    const byImpl = new Map<unknown, string[]>();
    for (const name of REGISTRY) {
      const impl = registered.getImplementation(name);
      if (!byImpl.has(impl)) byImpl.set(impl, []);
      byImpl.get(impl)!.push(name);
    }

    const expected: Record<string, string> = {};
    for (const [impl, names] of byImpl) {
      if (names.length === 1) continue;
      const primary = (impl as { name: string }).name;
      for (const name of names) if (name !== primary) expected[name] = primary;
    }

    const actual = Object.fromEntries(
      COMMAND_MANIFEST.filter(e => e.consolidationAliasOf).map(e => [
        e.name,
        e.consolidationAliasOf!,
      ])
    );
    expect(actual).toEqual(expected);
    // Finding 7's FIRST mechanism only — four real command names sharing an
    // implementation, NOT the eleven slim-bundle synonyms in COMMAND_ALIASES.
    expect(actual).toEqual({
      decrement: 'increment',
      replace: 'push',
      send: 'trigger',
      unless: 'if',
    });
    // Every alias target is itself a manifest row, so the graph never dangles.
    for (const target of Object.values(actual)) expect(MANIFEST_BY_NAME.has(target)).toBe(true);
  });

  it("upstreamOrExtension marks exactly core's extensions (§3)", () => {
    for (const name of REGISTRY) {
      const expected = EXTENSIONS.has(name) ? 'extension' : 'upstream';
      expect(MANIFEST_BY_NAME.get(name)!.upstreamOrExtension, `${name} tier`).toBe(expected);
    }
  });

  it('the unknown set IS the audit TIER_UNCLASSIFIED set (both empty since 4.1)', () => {
    // The coupling that stops the two from drifting apart — which is the exact
    // disease this arc exists to cure. It did its job in step 4.1: classifying
    // the 23 required deleting each row HERE and in TIER_UNCLASSIFIED in one
    // diff. Both sides are now empty, so on its own this is a weak assertion —
    // the load is carried by the per-command equality test above and by §3's
    // 51/7 split, which a re-classification cannot satisfy by accident.
    const unknown = COMMAND_MANIFEST.filter(e => e.upstreamOrExtension === 'unknown')
      .map(e => e.name)
      .sort();
    expect(unknown).toEqual([...TIER_UNCLASSIFIED].sort());
    expect(unknown).toEqual([]);
  });
});

// ===========================================================================
// 8. The headline counts
// ===========================================================================

describe('the classification debt, counted', () => {
  // Zero CLASSIFICATION debt. Step 4.4 (deriving `packageInfo.commands`) has
  // now LANDED and correctly added no row here: it is a derivation, not a
  // classification. Arc A is complete — every count below stays at its decided
  // value, and the counts 4.4 governs are gated in §6 and by verify:reference
  // rather than tracked as debt.
  it('0 rows await deliberate classification (4.1, 4.2, 4.3 all landed)', () => {
    // The numbers the arc exists to burn down. A step that classifies a
    // command flips its allowlist row AND moves the count here, so the diff
    // shows both the decision and its scope. Do not adjust a count without
    // moving the rows that justify it.
    //
    // Step 4.1 took this from 40 to 17: the LSP tier lists are now a total
    // partition of the registry (51 upstream / 8 extension), asserted in §3.
    // Step 4.2 took it from 17 to 4 by classifying the ten unclassified
    // capability rows as full-runtime-only and RESOLVING the block-only three
    // as classified-by-AVAILABLE_BLOCKS rather than unclassified, so they no
    // longer count as debt (they are still pinned in §4, both directions).
    // Step 4.3 took it to ZERO: `process`/`scroll`/`start` are advertised, and
    // `pseudo-command` moved to KEYWORD_NOT_ADVERTISED — a decision with a
    // reason, not an open row.
    expect(TIER_UNCLASSIFIED.size).toBe(0); // step 4.1 — DONE, was 23
    expect(CAPABILITY_UNCLASSIFIED.size).toBe(0); // step 4.2 — DONE, was 10
    expect(CAPABILITY_BLOCK_ONLY.size).toBe(3); // step 4.2 — DECIDED: blocks classify
    // (Step 4.3's two COMMAND_KEYWORDS counts left with §5 in Phase C5.)
  });
});

// ===========================================================================
// 9. metadata.compatibility (Arc B step 2) — the coupling, landed BEFORE values
// ===========================================================================

/**
 * `metadata.compatibility` is UNSET on all 58 registered commands, deliberately:
 * Arc A step 4.1 declined to populate it so Arc B could copy 59 *finished*
 * values instead of 23 `'unknown'`s. This section is the coupling that makes
 * that copy reviewable, and it lands **before** the values do — so the gate is
 * proven to fail correctly while there is still nothing for it to bless. A gate
 * written after the migration can only confirm what the migration decided.
 *
 * ## The domain mismatch, and the decision
 *
 * The two vocabularies do not line up:
 *
 * | manifest `upstreamOrExtension` | decorator `compatibility` |
 * | ------------------------------ | ------------------------- |
 * | `upstream` (51 rows)           | `'standard'`              |
 * | `extension` (8 rows)           | `'lokascript-extension'`  |
 * | *(no counterpart)*             | `'experimental'`          |
 *
 * DECIDED: project `upstream → 'standard'`, `extension → 'lokascript-extension'`,
 * and keep `'experimental'` as a third state that no command occupies. Dropping
 * it would narrow an exported public type for no present benefit; keeping it
 * unguarded would make it an escape hatch from this coupling. So it is
 * allowlisted at size 0 — a command marked `'experimental'` fails the projection
 * AND has to be named below with a reason, in the same diff. That is the
 * `TIER_UNCLASSIFIED` discipline: a judgment call is only reviewable if making
 * it moves a row and a count.
 *
 * ## Why every check here is value-based, never key-presence
 *
 * `'compatibility' in metadata` is measurably NOT the same question as
 * `metadata.compatibility === undefined`. `@meta` assigns the key
 * unconditionally (`compatibility: config.compatibility`), so 56 commands carry
 * the key holding `undefined`, while the three `commandMeta` classes
 * (`install`, `pseudo-command`, `render`) omit it entirely. A key-presence check
 * therefore splits the registry 56/3 and reads as a classification when it is
 * an artifact of how each class declares its metadata. Every assertion below
 * asks for the VALUE.
 */

/**
 * Registered commands with no `compatibility` value. Currently the whole
 * registry, which is the state Arc A deliberately left.
 *
 * Step 3 replaces this with the rows it could not classify — expected `[]`. It
 * cannot be satisfied by accident in either direction: populating 58 of 59 and
 * emptying this set fails (measured 1 ≠ 0), and populating 58 while leaving this
 * as the whole registry fails too (measured 1 ≠ 59).
 */
const COMPATIBILITY_UNSET = new Set<string>([]);

/**
 * Names whose served `compatibility` cannot match their own manifest side,
 * because a SHARED implementation cannot carry two values.
 *
 * `unless` is the only such row in the registry, and it is structural rather
 * than an oversight: `ConditionalCommand` is registered as both `if`
 * (upstream → `'standard'`) and `unless` (extension → `'lokascript-extension'`),
 * and both names resolve to the SAME instance — which is exactly how
 * `command-adapter.ts:440` registers the alias in the first place. One object,
 * one `compatibility`. The class carries `'standard'`, matching `if`: the
 * primary registered name, and the upstream one.
 *
 * Checked against the shared groups rather than hand-listed: of the four groups,
 * only this one straddles the upstream/extension line (`send`/`trigger` are both
 * upstream, `push`/`replace` both extension, `decrement`/`increment` both
 * upstream). Splitting metadata per registered name would fix it and is an
 * architectural change, so it is pinned here the way Arc A pinned the
 * two-category-unions disagreement rather than resolved inside a mechanical step.
 */
const COMPATIBILITY_ALIAS_DIVERGENCE: Record<string, { served: string; ownSide: string }> = {
  unless: { served: 'standard', ownSide: 'lokascript-extension' },
};

/**
 * Commands deliberately marked `'experimental'`. Empty, and it must stay empty
 * unless someone writes down why a command has a compatibility state the
 * manifest cannot express.
 */
const COMPATIBILITY_EXPERIMENTAL = new Set<string>([]);

/** The projection this arc commits to: manifest tier → decorator vocabulary. */
function expectedCompatibility(name: string): 'standard' | 'lokascript-extension' {
  return EXTENSIONS.has(name) ? 'lokascript-extension' : 'standard';
}

/** Read through the INSTANCE, the same path `command-adapter.ts` uses. */
function servedCompatibility(): Map<string, unknown> {
  const registered = new Runtime().getRegistry();
  return new Map(
    REGISTRY.map(name => [
      name,
      (registered.getImplementation(name) as { metadata?: { compatibility?: unknown } } | undefined)
        ?.metadata?.compatibility,
    ])
  );
}

describe('metadata.compatibility', () => {
  it('every populated row matches the manifest projection', () => {
    // THE live gate. Vacuous over values today (all 58 unset) and deliberately
    // so — mutation-verified when it landed by setting one command's
    // compatibility to the wrong side and watching this fail. Step 3 populates
    // into a gate that already works rather than one written to fit its output.
    const wrong: string[] = [];
    for (const [name, served] of servedCompatibility()) {
      if (served === undefined) continue; // unset rows are governed below
      if (served === 'experimental') continue; // governed by its own test
      if (name in COMPATIBILITY_ALIAS_DIVERGENCE) continue; // shared impl, governed below
      if (served !== expectedCompatibility(name)) {
        wrong.push(`${name}: ${String(served)} (manifest projects ${expectedCompatibility(name)})`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the alias divergences are exactly the shared groups that straddle the tier line', () => {
    // Derived, not hand-listed: any OTHER shared implementation whose names
    // disagree on tier would appear here and fail, so adding a consolidated
    // alias across the line cannot pass unnoticed.
    const straddling: string[] = [];
    const byCtor = new Map<string, string[]>();
    const registered = new Runtime().getRegistry();
    for (const name of REGISTRY) {
      const ctor = (registered.getImplementation(name) as object | undefined)?.constructor?.name;
      if (!ctor) continue;
      byCtor.set(ctor, [...(byCtor.get(ctor) ?? []), name]);
    }
    for (const names of byCtor.values()) {
      if (names.length < 2) continue;
      const sides = new Set(names.map(n => expectedCompatibility(n)));
      if (sides.size > 1) {
        // every name in the group except the one the class actually matches
        for (const n of names) {
          const served = servedCompatibility().get(n);
          if (served !== expectedCompatibility(n)) straddling.push(n);
        }
      }
    }
    expect(straddling.sort()).toEqual(Object.keys(COMPATIBILITY_ALIAS_DIVERGENCE).sort());
    // And the allowlist stays honest about WHICH way each row diverges.
    for (const [name, { served, ownSide }] of Object.entries(COMPATIBILITY_ALIAS_DIVERGENCE)) {
      expect(servedCompatibility().get(name), `${name} served`).toBe(served);
      expect(expectedCompatibility(name), `${name} own side`).toBe(ownSide);
    }
  });

  it('the unset rows are exactly the allowlist, both directions', () => {
    const unset = [...servedCompatibility()]
      .filter(([, served]) => served === undefined)
      .map(([name]) => name)
      .sort();
    expect(unset).toEqual([...COMPATIBILITY_UNSET].sort());
  });

  it("only allowlisted commands may be 'experimental'", () => {
    // The escape-hatch guard. `'experimental'` has no manifest counterpart, so
    // the projection test above cannot judge it — this is what stops it being
    // used to route around the projection.
    const experimental = [...servedCompatibility()]
      .filter(([, served]) => served === 'experimental')
      .map(([name]) => name)
      .sort();
    expect(experimental).toEqual([...COMPATIBILITY_EXPERIMENTAL].sort());
    expect(COMPATIBILITY_EXPERIMENTAL.size, 'an experimental row needs a written reason').toBe(0);
  });

  it('the projection is total and splits 51 / 8, matching §3', () => {
    // Ties this section to the count §3 already enforces, so the projection
    // cannot quietly re-partition the registry. If EXTENSIONS gains or loses a
    // row, this fails here as well as there.
    const tally = { standard: 0, 'lokascript-extension': 0 };
    for (const name of REGISTRY) tally[expectedCompatibility(name)]++;
    expect(tally).toEqual({
      standard: TIER_COUNTS.upstream,
      'lokascript-extension': TIER_COUNTS.extension,
    });
    expect(tally.standard + tally['lokascript-extension']).toBe(REGISTRY.length);
  });

  it('agrees with the manifest row-by-row, not just in aggregate', () => {
    // A count can be satisfied by two rows swapping sides. This cannot.
    for (const name of REGISTRY) {
      const manifestSide = MANIFEST_BY_NAME.get(name)!.upstreamOrExtension;
      const projected = expectedCompatibility(name);
      expect(projected, `${name} projection vs manifest`).toBe(
        manifestSide === 'upstream' ? 'standard' : 'lokascript-extension'
      );
    }
  });
});
