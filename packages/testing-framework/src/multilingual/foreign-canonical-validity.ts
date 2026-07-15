/**
 * Foreign→English canonical-validity gate
 * ---------------------------------------
 * The sibling en-render gate (canonical-validity.ts) renders every corpus English
 * reference and parses it on the real `hyperscript.org` engine. But the PRODUCTION
 * path is foreign→English: an authored non-English source is parsed and rendered to
 * English (`preprocessToEnglish` → `render`, and the roadmap's build-time
 * `@hyperscript-tools/i18n` transpiler). A parse can be role-faithful (the fidelity
 * ratchet scores ~1.0) yet still render English the canonical parser rejects.
 *
 * This gate closes that blind spot for the multilingual path: for every language, it
 * renders each authored `pattern_translation` to English and parses the result on
 * the canonical engine, failing on any invalid (pattern, language) pair that is not
 * in the committed allowlist. The allowlist is keyed by pattern id → the languages
 * that currently fail, so a fix that clears a family across languages shrinks (or
 * removes) its entry — the list only ever ratchets down.
 *
 * Denominator: only (pattern, language) pairs whose EN reference the canonical parser
 * already accepts are scored, so a handful of inherently non-canonical corpus rows
 * never distort the signal (same fairness rule as the en gate).
 *
 * DB dependency: reads authored translations from `pattern_translations`, which only
 * exist after `npm run populate`. Generate the baseline and run the gate against a
 * freshly populated DB (CI's multilingual-validation job populates; see the
 * provenance-stamp discipline in packages/patterns-reference/CLAUDE.md).
 */

import { getAllPatterns, getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
import { parseSemantic, render } from '@lokascript/semantic';
import { loadCanonicalParser, type CanonicalValidate } from './canonical-validity';

/**
 * The 23 non-English priority languages (the `browser-priority` corpus set). English
 * is the reference, scored by the sibling en gate.
 */
export const FOREIGN_LANGUAGES = [
  'es',
  'fr',
  'pt',
  'it',
  'id',
  'ms',
  'sw',
  'zh',
  'vi',
  'tl',
  'ja',
  'ko',
  'tr',
  'qu',
  'hi',
  'bn',
  'ar',
  'de',
  'ru',
  'uk',
  'pl',
  'th',
  'he',
] as const;

export interface ForeignValidityFailure {
  /** Corpus pattern id (`code_example` id the translation belongs to). */
  id: string;
  language: string;
  /** The authored foreign source that was rendered. */
  foreign: string;
  /** The English the renderer produced from the foreign parse. */
  rendered: string;
  error: string;
}

export interface ForeignValidityResult {
  /** (pattern, language) pairs whose EN reference the canonical parser accepts. */
  checked: number;
  valid: number;
  failures: ForeignValidityFailure[];
}

/**
 * Render every authored foreign `pattern_translation` to English and parse it on the
 * canonical engine. Only pairs whose EN reference is itself canonical-valid are scored.
 */
export async function checkForeignRenderValidity(opts?: {
  validate?: CanonicalValidate;
  languages?: readonly string[];
  /** Translations fetched per language (defaults comfortably above the corpus size). */
  perLanguageLimit?: number;
}): Promise<ForeignValidityResult> {
  const validate = opts?.validate ?? (await loadCanonicalParser());
  const languages = opts?.languages ?? FOREIGN_LANGUAGES;
  const limit = opts?.perLanguageLimit ?? 500;

  const patterns = await getAllPatterns();
  const enAccepts = new Map(patterns.map(p => [p.id, validate(p.rawCode).length === 0]));

  const failures: ForeignValidityFailure[] = [];
  let checked = 0;
  let valid = 0;

  for (const language of languages) {
    const translations = await getTranslationsByLanguage(language, limit);
    for (const t of translations) {
      if (!enAccepts.get(t.codeExampleId)) continue; // fair denominator: EN accepts the reference
      checked++;

      let rendered: string;
      let errors: string[];
      try {
        const node = parseSemantic(t.hyperscript, language).node;
        rendered = node ? render(node, 'en') : '(no node)';
        errors = validate(rendered);
      } catch (e) {
        rendered = '(threw)';
        errors = ['threw: ' + (e as Error).message.split('\n')[0]];
      }

      if (errors.length === 0) {
        valid++;
      } else {
        failures.push({
          id: t.codeExampleId,
          language,
          foreign: t.hyperscript,
          rendered,
          error: errors[0] ?? 'unknown error',
        });
      }
    }
  }

  return { checked, valid, failures };
}

/**
 * Group failures into the committed allowlist shape: `{ patternId: [langs…] }`
 * (languages sorted for a stable diff). Used by the baseline generator and by the
 * gate's stale-entry check.
 */
export function groupFailuresByPattern(
  failures: readonly ForeignValidityFailure[]
): Record<string, string[]> {
  const byPattern = new Map<string, Set<string>>();
  for (const f of failures) {
    if (!byPattern.has(f.id)) byPattern.set(f.id, new Set());
    byPattern.get(f.id)!.add(f.language);
  }
  const out: Record<string, string[]> = {};
  for (const id of [...byPattern.keys()].sort()) {
    out[id] = [...byPattern.get(id)!].sort();
  }
  return out;
}
