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
  assert(typeof m.getElementScopeMap === 'function', 'getElementScopeMap missing');
  const exportCount = Object.keys(m).length;
  assert(exportCount > 40, `only ${exportCount} exports (expected > 40)`);
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
