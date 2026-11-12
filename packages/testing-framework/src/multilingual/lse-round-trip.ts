/**
 * LSE round-trip gate: what LSE's two encodings do to real hyperscript.
 *
 * LSE (bracket syntax and protocol JSON, `@lokascript/intent`) carries commands
 * and simple handlers, not whole programs. The rule at its boundary is that a
 * node it cannot carry in full is REFUSED (`LossyEncodingError`), never written
 * in part. Until 2026-11-12 nothing checked that: on these same sources,
 * protocol JSON came back with a command, a role or a value missing 71 times
 * and could not be written at all 244 times, and bracket syntax lost something
 * 537 times, all without an error.
 *
 * Per source (the command-shape cases: every script in upstream's suite and the
 * reference examples that the engine reads), per encoding:
 *
 *   semantic.parse(source, 'en')            the node
 *   toProtocolJSON / renderExplicit         refused, or written
 *   fromProtocolJSON / parseCompound        read back
 *   scoreNodes(node, readBack)              the multilingual gate's scorer
 *
 * and one of four outcomes, best first:
 *
 *   faithful   reads back as the same commands, roles, role types and values
 *   type-only  the same commands and values; a role's value TYPE differs. In
 *              JSON that is the documented flattening of a property path to an
 *              expression; in bracket syntax, which is untyped, the parser's
 *              classification of a bare value.
 *   refused    the writer threw LossyEncodingError
 *   silent     written, and a command, a value or any other field is missing or
 *              added on the way back (the scorer's report, and `structure()`
 *              for the fields the scorer does not read), or the reader rejects
 *              the writer's own output
 *
 * `silent` is never allowed. The baseline lists the `type-only` and `refused`
 * cases; the gate fails on a case worse than listed and on one better than
 * listed (regenerate: tools/regen-lse-round-trip-baseline.ts).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LossyEncodingError,
  extractValue,
  fromProtocolJSON,
  parseCompound,
  renderExplicit,
  toProtocolJSON,
  type SemanticNode as IntentNode,
  type SemanticValue,
} from '@lokascript/intent';
import { parse } from '@lokascript/semantic';
import { scoreNodes } from '@lokascript/semantic/fidelity';

export const ENCODINGS = ['json', 'bracket'] as const;
export type Encoding = (typeof ENCODINGS)[number];

/** Best first: a higher index is a worse outcome. */
export const OUTCOMES = ['faithful', 'type-only', 'refused', 'silent'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface LseCaseResult {
  id: string;
  source: string;
  family: string;
  /** Absent when semantic does not parse the source (not this gate's subject). */
  outcomes?: Record<Encoding, Outcome>;
  /** For a refusal, what the encoding has no place for; for `silent`, what was lost. */
  detail?: Partial<Record<Encoding, string>>;
}

/** The non-faithful cases, by encoding and outcome; ids sorted. */
export interface LseRoundTripBaseline {
  description: string;
  cases: number;
  parsed: number;
  counts: Record<Encoding, Record<Outcome, number>>;
  entries: Record<Encoding, { 'type-only': string[]; refused: string[] }>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const CASES_PATH = path.join(here, 'command-shapes.cases.json');
export const BASELINE_PATH = path.join(here, '..', '..', 'baselines', 'lse-round-trip.json');

interface Case {
  id: string;
  source: string;
  family: string;
}

// Fields that hold no part of a script's meaning, and the fields that say what
// TYPE a value is (compared by the scorer; here a value is its text).
const META_FIELDS = new Set(['metadata', 'diagnostics', 'position', 'implicit', 'quoted']);
const TYPE_FIELDS = new Set([
  'type',
  'dataType',
  'selectorKind',
  'access',
  'object',
  'property',
  'raw',
  'value',
  'name',
  'enabled',
]);

function holdsNothing(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (v instanceof Map) return v.size === 0;
  return typeof v === 'object' && Object.keys(v as object).length === 0;
}

function isValue(v: object): v is SemanticValue {
  return typeof (v as { type?: unknown }).type === 'string' && !('kind' in v) && !('roles' in v);
}

/**
 * A node as plain data with every field kept and each value reduced to its
 * text. Two nodes with the same structure are the same script up to value
 * types. The scorer does not see every field (it scored `add .a to <p/> in me`
 * faithful with the `in me` gone), so this is the gate's own check that nothing
 * was dropped: any field a writer skips shows here.
 */
export function structure(v: unknown): unknown {
  if (v instanceof Map) {
    return Object.fromEntries(
      [...v]
        .map(([k, x]) => [String(k), structure(x)] as const)
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    );
  }
  if (Array.isArray(v)) return v.map(structure);
  if (v === null || typeof v !== 'object') return v;
  const out: Record<string, unknown> = {};
  const value = isValue(v);
  if (value) {
    out.$text = v.type === 'flag' ? `${v.enabled ? '+' : '~'}${v.name}` : String(extractValue(v));
  }
  for (const key of Object.keys(v).sort()) {
    if (META_FIELDS.has(key) || (value && TYPE_FIELDS.has(key))) continue;
    const field = (v as Record<string, unknown>)[key];
    if (!holdsNothing(field)) out[key] = structure(field);
  }
  return out;
}

export function grade(
  reference: unknown,
  readBack: unknown
): { outcome: Outcome; detail?: string } {
  const report = scoreNodes(reference, readBack);
  const lost = [
    ...report.missingActions.map(a => `-${a}`),
    ...report.spuriousActions.map(a => `+${a}`),
    ...report.missingValues,
  ];
  if (lost.length > 0) return { outcome: 'silent', detail: lost.join(', ') };
  if (JSON.stringify(structure(reference)) !== JSON.stringify(structure(readBack))) {
    return { outcome: 'silent', detail: 'a field or a value text differs (structure())' };
  }
  return { outcome: report.faithful ? 'faithful' : 'type-only' };
}

function attempt(run: () => { outcome: Outcome; detail?: string }): {
  outcome: Outcome;
  detail?: string;
} {
  try {
    return run();
  } catch (error) {
    if (error instanceof LossyEncodingError) {
      return { outcome: 'refused', detail: error.losses.join(', ') };
    }
    // The reader rejected what the writer wrote, or a writer crashed: not a refusal.
    return { outcome: 'silent', detail: error instanceof Error ? error.message : String(error) };
  }
}

export function loadCases(): Case[] {
  return (JSON.parse(readFileSync(CASES_PATH, 'utf8')) as { cases: Case[] }).cases;
}

export function runLseRoundTrip(cases: readonly Case[] = loadCases()): LseCaseResult[] {
  return cases.map(c => {
    const base = { id: c.id, source: c.source, family: c.family };
    let node: IntentNode;
    try {
      node = parse(c.source, 'en') as unknown as IntentNode;
    } catch {
      return base;
    }
    if (!node) return base;

    const json = attempt(() => {
      // Through text, as it would cross a wire.
      const wire = JSON.parse(JSON.stringify(toProtocolJSON(node)));
      return grade(node, fromProtocolJSON(wire));
    });
    const bracket = attempt(() => grade(node, parseCompound(renderExplicit(node))));

    const detail: Partial<Record<Encoding, string>> = {};
    if (json.detail) detail.json = json.detail;
    if (bracket.detail) detail.bracket = bracket.detail;
    return { ...base, outcomes: { json: json.outcome, bracket: bracket.outcome }, detail };
  });
}

export function baselineFrom(
  results: readonly LseCaseResult[],
  description: string
): LseRoundTripBaseline {
  const zero = (): Record<Outcome, number> => ({
    faithful: 0,
    'type-only': 0,
    refused: 0,
    silent: 0,
  });
  const counts = { json: zero(), bracket: zero() };
  const entries = {
    json: { 'type-only': [] as string[], refused: [] as string[] },
    bracket: { 'type-only': [] as string[], refused: [] as string[] },
  };
  let parsed = 0;
  for (const r of results) {
    if (!r.outcomes) continue;
    parsed++;
    for (const encoding of ENCODINGS) {
      const outcome = r.outcomes[encoding];
      counts[encoding][outcome]++;
      if (outcome === 'type-only' || outcome === 'refused') entries[encoding][outcome].push(r.id);
    }
  }
  for (const encoding of ENCODINGS) {
    entries[encoding]['type-only'].sort();
    entries[encoding].refused.sort();
  }
  return { description, cases: results.length, parsed, counts, entries };
}

export function loadBaseline(): LseRoundTripBaseline {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as LseRoundTripBaseline;
}

/** The outcome the baseline expects for a case: listed, or faithful. */
export function expectedOutcome(
  baseline: LseRoundTripBaseline,
  encoding: Encoding,
  id: string
): Outcome {
  if (baseline.entries[encoding].refused.includes(id)) return 'refused';
  if (baseline.entries[encoding]['type-only'].includes(id)) return 'type-only';
  return 'faithful';
}

export interface LseDiff {
  /** Written with something missing: never allowed, listed or not. */
  silent: string[];
  /** Worse than the baseline says (faithful → type-only or refused, type-only → refused). */
  worse: string[];
  /** Better than the baseline says: regenerate it. */
  better: string[];
  /** Baseline ids that are no longer cases. */
  orphaned: string[];
}

export function diffBaseline(
  results: readonly LseCaseResult[],
  baseline: LseRoundTripBaseline
): LseDiff {
  const diff: LseDiff = { silent: [], worse: [], better: [], orphaned: [] };
  const ids = new Set(results.map(r => r.id));
  const expected = (encoding: Encoding): Map<string, Outcome> => {
    const m = new Map<string, Outcome>();
    for (const id of baseline.entries[encoding]['type-only']) m.set(id, 'type-only');
    for (const id of baseline.entries[encoding].refused) m.set(id, 'refused');
    return m;
  };
  for (const encoding of ENCODINGS) {
    const want = expected(encoding);
    for (const id of want.keys()) if (!ids.has(id)) diff.orphaned.push(`${encoding} ${id}`);
    for (const r of results) {
      if (!r.outcomes) continue;
      const got = r.outcomes[encoding];
      const was = want.get(r.id) ?? 'faithful';
      const line = `${encoding} ${r.id} ${JSON.stringify(r.source.replace(/\s+/g, ' ').slice(0, 80))}`;
      if (got === 'silent') {
        diff.silent.push(`${line}: ${r.detail?.[encoding] ?? ''}`);
      } else if (OUTCOMES.indexOf(got) > OUTCOMES.indexOf(was)) {
        diff.worse.push(
          `${line}: ${was} → ${got}${got === 'refused' ? ` (${r.detail?.[encoding] ?? ''})` : ''}`
        );
      } else if (OUTCOMES.indexOf(got) < OUTCOMES.indexOf(was)) {
        diff.better.push(`${line}: ${was} → ${got}`);
      }
    }
  }
  return diff;
}
