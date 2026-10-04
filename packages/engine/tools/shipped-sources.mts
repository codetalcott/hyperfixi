// What the engine reads of what this repository ships.
//
// Every hyperscript source in `examples/` and the doc trees (the shipped-sources gate's own
// collection) is put to two parsers: upstream `hyperscript.org`'s and this engine's. A source
// written in another language (under a non-English `lang`) is left to the localized gate. The
// English sources this engine rejects are grouped by its error, which names the form; the
// sources the two parsers disagree on are each a fidelity question.
//
// (Until Phase C4 `packages/core`'s parser was a third column: the sources core accepted and
// this engine rejected were what replacing core's engine would break. That list reached zero.)
//
//   npx tsx packages/engine/tools/shipped-sources.mts [--show N]
import { JSDOM } from 'jsdom';
import { loadCanonicalParser } from '../../testing-framework/src/multilingual/canonical-validity';
import { installGlobals } from '../../testing-framework/src/multilingual/shipped-examples-execution';
import {
  collectLocalizedSources,
  collectShippedSources,
} from '../../testing-framework/src/multilingual/shipped-sources-validity';

const log = console.log;
console.log = console.warn = console.info = console.error = () => {};
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
installGlobals(dom);

const { api, everything, register } = await import('../src/index');
register(...everything);
const upstream = await loadCanonicalParser();

const engineError = (source: string): string | undefined => {
  try {
    return api.parse(source).errors[0]?.message.split('\n')[0];
  } catch (e) {
    return 'threw: ' + (e instanceof Error ? e.message.split('\n')[0] : String(e));
  }
};

const sources = collectShippedSources(dom.window.document);
const foreign = new Set(collectLocalizedSources().map(s => s.source));
const unique = new Map<string, string[]>();
for (const { source, file } of sources) {
  if (foreign.has(source)) continue;
  unique.set(source, [...(unique.get(source) ?? []), file]);
}

const tally = { upstreamReads: 0, engineReads: 0 };
const groups = new Map<string, { sources: string[]; files: Set<string>; upstream: number }>();
/** Sources upstream and this engine do not agree on: each is a fidelity question. */
const disagree: [string, string][] = [];
for (const [source, files] of unique) {
  const onUpstream = upstream(source).length === 0;
  const error = engineError(source);
  if (onUpstream) tally.upstreamReads++;
  if (!error) {
    tally.engineReads++;
  } else {
    const key = error.replace(/'[^']*'$/, "'…'").slice(0, 70);
    const group = groups.get(key) ?? { sources: [], files: new Set(), upstream: 0 };
    group.sources.push(source);
    for (const file of files) group.files.add(file);
    if (onUpstream) group.upstream++;
    groups.set(key, group);
  }
  if (onUpstream === !!error)
    disagree.push([
      source,
      onUpstream ? `engine: ${error}` : `upstream: ${upstream(source)[0]?.split('\n')[0]}`,
    ]);
}

const show = Number(process.argv[process.argv.indexOf('--show') + 1]) || 2;
log(
  `shipped sources: ${sources.length} (${unique.size} distinct in English; ` +
    `${foreign.size} in another language left out)`
);
log(`  upstream accepts ${tally.upstreamReads}, this engine accepts ${tally.engineReads}`);
log(`  this engine rejects: ${unique.size - tally.engineReads}`);
log(`  upstream and this engine disagree on: ${disagree.length}`);
for (const [source, why] of disagree) {
  log(`       ${JSON.stringify(source.replace(/\s+/g, ' ').slice(0, 150))}\n         ${why}`);
}
log(`\nwhat this engine rejects, by its error (sources, files; how many upstream accepts):`);
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
