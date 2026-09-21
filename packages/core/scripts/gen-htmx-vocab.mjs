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
 *   node packages/core/scripts/gen-htmx-vocab.mjs           # write the modules
 *   node packages/core/scripts/gen-htmx-vocab.mjs --check   # exit 1 if any is stale
 *
 * NAMES ARE ADDITIVE. A page authored against a shipped name must keep
 * working, so a name never disappears because a profile or dictionary word
 * moved: the new word becomes the primary (listed first) and the old one stays
 * as a parse alias via `htmx-vocab-legacy.json`. `--check` runs in core's test
 * suite, so the modules cannot silently fall behind their inputs again — they
 * once did, for months, and a plain regeneration would have deleted 165
 * shipped event names.
 *
 * The semantic profile and i18n dictionary packages must be built first
 * (the script imports from dist/). CI runs build for both before invoking.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
 * Resolve the localized names for one key, primary first. Empty when no
 * translation exists — the generator then omits the key from `attrs` and the
 * runtime falls back to the canonical English form.
 *
 * Order:
 *   1. `HTMX_ATTR_VOCAB[lang][ns][key]` — hand-authored names (a string, or
 *      `[primary, ...aliases]`), for keys that are not hyperscript keywords or
 *      whose profile word is the wrong register for an attribute name
 *      (see htmx-attr-vocab.mjs)
 *   2. `profile.keywords[key].primary` (the usual source for command/modifier keywords)
 *   3. `profile.references[key]` (for `target`, `event`, etc. which are
 *      stored in `references` because they're context-variable names)
 *
 * The profile word is appended even when the table leads: it is what shipped
 * before the table existed, so it stays a parse alias.
 */
function localizedNames(profile, key, authored) {
  const names = [authored ?? []].flat();
  const fromKeywords = profile?.keywords?.[key]?.primary;
  const fromReferences = profile?.references?.[key];
  if (fromKeywords && fromKeywords !== key) names.push(fromKeywords);
  else if (typeof fromReferences === 'string' && fromReferences) names.push(fromReferences);
  return [...new Set(names)].filter(name => name !== key);
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
      for (const [key, authored] of Object.entries(vocab[ns] ?? {})) {
        if (!ALL_KEYS[ns].includes(key)) {
          throw new Error(`htmx-attr-vocab: ${lang}.${ns}.${key} is not a known ${ns}- key`);
        }
        for (const name of [authored].flat()) {
          if (!name || /[\s"'<>\/=]/.test(name) || name !== name.toLowerCase()) {
            throw new Error(
              `htmx-attr-vocab: ${lang}.${ns}.${key} = "${name}" is not a valid attribute name ` +
                `(no whitespace, quotes, "=", "/", "<", ">" or uppercase)`
            );
          }
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

/**
 * Append retired names after the current ones. A retired name the current
 * vocabulary now uses for a DIFFERENT canonical cannot be kept — the current
 * meaning wins and the loss is reported.
 */
function appendLegacy(lang, kind, map, legacy, notes) {
  for (const [name, canonical] of Object.entries(legacy ?? {})) {
    if (!(name in map)) map[name] = canonical;
    else if (map[name] !== canonical) {
      notes.push(`${lang}: legacy ${kind} "${name}" meant ${canonical}, now ${map[name]} — dropped`);
    }
  }
}

/** Build the `attrs` map for one language: localized name → canonical, primary first. */
function buildAttrs(lang, profile, legacy, notes) {
  const attrs = {};
  for (const ns of Object.keys(ALL_KEYS)) {
    for (const key of ALL_KEYS[ns]) {
      const canonical = `${ns}-${key}`;
      // E.g. `sse-conectar: sse-connect` for Spanish.
      for (const localized of localizedNames(profile, key, HTMX_ATTR_VOCAB[lang]?.[ns]?.[key])) {
        // A multi-word profile primary (vi `lấy giá trị`) cannot be an
        // attribute name — HTML would read three attributes. Join with
        // hyphens, the convention the profiles already use for their own
        // multi-word attribute words (vi `trực-tiếp`, `kết-nối`). The spaced
        // form is not kept as an alias: it never could have matched.
        const name = `${ns}-${localized.trim().replace(/\s+/g, '-')}`;
        if (/\s/.test(localized)) {
          notes.push(`${lang}: attr "${ns}-${localized}" is multi-word — emitted as "${name}"`);
        }
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
  }
  appendLegacy(lang, 'attr', attrs, legacy, notes);
  return attrs;
}

/**
 * Build the `events` map from an i18n dictionary's events block.
 *
 * The dictionary serves hyperscript's `on <event>`, where a multi-word name
 * parses. Here it cannot: an event name is one whitespace-delimited token of
 * an `hx-trigger` value (`keyup delay:200ms`) or the suffix of an `hx-on:`
 * attribute NAME. Multi-word names are skipped and reported, never joined —
 * a fused or hyphenated form would be a coinage nobody reviewed.
 */
function buildEvents(lang, dict, legacy, notes) {
  const events = {};
  const raw = dict?.events ?? {};
  for (const [canonical, localized] of Object.entries(raw)) {
    if (typeof localized !== 'string') continue;
    if (localized === canonical) continue;
    if (/\s/.test(localized)) {
      notes.push(`${lang}: event "${localized}" (${canonical}) is multi-word — not emitted`);
      continue;
    }
    // localized name → canonical English event name.
    events[localized] = canonical;
  }
  appendLegacy(lang, 'event', events, legacy, notes);
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
// Several names may map to one canonical: the first is the primary (the form
// to teach), later ones are aliases kept so already-authored pages still work.
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

/** Render every module. Returns `{ files: [{ lang, path, content, ... }], notes }`. */
async function renderAll() {
  validateAuthoredVocab();
  const profiles = await loadProfiles();
  const dicts = await loadDictionaries();
  const legacy = JSON.parse(await readFile(resolve(__dirname, 'htmx-vocab-legacy.json'), 'utf-8'));
  const outDir = resolve(REPO_ROOT, 'packages/core/vocab/htmx');

  const notes = [];
  const files = PRIORITY_LANGS.map(lang => {
    const attrs = buildAttrs(lang, profiles[lang], legacy.attrs?.[lang], notes);
    const events = buildEvents(lang, dicts[lang], legacy.events?.[lang], notes);
    // English emits as an empty registration — useful for explicit
    // "no-op opt-in" pages that want to confirm the orchestrator loaded.
    return {
      lang,
      path: resolve(outDir, `${lang}.js`),
      content: emitModule(lang, attrs, events),
      attrCount: Object.keys(attrs).length,
      eventCount: Object.keys(events).length,
    };
  });
  return { outDir, files, notes };
}

async function main() {
  const check = process.argv.includes('--check');
  const { outDir, files, notes } = await renderAll();
  const rel = path => path.replace(REPO_ROOT + '/', '');

  if (check) {
    const stale = [];
    for (const file of files) {
      const current = await readFile(file.path, 'utf-8').catch(() => null);
      if (current !== file.content) stale.push(rel(file.path));
    }
    if (stale.length === 0) {
      console.log(`[gen-htmx-vocab] ${files.length} vocab modules are up to date.`);
      return;
    }
    console.error(
      `[gen-htmx-vocab] ${stale.length} vocab module(s) are stale:\n` +
        stale.map(f => `  ${f}`).join('\n') +
        `\n\nA semantic profile, an i18n dictionary or htmx-attr-vocab.mjs changed. Rebuild\n` +
        `packages/semantic and packages/i18n, run \`npm run generate:htmx-vocab --prefix\n` +
        `packages/core\`, and READ THE DIFF: if a name disappears, pages authored with it\n` +
        `break. Keep it as an alias by adding it to scripts/htmx-vocab-legacy.json.`
    );
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });
  for (const file of files) {
    await writeFile(file.path, file.content, 'utf-8');
    console.log(
      `[gen-htmx-vocab] ${file.lang}: ${file.attrCount} attrs, ` +
        `${file.eventCount} events → ${rel(file.path)}`
    );
  }
  console.log(`\n[gen-htmx-vocab] emitted ${files.length} vocab modules.`);
  if (notes.length) {
    console.log(`\n[gen-htmx-vocab] ${notes.length} name(s) adjusted or not emitted:`);
    for (const note of notes) console.log(`  ${note}`);
  }
}

export { renderAll };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('[gen-htmx-vocab] failed:', err);
    process.exit(1);
  });
}
