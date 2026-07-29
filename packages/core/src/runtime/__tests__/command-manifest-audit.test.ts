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
 * neither may be softened into a derivation: the hardcoded 59-name list in §1,
 * and the per-command factory identity check in §2 (each factory builds a
 * command that calls itself what the manifest calls it).
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

import { COMMANDS, COMPOUND_COMMANDS } from '../../parser/parser-constants';
import { COMMAND_MANIFEST, COMMAND_NAMES, toRegisteredName } from '../../commands/manifest';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  resolveCommandKey,
} from '../../bundle-generator/template-capabilities';
import { COMMAND_KEYWORDS, ALL_KEYWORDS, HOVER_DOCS } from '../../lsp-metadata';
import { bundleInfo } from '../../metadata';
import { BUNDLES_WITH_COMMAND_LISTS } from '../../compatibility/bundle-sources';
import { commands as referenceCommands } from '../../reference/index';
import { parse } from '../../parser/parser';

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
  it('registers exactly the 59 documented commands', () => {
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
    registry.register({ name, metadata: { name, aliases: ['audit-synthetic-alias'] } });

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
    expect(aliases.length).toBe(59);
    expect([...aliases].sort()).toEqual(REGISTRY);
  });

  it('reference/index.ts documents exactly the registered set', () => {
    const documented = Object.keys(referenceCommands).map(normalize);
    expect(documented.length).toBe(59);
    expect([...documented].sort()).toEqual(REGISTRY);
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

    // 59 commands, 55 factories: the four consolidation-alias rows are
    // registered from their primary's metadata.aliases, not from a factory of
    // their own. Set equality both ways, so a factory for a command the
    // manifest does not name fails just as loudly as a missing one.
    const needsFactory = COMMAND_MANIFEST.filter(e => !e.consolidationAliasOf).map(e => e.name);
    expect(needsFactory).toHaveLength(55);
    expect([...keys].sort()).toEqual([...needsFactory].sort());
  });

  it('each factory builds a command that registers under its manifest name', () => {
    // The check that keeps the loop honest. With registration manifest-driven,
    // "the manifest names equal the registry names" is very nearly a tautology
    // — this is not. A map entry pointing at the wrong factory (`toggle:
    // createAddCommand`) would register `add` twice and leave `toggle` absent,
    // and the identity below is what names the mistake instead of leaving it
    // to the hardcoded 59-name list above to report as a bare diff.
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
// 3. The LSP tier lists (language-server/src/command-tiers.ts)
// ===========================================================================

const tiersSource = readFileSync(
  resolve(DIR, '../../../../language-server/src/command-tiers.ts'),
  'utf-8'
);
/**
 * Anchored on the closing `] as const;` rather than the first `]`. The old
 * non-greedy `\]` stopped at whatever bracket came first, so a `]` inside one
 * of the annotation comments step 4.1 added would silently truncate the list
 * and turn every command below it into a phantom gap.
 */
function tierList(name: string): string[] {
  const block = tiersSource.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\n\\] as const;`));
  // Module scope, so a plain throw rather than expect(): a collection-time
  // failure here must name the cause, not surface as "expect outside test".
  if (!block) throw new Error(`${name} literal moved or changed shape in command-tiers.ts`);
  return stringsIn(block[1]);
}

const HYPERSCRIPT_TIER = tierList('HYPERSCRIPT_COMMANDS');
const LOKASCRIPT_TIER = tierList('LOKASCRIPT_ONLY_COMMANDS');

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
 * discipline as §8's headline counts. 51 + 8 = the 59 registered commands.
 */
const TIER_COUNTS = { upstream: 51, extension: 8 };

/**
 * The eight extensions, named. A count alone would let two rows swap sides
 * unnoticed, and this list is what `detectLokascriptFeatures()` raises editor
 * ERRORS from, so moving a command into or out of it is a user-visible change
 * that should never be incidental to another edit.
 */
const EXTENSIONS = new Set([
  'async',
  'beep', // upstream spells it `beep!`; the bare spelling is ours
  'copy',
  'prepend',
  'process',
  'push',
  'replace',
  'unless', // upstream has `unless` only as a TRAILING statement modifier
]);

describe('the LSP tier lists', () => {
  it('every tier entry is a registered command or an allowlisted feature', () => {
    // Set equality, not filter-and-assert-empty: a TIER_NOT_COMMANDS entry that
    // becomes a registered command (or leaves the lists) goes stale loudly.
    expect(ghostsIn([...HYPERSCRIPT_TIER, ...LOKASCRIPT_TIER])).toEqual(
      [...TIER_NOT_COMMANDS].sort()
    );
  });

  it('classifies every registered command — the partition is total (step 4.1)', () => {
    expect(gapsIn([...HYPERSCRIPT_TIER, ...LOKASCRIPT_TIER])).toEqual(
      [...TIER_UNCLASSIFIED].sort()
    );
    expect(TIER_UNCLASSIFIED.size, 'a command lost its classification').toBe(0);
  });

  it('the two tiers split the registry 51 / 8', () => {
    const upstream = HYPERSCRIPT_TIER.filter(name => REGISTERED.has(name));
    const extension = LOKASCRIPT_TIER.filter(name => REGISTERED.has(name));
    expect(extension.sort()).toEqual([...EXTENSIONS].sort());
    expect({ upstream: upstream.length, extension: extension.length }).toEqual(TIER_COUNTS);
    expect(upstream.length + extension.length).toBe(REGISTRY.length);
  });

  it('the tiers stay disjoint', () => {
    // command-tiers.test.ts asserts this too, but from inside the
    // language-server package. Repeated here because §7 derives the manifest's
    // upstreamOrExtension from these lists with `HYPERSCRIPT_TIER` winning:
    // a name in both would silently classify as upstream.
    const upstream = new Set(HYPERSCRIPT_TIER);
    expect(LOKASCRIPT_TIER.filter(name => upstream.has(name))).toEqual([]);
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
// 5. COMMAND_KEYWORDS (lsp-metadata.ts) — absorbs lsp-metadata.test.ts
// ===========================================================================

/**
 * In COMMAND_KEYWORDS but not an executable command, legitimately. `else` is a
 * block keyword — it continues an `if`, it is never dispatched as a command;
 * `for` and `while` are loop keywords the LSP should still complete.
 */
const KEYWORD_NOT_COMMANDS = new Set(['else', 'for', 'while']);

/**
 * Registered commands COMMAND_KEYWORDS does not advertise, so the LSP offers
 * no completion for them. Was six before the Finding 5 ghost fix renamed
 * `pushUrl`/`replaceUrl` to `push`/`replace` (#810), then four, and step 4.3
 * closed the last three (`process`, `scroll`, `start` — each probed live
 * against the parser). **Now empty, and it stays empty**: a registered command
 * belongs here only while somebody is actively deciding, and the two settled
 * outcomes have their own homes — advertised (in the list) or permanently
 * excluded (`KEYWORD_NOT_ADVERTISED` below, which requires a reason).
 */
const KEYWORD_GAPS = new Set<string>([]);

/**
 * Registered commands deliberately kept OUT of COMMAND_KEYWORDS. Not debt —
 * each row is a decision, and the reason has to survive next to it.
 *
 * `pseudo-command` is the name the parser EMITS for the method-call-as-command
 * form: `setAttribute('a','b') on me` yields a node named `pseudo-command`. No
 * user writes that token. It is not unreachable — step 3's note said it was
 * ("`-` is not an identifier character"), and step 4.3 measured that FALSE: `-`
 * is an identifier character, `pseudo-command` tokenizes as one identifier and
 * reaches a command node. But the node it reaches carries no `methodName`, so
 * advertising the token would offer a completion that parses and then does
 * nothing — a subtler form of the `pushUrl` defect, not a fix for it.
 */
const KEYWORD_NOT_ADVERTISED = new Set(['pseudo-command']);

/**
 * The parse oracle for §5 — the question nothing asked before step 4.3.
 *
 * `ghostsIn` checks registry membership, which is only a PROXY for what this
 * list promises: that the token parses. The proxy is weaker in BOTH directions.
 * `pseudo-command` is registered yet is not a keyword anybody writes, and a
 * name could parse without being registered (`else`, `for`, `while` do exactly
 * that). So the entries are probed against the real parser here.
 *
 * The snippet is each keyword's own `HOVER_DOCS` example, deliberately — it is
 * the text the LSP puts in front of the user, so a dead example is the shipped
 * defect (`pushUrl`, #810) one level down. It also means there is no second
 * hand-maintained probe table to drift: documenting a keyword IS probing it.
 *
 * A keyword passes when its example reaches at least one real command node.
 * `success` alone is NOT sufficient and must never be substituted: an
 * unrecognized word makes the command-list parser stop cleanly and hand back an
 * EMPTY command list with `success: true` — `on click zzznotacommand .x` parses
 * "fine". This is the same trap step 4.1 hit on the upstream engine, and it is
 * live here too. It is what made three hover examples dead code in silence.
 */
function commandNodesIn(source: string): string[] {
  const result = parse(source);
  const found: string[] = [];
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth = 0): void => {
    if (!node || typeof node !== 'object' || depth > 25 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(child => walk(child, depth + 1));
      return;
    }
    const rec = node as Record<string, unknown>;
    if (rec.type === 'command' && typeof rec.name === 'string') found.push(rec.name);
    for (const key of Object.keys(rec)) if (key !== 'tokens') walk(rec[key], depth + 1);
  };
  walk((result as { node?: unknown }).node);
  return found;
}

describe('COMMAND_KEYWORDS', () => {
  it('every keyword names a registered command or an allowlisted block keyword', () => {
    expect(ghostsIn(COMMAND_KEYWORDS)).toEqual([...KEYWORD_NOT_COMMANDS].sort());
  });

  it('every registered command is advertised, or excluded with a reason (step 4.3)', () => {
    expect(gapsIn(COMMAND_KEYWORDS)).toEqual([...KEYWORD_NOT_ADVERTISED].sort());
    expect([...KEYWORD_GAPS]).toEqual([]);
  });

  it('every keyword is documented — the probe corpus has no holes', () => {
    // Guards the gate below from going vacuously green: an undocumented
    // keyword has no example, so it would otherwise be silently unprobed.
    // `push`/`replace` sat undocumented from #810 until step 4.3.
    expect(COMMAND_KEYWORDS.filter(kw => !HOVER_DOCS[kw])).toEqual([]);
  });

  it('every keyword PARSES — its own hover example reaches a command node', () => {
    // The check `ghostsIn` cannot make. Mutation-verified: restoring any of the
    // three examples step 4.3 fixed (`repeat` without `end`, standalone
    // `while`, `transition #box's opacity`) fails here, and all three were
    // SILENT before this test existed.
    const dead = COMMAND_KEYWORDS.filter(kw => {
      const example = HOVER_DOCS[kw]?.example;
      if (!example) return false; // covered by the test above
      return commandNodesIn(`on click ${example.replace(/\n/g, '\n  ')}`).length === 0;
    });
    expect(dead).toEqual([]);
  });

  it('the excluded rows are excluded for the stated reason, not by accident', () => {
    for (const name of KEYWORD_NOT_ADVERTISED) {
      expect(REGISTERED.has(name)).toBe(true); // still registered
      expect(COMMAND_KEYWORDS as readonly string[]).not.toContain(name);
    }
    // `pseudo-command` is reachable as a token — step 3's "unreachable"
    // note was measured false — but only as a degenerate node. Both halves
    // are pinned so a future reader re-checks rather than trusting either.
    expect(commandNodesIn('on click pseudo-command')).toContain('pseudo-command');
    expect(commandNodesIn('on click setAttribute("a","b") on me')).toContain('pseudo-command');
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

  /**
   * The link whose ABSENCE was the bug. §6 pinned each array's size and
   * `metadata.ts` advertised a `commandCount`, but the two were never compared,
   * so `minimal` sat at 30 against an array of 10 and `standard` at 35 against
   * 25 — both for as long as the entries have existed. Pinning one side and
   * advertising the other is not a check; only the comparison is.
   *
   * Scoped to the array-publishing bundles: `verify:reference` covers the
   * factory-list and re-export arms with the same `bundle-sources.ts` pairing.
   */
  it('metadata commandCount matches the array each bundle actually publishes', () => {
    const mismatches: string[] = [];
    for (const [id, sourceFile] of Object.entries(BUNDLES_WITH_COMMAND_LISTS)) {
      const advertised = bundleInfo.find(b => b.id === id)?.commandCount;
      const actual = arrays[sourceFile]?.length;
      if (advertised === undefined || actual === undefined) {
        mismatches.push(`${id}: no metadata entry or no array in ${sourceFile}`);
      } else if (advertised !== actual) {
        mismatches.push(`${id}: metadata says ${advertised}, ${sourceFile} publishes ${actual}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
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

/**
 * `send` and `trigger` are `'events'` in `reference/index.ts` and `'event'` in
 * the `@command` decorator — the only two of 59 where the two category sources
 * disagree, and not a typo: `reference/index.ts` and `types/command-metadata.ts`
 * declare two independent `CommandCategory` unions that differ in exactly two
 * members (`'events'` vs `'event'`, and `'storage'` present only in the latter).
 * Nothing compared them before this audit.
 *
 * The manifest follows the decorator/registry union (it mirrors what the engine
 * serves). Reconciling the two unions is a rename with LSP and docs reach, so
 * it is pinned here rather than resolved inside a data-only step — the same
 * treatment Finding 7's synonym aliases got.
 */
const CATEGORY_DOC_DISAGREEMENTS: Record<string, { reference: string; decorator: string }> = {
  send: { reference: 'events', decorator: 'event' },
  trigger: { reference: 'events', decorator: 'event' },
};

describe('the command manifest', () => {
  it('names exactly the registered set, both directions', () => {
    const names = COMMAND_MANIFEST.map(e => e.name);
    expect(ghostsIn(names)).toEqual([]);
    expect(gapsIn(names)).toEqual([]);
    // A duplicated entry satisfies both checks above and COLLAPSES in the Map,
    // so the Map's size cannot see it — the array length is what rules it out.
    expect(COMMAND_MANIFEST.length).toBe(59);
    expect(MANIFEST_BY_NAME.size).toBe(59);
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

  it('pins the 2 rows where the reference and decorator categories disagree', () => {
    const disagreeing: string[] = [];
    for (const [key, ref] of Object.entries(referenceCommands)) {
      const name = normalize(key);
      const manifest = MANIFEST_BY_NAME.get(name);
      if (manifest && manifest.category !== (ref as { category: string }).category) {
        disagreeing.push(name);
      }
    }
    expect(disagreeing.sort()).toEqual(Object.keys(CATEGORY_DOC_DISAGREEMENTS).sort());
    // Keeps the allowlist honest about WHICH spellings diverge, so a partial
    // fix (one side renamed) fails instead of silently re-pointing the row.
    for (const [name, { reference, decorator }] of Object.entries(CATEGORY_DOC_DISAGREEMENTS)) {
      const ref = Object.entries(referenceCommands).find(([k]) => normalize(k) === name)![1];
      expect((ref as { category: string }).category, `${name} reference category`).toBe(reference);
      expect(MANIFEST_BY_NAME.get(name)!.category, `${name} manifest category`).toBe(decorator);
    }
  });

  it('tier mirrors reference/index.ts availability', () => {
    for (const [key, ref] of Object.entries(referenceCommands)) {
      const name = normalize(key);
      const availability = (ref as { availability: string }).availability;
      expect(MANIFEST_BY_NAME.get(name)!.tier, `${name} tier`).toBe(availability);
    }
  });

  it('multiword mirrors COMPOUND_COMMANDS', () => {
    const manifestMultiword = COMMAND_MANIFEST.filter(e => e.multiword)
      .map(e => e.name)
      .sort();
    expect(manifestMultiword).toEqual([...COMPOUND_COMMANDS].sort());
    expect(manifestMultiword.length).toBe(22);
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

  it('upstreamOrExtension agrees with the LSP tier lists', () => {
    for (const name of REGISTRY) {
      const expected = HYPERSCRIPT_TIER.includes(name)
        ? 'upstream'
        : LOKASCRIPT_TIER.includes(name)
          ? 'extension'
          : 'unknown';
      expect(MANIFEST_BY_NAME.get(name)!.upstreamOrExtension, `${name} tier`).toBe(expected);
    }
  });

  it('the unknown set IS the audit TIER_UNCLASSIFIED set (both empty since 4.1)', () => {
    // The coupling that stops the two from drifting apart — which is the exact
    // disease this arc exists to cure. It did its job in step 4.1: classifying
    // the 23 required deleting each row HERE and in TIER_UNCLASSIFIED in one
    // diff. Both sides are now empty, so on its own this is a weak assertion —
    // the load is carried by the per-command equality test above and by §3's
    // 51/8 split, which a re-classification cannot satisfy by accident.
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
    expect(KEYWORD_GAPS.size).toBe(0); // step 4.3 — DONE, was 4
    expect(KEYWORD_NOT_ADVERTISED.size).toBe(1); // step 4.3 — DECIDED: pseudo-command
  });
});
