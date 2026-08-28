/**
 * i18n-kept-rows ratchet — the retirement schedule for the i18n corpus writer.
 *
 * WHY THIS EXISTS
 * ---------------
 * Since 2026-08-27 the corpus writer (`patterns-reference/scripts/sync-translations.ts`)
 * defaults to `best`: every foreign row is rendered by BOTH @lokascript/semantic
 * (`render(parse_en(en), L)` — the renderer every runtime surface uses) and
 * @lokascript/i18n's GrammarTransformer, and the semantic row is stored unless
 * the i18n row beats it on some ratchet signal. The rows i18n still wins are
 * therefore exactly the cases the semantic renderer still loses — 229 of 3703
 * when the writer landed. This gate makes that list a committed, shrink-only
 * baseline: a row that flips to semantic must be deleted from it (the renderer
 * fix is not complete until it is), and a row that flips BACK to i18n fails.
 * When the list is empty, i18n's transformer has left the corpus path and the
 * package's grammar half can be retired (MULTILINGUAL_NEXT_STEPS.md 2026-08-27c).
 *
 * **It is empty as of 2026-08-28** — 229 kept rows at the flip, then 102, then 49
 * at the start of the final burn-down, now 0 of 3,657. `best` therefore stores a
 * semantic render for every foreign row, which is what "switch the corpus to
 * semantic-only" meant: there is no separate switch, and `best` degenerates to it
 * by construction. Retiring i18n's grammar half is the separate, larger job of
 * migrating its three remaining runtime consumers (`@hyperscript-tools/i18n`,
 * core's `browser-bundle-classic-i18n`, `vite-plugin/semantic-integration`) off
 * `GrammarTransformer` (5 files: 3,823 lines of source + a 2,780-line suite).
 *
 * WHAT IT READS
 * -------------
 * `pattern_translations.translation_method` for every non-English, translatable
 * row: `semantic-render` = won by semantic; `grammar-transform` = i18n rendered
 * better; `grammar-transform-no-reference` = semantic cannot parse the English
 * (parser coverage, not rendering); `keyword-substitute` = no grammar profile. It refuses a DB with no semantic rows at
 * all — that is a DB written by `PATTERNS_RENDERER=i18n`, not a corpus with
 * nothing kept — so the gate cannot pass vacuously against the wrong writer.
 *
 * DB dependency: a freshly populated patterns.db, like every gate here; the test
 * carries the same `FOREIGN_CANONICAL_VALIDITY=1` guard.
 */
import { getAllPatterns, getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
import { RENDER_LANGUAGES } from './render-fidelity';

/**
 * Method labels the i18n path writes. Anything else non-English is semantic's.
 * `grammar-transform-no-reference` is the class where semantic cannot parse the
 * ENGLISH at all (a parser-coverage gap — the five `component-*` patterns at the
 * flip); `grammar-transform` is where it parsed but rendered worse.
 */
const I18N_METHODS: ReadonlySet<string> = new Set([
  'grammar-transform',
  'grammar-transform-no-reference',
  'keyword-substitute',
]);
const IDENTITY_METHODS: ReadonlySet<string> = new Set(['non-translatable-identity', 'original']);

export interface KeptRow {
  readonly id: string;
  readonly language: string;
  readonly method: string;
  readonly surface: string;
}

export interface I18nKeptRowsResult {
  /** Translatable, non-English rows scored. */
  readonly checked: number;
  /** Rows the semantic renderer won. */
  readonly semantic: number;
  /** Rows still written by the i18n path. */
  readonly kept: readonly KeptRow[];
}

export async function checkI18nKeptRows(opts?: {
  languages?: readonly string[];
}): Promise<I18nKeptRowsResult> {
  const languages = opts?.languages ?? RENDER_LANGUAGES;
  const known = new Set((await getAllPatterns({ limit: 1000 })).map(p => p.id));

  let checked = 0;
  let semantic = 0;
  const kept: KeptRow[] = [];

  for (const language of languages) {
    const rows = await getTranslationsByLanguage(language, 1000);
    for (const row of rows) {
      if (!known.has(row.codeExampleId)) continue;
      const method = String(row.translationMethod);
      if (IDENTITY_METHODS.has(method)) continue;
      checked++;
      if (I18N_METHODS.has(method)) {
        kept.push({
          id: row.codeExampleId,
          language,
          method,
          surface: row.hyperscript,
        });
      } else {
        semantic++;
      }
    }
  }

  kept.sort((a, b) => a.id.localeCompare(b.id) || a.language.localeCompare(b.language));
  return { checked, semantic, kept };
}

/** Group kept rows as `{ patternId: [language, …] }` — the committed baseline shape. */
export function groupKeptByPattern(kept: readonly KeptRow[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const row of kept) (grouped[row.id] ??= []).push(row.language);
  for (const languages of Object.values(grouped)) languages.sort();
  return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
}
