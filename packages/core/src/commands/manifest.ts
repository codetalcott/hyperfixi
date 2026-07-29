/**
 * The command manifest — Arc A's registry-of-record (step 2)
 *
 * Arc A of `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`; the brief is
 * `docs-internal/HANDOFF-command-arch-manifest.md`. The command set is
 * currently described in ~20 hand-maintained places; this file is the one that
 * the others will be migrated onto, one consumer per PR (steps 3 and 4).
 *
 * ## Status: consumed by nobody, deliberately
 *
 * Nothing imports this module yet. That is the point of step 2 — the manifest
 * becomes real and gated before anything depends on it, so its arrival carries
 * zero behavioral risk. Its gate lives in
 * `runtime/__tests__/command-manifest-audit.test.ts` (§7), beside the step-1
 * audit whose registry derivation and allowlists it reuses rather than
 * re-deriving.
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
 * exactly the slim-bundle-facing ones. If a factory map is ever wanted it is a
 * separate module, imported only by `runtime/runtime.ts`, which already imports
 * all 59 anyway. Every import below is `import type`, so this module erases to
 * a single array literal. The guard is
 * `npm run snapshot:bundle-size --prefix packages/core`, not inspection.
 *
 * ## Where each field's values come from
 *
 * | Field | Source | Gate |
 * | ----- | ------ | ---- |
 * | `name` | `new Runtime().getRegistry().getCommandNames()` | set equality, both directions |
 * | `category` | the implementation's `metadata.category` (what the registry serves) | exact, all 59 |
 * | `tier` | `reference/index.ts`'s `availability` | exact, all 59 |
 * | `upstreamOrExtension` | the LSP tier lists (`language-server/src/command-tiers.ts`) | `unknown` set === the audit's `TIER_UNCLASSIFIED` |
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
 * is vacant. Step 4.1 classifies the 23 `unknown` rows against an upstream
 * `_hyperscript` checkout; populating `metadata.compatibility` at the same time
 * would let this field become derived rather than absorbed.
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
 * `'unknown'` is not a placeholder for "we did not bother" — it is the 23-row
 * classification debt the step-1 audit pins as `TIER_UNCLASSIFIED`, and the
 * audit asserts these two sets are equal so step 4.1 has to move both together.
 * This is the arc's one *live* defect: `detectLokascriptFeatures()` warns only
 * for commands in `LOKASCRIPT_ONLY_COMMANDS`, so an extension missing from
 * that list produces no compatibility warning at all.
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
 * All 59 registered commands, in registry (sorted) order.
 *
 * Adding or removing a command means editing this array **and** the registry
 * list in the audit — the gate compares them as sets in both directions, so
 * neither can move alone.
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
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'beep',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'blur',
    category: 'execution',
    tier: 'lite-plus',
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'break',
    category: 'control-flow',
    tier: 'hybrid',
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'breakpoint',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'close',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'continue',
    category: 'control-flow',
    tier: 'hybrid',
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'copy',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'extension',
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
    upstreamOrExtension: 'extension',
    multiword: false,
  },
  {
    name: 'measure',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'extension',
    multiword: true,
  },
  {
    name: 'morph',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'extension',
    multiword: true,
  },
  {
    name: 'open',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'pick',
    category: 'utility',
    tier: 'full',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'push',
    category: 'navigation',
    tier: 'hybrid',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
    consolidationAliasOf: 'push',
    multiword: true,
  },
  {
    name: 'reset',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
    multiword: false,
  },
  {
    name: 'select',
    category: 'dom',
    tier: 'full',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'extension',
    multiword: false,
  },
  { name: 'show', category: 'dom', tier: 'lite', upstreamOrExtension: 'upstream', multiword: true },
  {
    name: 'start',
    category: 'animation',
    tier: 'full',
    upstreamOrExtension: 'unknown',
    multiword: true,
  },
  {
    name: 'swap',
    category: 'dom',
    tier: 'hybrid',
    upstreamOrExtension: 'unknown',
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
    upstreamOrExtension: 'unknown',
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
