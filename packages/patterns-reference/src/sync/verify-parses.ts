/**
 * `pattern_translations.verified_parses`, MEASURED.
 *
 * The flag answers one question: does `@lokascript/semantic`'s parser accept
 * this stored row in its own language? It used to be written as
 * `language === 'en' ? 1 : 0` — never measured — so every consumer asking for
 * "successfully parsed" translations (`getVerifiedTranslations`, the semantic
 * `PatternsProvider`, `getSupportedLanguages()`, testing-framework's
 * `--verified-only`) silently got English only. Its other writer, the since
 * retired `validate-all --fix`, set it from bracket/quote balance without
 * parsing. This is now the only definition; sync-translations, `npm run verify`
 * and `verifyTranslation()` all call it.
 *
 * "Parses" is not "faithful": a parse can be non-null while dropping commands.
 * Fidelity is the multilingual gate's job (its R0–R5 ratchets, against the
 * English parse) and the en-reference-preservation gate's (the English parse
 * against the source); engine validity is `code_examples.engine`'s.
 */

import { canParse } from '@lokascript/semantic';
import { hyperscriptBodies } from './markup-attributes';

/**
 * Whether every hyperscript body of a stored row parses in `language`.
 *
 * A row with no hyperscript at all (`sse-connect` wiring, a template with no
 * `_`) has nothing that could parse and is NOT verified. A non-translatable row
 * stores the same English markup in every language, and English is what the
 * runtime reads from it, so its bodies parse as `en` whatever row it is.
 */
export function verifyParses(code: string, language: string, translatable = true): boolean {
  const bodies = hyperscriptBodies(code);
  if (bodies.length === 0) return false;
  const parseLanguage = translatable ? language : 'en';
  return bodies.every(body => {
    try {
      return canParse(body, parseLanguage);
    } catch {
      return false;
    }
  });
}
