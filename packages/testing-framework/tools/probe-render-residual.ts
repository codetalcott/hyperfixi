#!/usr/bin/env npx tsx
/**
 * Dump every wrapped + bare render-fidelity failure with full detail (the
 * English source, the rendered surface, and the missing actions/roles) — the
 * triage companion to the two allowlists. Run against a FRESHLY populated
 * patterns.db (same DB dependency as the gates), then diff successive runs'
 * `^W |^B ` lines to prove a fix cleared exactly its target pairs:
 *
 *   npx tsx tools/probe-render-residual.ts > /tmp/residual.txt
 *   grep -E '^W |^B ' /tmp/residual.txt | sort > /tmp/pairs.txt
 *
 * Used to drive the #956-#969 render-residual burn-down.
 */
import { checkRenderFidelity } from '../src/multilingual/render-fidelity';
import { checkBareRenderFidelity } from '../src/multilingual/bare-render-fidelity';

function dump(tag: string, failures: readonly any[]) {
  console.log(`\n######## ${tag}: ${failures.length} failing pairs ########`);
  for (const f of failures) {
    console.log('---');
    console.log(`${tag} ${f.id} [${f.language}]${f.unparseable ? ' UNPARSEABLE' : ''}`);
    console.log(`  en : ${f.english.replace(/\n/g, '\\n')}`);
    console.log(`  out: ${f.rendered.replace(/\n/g, '\\n')}`);
    if (f.missingActions.length) console.log(`  missingActions: ${f.missingActions.join(', ')}`);
    if (f.missingRoles.length) console.log(`  missingRoles: ${f.missingRoles.join(' | ')}`);
  }
}

async function main() {
  const wrapped = await checkRenderFidelity();
  console.log(`WRAPPED checked=${wrapped.checked} clean=${wrapped.clean}`);
  dump('W', wrapped.failures);
  const bare = await checkBareRenderFidelity();
  console.log(`\nBARE checked=${bare.checked} clean=${bare.clean}`);
  dump('B', bare.failures);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
