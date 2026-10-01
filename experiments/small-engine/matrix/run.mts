// Hosts the value matrix on the new engine.
//
// The cells, the fixture and the oracle are the gate's own
// (`packages/testing-framework/src/multilingual/value-matrix.ts`): each cell's English
// source runs on upstream `hyperscript.org`, and that result is what every lane must
// produce. This driver runs the multilingual TEXT path on two hosts and compares them:
//
//   en        the English source                               on the new engine
//   en-rt     semantic's English round trip                    on upstream / on the new engine
//   <L>       semantic's translation, through the adapter's    on upstream / on the new engine
//             `preprocess` (back to English)
//
// The adapter lanes on upstream are the gate's `<L>/up` lanes. What this adds is the same
// English strings on the new engine, so a difference between the two hosts is a difference
// between the engines and nothing else.
//
//   npx tsx experiments/small-engine/matrix/run.mts [--positions put,set] [--languages es,ja]
//                                                   [--limit N] [--out results.json] [--show N]
//
// Needs fresh dists of `@lokascript/semantic` and `@lokascript/hyperscript-adapter`.
// A loop whose condition a translation lost never ends on upstream; the gate stops it with
// an evaluation budget. The new engine has no such hook, so a string that spent the budget
// on upstream is not run on it (`✗budget`).
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { installGlobals } from '../../../packages/testing-framework/src/multilingual/shipped-examples-execution';
import {
  FIXTURE,
  FOREIGN_LANGUAGES,
  GLOBALS,
  NAME_VALUE,
  collidingNames,
  generateCells,
} from '../../../packages/testing-framework/src/multilingual/value-matrix';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const say = (line: string): void => void process.stdout.write(line + '\n');

interface Host {
  parse(source: string): { errors?: Array<{ message: string }> } | undefined;
  processNode(element: Element): void;
}
interface Upstream extends Host {
  internals: { runtime: { unifiedEval(parseElement: unknown, context: unknown): unknown } };
}

const EVAL_BUDGET = 20_000;
const failed = (result: string): boolean => result.startsWith('✗') || result === '∅';

// ---------------------------------------------------------------------------
// One window, both engines
// ---------------------------------------------------------------------------

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
installGlobals(dom);
// `installGlobals` leaves the names node defines itself. The new engine asks
// `instanceof EventTarget` before it listens, and an element is the window's kind, not node's.
Reflect.set(globalThis, 'EventTarget', dom.window.EventTarget);

let reportedErrors = 0;
console.log = console.warn = console.info = () => {};
console.error = () => void reportedErrors++;
process.removeAllListeners('unhandledRejection');
process.on('unhandledRejection', () => void reportedErrors++);

const { parseSemantic, render } = await import('@lokascript/semantic');
const { preprocess } = await import('@lokascript/hyperscript-adapter');
const require = createRequire(
  pathToFileURL(join(here, '../../../packages/testing-framework/package.json'))
);
const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
const upstream: Upstream = (await import(pathToFileURL(esm).href)).default;
await import('../src/bundles/spike');
const engine: Host = (await import('../src/engine')).api;

const runtime = upstream.internals.runtime;
const unifiedEval = runtime.unifiedEval.bind(runtime);
let evaluations = 0;
runtime.unifiedEval = (parseElement, context) => {
  if (++evaluations > EVAL_BUDGET) throw new Error('value matrix: evaluation budget spent');
  return unifiedEval(parseElement, context);
};

const window = dom.window;
const document = window.document;
const headAtStart = document.head.innerHTML;
const names = collidingNames();

function reset(): HTMLElement {
  if (!document.body) {
    const html = document.documentElement ?? document.appendChild(document.createElement('html'));
    html.innerHTML = `<head>${headAtStart}</head><body></body>`;
  }
  document.body.innerHTML = FIXTURE;
  for (const [name, make] of Object.entries(GLOBALS)) {
    const value = make();
    Reflect.set(window, name, value);
    Reflect.set(globalThis, name, value);
  }
  for (const { name } of names) {
    Reflect.set(window, name, NAME_VALUE);
    Reflect.set(globalThis, name, NAME_VALUE);
  }
  const button = document.getElementById('b');
  if (!button) throw new Error('fixture has no #b');
  return button;
}

/** Run English on a host: what it left in `#out`, or why it could not. */
function runOn(host: Host, source: string): string {
  try {
    const errors = host.parse(source)?.errors ?? [];
    if (errors.length) return `✗parse: ${errors[0]?.message.split('\n')[0] ?? ''}`;
    const button = reset();
    button.setAttribute('_', source);
    evaluations = 0;
    const before = reportedErrors;
    host.processNode(button);
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    if (evaluations > EVAL_BUDGET) return '✗budget';
    const got = document.getElementById('out')?.textContent ?? '✗no #out';
    return reportedErrors > before && got === '∅' ? '✗threw' : got;
  } catch (e) {
    return `✗threw: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`;
  }
}

/** The same English on both hosts. */
function onBoth(english: string): { up: string; next: string } {
  const up = runOn(upstream, english);
  return { up, next: up === '✗budget' ? up : runOn(engine, english) };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const positions = opt('positions')?.split(',');
const languages = opt('languages')?.split(',') ?? [...FOREIGN_LANGUAGES];
let cells = generateCells().filter(c => !positions || positions.includes(c.position));
if (opt('limit')) cells = cells.slice(0, Number(opt('limit')));

interface Row {
  id: string;
  lane: string;
  english: string;
  want: string;
  up: string;
  next: string;
}
/** Every (cell, lane) where the two hosts disagree, or the new engine misses the oracle. */
const rows: Row[] = [];
const tally = {
  cells: cells.length,
  invalid: 0,
  english: { run: 0, pass: 0 },
  roundTrip: { run: 0, upPass: 0, nextPass: 0, differ: 0 },
  adapter: { run: 0, untranslatable: 0, upPass: 0, nextPass: 0, differ: 0 },
};
const differByLanguage: Record<string, number> = {};
const started = performance.now();

/** Two hosts agree when both fail, or both produce the same value. */
const agree = (a: string, b: string): boolean => (failed(a) && failed(b)) || a === b;

for (const [index, cell] of cells.entries()) {
  if (index % 250 === 0)
    process.stderr.write(`  ${index} / ${cells.length}  ${cell.id.slice(0, 60)}\n`);
  const want = runOn(upstream, cell.source);
  if (failed(want)) {
    tally.invalid++;
    continue;
  }

  const next = runOn(engine, cell.source);
  tally.english.run++;
  if (next === want) tally.english.pass++;
  else rows.push({ id: cell.id, lane: 'en', english: cell.source, want, up: want, next });

  const node = parseSemantic(cell.source, 'en').node;
  if (!node) continue;

  const roundTrip = render(node, 'en');
  const rt = onBoth(roundTrip);
  tally.roundTrip.run++;
  if (rt.up === want) tally.roundTrip.upPass++;
  if (rt.next === want) tally.roundTrip.nextPass++;
  if (!agree(rt.up, rt.next)) {
    tally.roundTrip.differ++;
    rows.push({ id: cell.id, lane: 'en-rt', english: roundTrip, want, ...rt });
  }

  for (const language of languages) {
    if (cell.skip?.includes(language)) continue;
    let english: string;
    try {
      english = preprocess(render(node, language), language);
    } catch {
      tally.adapter.untranslatable++;
      continue;
    }
    const got = onBoth(english);
    tally.adapter.run++;
    if (got.up === want) tally.adapter.upPass++;
    if (got.next === want) tally.adapter.nextPass++;
    if (!agree(got.up, got.next)) {
      tally.adapter.differ++;
      differByLanguage[language] = (differByLanguage[language] ?? 0) + 1;
      rows.push({ id: cell.id, lane: language, english, want, ...got });
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const seconds = Math.round((performance.now() - started) / 1000);
say(`cells ${tally.cells} (oracle unusable: ${tally.invalid})  ${seconds}s`);
say(`en       new engine matches the oracle: ${tally.english.pass} / ${tally.english.run}`);
say(
  `en-rt    upstream ${tally.roundTrip.upPass} / ${tally.roundTrip.run}, ` +
    `new engine ${tally.roundTrip.nextPass} / ${tally.roundTrip.run}, hosts differ: ${tally.roundTrip.differ}`
);
say(
  `adapter  upstream ${tally.adapter.upPass} / ${tally.adapter.run}, ` +
    `new engine ${tally.adapter.nextPass} / ${tally.adapter.run}, hosts differ: ${tally.adapter.differ}` +
    (tally.adapter.untranslatable ? `, untranslatable: ${tally.adapter.untranslatable}` : '')
);
if (tally.adapter.differ) say('differ by language: ' + JSON.stringify(differByLanguage));

// Group what is left by the English string: one engine difference shows up in many lanes.
const groups = new Map<string, { row: Row; lanes: string[] }>();
for (const row of rows) {
  const key = `${row.english}\u0000${row.up}\u0000${row.next}`;
  const group = groups.get(key);
  if (group) group.lanes.push(row.lane);
  else groups.set(key, { row, lanes: [row.lane] });
}
const show = Number(opt('show') ?? 40);
say(`\n${rows.length} rows in ${groups.size} distinct (English, upstream, new engine) triples`);
for (const { row, lanes } of [...groups.values()].slice(0, show)) {
  say(`  ${JSON.stringify(row.english)}`);
  say(
    `      want ${JSON.stringify(row.want)}  upstream ${JSON.stringify(row.up).slice(0, 70)}  ` +
      `new ${JSON.stringify(row.next).slice(0, 70)}  [${lanes.length} lanes: ${lanes.slice(0, 6).join(' ')}${lanes.length > 6 ? ' …' : ''}]`
  );
}
if (opt('out')) writeFileSync(String(opt('out')), JSON.stringify({ tally, rows }, null, 1) + '\n');
process.exit(0);
