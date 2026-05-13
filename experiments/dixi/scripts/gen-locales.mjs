#!/usr/bin/env node
// Generate dixi locale files from @lokascript/semantic profiles + fx-vocab.mjs.
//
// Usage:
//   node experiments/dixi/scripts/gen-locales.mjs              # write all 24
//   node experiments/dixi/scripts/gen-locales.mjs --dry-run    # preview only
//   node experiments/dixi/scripts/gen-locales.mjs --locale=es  # one locale
//
// Inputs:
//   - packages/semantic/src/generators/profiles/{profile}.ts   (event vocab)
//   - experiments/dixi/scripts/fx-vocab.mjs                    (fx-*/modifiers)
//
// Outputs:
//   - experiments/dixi/locales/{code}.js
//
// Event-name vocabulary derives from each profile's `keywords` field by
// extracting `primary` + `alternatives` for: click, change, submit, input,
// focus, blur, init. fx-vocab's `valuesExtra` fills any gaps where a profile
// doesn't define a particular event.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES } from './fx-vocab.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIXI_ROOT = path.resolve(__dirname, '..');
const PROFILES_DIR = path.resolve(
  __dirname,
  '../../../packages/semantic/src/generators/profiles'
);
const LOCALES_DIR = path.resolve(DIXI_ROOT, 'locales');

const EVENT_KEYWORDS = ['click', 'change', 'submit', 'input', 'focus', 'blur', 'init'];

/** Parse CLI args. */
function parseArgs() {
  const args = { dryRun: false, locale: null, help: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--locale=')) args.locale = arg.slice('--locale='.length);
  }
  return args;
}

/**
 * Extract event-name translations from a profile file.
 * Returns a map of localized-form → canonical English name.
 *
 * Matches each keyword's block as `keyword: { ... }`. Because the value blocks
 * don't contain nested braces, a non-greedy `[\s\S]*?` to the next `}` is safe.
 */
function extractEventValues(profileSource) {
  const values = {};
  for (const kw of EVENT_KEYWORDS) {
    const blockRe = new RegExp(`\\b${kw}:\\s*\\{([\\s\\S]*?)\\}`, 'g');
    const blockMatch = blockRe.exec(profileSource);
    if (!blockMatch) continue;
    const block = blockMatch[1];

    const primaryMatch = block.match(/primary:\s*['"]([^'"]+)['"]/);
    const normalizedMatch = block.match(/normalized:\s*['"]([^'"]+)['"]/);
    const altMatch = block.match(/alternatives:\s*\[([^\]]*)\]/);

    if (!primaryMatch || !normalizedMatch) continue;
    const canonical = normalizedMatch[1];

    const primary = primaryMatch[1];
    if (primary !== canonical && primary !== 'TODO') {
      values[primary] = canonical;
    }

    if (altMatch) {
      const alts = altMatch[1].match(/['"]([^'"]+)['"]/g);
      if (alts) {
        for (const raw of alts) {
          const v = raw.replace(/['"]/g, '');
          if (v && v !== canonical && v !== 'TODO') {
            values[v] = canonical;
          }
        }
      }
    }
  }
  return values;
}

/** Stable key order for predictable diffs: insertion order following EVENT_KEYWORDS. */
function orderValues(values, canonicalOrder) {
  const ordered = {};
  // Group by canonical, in canonical-order; within a group, keep encounter order.
  for (const canonical of canonicalOrder) {
    for (const [key, val] of Object.entries(values)) {
      if (val === canonical) ordered[key] = val;
    }
  }
  // Any leftover (shouldn't happen, but defensive)
  for (const [key, val] of Object.entries(values)) {
    if (!(key in ordered)) ordered[key] = val;
  }
  return ordered;
}

/** Format a JS object literal with single-quoted keys/values, 4-space indent. */
function formatObject(obj, indent) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  const pad = ' '.repeat(indent);
  const padInner = ' '.repeat(indent + 2);
  const lines = entries.map(([key, val]) => {
    const qkey = /^[a-zA-Z_$][\w$-]*$/.test(key) && !key.includes('-')
      ? key
      : `'${key.replace(/'/g, "\\'")}'`;
    return `${padInner}${qkey}: '${val.replace(/'/g, "\\'")}',`;
  });
  return `{\n${lines.join('\n')}\n${pad}}`;
}

/** Build the locale file source. */
function renderLocaleFile(code, spec, values) {
  const unreviewedBanner = spec.reviewed
    ? ''
    : `// ⚠ Unreviewed: fx-* attribute names and modifier translations for this locale
//   have not been native-speaker reviewed. To suggest corrections, edit
//   experiments/dixi/scripts/fx-vocab.mjs (LOCALES.${code}) and regenerate.
//   The event-name vocabulary (\`values\` below) IS reviewed — it derives from
//   the @lokascript/semantic profile.
`;

  const header = `// AUTO-GENERATED — do not edit by hand.
// Source: packages/semantic/src/generators/profiles/${spec.profile}.ts (event vocab)
//         experiments/dixi/scripts/fx-vocab.mjs (fx-*/modifier vocab)
// Regenerate: cd experiments/dixi && npm run gen
//
// Attribution: event-name vocabulary derived from @lokascript/semantic profiles.
${unreviewedBanner}`;

  // English no-op: just register an empty dict.
  if (code === 'en') {
    return `${header}// English no-op — registered for completeness; English is canonical.
window.dixi.register('en', { attrs: {}, values: {}, modifiers: {} });
`;
  }

  // Strip identity mappings (e.g., French 'fx-action': 'fx-action') — they're
  // no-ops at runtime and just add MutationObserver churn through the rename loop.
  const stripIdentity = (obj) => Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => k !== v)
  );

  const attrsBlock = formatObject(stripIdentity(spec.attrs), 2);
  const valuesBlock = formatObject(stripIdentity(values), 2);
  const modifiersBlock = formatObject(stripIdentity(spec.modifiers), 2);

  return `${header}window.dixi.register('${code}', {
  attrs: ${attrsBlock},
  values: ${valuesBlock},
  modifiers: ${modifiersBlock},
});
`;
}

function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`Generate dixi locale files from semantic profiles + fx-vocab.

  --dry-run         preview output without writing
  --locale=<code>   process only one locale
  --help            show this help`);
    return;
  }

  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true });
  }

  const codes = args.locale ? [args.locale] : Object.keys(LOCALES);
  if (args.locale && !LOCALES[args.locale]) {
    console.error(`Unknown locale: ${args.locale}`);
    console.error(`Known: ${Object.keys(LOCALES).join(', ')}`);
    process.exit(1);
  }

  let writeCount = 0;
  let skipCount = 0;

  for (const code of codes) {
    const spec = LOCALES[code];
    const profilePath = path.join(PROFILES_DIR, `${spec.profile}.ts`);

    let profileSource = '';
    if (fs.existsSync(profilePath)) {
      profileSource = fs.readFileSync(profilePath, 'utf-8');
    } else if (code !== 'en') {
      console.error(`  [SKIP] ${code}: profile not found at ${profilePath}`);
      skipCount++;
      continue;
    }

    const profileValues = profileSource ? extractEventValues(profileSource) : {};
    const merged = { ...profileValues, ...(spec.valuesExtra ?? {}) };
    const values = orderValues(merged, EVENT_KEYWORDS);

    const output = renderLocaleFile(code, spec, values);
    const outPath = path.join(LOCALES_DIR, `${code}.js`);

    if (args.dryRun) {
      console.log(`  [DRY] ${code}: ${Object.keys(values).length} values, ${Object.keys(spec.attrs).length} attrs, ${Object.keys(spec.modifiers).length} modifiers`);
    } else {
      const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : '';
      if (prev === output) {
        console.log(`  [SAME] ${code}`);
      } else {
        fs.writeFileSync(outPath, output);
        console.log(`  [WROTE] ${code}: ${outPath}`);
      }
      writeCount++;
    }
  }

  if (!args.dryRun) {
    console.log(`\nProcessed ${writeCount} locales (${skipCount} skipped).`);
  }
}

main();
