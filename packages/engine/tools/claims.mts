// The claims check: each module upstream lacks (src/additions.ts) lists the sources it gives a
// meaning to (tests/claims.json), and each is read and run on upstream to see what that meaning
// replaces. The tier a module may have follows from the worst of its claims:
//   addition     upstream rejects every claim (a parse error): no upstream script changes
//   trap-repair  upstream reads a claim but it fails when run: no working script changes
//   dialect      upstream reads and runs a claim: a script that works upstream would change
// The gate: a module's tier in tests/claims.json is the tier its claims measure; the engine reads
// and runs every claim; and the engine WITHOUT the module reads each claim as upstream does
// (otherwise the claim is not the module's).
//   npm run check:claims --prefix packages/engine
//   npx tsx packages/engine/tools/claims.mts --report    every claim and what each reader did
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { installGlobals } from '../../testing-framework/src/multilingual/shipped-examples-execution';

const here = dirname(fileURLToPath(import.meta.url));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
installGlobals(dom);

const firstLine = (s: unknown) => String(s).trim().split('\n')[0] ?? '';
const errors: string[] = [];
const log = console.log;
console.error = (...a: unknown[]) =>
  void errors.push(
    a
      .filter(x => !(x instanceof dom.window.Element))
      .map(firstLine)
      .join(' ')
  );
process.on('unhandledRejection', e => void errors.push(firstLine(e)));

interface Host {
  parse(source: string): { errors?: Array<{ message: string }> } | undefined;
  processNode(element: Element): void;
}
const require = createRequire(pathToFileURL(join(here, '../../testing-framework/package.json')));
const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
const upstream: Host = (await import(pathToFileURL(esm).href)).default;
// After the DOM globals: the engine's modules are imported, not hoisted above installGlobals.
await import('../src/bundles/full');
const { api: engine } = await import('../src/engine');
const { everything } = await import('../src/everything');
const { ParseError, Parser, createGrammar } = await import('../src/parser');
const { program } = await import('../src/statements');
const { tokenize } = await import('../src/tokenizer');
const additions: Record<string, unknown> = await import('../src/additions');

type Module = (typeof everything)[number];
const TIERS = ['addition', 'trap-repair', 'dialect'] as const;
type Tier = (typeof TIERS)[number];
/** What upstream does with a claim, in the order of the tier it implies. */
const OUTCOMES = ['rejected', 'fails when run', 'runs'] as const;
type Outcome = (typeof OUTCOMES)[number];

interface Claim {
  /** A handler on a `<button>` that is clicked. */
  source: string;
  /** Markup put beside the button first. */
  html?: string;
  /** Why the engine only reads this claim here (jsdom lacks the API it calls; tests/additions.js runs it). */
  parseOnly?: string;
}
interface Result {
  outcome: Outcome;
  error?: string;
  /** The button's text after a run. */
  text?: string;
}
interface Entry {
  tier: Tier;
  note?: string;
  claims: Claim[];
}

/** Read `source` on `host`; if it reads, run it once and report what happened. */
async function run(host: Host, claim: Claim, readOnly = false): Promise<Result> {
  errors.length = 0;
  let bad: Array<{ message: string }>;
  try {
    bad = host.parse(claim.source)?.errors ?? [];
  } catch (e) {
    bad = [{ message: String(e instanceof Error ? e.message : e) }];
  }
  if (bad.length) return { outcome: 'rejected', error: firstLine(bad[0]?.message) };
  if (readOnly) return { outcome: 'runs' };
  const box = document.createElement('div');
  box.innerHTML = claim.html ?? '';
  const button = document.createElement('button');
  button.setAttribute('_', claim.source);
  box.append(button);
  document.body.append(box);
  host.processNode(box);
  button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 20));
  box.remove();
  const text = button.textContent ?? '';
  return errors.length
    ? { outcome: 'fails when run', error: errors[0], text }
    : { outcome: 'runs', text };
}

const describe = (r: Result) =>
  r.outcome +
  (r.error ? `: ${r.error.slice(0, 100)}` : '') +
  (r.text !== undefined ? `  (text ${JSON.stringify(r.text)})` : '');

/** Whether the engine reads `source` with every module but `without`. */
function readsWithout(without: Module, source: string): boolean {
  const g = createGrammar();
  for (const mod of everything) if (mod !== without) mod(g);
  const p = new Parser(g, tokenize(source), source);
  try {
    program(p);
    if (p.hasMore()) p.err();
    return true;
  } catch (e) {
    if (e instanceof ParseError) return false;
    throw e;
  }
}

const report = process.argv.includes('--report');
const entries: Record<string, Entry> = JSON.parse(
  readFileSync(join(here, '../tests/claims.json'), 'utf8')
);
const problems: string[] = [];

const modules = Object.entries(additions).filter(
  (pair): pair is [string, Module] => typeof pair[1] === 'function'
);
for (const name of Object.keys(entries))
  if (!modules.some(([n]) => n === name))
    problems.push(`tests/claims.json lists '${name}', which src/additions.ts does not export`);

for (const [name, mod] of modules) {
  const entry = entries[name];
  if (!entry?.claims.length) {
    problems.push(`${name}: no claims in tests/claims.json`);
    continue;
  }
  let worst = 0;
  for (const claim of entry.claims) {
    const up = await run(upstream, claim);
    const own = await run(engine, claim, !!claim.parseOnly);
    const without = readsWithout(mod, claim.source);
    worst = Math.max(worst, OUTCOMES.indexOf(up.outcome));
    if (report) {
      log(`${name}  ${claim.source}`);
      log(`   upstream          ${describe(up)}`);
      log(
        `   engine            ${claim.parseOnly ? `reads (not run: ${claim.parseOnly})` : describe(own)}`
      );
      log(`   engine without it ${without ? 'reads' : 'rejected'}`);
    }
    if (own.outcome !== 'runs')
      problems.push(`${name}: the engine does not run its claim: ${claim.source} (${own.error})`);
    if (without !== (up.outcome !== 'rejected'))
      problems.push(
        `${name}: without the module the engine ${without ? 'reads' : 'rejects'} what upstream ` +
          `${up.outcome === 'rejected' ? 'rejects' : 'reads'}: ${claim.source}`
      );
  }
  const measured = TIERS[worst];
  log(`${name}: ${entry.claims.length} claims, measured ${measured} (listed ${entry.tier})`);
  if (measured !== entry.tier)
    problems.push(`${name}: listed as ${entry.tier} in tests/claims.json, measured ${measured}`);
}

for (const problem of problems) log(`✗ ${problem}`);
if (!problems.length) log('every claim measures as listed');
process.exit(problems.length ? 1 : 0);
