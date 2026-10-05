/**
 * Node import smoke checks.
 *
 * Runs INSIDE the harness's temp install dir (see ../run.mjs), so every
 * `import` resolves the actual published package from node_modules — not a
 * workspace symlink. This catches broken `exports` maps, missing `files`,
 * and bad `dist` paths that source-aliased unit tests can't see.
 *
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

// Since 4.0 core's root is the engine, re-exported: the same objects, not a copy.
await check('@hyperfixi/core — the engine, re-exported, + /multilingual', async () => {
  const m = await import('@hyperfixi/core');
  const engine = await import('@hyperfixi/engine');
  assert(m.register === engine.register, "register is not @hyperfixi/engine's own");
  assert(typeof m.VERSION === 'string', 'VERSION missing');
  const ml = await import('@hyperfixi/core/multilingual');
  const es = await ml.translate('toggle .active', 'en', 'es');
  assert(es !== 'toggle .active', 'translate returned its input');
  return `${Object.keys(m).length} exports, /multilingual translates`;
});

await check('@hyperfixi/engine — bare-Node import, parse', async () => {
  const m = await import('@hyperfixi/engine');
  assert(typeof m.register === 'function', 'register missing');
  assert(Array.isArray(m.everything) && m.everything.length > 20, 'everything missing');
  m.register(...m.everything);
  const parsed = m.api.parse('on click toggle .active on me');
  assert(parsed.errors.length === 0, 'parse reported errors');
  return `${m.everything.length} modules, parse ok`;
});

// An engine module since 4.0 (a plugin for core's runtime before): registering it on
// the INSTALLED engine is what proves the two packages fit.
await check('@hyperfixi/speech — the speak module on the engine', async () => {
  const m = await import('@hyperfixi/speech');
  assert(typeof m.speak === 'function', 'speak missing');
  const engine = await import('@hyperfixi/engine');
  engine.register(...engine.everything, m.speak);
  const parsed = engine.api.parse('speak "hi" with rate 2');
  assert(parsed.errors.length === 0, `speak did not parse: ${parsed.errors[0]?.message}`);
  return 'speak registered, parses';
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

await check('@lokascript/i18n — vocabulary surface', async () => {
  // 3.0.0 deleted the grammar transformer (#1001); what i18n ships is
  // per-language vocabulary and grammar PROFILES. Translation lives in
  // @lokascript/semantic — asserted in the next check, so a release that
  // dropped it would still fail here.
  const m = await import('@lokascript/i18n');
  assert(typeof m.getProfile === 'function', 'getProfile missing');
  assert(typeof m.getSupportedLocales === 'function', 'getSupportedLocales missing');
  assert(m.LocaleManager && typeof m.LocaleManager.register === 'function', 'LocaleManager missing');
  assert(m.GrammarTransformer === undefined, 'GrammarTransformer came back — it was deleted in 3.0.0');
  return 'getProfile + getSupportedLocales + LocaleManager';
});

await check('@lokascript/semantic — translate surface', async () => {
  const m = await import('@lokascript/semantic');
  assert(typeof m.translate === 'function', 'translate missing');
  return 'translate';
});

process.exit(failed ? 1 : 0);
