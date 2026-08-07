/**
 * Shared harness for the full-vs-slim preprocessor parity oracle.
 *
 * Single source of truth for the parity corpus — the generator script
 * (scripts/generate-parity-fixture.ts) and BOTH parity test files execute
 * exactly these rows, so the fixture can never drift from what the tests
 * run.
 *
 * DELIBERATELY imports neither preprocessor. The full package wires the
 * rich pattern builder (`buildPatternsForLanguage`, handcrafted patterns
 * included) into the registry as an import side effect; slim bundles wire
 * the schema-only `generatePatternsForLanguage`. Shipped bundles never
 * share a registry — but under vitest's src aliases all modules in one
 * test file DO, and whoever calls setPatternGenerator last would silently
 * reconfigure the other path (measured: the full path loses exactly the
 * handcrafted-pattern rows). So each parity test file imports only its own
 * path's chain, and the two files never meet in one module graph:
 *
 *   - preprocessor-parity.full.test.ts — full path only
 *   - preprocessor-parity.slim.test.ts — slim path + wireSlimPath()
 *
 * The corpus deliberately reaches every branch of the preprocessors'
 * shared skeleton: single commands across word orders (SVO/SOV/VSO),
 * compound statements (localized + English `then`, newlines — handled by
 * the whole-string parse), event-prefix stripping (plain, `every`,
 * modifier, filter, `from`), confidence-gated fallback, English identity,
 * and unregistered languages.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PreprocessorConfig } from '../src/preprocessor';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ParityRow {
  lang: string;
  input: string;
  config?: Partial<PreprocessorConfig>;
}

export interface FixtureRow extends ParityRow {
  full: string;
  slim: string;
}

/** Languages the slim path registers (one per word order plus the rest of
 *  the unit-test matrix). Keep in sync with wireSlimPath in the slim file. */
export const SLIM_LANGS = ['es', 'ja', 'ko', 'zh', 'fr', 'ar'] as const;

export const PARITY_CORPUS: ParityRow[] = [
  // ── Single commands: the unit-test matrix (SVO / SOV / VSO) ──────
  { lang: 'es', input: 'alternar .active' },
  { lang: 'ja', input: '.active を 切り替え' },
  { lang: 'ko', input: '.active 을 토글' },
  { lang: 'zh', input: '切换 .active' },
  { lang: 'fr', input: 'basculer .active' },
  { lang: 'ar', input: 'بدّل .active' },
  { lang: 'es', input: 'agregar .highlight en #box' },
  { lang: 'ja', input: '#box に .highlight を 追加' },
  { lang: 'ko', input: '#box 에 .highlight 을 추가' },
  { lang: 'fr', input: 'ajouter .highlight sur #box' },
  { lang: 'ar', input: 'أضف .highlight إلى #box' },
  { lang: 'es', input: 'quitar .hidden de yo' },
  { lang: 'ja', input: '自分 から .hidden を 削除' },
  { lang: 'ko', input: '나 에서 .hidden 을 제거' },
  { lang: 'fr', input: 'supprimer .hidden de moi' },
  { lang: 'es', input: 'poner "hello" en #msg' },
  { lang: 'ja', input: '"hello" を #msg に 置く' },
  { lang: 'ko', input: '"hello" 을 #msg 에 넣다' },
  { lang: 'fr', input: 'mettre "hello" sur #msg' },
  { lang: 'es', input: 'establecer x a 5' },
  { lang: 'ja', input: 'x を 5 に 設定' },
  { lang: 'zh', input: '设置 x 为 5' },
  { lang: 'es', input: 'mostrar #modal' },
  { lang: 'es', input: 'ocultar #tooltip' },
  { lang: 'ja', input: '#modal を 表示' },
  { lang: 'ja', input: '#tooltip を 非表示' },
  { lang: 'ar', input: 'أظهر #modal' },
  { lang: 'ar', input: 'أخفِ #tooltip' },

  // ── Compound statements: localized/English `then` and newlines ───
  { lang: 'es', input: 'alternar .active entonces poner "ok" en #msg' },
  { lang: 'es', input: 'alternar .active then mostrar #modal' },
  { lang: 'es', input: 'alternar .active\nmostrar #modal' },
  { lang: 'ja', input: '.active を 切り替え それから #modal を 表示' },

  // ── String literals containing then-keywords ─────────────────────
  // The deleted split-statement fallback was string-literal-blind (it
  // would split `'now then later'` inside the quotes). These rows pin
  // that the whole-string parse treats literals atomically — including a
  // literal that is nothing but a whitespace-padded then-keyword — and
  // that long chains stay on the whole-string arm.
  { lang: 'es', input: 'poner "hola entonces adios" en #msg' },
  { lang: 'es', input: "poner 'ahora entonces luego' en #msg" },
  { lang: 'es', input: 'poner "  entonces  " en #msg\nmostrar #a' },
  {
    lang: 'es',
    input:
      'alternar .a entonces alternar .b entonces alternar .c entonces alternar .d entonces alternar .e',
  },

  // ── Block bodies: the rows the whole-string-first reorder repairs ─
  // A localized `then` inside a loop/tell body, or between consecutive
  // `bind` features, is NOT a statement separator — splitting there and
  // rejoining with ` then ` emits English the real engine rejects. Pinned
  // here so the ratchet covers the class; validity itself is asserted
  // against the vendored engine in whole-string-first.test.ts.
  { lang: 'es', input: 'en clic repetir 3 times entonces agregar "<p>Line</p>" a yo' },
  { lang: 'ja', input: '#panel を クリック で 伝える それから .open を 追加 それから 待つ 200ms それから .visible を 追加' },
  { lang: 'fr', input: 'bind $name à #input-a alors bind $name à #input-b' },

  // ── Event-prefix stripping ───────────────────────────────────────
  { lang: 'es', input: 'on click alternar .active' },
  { lang: 'es', input: 'on every keyup establecer x a 5' },
  { lang: 'es', input: 'on click.debounce(300) alternar .active' },
  { lang: 'es', input: "on keyup[key=='Enter'] establecer x a 1" },
  { lang: 'es', input: 'on click from body alternar .active' },
  { lang: 'ja', input: 'on click .active を 切り替え' },

  // ── Fallback / identity / unregistered ───────────────────────────
  { lang: 'es', input: 'xyz abc 123' },
  { lang: 'es', input: 'xyz abc 123', config: { confidenceThreshold: 1.0 } },
  { lang: 'en', input: 'toggle .active' },
  { lang: 'xx', input: 'toggle .active' },
  { lang: 'es', input: 'toggle .active' }, // already-English text under an es scope
];

export function loadFixture(): FixtureRow[] {
  return JSON.parse(
    readFileSync(path.join(__dirname, 'fixtures', 'preprocessor-parity.json'), 'utf8')
  );
}

/** The rows where the two paths are KNOWN to disagree today. Five of the
 *  original six (zh `切换` toggle, `set` in es/zh, bare and under event
 *  prefixes) were burned down by fixing the set/toggle schema marker data
 *  for es/zh — the generated patterns carried mandatory markers no real
 *  input has (`establecer en x a 5`, `设置 在 x 把 5`, `切换 把`-only).
 *
 *  The one left is the es `repeat` row: the schema-generated event pattern
 *  drops the loop quantity (`3 times`) and the slim SYNTAX render of
 *  repeat is also wrong (renders only `quantity`/`condition`), so the slim
 *  output is `on click repeat add "<p>Line</p>"` — engine-INVALID, which
 *  the host-validate gate (#900) safely converts to a fallback. That
 *  invalidity is currently a SAFETY property: a bare `repeat` is FOREVER,
 *  so partially repairing the render (e.g. mirroring semantic's
 *  string-content `to me` exception) without fixing quantity capture
 *  would commit a valid infinite loop. The slim parity test pins the
 *  row's output staying engine-invalid until the repeat surface is fixed
 *  whole (capture + SYNTAX render + me-suppression exception together). */
export const KNOWN_DIVERGENCES: Array<[lang: string, input: string]> = [
  ['es', 'en clic repetir 3 times entonces agregar "<p>Line</p>" a yo'],
];
