#!/usr/bin/env node
/**
 * Generate localized htmx-compat vocab modules from @lokascript/semantic
 * profiles + @lokascript/i18n dictionaries.
 *
 * Phase 8c of htmx-v4-reactive-streaming.md. Adapts the loka-js generator
 * pattern (https://github.com/wmtalcott/loka-js/blob/main/scripts/gen-locales.mjs)
 * for our three namespaces (hx-*, sse-*, ws-*).
 *
 * Output: one self-registering ES script per priority language under
 *   packages/core/vocab/htmx/{lang}.js
 *
 * Each emitted module calls `window.__hyperfixi_i18n.register('xx', { ... })`,
 * so consumers wire vocab via a single <script src=".../htmx/{lang}.js">
 * tag in their page (loka-js convention). Lives outside `dist/` because
 * artifacts are committed (matches loka-js's `locales/` and `dom-vocab/`
 * placement); regeneration is tracked via `npm run generate:htmx-vocab`.
 *
 * Usage:
 *   node packages/core/scripts/gen-htmx-vocab.mjs
 *
 * The semantic profile and i18n dictionary packages must be built first
 * (the script imports from dist/). CI runs build for both before invoking.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HTMX_ATTR_VOCAB } from './htmx-attr-vocab.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

/**
 * Canonical attribute-key registry. Must stay in sync with
 * [packages/core/src/htmx/i18n-hooks.ts](../src/htmx/i18n-hooks.ts) `KEYS`.
 * Duplicated here so the script needs no compile step on the core source.
 */
const KEYS = {
  hx: [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'target',
    'swap',
    'trigger',
    'confirm',
    'boost',
    'vals',
    'headers',
    'push-url',
    'replace-url',
    'on',
    'live',
  ],
  sse: ['connect', 'swap'],
  ws: ['connect', 'send'],
};

/**
 * Keys localized for the htmx-adapter only. Core's embedded htmx-compat
 * layer does not implement these attributes, so they stay OUT of `KEYS`
 * (which mirrors core and feeds its discovery/observer lists). Under the
 * adapter stock htmx implements them, and canonicalization is data-driven
 * from the emitted attrs map — so emitting the name is all it takes.
 */
const ADAPTER_ONLY_KEYS = {
  hx: ['indicator', 'include'],
  sse: [],
  ws: [],
};

/** Every key the generator resolves, per namespace, in emission order. */
const ALL_KEYS = Object.fromEntries(
  Object.keys(KEYS).map(ns => [ns, [...KEYS[ns], ...ADAPTER_ONLY_KEYS[ns]]])
);

/**
 * Languages to emit vocab modules for. Originally the eight Phase 0
 * priority languages (en/es/fr/ja/zh/ar/ko/de); expanded over time as
 * Phase 8 keywords were added to additional semantic profiles. The full
 * set now covers every semantic profile that has the four Phase 8
 * keywords (connect/stream/live/socket) populated.
 */
const PRIORITY_LANGS = [
  // Original Phase 8 priority eight
  'en', 'es', 'fr', 'ja', 'zh', 'ar', 'ko', 'de',
  // Tier 2 (added after initial rollout)
  'pt', 'it', 'ru', 'uk', 'pl', 'tr',
  // Tier 3 (filled in the 24-lang expansion)
  'hi', 'bn', 'vi', 'id', 'ms', 'tl', 'th', 'he', 'sw', 'qu',
];

/** Map of priority code → semantic profile import path. */
const PROFILE_MODULES = {
  en: 'english',
  es: 'spanish',
  fr: 'french',
  ja: 'japanese',
  zh: 'chinese',
  ar: 'arabic',
  ko: 'korean',
  de: 'german',
  pt: 'portuguese',
  it: 'italian',
  ru: 'russian',
  uk: 'ukrainian',
  pl: 'polish',
  tr: 'turkish',
  hi: 'hindi',
  bn: 'bengali',
  vi: 'vietnamese',
  id: 'indonesian',
  ms: 'malay',
  tl: 'tagalog',
  th: 'thai',
  he: 'hebrew',
  sw: 'swahili',
  qu: 'quechua',
};

/**
 * Load semantic profiles from the built dist. The semantic package
 * bundles all profile exports into the single `dist/index.js`, so we
 * import once and pluck the named exports.
 */
async function loadProfiles() {
  const indexUrl = pathToFileURL(
    resolve(REPO_ROOT, 'packages/semantic/dist/index.js')
  ).href;
  const mod = await import(indexUrl);
  const out = {};
  for (const [code, modName] of Object.entries(PROFILE_MODULES)) {
    const exportName = `${modName}Profile`;
    if (!mod[exportName]) {
      throw new Error(`Expected export ${exportName} from ${indexUrl}`);
    }
    out[code] = mod[exportName];
  }
  return out;
}

/** Load i18n dictionaries from the built dist (bundled in dictionaries/index.js). */
async function loadDictionaries() {
  const url = pathToFileURL(
    resolve(REPO_ROOT, 'packages/i18n/dist/dictionaries/index.js')
  ).href;
  const mod = await import(url);
  const out = {};
  for (const code of PRIORITY_LANGS) {
    if (!mod[code]) {
      throw new Error(`Expected export ${code} from ${url}`);
    }
    out[code] = mod[code];
  }
  return out;
}

/**
 * Resolve a localized keyword from a profile. Returns null if no
 * translation exists — the generator omits it from `attrs` so the
 * runtime falls back to the canonical English form.
 *
 * Lookup order:
 *   1. `HTMX_ATTR_VOCAB[lang][ns][key]` — hand-authored attribute names for
 *      keys that are not hyperscript keywords (see htmx-attr-vocab.mjs)
 *   2. `profile.keywords[key].primary` (the usual source for command/modifier keywords)
 *   3. `profile.references[key]` (for `target`, `event`, etc. which are
 *      stored in `references` because they're context-variable names)
 */
function localizedKeyword(profile, key, authored) {
  if (authored && authored !== key) return authored;
  const fromKeywords = profile?.keywords?.[key]?.primary;
  if (fromKeywords && fromKeywords !== key) return fromKeywords;
  const fromReferences = profile?.references?.[key];
  if (typeof fromReferences === 'string' && fromReferences && fromReferences !== key) {
    return fromReferences;
  }
  return null;
}

/**
 * Reject a hand-authored table that cannot work: a key the generator never
 * resolves (a typo would otherwise be silently dropped), or a name the HTML
 * parser would mangle (it lowercases attribute names and splits on
 * whitespace, `=`, `/`, `>` and quotes).
 */
function validateAuthoredVocab() {
  for (const [lang, vocab] of Object.entries(HTMX_ATTR_VOCAB)) {
    if (!PROFILE_MODULES[lang]) {
      throw new Error(`htmx-attr-vocab: unknown language "${lang}"`);
    }
    for (const ns of Object.keys(ALL_KEYS)) {
      for (const [key, name] of Object.entries(vocab[ns] ?? {})) {
        if (!ALL_KEYS[ns].includes(key)) {
          throw new Error(`htmx-attr-vocab: ${lang}.${ns}.${key} is not a known ${ns}- key`);
        }
        if (!name || /[\s"'<>\/=]/.test(name) || name !== name.toLowerCase()) {
          throw new Error(
            `htmx-attr-vocab: ${lang}.${ns}.${key} = "${name}" is not a valid attribute name ` +
              `(no whitespace, quotes, "=", "/", "<", ">" or uppercase)`
          );
        }
      }
    }
    for (const key of Object.keys(vocab.lowConfidence ?? {})) {
      if (!Object.keys(ALL_KEYS).some(ns => vocab[ns]?.[key])) {
        throw new Error(`htmx-attr-vocab: ${lang}.lowConfidence.${key} flags a key with no entry`);
      }
    }
  }
}

/** Build the `attrs` map for one language. */
function buildAttrs(lang, profile) {
  const attrs = {};
  for (const ns of Object.keys(ALL_KEYS)) {
    for (const key of ALL_KEYS[ns]) {
      const localized = localizedKeyword(profile, key, HTMX_ATTR_VOCAB[lang]?.[ns]?.[key]);
      if (!localized) continue;
      // Localized attribute name → canonical English attribute name.
      // E.g. `sse-conectar: sse-connect` for Spanish.
      const name = `${ns}-${localized}`;
      const canonical = `${ns}-${key}`;
      // Two canonicals sharing one localized name would silently drop the
      // first — an authored word that equals a profile keyword's primary.
      if (attrs[name] && attrs[name] !== canonical) {
        throw new Error(
          `[${lang}] "${name}" resolves for both ${attrs[name]} and ${canonical} — ` +
            `pick a different word in htmx-attr-vocab.mjs`
        );
      }
      attrs[name] = canonical;
    }
  }
  return attrs;
}

/** Build the `events` map from an i18n dictionary's events block. */
function buildEvents(dict) {
  const events = {};
  const raw = dict?.events ?? {};
  for (const [canonical, localized] of Object.entries(raw)) {
    if (typeof localized !== 'string') continue;
    if (localized === canonical) continue;
    // localized name → canonical English event name.
    events[localized] = canonical;
  }
  return events;
}

/**
 * Emit one vocab module for a language. Pretty-printed JSON inside a
 * self-registering IIFE so dropping the file in via <script src> just
 * works — no parser knowledge of object literals needed in older
 * browsers, no module-resolution required.
 */
function emitModule(lang, attrs, events) {
  const attrsJson = JSON.stringify(attrs, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : `      ${l}`))
    .join('\n');
  const eventsJson = JSON.stringify(events, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : `      ${l}`))
    .join('\n');

  return `// Auto-generated by packages/core/scripts/gen-htmx-vocab.mjs — do not edit by hand.
// Localized htmx-compat attribute vocab for language: ${lang}
// Re-generate after editing packages/core/scripts/htmx-attr-vocab.mjs,
// packages/semantic/src/generators/profiles/${PROFILE_MODULES[lang]}.ts
// or packages/i18n/src/dictionaries/${lang}.ts.
(function () {
  if (typeof window === 'undefined' || !window.__hyperfixi_i18n) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[hyperfixi-i18n] Vocab for "${lang}" loaded before the htmx-compat orchestrator. ' +
          'Move the hyperfixi-hx-v4 (or core) <script> above the vocab <script>.'
      );
    }
    return;
  }
  window.__hyperfixi_i18n.register('${lang}', {
    hyperfixi: {
      attrs: ${attrsJson},
      events: ${eventsJson},
    },
  });
})();
`;
}

async function main() {
  const outDir = resolve(REPO_ROOT, 'packages/core/vocab/htmx');
  await mkdir(outDir, { recursive: true });

  validateAuthoredVocab();
  const profiles = await loadProfiles();
  const dicts = await loadDictionaries();

  let emitted = 0;
  for (const lang of PRIORITY_LANGS) {
    const attrs = buildAttrs(lang, profiles[lang]);
    const events = buildEvents(dicts[lang]);
    // English emits as an empty registration — useful for explicit
    // "no-op opt-in" pages that want to confirm the orchestrator loaded.
    const content = emitModule(lang, attrs, events);
    const outPath = resolve(outDir, `${lang}.js`);
    await writeFile(outPath, content, 'utf-8');
    emitted++;
    console.log(
      `[gen-htmx-vocab] ${lang}: ${Object.keys(attrs).length} attrs, ` +
        `${Object.keys(events).length} events → ${outPath.replace(REPO_ROOT + '/', '')}`
    );
  }
  console.log(`\n[gen-htmx-vocab] emitted ${emitted} vocab modules.`);
}

main().catch(err => {
  console.error('[gen-htmx-vocab] failed:', err);
  process.exit(1);
});
