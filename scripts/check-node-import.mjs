/**
 * Bare-Node import check for @hyperfixi/core.
 *
 * Guards the Node/SSR-safety of core's published entry points. morphlex does
 * module-scope DOM feature-detection (`"moveBefore" in Element.prototype`)
 * that threw `ReferenceError: Element is not defined` in bare Node until the
 * dom-globals shim (packages/core/src/lib/dom-globals-shim.ts) was added.
 * This check fails if that shim is dropped, reordered after morphlex, or a
 * dependency upgrade introduces a new module-scope DOM global.
 *
 * Runs from the repo root against built dist via workspace resolution
 * (CI: export-validation job, after build artifacts are restored).
 * Prints one `PASS <desc>` / `FAIL <desc>` line per check; exits 1 if any fail.
 */

let failed = 0;

async function check(desc, fn) {
  try {
    const detail = await fn();
    console.log(`PASS ${desc}${detail ? ` (${detail})` : ''}`);
  } catch (e) {
    console.log(`FAIL ${desc} — ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

await check('@hyperfixi/core — bare-Node import (main index)', async () => {
  const m = await import('@hyperfixi/core');
  // Name the entry points a Node consumer actually reaches for, rather than
  // leaning on a raw export count: the count was `> 40` until Arc 6b deleted
  // the 24 dead `features/` values (53 → 29), and a threshold that a
  // deletion of dead code can trip is measuring the wrong thing. The floor
  // below only catches an import that resolved to an empty or stub module.
  for (const name of ['hyperscript', 'parse', 'Runtime', 'createContext', 'getElementScopeMap']) {
    assert(name in m, `${name} missing`);
  }
  const exportCount = Object.keys(m).length;
  assert(exportCount > 20, `only ${exportCount} exports (expected > 20)`);
  return `${exportCount} exports`;
});

await check('@hyperfixi/core/commands — bare-Node import', async () => {
  const m = await import('@hyperfixi/core/commands');
  assert(typeof m.swap === 'function', 'swap factory missing');
  assert(typeof m.morph === 'function', 'morph factory missing');
  return 'swap + morph factories';
});

await check('@hyperfixi/core/behaviors — bare-Node import', async () => {
  const m = await import('@hyperfixi/core/behaviors');
  assert(typeof m.registerHistorySwap === 'function', 'registerHistorySwap missing');
  return 'registerHistorySwap';
});

process.exit(failed ? 1 : 0);
