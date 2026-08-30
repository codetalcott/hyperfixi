/**
 * The engine migration corpus — Arc 0's shared input set
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Two gates read this:
 * `ast-vocabulary.test.ts` (which node kinds each producer emits) and
 * `ast-equivalence.test.ts` (whether a refactor changed any parse). They must
 * agree on the input set or the second stops covering the first, so the corpus
 * lives here rather than being copied into both.
 *
 * ## Where it comes from
 *
 * Most of it is DERIVED: every registered command's own `metadata.examples`,
 * read off the runtime registry. That is deliberate — a hand-listed corpus
 * would rot the way every other hand-maintained list in this repo has, whereas
 * this one grows the moment a command is added, and
 * `ast-vocabulary.test.ts` fails if a command's examples ever go empty.
 *
 * The rest is a fixed set of FEATURE-level sources, because not one command
 * example is an event handler, a behavior or a `def`. Without them the entire
 * statement half of the AST would be outside both gates — the same
 * "the construct is outside the corpus" blind spot the multilingual work has
 * hit repeatedly.
 */

import { createHash } from 'node:crypto';
import { parse } from '../parser';
import { Runtime } from '../../runtime/runtime';

/**
 * Feature- and block-level sources: handlers, filters, modifiers, blocks,
 * scopes, and one instance of each expression shape the parser can emit.
 *
 * Hand-maintained on purpose, and small on purpose. Adding a row is cheap;
 * what it must never become is a second copy of the command set.
 */
export const FEATURE_SOURCES: readonly string[] = [
  // Handlers, filters, modifiers
  'on click toggle .active',
  'on click or keyup toggle .active',
  'on click from .btn add .x to me',
  'on click[shiftKey] log "shift"',
  'on click debounced at 200ms log "d"',
  'on mouseenter halt the event',
  'on load fetch /api then put it into me',

  // Top-level features
  'init log "ready" end',
  'def greet(name) return "hi " + name end',
  'behavior Toggleable(cls) on click toggle .{cls} on me end end',

  // Blocks
  'on click if true then add .a else add .b end',
  'on click repeat 3 times log "x" end',
  'on click for item in [1, 2, 3] log item end',
  'on click repeat while false log "never" end',
  'on click tell #panel show end',
  'on click js return 1 end',

  // Scopes
  'on click set :count to 1 then increment :count',
  'on click set $g to 1 then log $g',

  // Expression shapes
  "on click log #target's innerHTML",
  'on click log first .item',
  'on click log 1 + 2 * 3 and true or false',
  'on click log "a" is not "b"',
  'on click log [1, 2] and {a: 1}',
  'on click log `t ${1}`',
  'on click log @data-x of me',
  'on click log the value of #inp as Int',
  'on click log 5 is between 1 and 10',
  'on click wait 10ms then log "after"',
];

/** One documented example, tagged with the command that documents it. */
export interface CommandExample {
  readonly command: string;
  readonly source: string;
}

/**
 * Every registered command's own `metadata.examples`, in registry order.
 *
 * Constructs a `Runtime` to read the registry rather than importing the
 * manifest, because the manifest is data-only by design (it carries no
 * implementations, so it cannot reach `metadata`).
 */
export function commandExamples(): CommandExample[] {
  const registry = new Runtime().getRegistry();
  const out: CommandExample[] = [];
  for (const command of registry.getCommandNames()) {
    for (const example of registry.getImplementation(command)?.metadata?.examples ?? []) {
      if (typeof example === 'string' && example.trim()) out.push({ command, source: example });
    }
  }
  return out;
}

/** Commands the registry knows about but that document no example. */
export function commandsWithoutExamples(): string[] {
  const registry = new Runtime().getRegistry();
  return registry
    .getCommandNames()
    .filter(name => !(registry.getImplementation(name)?.metadata?.examples?.length ?? 0));
}

/** The full corpus both gates read: feature sources plus every command example. */
export function corpusSources(): string[] {
  return [...FEATURE_SOURCES, ...commandExamples().map(e => e.source)];
}

// ===========================================================================
// Fingerprinting — read by ast-equivalence.test.ts and its baseline generator
// ===========================================================================

/**
 * Deterministic serialization: keys sorted, `undefined` dropped, arrays and
 * primitives untouched. Cycles are impossible in a parse result, so no cycle
 * guard — and if one ever appeared, the resulting throw is a finding, not a
 * flake to paper over.
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (record[key] === undefined) continue;
    out[key] = canonicalize(record[key]);
  }
  return out;
}

/**
 * The recorded shape of one source's parse. `ok: false` is a legitimate,
 * pinned outcome — 19 documented command examples do not parse (see
 * `ast-vocabulary.test.ts`), and a refactor that accidentally FIXES one is a
 * change this gate should report just as loudly as one that breaks a parse.
 */
export function fingerprint(source: string): string {
  let result: { success: boolean; node?: unknown; errors?: unknown[] };
  try {
    result = parse(source, {}) as typeof result;
  } catch (error) {
    return `throw:${createHash('sha1')
      .update(String((error as Error)?.message ?? error))
      .digest('hex')
      .slice(0, 12)}`;
  }

  if (!result.success) {
    // Error MESSAGES are prose and get reworded; the count is the stable
    // signal, and the vocabulary test pins which sources are in this state.
    return `fail:${result.errors?.length ?? 0}`;
  }

  const canonical = JSON.stringify(canonicalize(result.node));
  return `ok:${createHash('sha1').update(canonical).digest('hex').slice(0, 12)}`;
}
