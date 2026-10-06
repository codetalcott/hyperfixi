/**
 * The command-shape gate — what a translation silently drops
 * -----------------------------------------------------------
 * Every other multilingual gate reads the corpus or a generated matrix of
 * value shapes. Neither holds the shapes a page author writes around the
 * values: a second class ref, a `when` filter, `else if`, `break`, `catch`, a
 * second feature after the first `end`. Semantic's parser matches a prefix of
 * such a script and leaves the rest unconsumed; `translate()` returned the
 * prefix as though it were the whole.
 *
 * A CASE is one script a page author could write: every `_` attribute and
 * hyperscript script body in the vendored upstream suite, core's reference
 * examples and its hover examples, that the engine parses
 * (`command-shapes.cases.json`, harvested by tools/harvest-command-shapes.ts).
 *
 * ## Lanes
 *   - `en`   `translate(src, 'en', 'en')`;
 *   - `<L>`  each of 23 languages: `translate(translate(src, 'en', L), L, 'en')`.
 *
 * ## Oracle
 * The engine's parse of the lane's English equals its parse of the source,
 * positions stripped, after the named EQUIVALENCES (each rewrites both parses,
 * and each is pinned by a run on the engine and on upstream in
 * command-shapes.equivalences.test.ts). Node only, no browser: the same engine
 * reads both strings, so equal parses run the same.
 *
 * A (case, lane) pair is one of
 *   - `pass`     the parses are equal;
 *   - `refused`  a `translate` call threw: the caller was told;
 *   - `silent`   it returned English that parses differently, or that the
 *                engine rejects, and nothing said so.
 *
 * ## The baseline
 * `baselines/command-shapes.json` lists, per case, the lanes that are refused
 * and the lanes that are silent. The gate fails on a pair that does not pass
 * and is not listed, on a listed pair that passes, on a pair listed refused
 * that went silent, and on a pair listed silent that is refused now (prune
 * it): so both lists only shrink. Cases in a LOUD family (shapes semantic does
 * not carry yet) carry their reason; the gate fails when one starts to pass.
 * Regenerate with tools/regen-command-shapes-baseline.ts.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOREIGN_LANGUAGES } from './value-matrix';

const here = path.dirname(fileURLToPath(import.meta.url));

export const CASES_PATH = path.join(here, 'command-shapes.cases.json');
export const BASELINE_PATH = path.resolve(here, '../../baselines/command-shapes.json');
const RUNNER_PATH = path.resolve(here, '../../../engine/upstream-suite/run.mjs');

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface CommandShapeCase {
  /** A hash of the source with its whitespace collapsed: stable across re-harvests. */
  id: string;
  source: string;
  /** `upstream:<file>`, `reference:<command>`, `reference-pattern:<name>` or `hover:<keyword>`. */
  origin: string;
  /** What the source's origin tests: the upstream file's stem, or the documented keyword. */
  family: string;
}

export interface CommandShapeCases {
  description: string;
  /** The vendored upstream version the cases were harvested from. */
  upstream: string;
  cases: CommandShapeCase[];
}

/** The key two sources share when they differ only in whitespace. */
export const collapse = (source: string): string => source.replace(/\s+/g, ' ').trim();

/** The upstream version `upstream-suite/run.mjs` runs (its VENDORED constant). */
export function vendoredUpstreamVersion(): string {
  const match = /const VENDORED = '([^']+)'/.exec(readFileSync(RUNNER_PATH, 'utf8'));
  if (!match?.[1]) throw new Error(`no VENDORED constant in ${RUNNER_PATH}`);
  return match[1];
}

export function loadCommandShapeCases(): CommandShapeCases {
  return JSON.parse(readFileSync(CASES_PATH, 'utf8')) as CommandShapeCases;
}

// ---------------------------------------------------------------------------
// Lanes
// ---------------------------------------------------------------------------

/** Every lane, in report order: English, then the 23 languages. */
export const LANES: readonly string[] = ['en', ...FOREIGN_LANGUAGES];

export type Outcome = 'pass' | 'refused' | 'silent';

/** How a silent lane differs: what the report and the triage group by. */
export type SilentKind =
  /** The engine rejects the lane's English. */
  | 'rejected'
  /** A command or feature the source has is missing, or one it lacks is there. */
  | 'commands'
  /** The same commands and features, parsed differently. */
  | 'differs';

export interface LaneResult {
  outcome: Outcome;
  /** The lane's English (a silent lane), or the error's first line (a refused one). */
  detail?: string;
  kind?: SilentKind;
}

export interface CaseResult {
  id: string;
  /** The LOUD family the case belongs to (see LOUD), if any. */
  loud?: string;
  /** The command and feature node types of the source's engine parse, for the report. */
  statements: string[];
  lanes: Record<string, LaneResult>;
}

// ---------------------------------------------------------------------------
// The oracle
// ---------------------------------------------------------------------------

/**
 * What the engine's parse carries that is not meaning: where a node sits, and
 * a label derived from what it holds (`displayName`). Functions (what a node
 * runs) are dropped too. Not `source`: a `js` body keeps its code there.
 */
const POSITION_KEYS: ReadonlySet<string> = new Set([
  'start',
  'end',
  'line',
  'column',
  'displayName',
]);

/** The engine's parse surface this uses. */
export interface EngineParser {
  parse(source: string): unknown;
}

/** A parse as plain data: positions and functions stripped, cycles cut. */
export function plainParse(parsed: unknown): unknown {
  const seen = new WeakSet<object>();
  const walk = (value: unknown): unknown => {
    if (typeof value === 'function') return undefined;
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return '<cycle>';
    seen.add(value);
    if (Array.isArray(value)) return value.map(walk);
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (POSITION_KEYS.has(key)) continue;
      const w = walk(v);
      if (w !== undefined) out[key] = w;
    }
    seen.delete(value);
    return out;
  };
  return walk(parsed);
}

/** The node types in a plain parse, with their counts, for the commands and features. */
export function statementCounts(plain: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const v of value) walk(v);
      return;
    }
    const type = (value as { type?: unknown }).type;
    if (typeof type === 'string' && /(Command|Feature)$/.test(type)) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    for (const v of Object.values(value)) walk(v);
  };
  walk(plain);
  return counts;
}

/** Every node type in a plain parse. */
export function nodeTypes(plain: unknown): Set<string> {
  const types = new Set<string>();
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const v of value) walk(v);
      return;
    }
    const type = (value as { type?: unknown }).type;
    if (typeof type === 'string') types.add(type);
    for (const v of Object.values(value)) walk(v);
  };
  walk(plain);
  return types;
}

/**
 * Judge one lane's English against the source's parse (already plain and
 * normalized): pass, or how it is silent.
 */
export function judge(
  engine: EngineParser,
  want: string,
  wantPlain: unknown,
  english: string
): LaneResult {
  let got: unknown;
  try {
    got = normalize(plainParse(engine.parse(english)));
  } catch {
    return { outcome: 'silent', kind: 'rejected', detail: english };
  }
  if (JSON.stringify(got) === want) return { outcome: 'pass' };
  const a = statementCounts(wantPlain);
  const b = statementCounts(got);
  const same = a.size === b.size && [...a].every(([type, n]) => b.get(type) === n);
  return { outcome: 'silent', kind: same ? 'differs' : 'commands', detail: english };
}

// ---------------------------------------------------------------------------
// Named equivalences
// ---------------------------------------------------------------------------

/**
 * Two spellings the engine parses into different nodes that run the same.
 * Each rewrites a plain node (its children already rewritten) from one
 * spelling into the other, and each is pinned by runs on the engine and on
 * upstream (command-shapes.equivalences.test.ts). `the` is not one: `halt
 * event` does not parse where `halt the event` does.
 */
export interface Equivalence {
  name: string;
  description: string;
  /**
   * Handlers that must leave the same observation on both engines, written so
   * the observation is not empty: each pair is a spelling and its rewrite.
   */
  pins: ReadonlyArray<readonly [string, string]>;
  rewrite(node: PlainNode): PlainNode;
}

export type PlainNode = Record<string, unknown>;

const isNode = (value: unknown, type: string): value is PlainNode =>
  !!value && typeof value === 'object' && (value as PlainNode).type === type;

/** The pronoun each possessive or subject form reads as. */
const PRONOUNS: Readonly<Record<string, string>> = { my: 'me', I: 'me', its: 'it', your: 'you' };

const isPronoun = (value: unknown): boolean =>
  isNode(value, 'symbol') &&
  value.scope === 'local' &&
  ['me', 'it', 'you'].includes(String(value.name));

/** A node without one key. */
const without = (node: PlainNode, key: string): PlainNode => {
  const { [key]: _dropped, ...rest } = node;
  return rest;
};

export const EQUIVALENCES: readonly Equivalence[] = [
  {
    name: 'pronoun-spelling',
    description: '`my`, `I`, `its` and `your` read as `me`, `me`, `it` and `you`',
    pins: [
      ['on click put my.id into #o', 'on click put me.id into #o'],
      [
        "on click get {name:'Q'} then put its.name into #o",
        "on click get {name:'Q'} then put it.name into #o",
      ],
    ],
    rewrite: node =>
      isNode(node, 'symbol') && node.scope === 'local' && String(node.name) in PRONOUNS
        ? { ...node, name: PRONOUNS[String(node.name)] }
        : node,
  },
  {
    name: 'of-possessive',
    description: "`the X of Y` is `Y's X`, for a property, a style and an attribute",
    pins: [
      ['on click put the id of me into #o', "on click put me's id into #o"],
      ['on click set the *color of #t to "red"', 'on click set #t\'s *color to "red"'],
      ['on click put the @id of me into #o', "on click put me's @id into #o"],
    ],
    rewrite: node => {
      if (!isNode(node, 'ofExpression')) return node;
      const name = String(node.name);
      if (node.kind === 'property') return { type: 'possessive', root: node.root, prop: name };
      if (node.kind === 'style') {
        return { type: 'possessive', root: node.root, attribute: { type: 'styleRef', name } };
      }
      if (node.kind === 'attribute') {
        return {
          type: 'possessive',
          root: node.root,
          attribute: { type: 'attributeRef', name, css: `[${name}]` },
        };
      }
      return node;
    },
  },
  {
    name: 'dotted-possessive',
    description: "`my x` is `my.x`, and `its x` is `it.x`: a pronoun's property, either spelling",
    pins: [['on click put my id into #o', 'on click put my.id into #o']],
    rewrite: node =>
      isNode(node, 'possessive') && isPronoun(node.root) && typeof node.prop === 'string'
        ? { type: 'propertyAccess', root: node.root, prop: node.prop }
        : node,
  },
  {
    name: 'implicit-me',
    description: 'a target left out is `me` (`hide` is `hide me`)',
    pins: [
      [
        'on click add .a then put my className into #o',
        'on click add .a to me then put my className into #o',
      ],
    ],
    rewrite: node =>
      isNode(node, 'implicitMeTarget') ? { type: 'symbol', name: 'me', scope: 'local' } : node,
  },
  {
    name: 'go-to-string',
    description: '`go to "<address>"` is `go url "<address>"`',
    pins: [['on click go to "#here"', 'on click go url "#here"']],
    rewrite: node =>
      isNode(node, 'goCommand') && isNode(node.target, 'string')
        ? { ...without(node, 'target'), url: node.target.value }
        : node,
  },
  {
    name: 'call-pseudo-command',
    description: 'a call written as a command (`foo()`) is `call foo()`',
    pins: [
      ['on click getText() then put it into #o', 'on click call getText() then put it into #o'],
    ],
    rewrite: node => (isNode(node, 'pseudoCommand') ? { ...node, type: 'getCommand' } : node),
  },
  {
    name: 'pseudo-command-target',
    description:
      'a call written as a command on a target (`f(x) from the document`) is `call document.f(x)`',
    pins: [
      [
        'on click setAttribute("title", "T") on #o then put #o.title into #o',
        'on click call #o.setAttribute("title", "T") then put #o.title into #o',
      ],
    ],
    rewrite: node => {
      if (!isNode(node, 'getCommand') || !('target' in node)) return node;
      const call = node.value;
      if (!isNode(call, 'functionCall') || !isNode(call.root, 'symbol')) return node;
      const root = { type: 'propertyAccess', root: node.target, prop: call.root.name };
      return { ...without(node, 'target'), value: { ...call, root } };
    },
  },
  {
    name: 'empty-else',
    description: 'an `else` with nothing in it is no `else`',
    pins: [['on click if true put "a" into #o else end', 'on click if true put "a" into #o end']],
    rewrite: node =>
      isNode(node, 'ifCommand') && Array.isArray(node.falseBranch) && !node.falseBranch.length
        ? without(node, 'falseBranch')
        : node,
  },
  {
    name: 'milliseconds',
    description: 'a time in milliseconds (`10 ms`, `10ms`) is the number (`10`)',
    pins: [['on click put 10 ms into #o', 'on click put 10 into #o']],
    rewrite: node =>
      isNode(node, 'timeExpression') && node.suffix === 1 ? (node.root as PlainNode) : node,
  },
  {
    name: 'by-one',
    description: '`increment x by 1` is `increment x`, and so for `decrement`',
    pins: [
      [
        'on click set x to 5 then increment x by 1 then put x into #o',
        'on click set x to 5 then increment x then put x into #o',
      ],
      [
        'on click set x to 5 then decrement x by 1 then put x into #o',
        'on click set x to 5 then decrement x then put x into #o',
      ],
    ],
    rewrite: node =>
      (isNode(node, 'incrementCommand') || isNode(node, 'decrementCommand')) &&
      isNode(node.amount, 'number') &&
      node.amount.value === 1
        ? without(node, 'amount')
        : node,
  },
  {
    name: 'named-arguments-object',
    description: 'naked named arguments (`with method:"POST"`) are the braced object literal',
    pins: [['on click fetch /x with method:"POST"', 'on click fetch /x with {method:"POST"}']],
    rewrite: node =>
      isNode(node, 'namedArgumentList')
        ? { type: 'objectLiteral', keys: node.names, values: node.values }
        : node,
  },
];

/** A plain parse with every equivalence (or the given ones) applied, bottom-up. */
export function normalize(
  plain: unknown,
  equivalences: readonly Equivalence[] = EQUIVALENCES
): unknown {
  const walk = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(walk);
    let node: PlainNode = {};
    for (const [key, v] of Object.entries(value)) node[key] = walk(v);
    for (const equivalence of equivalences) node = equivalence.rewrite(node);
    return node;
  };
  return walk(plain);
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

type Translate = (input: string, from: string, to: string) => string;

/** The first line of what a refused call threw. */
const firstLine = (e: unknown): string => ((e as Error)?.message ?? String(e)).split('\n')[0] ?? '';

export interface CommandShapeRunner {
  /** Every lane of one case, or only `lanes`. */
  runCase(shape: CommandShapeCase, lanes?: readonly string[]): CaseResult;
}

/**
 * Load the engine (ESM-only, so imported here rather than at the top: tsx
 * runs the tools as CommonJS) and semantic, and return a case runner.
 */
export async function initCommandShapes(): Promise<CommandShapeRunner> {
  const engineModule = await import('@hyperfixi/engine');
  engineModule.register(...engineModule.everything);
  const engine: EngineParser = { parse: engineModule.parse };
  const { translate } = (await import('@lokascript/semantic')) as { translate: Translate };

  const lane = (source: string, language: string): string =>
    language === 'en'
      ? translate(source, 'en', 'en')
      : translate(translate(source, 'en', language), language, 'en');

  return {
    runCase(shape, lanes = LANES) {
      const plain = plainParse(engine.parse(shape.source));
      const wantPlain = normalize(plain);
      const want = JSON.stringify(wantPlain);
      const loud = loudFamilyOf(shape.source, plain);
      const result: CaseResult = {
        id: shape.id,
        ...(loud ? { loud: loud.name } : {}),
        statements: [...statementCounts(plain).keys()].sort(),
        lanes: {},
      };
      for (const language of lanes) {
        let english: string;
        try {
          english = lane(shape.source, language);
        } catch (e) {
          result.lanes[language] = { outcome: 'refused', detail: firstLine(e) };
          continue;
        }
        result.lanes[language] = judge(engine, want, wantPlain, english);
      }
      return result;
    },
  };
}

/** Run the given cases, in order. */
export async function runCommandShapes(
  cases: readonly CommandShapeCase[],
  lanes: readonly string[] = LANES
): Promise<CaseResult[]> {
  const runner = await initCommandShapes();
  return cases.map(shape => runner.runCase(shape, lanes));
}

// ---------------------------------------------------------------------------
// Scope: what semantic is not asked to carry yet
// ---------------------------------------------------------------------------

/**
 * A family of shapes semantic does not carry yet (the M1 plan's LOUD verdict).
 * A translation of one must be REFUSED, never silently lossy: its baseline
 * entries carry the reason, and the gate fails when one starts to pass (it
 * belongs with the rest then). Every other case must round-trip, or be fixed.
 */
export interface LoudFamily {
  name: string;
  reason: string;
  /** Does the case belong to the family? `types` are the node types of its engine parse. */
  matches(source: string, types: ReadonlySet<string>, plain: unknown): boolean;
}

/** Some node in a plain parse satisfies `test`. */
function someNode(plain: unknown, test: (node: PlainNode) => boolean): boolean {
  if (!plain || typeof plain !== 'object') return false;
  if (Array.isArray(plain)) return plain.some(v => someNode(v, test));
  return test(plain as PlainNode) || Object.values(plain).some(v => someNode(v, test));
}

export const LOUD: readonly LoudFamily[] = [
  {
    name: 'ask-answer',
    reason:
      'semantic has no schema and no dictionary word for `ask` / `answer`; adding them is an ' +
      'owner vocabulary decision (the M2 sheet)',
    matches: (_source, types) => types.has('askCommand') || types.has('answerCommand'),
  },
  {
    name: 'templated-selector',
    reason:
      'a templated selector (`#{…}`, `.{"…"}`, `<${…}/>`) is rare, and its fix is in the tokenizer',
    matches: source => /[#.]\{|<[^<>]*\$\{/.test(source),
  },
  {
    name: 'caret-on-target',
    reason: '`^name on <element>` is new in upstream 0.9.93 and rare; plain `^name` is carried',
    matches: (_source, _types, plain) =>
      someNode(plain, node => node.type === 'symbol' && 'on' in node),
  },
  {
    name: 'dom-scope-word',
    reason: 'a `dom` scope word (`dom count`) is a one-off leaf; file it when a user meets one',
    matches: (_source, _types, plain) =>
      someNode(
        plain,
        node =>
          node.type === 'symbol' && node.scope === 'inherited' && !String(node.name).startsWith('^')
      ),
  },
  {
    name: 'set-feature',
    reason: 'a `set` feature (run once, at install) has one source; revisit if a user asks',
    matches: (_source, types) => types.has('setFeature'),
  },
];

/** The LOUD family a case belongs to, if any. */
export function loudFamilyOf(source: string, plain: unknown): LoudFamily | undefined {
  const types = nodeTypes(plain);
  return LOUD.find(family => family.matches(source, types, plain));
}

// ---------------------------------------------------------------------------
// The baseline
// ---------------------------------------------------------------------------

export interface BaselineEntry {
  /** The source, whitespace collapsed and cut at 120 characters: for reading, not asserted. */
  src: string;
  /** The case's family (see CommandShapeCase): for reading the burn-down, not asserted. */
  family: string;
  /** Lanes whose translation is refused, in LANES order; `*` stands for all 23 languages. */
  refused?: string;
  /** Lanes whose translation is silently lossy, in the same shorthand. */
  silent?: string;
  /** For a case in a LOUD family: why it is not carried yet. */
  loud?: string;
}

export interface CommandShapesBaseline {
  description: string;
  /** The vendored upstream version the cases came from. */
  upstream: string;
  cases: number;
  pairs: number;
  pass: number;
  refused: number;
  silent: number;
  entries: Record<string, BaselineEntry>;
}

const FOREIGN_LANES: readonly string[] = LANES.filter(lane => lane !== 'en');

/** Lanes (in LANES order) as a baseline string, `*` for all 23 languages. */
export function compressLanes(lanes: readonly string[]): string {
  const set = new Set(lanes);
  const all = FOREIGN_LANES.every(lane => set.has(lane));
  const out = LANES.filter(lane => set.has(lane) && !(all && lane !== 'en'));
  if (all) out.push('*');
  return out.join(' ');
}

/** The lanes a baseline string names. */
export function expandLanes(text: string | undefined): string[] {
  const out: string[] = [];
  for (const token of (text ?? '').split(' ').filter(Boolean)) {
    if (token === '*') out.push(...FOREIGN_LANES);
    else out.push(token);
  }
  return out;
}

const lanesWith = (result: CaseResult, outcome: Outcome): string[] =>
  LANES.filter(lane => result.lanes[lane]?.outcome === outcome);

/** The baseline a run implies. */
export function baselineFrom(
  results: readonly CaseResult[],
  cases: readonly CommandShapeCase[],
  description: string,
  upstream: string
): CommandShapesBaseline {
  const byId = new Map(cases.map(c => [c.id, c]));
  const reasons = new Map(LOUD.map(family => [family.name, family.reason]));
  const doc: CommandShapesBaseline = {
    description,
    upstream,
    cases: results.length,
    pairs: 0,
    pass: 0,
    refused: 0,
    silent: 0,
    entries: {},
  };
  for (const r of results) {
    const refused = lanesWith(r, 'refused');
    const silent = lanesWith(r, 'silent');
    doc.pairs += Object.keys(r.lanes).length;
    doc.refused += refused.length;
    doc.silent += silent.length;
    doc.pass += lanesWith(r, 'pass').length;
    if (!refused.length && !silent.length) continue;
    const shape = byId.get(r.id);
    const src = collapse(shape?.source ?? '');
    doc.entries[r.id] = {
      src: src.length > 120 ? `${src.slice(0, 119)}…` : src,
      family: shape?.family ?? '',
      ...(refused.length ? { refused: compressLanes(refused) } : {}),
      ...(silent.length ? { silent: compressLanes(silent) } : {}),
      ...(r.loud ? { loud: `${r.loud}: ${reasons.get(r.loud) ?? ''}` } : {}),
    };
  }
  return doc;
}

/** The outcome the baseline lists for a pair: `pass` unless it is listed. */
export function listedOutcome(entry: BaselineEntry | undefined, lane: string): Outcome {
  if (expandLanes(entry?.silent).includes(lane)) return 'silent';
  if (expandLanes(entry?.refused).includes(lane)) return 'refused';
  return 'pass';
}

export interface PairChange {
  id: string;
  lane: string;
  listed: Outcome;
  got: Outcome;
  detail?: string;
}

/** How bad an outcome is: a change toward a worse one is a regression. */
const RANK: Readonly<Record<Outcome, number>> = { pass: 0, refused: 1, silent: 2 };

export interface BaselineDiff {
  /** Pairs worse than listed: pass → refused or silent, refused → silent. */
  worse: PairChange[];
  /** Pairs better than listed: prune them, so the lists only shrink. */
  better: PairChange[];
}

/**
 * Compare results with the baseline, over the cases that ran (a shard
 * compares only its own; an entry for a case outside `results` is not judged).
 */
export function diffBaseline(
  results: readonly CaseResult[],
  baseline: Pick<CommandShapesBaseline, 'entries'>
): BaselineDiff {
  const diff: BaselineDiff = { worse: [], better: [] };
  for (const r of results) {
    const entry = baseline.entries[r.id];
    for (const lane of LANES) {
      const got = r.lanes[lane];
      if (!got) continue;
      const listed = listedOutcome(entry, lane);
      if (listed === got.outcome) continue;
      const change: PairChange = {
        id: r.id,
        lane,
        listed,
        got: got.outcome,
        ...(got.detail !== undefined ? { detail: got.detail } : {}),
      };
      (RANK[got.outcome] > RANK[listed] ? diff.worse : diff.better).push(change);
    }
  }
  return diff;
}

/** Entries for cases the cases file no longer holds. */
export function orphanedEntries(
  baseline: Pick<CommandShapesBaseline, 'entries'>,
  cases: readonly CommandShapeCase[]
): string[] {
  const ids = new Set(cases.map(c => c.id));
  return Object.keys(baseline.entries).filter(id => !ids.has(id));
}
