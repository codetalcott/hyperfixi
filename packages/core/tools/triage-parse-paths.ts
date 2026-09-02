/**
 * triage-parse-paths — what actually differs between the two English parse paths
 *
 * Arc 1 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Step 5 measured that
 * semantic-first and traditional produce a DIFFERENT AST for roughly half the
 * engine corpus. The owner chose to converge them before step 6, which turns
 * "107 sources differ" into a question this tool answers: **differ HOW, and how
 * many distinct decisions is that really?**
 *
 * It walks both canonicalized parses in parallel and classifies every
 * difference site by kind, so the 107 collapse into a handful of families that
 * can each be decided once.
 *
 * Usage (from packages/core):
 *   npx tsx tools/triage-parse-paths.ts            # summary
 *   npx tsx tools/triage-parse-paths.ts --kind=X   # sources exhibiting kind X
 *   npx tsx tools/triage-parse-paths.ts --source=N # full diff for corpus row N
 *   npx tsx tools/triage-parse-paths.ts --json     # machine-readable
 */

import { corpusSources, canonicalize } from '../src/parser/__tests__/engine-corpus';
import { hyperscript } from '../src/api/hyperscript-api';
import { SemanticGrammarBridge } from '../src/multilingual/bridge';

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

type Parse = { ok: true; ast: unknown } | { ok: false };

/**
 * The two English parse paths, as they exist after Arc 1 step 6.
 *
 * `traditional` is the core parser (`compileSync`). `semantic` is the
 * front-end's WHOLE-PROGRAM direct path — `SemanticGrammarBridge.parseToASTWithDetails`
 * with `lang: 'en'`, the route `hyperscript.compile(code, { language })` and the
 * multilingual bundles take. Until step 6 the semantic side here was
 * `compileSync` with the in-loop adapter, which adopted the front-end's parse
 * per command; that path no longer exists, and comparing `compileSync` against
 * itself would have made every row `same`. A fallback (`usedDirectPath: false`)
 * is reported as a semantic parse failure — the fallback IS the traditional
 * parse, so there is nothing to compare.
 */
function parseTraditional(source: string): Parse {
  try {
    const r = hyperscript.compileSync(source) as { ok: boolean; ast?: unknown };
    return r.ok && r.ast ? { ok: true, ast: canonicalize(r.ast) } : { ok: false };
  } catch {
    return { ok: false };
  }
}
let bridge: SemanticGrammarBridge | null = null;
async function parseSemantic(source: string): Promise<Parse> {
  try {
    if (!bridge) {
      bridge = new SemanticGrammarBridge();
      await bridge.initialize();
    }
    const r = await bridge.parseToASTWithDetails(source, 'en');
    return r.usedDirectPath && r.ast ? { ok: true, ast: canonicalize(r.ast) } : { ok: false };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Difference classification
// ---------------------------------------------------------------------------

const POSITION_KEYS = new Set(['start', 'end', 'line', 'column']);

/**
 * Words the traditional parser leaves in `args` as bare identifiers and the
 * semantic path lifts into a role instead. Derived from the corpus rather than
 * asserted — `--kind=marker-in-args` prints the ones actually seen.
 */
const MARKER_WORDS = new Set([
  'to',
  'from',
  'into',
  'on',
  'in',
  'at',
  'of',
  'with',
  'for',
  'by',
  'before',
  'after',
  'over',
  'under',
  'as',
  'the',
  'url',
  'then',
]);

export interface DiffSite {
  path: string;
  kind: string;
  trad: unknown;
  sem: unknown;
}

function nodeType(v: unknown): string | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? ((v as { type?: unknown }).type as string | undefined)
    : undefined;
}

/**
 * The word a node carries, if it is the kind of node a marker can arrive as.
 *
 * `string` is here as well as `identifier` because the flat-token-list parsers
 * (`parseGoCommand`, `parseScrollCommand`) deliberately emit their structural
 * keywords as `string` nodes — an unbound identifier does not evaluate to its
 * own text, and those runtimes match these words BY text. Reading only
 * `identifier` therefore under-counted `marker-in-args` and spilled the same
 * differences into `arity`: `go to url "…"` had been misfiled that way since
 * `parseGoCommand` was written, and `scroll to #top` joined it the moment
 * `scroll` got the same treatment. Both are markers the semantic path lifts
 * into a role, which is exactly what this family is for.
 */
function identName(v: unknown): string | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const n = v as { type?: string; name?: unknown; value?: unknown };
  if (n.type !== 'identifier' && n.type !== 'string') return undefined;
  if (typeof n.name === 'string' && n.name !== '') return n.name;
  return typeof n.value === 'string' ? n.value : undefined;
}

function isContextMe(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const n = v as { type?: string; name?: unknown; contextType?: unknown };
  return (
    (n.type === 'contextReference' || n.type === 'identifier') &&
    (n.name === 'me' || n.contextType === 'me')
  );
}

/** Walk both trees in parallel, emitting one record per difference site. */
function diff(trad: unknown, sem: unknown, path: string, out: DiffSite[]): void {
  if (trad === sem) return;

  const tKey =
    path
      .split('.')
      .pop()
      ?.replace(/\[\d+\]$/, '') ?? '';
  if (POSITION_KEYS.has(tKey) && typeof trad === 'number' && typeof sem === 'number') {
    out.push({ path, kind: 'position', trad, sem });
    return;
  }

  const bothArrays = Array.isArray(trad) && Array.isArray(sem);
  if (bothArrays) {
    const t = trad as unknown[];
    const s = sem as unknown[];
    if (t.length !== s.length) {
      // Which side has the extra, and is it a marker word the other lifted out?
      const longer = t.length > s.length ? t : s;
      const shorter = t.length > s.length ? s : t;
      const extras = longer.filter(
        x => !shorter.some(y => JSON.stringify(y) === JSON.stringify(x))
      );
      const markers = extras.map(identName).filter((w): w is string => !!w && MARKER_WORDS.has(w));
      if (markers.length > 0 && t.length > s.length) {
        out.push({ path, kind: 'marker-in-args', trad: markers, sem: null });
        return;
      }
      if (extras.some(isContextMe) && s.length > t.length) {
        out.push({ path, kind: 'implicit-me', trad: null, sem: 'me' });
        return;
      }
      out.push({ path, kind: 'arity', trad: t.length, sem: s.length });
      return;
    }
    for (let i = 0; i < t.length; i++) diff(t[i], s[i], `${path}[${i}]`, out);
    return;
  }

  const tObj = trad && typeof trad === 'object' && !Array.isArray(trad);
  const sObj = sem && typeof sem === 'object' && !Array.isArray(sem);

  if (tObj && sObj) {
    const tt = nodeType(trad);
    const st = nodeType(sem);
    if (tt && st && tt !== st) {
      out.push({ path, kind: `node-type:${tt}->${st}`, trad: tt, sem: st });
      return;
    }
    const t = trad as Record<string, unknown>;
    const s = sem as Record<string, unknown>;
    for (const key of new Set([...Object.keys(t), ...Object.keys(s)])) {
      const child = path ? `${path}.${key}` : key;
      if (!(key in t)) {
        if (key === 'semanticRoles')
          out.push({
            path: child,
            kind: 'semanticRoles-added',
            trad: null,
            sem: Object.keys(s[key] as object),
          });
        else if (isContextMe(s[key]))
          out.push({ path: child, kind: 'implicit-me', trad: null, sem: 'me' });
        else out.push({ path: child, kind: `field-only-sem:${key}`, trad: null, sem: s[key] });
        continue;
      }
      if (!(key in s)) {
        out.push({ path: child, kind: `field-only-trad:${key}`, trad: t[key], sem: null });
        continue;
      }
      diff(t[key], s[key], child, out);
    }
    return;
  }

  out.push({ path, kind: 'value', trad, sem });
}

/**
 * Expression kinds that CONTAIN other expressions, and the leaf kinds a
 * truncating parse collapses them to. A `binaryExpression -> literal` at the
 * same path is not two defensible shapes — it is one side having dropped the
 * rest of the expression.
 */
const COMPOUND = new Set([
  'binaryExpression',
  'betweenExpression',
  'asExpression',
  'possessiveExpression',
  'memberExpression',
  'unaryExpression',
  'callExpression',
]);
const LEAF = new Set(['literal', 'identifier', 'selector', 'string', 'variable']);

/** Does this site show one side losing structure the other kept? */
export function structureLoss(s: DiffSite): 'sem-lost' | 'trad-lost' | null {
  const m = /^node-type:(.+)->(.+)$/.exec(s.kind);
  if (m) {
    if (COMPOUND.has(m[1]) && LEAF.has(m[2])) return 'sem-lost';
    if (COMPOUND.has(m[2]) && LEAF.has(m[1])) return 'trad-lost';
  }
  if (s.kind === 'arity' && typeof s.trad === 'number' && typeof s.sem === 'number') {
    return s.trad > s.sem ? 'sem-lost' : 'trad-lost';
  }
  return null;
}

/** Collapse a site kind to its family, for the summary table. */
function family(kind: string): string {
  if (kind.startsWith('node-type:')) return 'node-type';
  if (kind.startsWith('field-only-sem:')) return 'field-only-sem';
  if (kind.startsWith('field-only-trad:')) return 'field-only-trad';
  return kind;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

interface Row {
  index: number;
  source: string;
  status: 'same' | 'differ' | 'trad-only' | 'sem-only' | 'both-fail';
  sites: DiffSite[];
}

async function analyse(): Promise<Row[]> {
  const rows: Row[] = [];
  for (const [index, source] of corpusSources().entries()) {
    const t = parseTraditional(source);
    const s = await parseSemantic(source);
    if (!t.ok && !s.ok) {
      rows.push({ index, source, status: 'both-fail', sites: [] });
      continue;
    }
    if (!s.ok) {
      rows.push({ index, source, status: 'trad-only', sites: [] });
      continue;
    }
    if (!t.ok) {
      rows.push({ index, source, status: 'sem-only', sites: [] });
      continue;
    }
    const sites: DiffSite[] = [];
    diff(t.ast, s.ast, '', sites);
    rows.push({
      index,
      source,
      status: sites.length === 0 ? 'same' : 'differ',
      sites,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const arg = (name: string): string | undefined =>
    argv
      .find(a => a.startsWith(`--${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');

  const rows = await analyse();

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
    return;
  }

  const one = arg('source');
  if (one !== undefined) {
    const row = rows[Number(one)];
    process.stdout.write(`[${row.index}] ${row.status}  ${row.source}\n\n`);
    for (const s of row.sites) {
      process.stdout.write(
        `  ${s.kind}\n    at ${s.path || '<root>'}\n    trad: ${JSON.stringify(s.trad)}\n    sem:  ${JSON.stringify(s.sem)}\n\n`
      );
    }
    return;
  }

  const wanted = arg('kind');
  if (wanted !== undefined) {
    for (const row of rows) {
      const hits = row.sites.filter(s => s.kind === wanted || family(s.kind) === wanted);
      if (hits.length === 0) continue;
      process.stdout.write(`[${row.index}] ${row.source}\n`);
      for (const h of hits.slice(0, 6)) {
        process.stdout.write(
          `    ${h.path || '<root>'}  ${h.kind}  ${JSON.stringify(h.trad)} -> ${JSON.stringify(h.sem)}\n`
        );
      }
    }
    return;
  }

  // Summary
  const status = new Map<string, number>();
  for (const r of rows) status.set(r.status, (status.get(r.status) ?? 0) + 1);

  const byFamily = new Map<string, { sites: number; sources: Set<number> }>();
  const byKind = new Map<string, { sites: number; sources: Set<number> }>();
  for (const r of rows) {
    for (const s of r.sites) {
      for (const [map, key] of [
        [byFamily, family(s.kind)],
        [byKind, s.kind],
      ] as const) {
        const e = map.get(key) ?? { sites: 0, sources: new Set<number>() };
        e.sites++;
        e.sources.add(r.index);
        map.set(key, e);
      }
    }
  }

  // How many differing sources are explained ENTIRELY by a given family set?
  const soleFamily = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== 'differ') continue;
    const fams = new Set(r.sites.map(s => family(s.kind)));
    if (fams.size === 1) {
      const f = [...fams][0];
      soleFamily.set(f, (soleFamily.get(f) ?? 0) + 1);
    }
  }

  const L = (s: string) => process.stdout.write(s + '\n');
  L('');
  L('=== parse-path status ===');
  for (const k of ['same', 'differ', 'trad-only', 'sem-only', 'both-fail']) {
    L(`  ${k.padEnd(11)} ${String(status.get(k) ?? 0).padStart(4)}`);
  }

  L('');
  L('=== difference families (a source can appear in several) ===');
  L('  family                 sites   sources   sources it FULLY explains');
  for (const [f, e] of [...byFamily.entries()].sort(
    (a, b) => b[1].sources.size - a[1].sources.size
  )) {
    L(
      `  ${f.padEnd(22)} ${String(e.sites).padStart(5)}   ${String(e.sources.size).padStart(7)}   ${String(soleFamily.get(f) ?? 0).padStart(6)}`
    );
  }

  L('');
  L('=== differing sources by their FAMILY SET ===');
  L('  (this is the real cost: a source whose only differences are metadata');
  L('   needs one decision for the whole family, not one per source)');
  const METADATA = new Set([
    'position',
    'semanticRoles-added',
    'field-only-trad',
    'field-only-sem',
  ]);
  const sets = new Map<string, number>();
  let metadataOnly = 0;
  for (const r of rows) {
    if (r.status !== 'differ') continue;
    const fams = [...new Set(r.sites.map(s => family(s.kind)))].sort();
    if (fams.every(f => METADATA.has(f))) metadataOnly++;
    const key = fams.join(' + ');
    sets.set(key, (sets.get(key) ?? 0) + 1);
  }
  for (const [k, n] of [...sets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    L(`  ${String(n).padStart(4)}  ${k}`);
  }
  L('');
  L(
    `  METADATA-ONLY (position / semanticRoles / field presence): ${metadataOnly} of ${status.get('differ') ?? 0}`
  );
  L(
    `  STRUCTURAL   (node-type / marker / me / arity / value):    ${(status.get('differ') ?? 0) - metadataOnly}`
  );

  L('');
  L('=== STRUCTURE LOSS (one side dropped what the other kept) ===');
  const lost = { 'sem-lost': new Set<number>(), 'trad-lost': new Set<number>() };
  for (const r of rows) {
    for (const site of r.sites) {
      const v = structureLoss(site);
      if (v) lost[v].add(r.index);
    }
  }
  L(`  semantic dropped structure in    ${String(lost['sem-lost'].size).padStart(3)} sources`);
  L(`  traditional dropped structure in ${String(lost['trad-lost'].size).padStart(3)} sources`);
  L(`  sources: sem-lost  ${[...lost['sem-lost']].join(', ')}`);
  L(`  sources: trad-lost ${[...lost['trad-lost']].join(', ')}`);

  L('');
  L('=== node-type transitions ===');
  for (const [k, e] of [...byKind.entries()]
    .filter(([k]) => k.startsWith('node-type:'))
    .sort((a, b) => b[1].sources.size - a[1].sources.size)) {
    L(
      `  ${k.replace('node-type:', '').padEnd(40)} ${String(e.sites).padStart(4)} sites  ${String(e.sources.size).padStart(3)} sources`
    );
  }

  L('');
  L('=== fields only one side emits ===');
  for (const [k, e] of [...byKind.entries()]
    .filter(([k]) => k.startsWith('field-only-'))
    .sort((a, b) => b[1].sources.size - a[1].sources.size)) {
    L(
      `  ${k.padEnd(40)} ${String(e.sites).padStart(4)} sites  ${String(e.sources.size).padStart(3)} sources`
    );
  }
  L('');
}

void main();
