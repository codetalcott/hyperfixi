/**
 * The round-trip gate kit (domains rethink Phase 4.6, `docs-internal/DOMAINS_RETHINK.md`): every
 * command of a grammar, written in each of its languages by its own renderer and read back by its own
 * parser. Moved from lokascript-domains' `packages/domains/gate/round-trip.ts` (the domain gate, Phase
 * 2), so any grammar on the framework runs the same gate; the domains repo keeps its fixtures
 * (`gate/values.ts`), baselines and regen tool.
 *
 * A case is a command (bracket syntax, parsed in English) and a language:
 *
 * - **round trip**: `render(ref, lang)`, then `parse`. `pass` when the parse is the reference node, or,
 *   for a grammar whose compiled output does not depend on the language, when the text compiles to what
 *   the command itself (its bracket form) compiles to (a parser may keep a translated word that the
 *   generator normalizes: bdd ja `#box0 が 表示 前提` is `visible`). English is a lane like the others.
 *   `refused` when the render is null or the parse throws: the caller is told. `silent` otherwise: it
 *   reads, or compiles to, something else.
 * - **leftover**: the same render plus one unknown word. `refused` is the expected outcome; a parse
 *   that returns accepted input it did not read (`silent`).
 *
 * The outcomes are the command-shape gate's (hyperfixi `testing-framework`). A baseline lists every
 * case that is not at its best outcome; `compare` reports a case worse than listed and one better than
 * listed, so a gate built on it only shrinks.
 */

export type Outcome = 'pass' | 'refused' | 'silent';
export type CaseKind = 'roundTrip' | 'leftover';

/** Best first. A round trip's best is `pass`; leftover input's is `refused`. */
export const RANK: Record<CaseKind, Record<Outcome, number>> = {
  roundTrip: { pass: 2, refused: 1, silent: 0 },
  leftover: { refused: 2, pass: 2, silent: 0 },
};
export const BEST: Record<CaseKind, Outcome> = { roundTrip: 'pass', leftover: 'refused' };

/** Appended for the leftover cases: a word no grammar's vocabulary has. */
export const UNKNOWN_WORD = 'zzqx';

export interface CaseResult {
  /** The grammar (a domain's name). */
  grammar: string;
  kind: CaseKind;
  /** The command, in bracket syntax (read in English). */
  source: string;
  lang: string;
  outcome: Outcome;
  /** What the renderer wrote (plus the unknown word, for leftover). */
  text?: string;
  /** Why it is not `pass`: the error, or what the parse read instead. */
  why?: string;
  /** The round trip's parse, summarized (`summarize`); absent when it was refused. */
  read?: string;
}

/** What the gate reads of a role in a schema. */
export interface GateRoleSpec {
  readonly role: string;
  readonly required?: boolean;
  readonly expectedTypes?: readonly string[];
}

/** What the gate reads of a command schema. */
export interface GateSchema {
  readonly action: string;
  readonly roles: readonly GateRoleSpec[];
}

/** What the gate reads of a parse. */
export interface GateNode {
  readonly action: string;
  readonly roles: ReadonlyMap<string, unknown> | Readonly<Record<string, unknown>>;
}

/** The grammar's DSL, as the gate drives it. */
export interface GateDSL {
  parse(input: string, language: string): GateNode;
  compile(input: string, language: string): { ok: boolean; code?: string; errors?: string[] };
  render?(node: GateNode, language: string): string | null;
  getSupportedLanguages(): string[];
}

/**
 * The values the gate writes into each role. A role not listed gets a plain name no vocabulary uses
 * (`v0x`, or `#box0` where only a selector fits): its value must come back verbatim. A role that takes
 * FIXED words lists every word the grammar's renderer and generator know, in English: the gate writes
 * the command once per word, in every language, so a word one of the two tables lacks fails in the
 * languages where it is missing.
 */
export interface GateFixture {
  /**
   * `compile`: a round trip also passes when the text compiles to the command's own code (the grammar
   * compiles to something that does not depend on the language). `node`: only the parse counts (a
   * grammar that compiles to a sentence in each language).
   */
  oracle: 'compile' | 'node';
  /** Keys are `<action>.<role>` or `<role>` (every action). The first value is the one the other cases use. */
  values: Record<string, string[]>;
  /** Actions that do not compile on their own (a gate may check every other one does). */
  englishDoesNotCompile?: string[];
}

/** A value no vocabulary uses: a selector where only a selector fits, a plain name otherwise. */
function defaultValue(role: GateRoleSpec, i: number): string {
  const types = role.expectedTypes ?? [];
  if (types.includes('selector') && !types.includes('literal') && !types.includes('expression'))
    return `#box${i}`;
  return `v${i}x`;
}

function valuesFor(fixture: GateFixture, action: string, role: GateRoleSpec, i: number): string[] {
  return (
    fixture.values[`${action}.${role.role}`] ?? fixture.values[role.role] ?? [defaultValue(role, i)]
  );
}

/**
 * The commands a grammar is checked on: for each schema, its required roles alone and all its roles
 * (each with its first value), then each further value of a role that takes fixed words, alone.
 */
export function commandsFor(schemas: readonly GateSchema[], fixture: GateFixture): string[] {
  const out = new Set<string>();
  for (const schema of schemas) {
    const required = schema.roles.filter(r => r.required);
    const variants =
      required.length === schema.roles.length ? [required] : [required, [...schema.roles]];
    for (const roles of variants) {
      const values = roles.map((r, i) => valuesFor(fixture, schema.action, r, i));
      const write = (pick: string[]) =>
        `[${schema.action}${roles.map((r, i) => ` ${r.role}:${pick[i]}`).join('')}]`;
      const first = values.map(v => v[0]!);
      out.add(write(first));
      values.forEach((vs, i) => {
        for (const v of vs.slice(1)) out.add(write(first.map((f, j) => (j === i ? v : f))));
      });
    }
  }
  return [...out];
}

function roleEntries(node: GateNode): [string, unknown][] {
  return node.roles instanceof Map
    ? [...(node.roles as ReadonlyMap<string, unknown>)]
    : Object.entries(node.roles ?? {});
}

function roleValues(node: GateNode): Record<string, string> {
  return Object.fromEntries(
    roleEntries(node)
      .map(([k, v]): [string, string] => [
        k,
        String((v as { value?: unknown })?.value ?? (v as { raw?: unknown })?.raw ?? v),
      ])
      .sort(([a], [b]) => (a < b ? -1 : 1))
  );
}

/** A parse as one line: `action role:type=value …`, roles sorted. What the parse snapshot records. */
export function summarize(node: GateNode): string {
  const roles = roleEntries(node)
    .map(([k, v]) => {
      const t = (v as { type?: unknown })?.type;
      const raw = (v as { value?: unknown })?.value ?? (v as { raw?: unknown })?.raw ?? v;
      const text = String(raw);
      return `${k}${t ? `:${String(t)}` : ''}=${/[\s=]/.test(text) ? JSON.stringify(text) : text}`;
    })
    .sort();
  return [node.action, ...roles].join(' ');
}

function describeRead(want: Record<string, string>, ref: GateNode, back: GateNode): string {
  if (back.action !== ref.action) return `another command: ${back.action}`;
  const got = roleValues(back);
  const lost = Object.keys(want).filter(k => !(k in got));
  const added = Object.keys(got).filter(k => !(k in want));
  const changed = Object.keys(want).filter(k => k in got && got[k] !== want[k]);
  const parts = [
    ...lost.map(k => `${k} lost`),
    ...added.map(k => `${k} added (${got[k]})`),
    ...changed.map(k => `${k}: ${got[k]}`),
  ];
  return parts.join(', ');
}

const message = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 160);

/** What a command (bracket syntax) compiles to; null when it does not compile on its own. */
export function referenceCode(dsl: GateDSL, source: string): string | null {
  try {
    const c = dsl.compile(source, 'en');
    return c.ok && typeof c.code === 'string' ? c.code : null;
  } catch {
    return null;
  }
}

/** Run every case of one grammar: each command of `commandsFor` in each of the DSL's languages. */
export function runRoundTrip(
  grammar: string,
  dsl: GateDSL,
  schemas: readonly GateSchema[],
  fixture: GateFixture
): CaseResult[] {
  const languages = dsl.getSupportedLanguages();
  const results: CaseResult[] = [];

  for (const source of commandsFor(schemas, fixture)) {
    const ref = dsl.parse(source, 'en');
    const want = roleValues(ref);
    const sameNode = (back: GateNode) =>
      back.action === ref.action && JSON.stringify(roleValues(back)) === JSON.stringify(want);

    // The code the command itself compiles to: its bracket form, not its English render, or the English
    // lane would be measured against itself (bdd's `When double-click` reads `double`, and compiled to a
    // comment that every correct language then "differed" from). Null when the command does not compile
    // alone; then only the node can pass.
    const refCode = fixture.oracle === 'compile' ? referenceCode(dsl, source) : null;

    for (const lang of languages) {
      const at = { grammar, source, lang };
      const text = dsl.render?.(ref, lang) ?? null;
      if (!text) {
        results.push({ ...at, kind: 'roundTrip', outcome: 'refused', why: 'no render' });
        continue;
      }
      let back: GateNode;
      try {
        back = dsl.parse(text, lang);
      } catch (e) {
        results.push({ ...at, kind: 'roundTrip', outcome: 'refused', text, why: message(e) });
        continue;
      }

      let outcome: Outcome = 'silent';
      let why: string | undefined;
      if (sameNode(back)) outcome = 'pass';
      else if (refCode !== null) {
        let code: string | undefined;
        try {
          const c = dsl.compile(text, lang);
          code = c.ok ? c.code : undefined;
        } catch {
          code = undefined;
        }
        if (code === refCode) outcome = 'pass';
        else why = `compiles differently; reads ${describeRead(want, ref, back)}`;
      } else why = `reads ${describeRead(want, ref, back)}`;
      results.push({
        ...at,
        kind: 'roundTrip',
        outcome,
        text,
        ...(why ? { why } : {}),
        read: summarize(back),
      });

      // Leftover input: only where the text itself reads, or a refusal would say nothing.
      const extended = `${text} ${UNKNOWN_WORD}`;
      try {
        const read = dsl.parse(extended, lang);
        results.push({
          ...at,
          kind: 'leftover',
          outcome: 'silent',
          text: extended,
          why: `accepted as ${read.action}`,
        });
      } catch {
        results.push({ ...at, kind: 'leftover', outcome: 'refused', text: extended });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------------------------------
// The baseline
// ---------------------------------------------------------------------------------------------------

export interface ListedCase {
  outcome: Exclude<Outcome, 'pass'>;
  text?: string;
  why?: string;
}

export interface GateBaseline {
  /** The upstream packages this was measured on (the grammar's lockfile). */
  upstream: Record<string, string>;
  /** Per grammar and kind: cases and outcomes. Written by the regen tool for the reader; not checked. */
  counts: Record<string, Record<CaseKind, Record<Outcome | 'cases', number>>>;
  /** Per grammar, command and language: every round trip that is not `pass`. */
  roundTrip: Record<string, Record<string, Record<string, ListedCase>>>;
  /** Per grammar and command: the languages whose leftover case was accepted (`silent`). */
  leftover: Record<string, Record<string, string[]>>;
}

export interface DriftCase {
  kind: CaseKind;
  source: string;
  lang: string;
  listed: Outcome;
  now: Outcome;
  text?: string;
  why?: string;
}

export interface Drift {
  worse: DriftCase[];
  better: DriftCase[];
  /** Listed cases that are no longer cases at all. */
  stale: { kind: CaseKind; source: string; lang: string }[];
}

function listedOutcome(
  baseline: GateBaseline,
  r: Pick<CaseResult, 'grammar' | 'kind' | 'source' | 'lang'>
): Outcome {
  if (r.kind === 'roundTrip')
    return baseline.roundTrip[r.grammar]?.[r.source]?.[r.lang]?.outcome ?? 'pass';
  return baseline.leftover[r.grammar]?.[r.source]?.includes(r.lang) ? 'silent' : 'refused';
}

/** How one grammar's results moved against the baseline. */
export function compare(grammar: string, results: CaseResult[], baseline: GateBaseline): Drift {
  const drift: Drift = { worse: [], better: [], stale: [] };
  const seen = new Set<string>();
  for (const r of results) {
    seen.add(`${r.kind}\u0000${r.source}\u0000${r.lang}`);
    const listed = listedOutcome(baseline, r);
    const rank = RANK[r.kind];
    const entry = { kind: r.kind, source: r.source, lang: r.lang, listed, now: r.outcome };
    if (rank[r.outcome] < rank[listed])
      drift.worse.push({
        ...entry,
        ...(r.text !== undefined ? { text: r.text } : {}),
        ...(r.why !== undefined ? { why: r.why } : {}),
      });
    else if (rank[r.outcome] > rank[listed]) drift.better.push(entry);
  }
  const listedCases: { kind: CaseKind; source: string; lang: string }[] = [
    ...Object.entries(baseline.roundTrip[grammar] ?? {}).flatMap(([source, langs]) =>
      Object.keys(langs).map(lang => ({ kind: 'roundTrip' as const, source, lang }))
    ),
    ...Object.entries(baseline.leftover[grammar] ?? {}).flatMap(([source, langs]) =>
      langs.map(lang => ({ kind: 'leftover' as const, source, lang }))
    ),
  ];
  for (const c of listedCases)
    if (!seen.has(`${c.kind}\u0000${c.source}\u0000${c.lang}`)) drift.stale.push(c);
  return drift;
}

/** The baseline entries for one grammar's results. */
export function listingOf(results: CaseResult[]): {
  roundTrip: Record<string, Record<string, ListedCase>>;
  leftover: Record<string, string[]>;
} {
  const roundTrip: Record<string, Record<string, ListedCase>> = {};
  const leftover: Record<string, string[]> = {};
  for (const r of results) {
    if (r.kind === 'roundTrip' && r.outcome !== 'pass') {
      (roundTrip[r.source] ??= {})[r.lang] = {
        outcome: r.outcome,
        ...(r.text ? { text: r.text } : {}),
        ...(r.why ? { why: r.why } : {}),
      };
    } else if (r.kind === 'leftover' && r.outcome === 'silent')
      (leftover[r.source] ??= []).push(r.lang);
  }
  return { roundTrip, leftover };
}

export function countsOf(
  results: CaseResult[]
): Record<CaseKind, Record<Outcome | 'cases', number>> {
  const counts = {
    roundTrip: { cases: 0, pass: 0, refused: 0, silent: 0 },
    leftover: { cases: 0, pass: 0, refused: 0, silent: 0 },
  };
  for (const r of results) {
    counts[r.kind].cases++;
    counts[r.kind][r.outcome]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------------------------------
// The parse snapshot
// ---------------------------------------------------------------------------------------------------

/**
 * Every round trip's parse, so a change that moves a parse shows it, whether or not an outcome moved
 * (a value's type, a role a passing case gained, what a silent case reads now). `refused` where the
 * parse threw. Leftover cases are not in it: their outcome is the baseline's.
 */
export interface ParseSnapshot {
  upstream: Record<string, string>;
  /** Per grammar, command and language. */
  parses: Record<string, Record<string, Record<string, string>>>;
}

export function snapshotOf(results: CaseResult[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const r of results)
    if (r.kind === 'roundTrip') (out[r.source] ??= {})[r.lang] = r.read ?? 'refused';
  return out;
}

export interface SnapshotChange {
  source: string;
  lang: string;
  was?: string;
  now?: string;
}

/** Every round trip whose parse differs from the snapshot's, for one grammar. */
export function snapshotChanges(
  grammar: string,
  results: CaseResult[],
  snapshot: ParseSnapshot
): SnapshotChange[] {
  const now = snapshotOf(results);
  const was = snapshot.parses[grammar] ?? {};
  const changes: SnapshotChange[] = [];
  for (const source of new Set([...Object.keys(was), ...Object.keys(now)]))
    for (const lang of new Set([
      ...Object.keys(was[source] ?? {}),
      ...Object.keys(now[source] ?? {}),
    ])) {
      const a = was[source]?.[lang];
      const b = now[source]?.[lang];
      if (a !== b)
        changes.push({
          source,
          lang,
          ...(a !== undefined ? { was: a } : {}),
          ...(b !== undefined ? { now: b } : {}),
        });
    }
  return changes;
}
