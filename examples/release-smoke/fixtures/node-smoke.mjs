/**
 * Node import smoke checks.
 *
 * Runs INSIDE the harness's temp install dir (see ../run.mjs), so every
 * `import` resolves the actual published package from node_modules — not a
 * workspace symlink. This catches broken `exports` maps, missing `files`,
 * and bad `dist` paths that source-aliased unit tests can't see.
 *
 * Prints one `PASS <desc>` / `FAIL <desc>` line per check; exits 1 if any fail.
 *
 * NOTE: @hyperfixi/components references browser globals (`Element`) at
 * module scope and cannot be imported in bare Node — it is verified by the
 * browser-bundle stage of run.mjs instead. @hyperfixi/core is Node-safe
 * since 2.7.2 (dom-globals shim ahead of morphlex) and is checked below.
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

await check('@hyperfixi/core — bare-Node import (dom-globals shim)', async () => {
  const m = await import('@hyperfixi/core');
  assert(typeof m.getElementScopeMap === 'function', 'getElementScopeMap missing');
  const commands = await import('@hyperfixi/core/commands');
  assert(typeof commands.swap === 'function', 'commands.swap missing');
  return `${Object.keys(m).length} exports + /commands`;
});

await check('@hyperfixi/speech — plugin + commands', async () => {
  const m = await import('@hyperfixi/speech');
  assert(m.speechPlugin?.name === '@hyperfixi/speech', 'speechPlugin.name mismatch');
  assert(typeof m.speechPlugin.install === 'function', 'speechPlugin.install missing');
  assert(m.speakCommand && m.askCommand && m.answerCommand, 'command exports missing');
  return 'speechPlugin + speak/ask/answer';
});

await check('@hyperfixi/reactivity — plugin', async () => {
  const m = await import('@hyperfixi/reactivity');
  assert(m.reactivityPlugin?.name === '@hyperfixi/reactivity', 'reactivityPlugin.name mismatch');
  assert(typeof m.reactivityPlugin.install === 'function', 'reactivityPlugin.install missing');
  return 'reactivityPlugin';
});

await check('@hyperfixi/vite-plugin — plugin factory', async () => {
  const m = await import('@hyperfixi/vite-plugin');
  assert(typeof m.default === 'function', 'default export is not a function');
  return 'default export callable';
});

await check('@lokascript/semantic — parser surface', async () => {
  const m = await import('@lokascript/semantic');
  assert(m.KNOWN_PROFILES && typeof m.KNOWN_PROFILES === 'object', 'KNOWN_PROFILES missing');
  assert(typeof m.parseSemantic === 'function', 'parseSemantic missing');
  return 'KNOWN_PROFILES + parseSemantic';
});

await check('@lokascript/i18n — grammar surface', async () => {
  const m = await import('@lokascript/i18n');
  assert(typeof m.GrammarTransformer === 'function', 'GrammarTransformer missing');
  assert(typeof m.translate === 'function', 'translate missing');
  return 'GrammarTransformer + translate';
});

process.exit(failed ? 1 : 0);
