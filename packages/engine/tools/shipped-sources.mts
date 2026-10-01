// What the engine reads of what this repository ships.
//
// Every hyperscript source in `examples/` and the doc trees (the shipped-sources gate's own
// collection) is put to three parsers: `packages/core`'s, upstream `hyperscript.org`'s and
// this engine's. The sources core accepts and this engine rejects are what replacing core's
// engine would break for a page copied from our own material. They are grouped by the
// engine's error, which names the form.
//
//   npx tsx packages/engine/tools/shipped-sources.mts [--show N]
import { JSDOM } from 'jsdom';
import { loadCanonicalParser } from '../../testing-framework/src/multilingual/canonical-validity';
import { installGlobals } from '../../testing-framework/src/multilingual/shipped-examples-execution';
import { collectShippedSources } from '../../testing-framework/src/multilingual/shipped-sources-validity';

const log = console.log;
console.log = console.warn = console.info = console.error = () => {};
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
installGlobals(dom);

const core = await import('@hyperfixi/core');
const { api, everything, register } = await import('../src/index');
register(...everything);
const upstream = await loadCanonicalParser();

const coreAccepts = (source: string): boolean => {
  try {
    const result = core.hyperscript.compileSync(source);
    return result.ok && !result.errors?.length;
  } catch {
    return false;
  }
};
const engineError = (source: string): string | undefined => {
  try {
    return api.parse(source).errors[0]?.message.split('\n')[0];
  } catch (e) {
    return 'threw: ' + (e instanceof Error ? e.message.split('\n')[0] : String(e));
  }
};

const sources = collectShippedSources(dom.window.document);
const unique = new Map<string, string[]>();
for (const { source, file } of sources) unique.set(source, [...(unique.get(source) ?? []), file]);

const tally = { all: 0, coreOnly: 0, upstreamToo: 0, engineReads: 0, engineOnlyRejects: 0 };
const groups = new Map<string, { sources: string[]; files: Set<string>; upstream: number }>();
/** Sources upstream and this engine do not agree on: each is a fidelity question. */
const disagree: [string, string][] = [];
let coreAccepted = 0;
let coreAndEngine = 0;
for (const [source, files] of unique) {
  tally.all++;
  const onCore = coreAccepts(source);
  const onUpstream = upstream(source).length === 0;
  const error = engineError(source);
  if (!error) tally.engineReads++;
  if (onUpstream === !!error)
    disagree.push([
      source,
      onUpstream ? `engine: ${error}` : `upstream: ${upstream(source)[0]?.split('\n')[0]}`,
    ]);
  if (onUpstream) tally.upstreamToo++;
  if (!onCore) continue;
  coreAccepted++;
  if (!error) {
    coreAndEngine++;
    continue;
  }
  if (!onUpstream) tally.coreOnly++;
  const key = error.replace(/'[^']*'$/, "'…'").slice(0, 70);
  const group = groups.get(key) ?? { sources: [], files: new Set(), upstream: 0 };
  group.sources.push(source);
  for (const file of files) group.files.add(file);
  if (onUpstream) group.upstream++;
  groups.set(key, group);
}

const show = Number(process.argv[process.argv.indexOf('--show') + 1]) || 2;
log(`shipped sources: ${sources.length} (${unique.size} distinct)`);
log(`  upstream accepts ${tally.upstreamToo}, this engine accepts ${tally.engineReads}`);
log(`  core accepts ${coreAccepted}; of those this engine accepts ${coreAndEngine}`);
log(`  core accepts and this engine rejects: ${coreAccepted - coreAndEngine}`);
log(`  upstream and this engine disagree on: ${disagree.length}`);
for (const [source, why] of disagree) {
  log(`       ${JSON.stringify(source.replace(/\s+/g, ' ').slice(0, 150))}\n         ${why}`);
}
log(`\nby the engine's error (sources, files; how many upstream accepts):`);
for (const [key, group] of [...groups].sort((a, b) => b[1].sources.length - a[1].sources.length)) {
  log(
    `\n${String(group.sources.length).padStart(4)} sources, ${group.files.size} files` +
      (group.upstream ? `, UPSTREAM ACCEPTS ${group.upstream}` : '') +
      `   ${key}`
  );
  for (const source of group.sources.slice(0, show)) {
    log(`       ${JSON.stringify(source.replace(/\s+/g, ' ').slice(0, 130))}`);
  }
}
process.exit(0);
