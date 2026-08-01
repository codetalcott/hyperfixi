/**
 * The command manifest — Arc A's registry-of-record (step 2)
 *
 * Arc A of `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`; the brief is
 * `docs-internal/archive/HANDOFF-command-arch-manifest.md`. The command set is
 * currently described in ~20 hand-maintained places; this file is the one that
 * the others will be migrated onto, one consumer per PR (steps 3 and 4).
 *
 * ## Status: the four mechanical consumers are migrated (step 3)
 *
 * Step 2 landed this file consumed by nobody, deliberately — the manifest
 * became real and gated before anything depended on it, so its arrival carried
 * zero behavioral risk. Step 3 then pointed the four lists that already agreed
 * with it (the brief's Claim 2) at this array:
 *
 * | Consumer | Relationship | Where |
 * | -------- | ------------ | ----- |
 * | `parser/parser-constants.ts` `COMMANDS` | **driven** — the seed IS the manifest names + the parser-only `for` | `parser-constants.ts` |
 * | `runtime/runtime.ts` registration | **driven** — one loop over the manifest, `COMMAND_FACTORIES` supplies the factory per name | `runtime.ts` |
 * | `commands/index.ts` factory aliases | **checked** — re-export statements cannot be generated without pinning all 59 (Finding 9) | audit §2 |
 * | `reference/index.ts` + `metadata.ts` counts | **checked** — the manifest is now `verify:reference`'s spine | `scripts/verify-reference-data.ts` |
 *
 * Finding 6 is honored by the first two rows together: the static parser seed
 * and the registration-time `COMMANDS.add` were two halves of one mechanism,
 * and the manifest now feeds both halves rather than the runtime patching the
 * parser at construction time. `command-adapter.ts`'s `COMMANDS.add` stays —
 * it is what teaches the parser about commands registered from OUTSIDE the
 * manifest (plugins, tests, custom bundles), and the audit pins that.
 *
 * The gate lives in `runtime/__tests__/command-manifest-audit.test.ts` (§7),
 * beside the step-1 audit whose registry derivation and allowlists it reuses
 * rather than re-deriving.
 *
 * ## Data-only, and why that is load-bearing (Finding 9)
 *
 * There is deliberately **no `factory` field**. An object literal that
 * references a command factory pins it, so nothing downstream can be shaken
 * out. Measured with esbuild `--bundle --minify` over a four-command manifest
 * whose consumer reads only the names:
 *
 * ```text
 * data-only     ({name, category})           →     177 bytes
 * factory-carrying ({name, category, factory}) →  38,395 bytes
 * ```
 *
 * At 59 commands a `factory` field would pull the entire command set into any
 * bundle that merely wants the name list — and the intended consumers
 * (`template-capabilities`, the bundle generator, the LSP tier lists) are
 * exactly the slim-bundle-facing ones. Every import below is `import type`, so
 * this module erases to two plain data literals. The guard is
 * `npm run snapshot:bundle-size --prefix packages/core`, not inspection.
 *
 * Step 3's manifest-driven registration loop needs a name → factory map, and
 * that map lives in `runtime/runtime.ts` rather than here for exactly this
 * reason: `runtime.ts` already imports every command implementation, so the
 * pinning it causes is already paid there and nowhere else.
 * `parser-constants.ts` imports the manifest for its names and gets no
 * factories with them — which is the whole point of the split: a names-only
 * consumer must never pull the command implementations in behind them. The
 * data payload has the same hazard one level down; see {@link COMMAND_NAMES}.
 *
 * ## Where each field's values come from
 *
 * | Field | Source | Gate |
 * | ----- | ------ | ---- |
 * | `name` | `new Runtime().getRegistry().getCommandNames()` | set equality, both directions |
 * | `category` | the implementation's `metadata.category` (what the registry serves) | exact, all 59 |
 * | `tier` | `reference/index.ts`'s `availability` | exact, all 59 |
 * | `upstreamOrExtension` | the LSP tier lists (`language-server/src/command-tiers.ts`) | per-command equality, all 59; plus `unknown` set === the audit's `TIER_UNCLASSIFIED` (both empty since step 4.1) |
 * | `consolidationAliasOf` | `metadata.aliases`, resolved by shared implementation identity | exact, the 4 pairs |
 * | `multiword` | `parser-constants.COMPOUND_COMMANDS` | set equality |
 *
 * Every field is a **checked mirror** of a source that already exists, not a
 * fresh hand-maintained copy — which is the whole point: a manifest that could
 * drift from the registry would be the twenty-first place, not the fix.
 *
 * ## Two measurements taken while authoring this file
 *
 * **1. `category` has two sources, and they disagree on exactly 2 of 59.**
 * `reference/index.ts` carries a `category:` per command (validated by
 * `scripts/verify-reference-data.ts` against its own 13-name list), and the
 * `@command({ category })` decorator statics carry another. Nothing compared
 * them before now. Measured: 57 agree; `send` and `trigger` are `'events'` in
 * the reference and `'event'` in the decorator. The root cause is not a typo —
 * there are **two independent `CommandCategory` unions**, differing in two
 * members:
 *
 * ```text
 * reference/index.ts        …| 'events' |…            (no 'storage')
 * types/command-metadata.ts …| 'event'  | 'storage' |…
 * ```
 *
 * This manifest follows the **decorator/registry** union, because the manifest
 * mirrors what the engine serves and `types/command-metadata.ts` is that
 * union. The reference-side divergence is recorded and pinned in the audit
 * (`CATEGORY_DOC_DISAGREEMENTS`) rather than silently resolved here —
 * reconciling the two unions is a rename with LSP and docs reach, so it wants
 * its own decision, like Finding 7's synonym aliases.
 *
 * **2. `upstreamOrExtension` has a typed slot that is empty (Finding 8,
 * sharpened).** `CommandMetadata` already declares
 * `compatibility?: 'standard' | 'lokascript-extension' | 'experimental'`, and
 * the `@meta` decorator forwards it — but **all 59 commands leave it unset**.
 * So the fact genuinely is recorded nowhere except the LSP tier lists, as the
 * brief found; what is new is that the natural home for it already exists and
 * is vacant.
 *
 * **Step 4.1 decided NOT to populate it, deliberately.** The classification
 * stays absorbed from the tier lists and mirrored here under assertion. Three
 * reasons, in order of weight:
 *
 * 1. Arc A's non-goals fence the decorator statics off as **Arc B** ("the
 *    manifest is a sibling of `metadata`, not a replacement"). Populating
 *    `compatibility` is that arc's work, not this one's.
 * 2. The review artifact. Step 4.1 is 23 per-command judgment calls; they are
 *    reviewable as one annotated table in one file, and unreviewable as a
 *    one-line decorator change spread over 59 implementation files.
 * 3. The domains do not line up. `compatibility` offers `'experimental'`,
 *    which has no counterpart here, and this field offers `'unknown'`, which
 *    has none there. Populating it would force a second, undiscussed decision
 *    about what `'experimental'` means inside a PR about upstream parity.
 *
 * Nothing is lost by waiting: the classification is now **complete**, so Arc B
 * can invert the direction (registry-derived rather than tier-list-absorbed)
 * by copying 59 finished values, which it could not have done while 23 of them
 * read `'unknown'`.
 *
 * ## Not in this file
 *
 * - **The eleven synonym aliases** (`flip`, `fire`, `goto`, …) in
 *   `COMMAND_ALIASES`. `consolidationAliasOf` is Finding 7's *first* mechanism
 *   only — the four `metadata.aliases` that back real command names the parser
 *   accepts. The synonyms work in the slim bundles and are rejected by the full
 *   parser; that divergence is a behavior change deferred out of the arc.
 * - **The parse.** `multiword` records *that* a command has multi-word forms
 *   (mirroring `COMPOUND_COMMANDS`); `MULTI_WORD_PATTERNS` and the command
 *   parsers keep owning *how* they parse.
 */

import type { CommandCategory } from '../types/command-metadata';

/**
 * Which prebuilt browser bundle first ships a command, mirroring
 * `reference/index.ts`'s `BundleAvailability`.
 *
 * NOTE this is **not** the same partition as
 * `bundle-generator/template-capabilities.ts`'s
 * `AVAILABLE_COMMANDS` / `FULL_RUNTIME_ONLY_COMMANDS`, and neither derives
 * from the other. Under the natural mapping (`full` ↔ full-runtime-only) the
 * two disagree on **16 of 59** rows — `beep`/`copy`/`js`/`take` are `full`
 * here yet generator-available, while `async`/`fetch`/`make`/`swap` are
 * `hybrid` here yet absent from the capability lists entirely. They answer
 * different questions ("which shipped bundle has it" vs "can the generator
 * emit it into a lite bundle"), so step 4.2 must treat them as two facts, not
 * one fact stored twice.
 */
export type CommandTier = 'lite' | 'lite-plus' | 'hybrid' | 'full';

/**
 * Whether a command exists in upstream `_hyperscript` or is a LokaScript
 * extension.
 *
 * **`'unknown'` is now unused — step 4.1 classified all 59 (51 upstream, 8
 * extension).** It is kept in the union rather than deleted so the audit can go
 * on asserting the empty-set coupling described below; a row that reappears as
 * `'unknown'` fails the gate rather than being unrepresentable, which keeps the
 * failure message about the classification instead of about a type.
 *
 * It was a 23-row classification debt, pinned by the step-1 audit as
 * `TIER_UNCLASSIFIED`, and the audit asserts the manifest's `'unknown'` set and
 * that set are **equal** — so step 4.1 had to empty both in one diff. That debt
 * was the arc's one *live* defect: `detectLokascriptFeatures()` scans only
 * `LOKASCRIPT_ONLY_COMMANDS` and `language-server/src/server.ts` turns each hit
 * into a `DiagnosticSeverity.Error`, so an extension missing from that list
 * produced no diagnostic at all.
 *
 * The values are measured against the published original engine, not recalled;
 * `language-server/src/command-tiers.ts` carries the per-command probe and the
 * oracle version, and is the source this field mirrors.
 */
export type UpstreamOrExtension = 'upstream' | 'extension' | 'unknown';

/** One command, as the manifest records it. Data only — see the file header. */
export interface CommandManifestEntry {
  /** The name the registry dispatches on, and the parser recognizes. */
  readonly name: string;
  /** `metadata.category` as the registry serves it (see measurement 1). */
  readonly category: CommandCategory;
  /** Earliest prebuilt bundle that ships it. */
  readonly tier: CommandTier;
  /** Upstream `_hyperscript`, LokaScript extension, or not yet classified. */
  readonly upstreamOrExtension: UpstreamOrExtension;
  /**
   * For the four consolidated commands, the name of the implementation this
   * one is an alias of. Both names are real, registered, and parse; they share
   * one implementation instance via `metadata.aliases`
   * (`runtime/command-adapter.ts`). Absent for the other 55.
   */
  readonly consolidationAliasOf?: string;
  /** Has multi-word forms — mirrors `parser-constants.COMPOUND_COMMANDS`. */
  readonly multiword: boolean;
}

/**
 * Just the names, for consumers that want the command SET and none of the
 * facts about it.
 *
 * ## Why this is a second literal and not `COMMAND_MANIFEST.map(e => e.name)`
 *
 * Same hazard as Finding 9's `factory` field, one level down: a `.map()` over
 * the entries references the entries, so the whole rich array — `category`,
 * `tier`, `upstreamOrExtension`, `multiword` for 59 commands — survives into
 * any bundle that wanted a name list. Measured on `hyperfixi-hx.js` (18 KB
 * gzipped, a hybrid-parser bundle with no command registry at all) when
 * `parser-constants.ts` derived its `COMMANDS` seed that way in step 3:
 *
 * ```text
 * names via COMMAND_MANIFEST.map()   raw 73.3 KB  (+7.5%, over the ±5% gate)
 * names via COMMAND_NAMES            raw 69.1 KB  (+0.9%)
 * ```
 *
 * The entries are shaken out entirely by the second form, because nothing in
 * that bundle's graph mentions them.
 *
 * ## This is not a hand-maintained second copy
 *
 * The audit asserts the two are equal **as ordered lists**, so a command added
 * to one and not the other fails the gate rather than drifting — which is the
 * only property that matters. It is the same trade Finding 9 already forced for
 * `commands/index.ts`: an explicit list, gated at tolerance 0, because
 * generating it would pin what must stay shakeable.
 */
export const COMMAND_NAMES: readonly string[] = [
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
];

/**
 * All 59 registered commands, in registry (sorted) order.
 *
 * Adding or removing a command means editing this array, {@link COMMAND_NAMES}
 * above, **and** the registry list in the audit — the gate compares all three
 * in both directions, so none can move alone.
 */
export const COMMAND_MANIFEST: readonly CommandManifestEntry[] = [
  { name: 'add', category: 'dom', tier: 'lite', upstreamOrExtension: 'upstream', multiword: true },
  {
    name: 'append',
    category: 'content',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'async',
    category: 'advanced',
    tier: 'hybrid',
    upstreamOrExtension: 'extension',
    multiword: false,
  },
  {
    name: 'beep',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'extension',
    multiword: false,
  },
  {
    name: 'blur',
    category: 'execution',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'break',
    category: 'control-flow',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'breakpoint',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'call',
    category: 'execution',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'clear',
    category: 'data',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'close',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'continue',
    category: 'control-flow',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'copy',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'extension',
    multiword: false,
  },
  {
    name: 'decrement',
    category: 'data',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    consolidationAliasOf: 'increment',
    multiword: false,
  },
  {
    name: 'default',
    category: 'data',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'empty',
    category: 'dom',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'exit',
    category: 'control-flow',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'fetch',
    category: 'async',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'focus',
    category: 'execution',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'get',
    category: 'data',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'go',
    category: 'navigation',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'halt',
    category: 'control-flow',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  { name: 'hide', category: 'dom', tier: 'lite', upstreamOrExtension: 'upstream', multiword: true },
  {
    name: 'if',
    category: 'control-flow',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'increment',
    category: 'data',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'install',
    category: 'behaviors',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'js',
    category: 'advanced',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'log',
    category: 'utility',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'make',
    category: 'dom',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'measure',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'morph',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'open',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'pick',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'prepend',
    category: 'content',
    tier: 'hybrid',
    upstreamOrExtension: 'extension',
    multiword: false,
  },
  {
    name: 'process',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'extension',
    multiword: true,
  },
  {
    name: 'pseudo-command',
    category: 'execution',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'push',
    category: 'navigation',
    tier: 'hybrid',
    upstreamOrExtension: 'extension',
    multiword: true,
  },
  { name: 'put', category: 'dom', tier: 'lite', upstreamOrExtension: 'upstream', multiword: true },
  {
    name: 'remove',
    category: 'dom',
    tier: 'lite',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'render',
    category: 'templates',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'repeat',
    category: 'control-flow',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'replace',
    category: 'navigation',
    tier: 'hybrid',
    upstreamOrExtension: 'extension',
    consolidationAliasOf: 'push',
    multiword: true,
  },
  {
    name: 'reset',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'return',
    category: 'control-flow',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'scroll',
    category: 'navigation',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'select',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'send',
    category: 'event',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    consolidationAliasOf: 'trigger',
    multiword: true,
  },
  { name: 'set', category: 'data', tier: 'lite', upstreamOrExtension: 'upstream', multiword: true },
  {
    name: 'settle',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  { name: 'show', category: 'dom', tier: 'lite', upstreamOrExtension: 'upstream', multiword: true },
  {
    name: 'start',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'swap',
    category: 'dom',
    tier: 'hybrid',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'take',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'tell',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'throw',
    category: 'control-flow',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'toggle',
    category: 'dom',
    tier: 'lite',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'transition',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
  {
    name: 'trigger',
    category: 'event',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: true,
  },
  {
    name: 'unless',
    category: 'control-flow',
    tier: 'full',
    upstreamOrExtension: 'extension',
    consolidationAliasOf: 'if',
    multiword: false,
  },
  {
    name: 'wait',
    category: 'async',
    tier: 'lite-plus',
    upstreamOrExtension: 'upstream',
    multiword: false,
  },
];

/**
 * Four commands are SPELLED differently in the two published lists than the
 * name they register under, mapped here (lowercased, `_`/`Cmd` suffixes already
 * stripped) → the registered name.
 *
 * `commands/index.ts` exports `createPushUrlCommand as pushUrl` and
 * `reference/index.ts` keys the same command `pushUrl`, but the registry
 * dispatches it as `push` (the parsing name — `push url "/x"` parses,
 * `pushUrl "/x"` does not; that gap was the Finding 5 ghost, #810). Both
 * spellings are **public API** — the export alias is part of
 * `@hyperfixi/core/commands` and the reference key is part of the docs surface
 * — so they are normalized here rather than renamed.
 *
 * This map is exported because two step-3 consumers need the same
 * normalization and a second copy would be the twenty-first hand-maintained
 * place this arc exists to remove: the audit
 * (`runtime/__tests__/command-manifest-audit.test.ts`) and
 * `scripts/verify-reference-data.ts`. It is a separate export from
 * `COMMAND_MANIFEST` so a names-only consumer shakes it out.
 */
export const COMMAND_LIST_SPELLINGS: Readonly<Record<string, string>> = {
  processpartials: 'process',
  pushurl: 'push',
  replaceurl: 'replace',
  pseudo: 'pseudo-command',
};

/**
 * Normalize a name as `commands/index.ts` or `reference/index.ts` spells it to
 * the name the registry dispatches on: strip the `_` suffix that keeps
 * reserved words legal identifiers (`if_`, `break_`), strip the `Cmd` suffix
 * that does the same for `default`/`processPartials`, lowercase, then apply
 * {@link COMMAND_LIST_SPELLINGS}.
 */
export function toRegisteredName(listSpelling: string): string {
  const lower = listSpelling.replace(/_$/, '').replace(/Cmd$/, '').toLowerCase();
  return COMMAND_LIST_SPELLINGS[lower] ?? lower;
}
