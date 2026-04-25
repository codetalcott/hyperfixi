/**
 * Phase 0 — Cross-language equivalence check
 *
 * Parses the same "toggle .active on #button on click" command in 5 languages
 * and prints the resulting protocol JSON side-by-side, comparing for
 * structural equivalence (action + role keys + role values). Metadata fields
 * (sourceLanguage, sourceText, confidence) are expected to differ and are
 * stripped before comparison.
 *
 * Input phrases are drawn verbatim from
 * packages/semantic/test/language-coverage/test-cases.ts:
 *   - 'toggle-on-click' (line 326) for en, ja, es, ko
 *   - 'toggle-with-destination' (line 601) for ar (line 605)
 *     because 'toggle-on-click' line 330 triggers a known Arabic tokenizer bug
 *     where the pre-verb destination eats the patient role.
 *
 * Run from the repo root:
 *   node examples/llm-native-demo-multilingual/phase-0-check.mjs
 *
 * Exit code 0 on equivalence pass, 2 on any divergence.
 */
import { parse } from '../../packages/semantic/dist/index.js';
import { toProtocolJSON } from '../../packages/intent/dist/index.js';

const PHRASES = {
  en: 'on click toggle .active on #button',
  ja: 'クリック で #button の .active を 切り替え',
  ar: 'عند النقر بدّل .active على #button',
  es: 'al clic alternar .active en #button',
  ko: '클릭 할 때 #button 의 .active 를 토글',
};

// Strip metadata fields that are expected to vary by language and are
// not part of "semantic equivalence" — only node shape/action/roles should
// be compared. Also sort keys so iteration order doesn't matter.
function normalize(json) {
  if (json === null || typeof json !== 'object') return json;
  if (Array.isArray(json)) return json.map(normalize);
  const out = {};
  for (const k of Object.keys(json).sort()) {
    if (
      k === 'metadata' ||
      k === 'sourceLanguage' ||
      k === 'sourceText' ||
      k === 'confidence' ||
      k === 'patternId'
    )
      continue;
    if (k === 'selectorKind') continue;
    // Language-specific pattern name lives in diagnostics; strip it.
    if (k === 'diagnostics') continue;
    out[k] = normalize(json[k]);
  }
  return out;
}

console.log('=== Phase 0 — Cross-language LSE equivalence ===\n');

const results = {};
let parseOk = 0;
let parseFail = 0;

for (const [lang, phrase] of Object.entries(PHRASES)) {
  try {
    const node = parse(phrase, lang);
    if (!node) {
      console.log(`[${lang}] parse returned null`);
      results[lang] = null;
      parseFail++;
      continue;
    }
    const proto = toProtocolJSON(node);
    const normalized = normalize(proto);
    results[lang] = { raw: proto, normalized, phrase };
    parseOk++;
    console.log(`[${lang}] "${phrase}"`);
    console.log('  action:', proto.action);
    console.log('  kind:', proto.kind ?? '(default: command)');
    if (proto.trigger) console.log('  trigger:', JSON.stringify(proto.trigger));
    if (proto.body) {
      console.log('  body (verbose form):');
      for (const b of proto.body) {
        console.log('    action:', b.action);
        console.log('    roles:', JSON.stringify(b.roles));
      }
    } else {
      console.log('  roles:', JSON.stringify(proto.roles));
    }
    console.log();
  } catch (err) {
    console.log(`[${lang}] PARSE ERROR: ${err.message}`);
    results[lang] = { error: err.message, phrase };
    parseFail++;
  }
}

console.log('=== Equivalence check ===\n');

const ref = results.en;
if (!ref || ref.error) {
  console.log('FAIL: English reference did not parse');
  process.exit(1);
}

const refNormalized = JSON.stringify(ref.normalized, null, 2);
console.log('Reference (en normalized):');
console.log(refNormalized);
console.log();

let allEquivalent = true;
const divergences = [];

for (const lang of ['ja', 'ar', 'es', 'ko']) {
  const r = results[lang];
  if (!r || r.error) {
    console.log(`[${lang}] SKIPPED (parse failed)`);
    allEquivalent = false;
    divergences.push({ lang, reason: 'parse failed', detail: r?.error ?? 'null' });
    continue;
  }
  const normalized = JSON.stringify(r.normalized, null, 2);
  if (normalized === refNormalized) {
    console.log(`[${lang}] ✓ EQUIVALENT to en`);
  } else {
    console.log(`[${lang}] ✗ DIVERGES from en`);
    console.log('  got:', normalized);
    allEquivalent = false;
    divergences.push({ lang, reason: 'normalized JSON differs', detail: normalized });
  }
}

console.log('\n=== Summary ===');
console.log(`Parse OK: ${parseOk}/5, Parse FAIL: ${parseFail}/5`);
console.log(`Equivalent to en: ${allEquivalent ? 'ALL 5' : 'NO — see divergences above'}`);
if (allEquivalent) {
  console.log('\n✓ PHASE 0 PASSED');
  process.exit(0);
} else {
  console.log('\n✗ PHASE 0 FAILED — review divergences before proceeding');
  console.log('Divergent languages:', divergences.map(d => d.lang).join(', '));
  process.exit(2);
}
