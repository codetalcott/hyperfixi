// Hosts R4 (canonical validity) on the new engine.
//
// The gate's own checks (`foreign-canonical-validity.ts`, `canonical-validity.ts`) render
// every authored translation, and every English corpus row, to English and ask upstream
// `hyperscript.org` whether it parses. Here every string they ask about is put to the new
// engine as well, and the strings on which the two parsers disagree are listed. Upstream's
// answer is the one handed back, so the totals printed are the gate's.
//
//   npx tsx experiments/small-engine/matrix/r4.mts
//
// Reads `packages/patterns-reference/data/patterns.db` as it is on disk.
import {
  checkCorpusRenderValidity,
  loadCanonicalParser,
  type CanonicalValidate,
} from '../../../packages/testing-framework/src/multilingual/canonical-validity';
import { checkForeignRenderValidity } from '../../../packages/testing-framework/src/multilingual/foreign-canonical-validity';

const log = console.log;
console.warn = console.info = () => {};

await import('../src/bundles/spike');
const engine = (await import('../src/engine')).api;
const upstream = await loadCanonicalParser();
const next: CanonicalValidate = source => {
  try {
    return engine.parse(source).errors.map(e => e.message);
  } catch (e) {
    return ['threw: ' + (e instanceof Error ? e.message.split('\n')[0] : String(e))];
  }
};

const asked = new Set<string>();
const disagree = new Map<string, { upstream: string; next: string }>();
const both: CanonicalValidate = source => {
  const up = upstream(source);
  const mine = next(source);
  asked.add(source);
  if ((up.length === 0) !== (mine.length === 0)) {
    disagree.set(source, { upstream: up[0] ?? 'accepts', next: mine[0] ?? 'accepts' });
  }
  return up;
};

const corpus = await checkCorpusRenderValidity({ validate: both });
const foreign = await checkForeignRenderValidity({ validate: both });
log(`en corpus renders valid on upstream:      ${corpus.valid} / ${corpus.checked}`);
log(`foreign renders valid on upstream:        ${foreign.valid} / ${foreign.checked}`);
log(`distinct strings put to both parsers:     ${asked.size}`);
log(`strings the two parsers disagree on:      ${disagree.size}`);
for (const [source, verdict] of disagree) {
  log(`  ${JSON.stringify(source.replace(/\s+/g, ' ').slice(0, 150))}`);
  log(`      upstream: ${verdict.upstream.split('\n')[0]?.slice(0, 100)}`);
  log(`      new:      ${verdict.next.split('\n')[0]?.slice(0, 100)}`);
}
process.exit(0);
