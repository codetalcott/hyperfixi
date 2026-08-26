/**
 * Value-interior localization.
 *
 * `keywords` gives the renderer the command verb and `roleMarkers` gives it the
 * particle that frames a role, but a role's VALUE has an interior of its own —
 * the `true` in `set @disabled to true`, the `value` in `put my value into
 * #out`, the `seconds` in `wait 2 seconds`. Until the profile gained a
 * `lexicon` block there was nowhere for those words to come from, so the
 * renderer emitted them in English. The target-language parser then could not
 * bind them back and dropped the role silently.
 *
 * Measured 2026-08-26 across the corpus (161 examples x 23 languages): the
 * en->foreign render was 73.3% structurally clean against the English
 * reference where the i18n-rendered corpus was 97.0%, and 99.6% of that gap is
 * attributable to five value types. This module is what closes it.
 *
 * SCOPE — deliberately word-level, like the implementation it replaces.
 * @lokascript/i18n has localized value interiors this way for years
 * (`translateWord` / `translateMultiWordValue`), and the corpus proves the
 * output re-parses in all 23 languages. Nothing here tries to be cleverer than
 * that; it only makes the same capability reachable from a typed IR.
 *
 * WHAT IS NEVER TOUCHED — the reason this is safe to run over a raw expression:
 *   - anything inside quotes, backticks, or a template interpolation (user text)
 *   - selectors, urls, numbers, and sigil-attached tokens (`@attr`, `#id`, `$var`)
 *   - identifiers the lexicon has no entry for (they pass through unchanged)
 * A word is rewritten only when the profile vouches for it, so an unknown token
 * is always left alone rather than guessed at.
 */
import type { LanguageLexicon, LanguageProfile } from '../generators/profiles/types';
import { getLexicon } from '../lexicon-registry';

/** Category order matters: first hit wins, mirroring i18n's DICTIONARY_CATEGORIES. */
const LEXICON_CATEGORIES = ['values', 'expressions', 'logical', 'temporal', 'attributes'] as const;

/**
 * Spans that must survive verbatim: single/double/backtick strings, including
 * any interpolation inside them (that is code the author wrote, not vocabulary).
 */
const PROTECTED_SPAN = /"[^"]*"|'[^']*'|`[^`]*`/g;

/**
 * Private-use sentinels for masked spans. Hyperscript source cannot contain
 * these, so the mask/restore round-trip is exact — a bare digit in the source
 * (`wait 2 seconds`) can never be mistaken for a span index.
 */
const MASK_OPEN = '\uE010';
const MASK_CLOSE = '\uE011';
const MASK_TOKEN = /\uE010(\d+)\uE011/g;

/**
 * A localizable word: ASCII letters (with internal hyphens), at least two
 * characters, not attached to a sigil, a dot, or a digit. Deliberately
 * conservative — `my.value` and `#id` are handled by their own renderers, and a
 * one-letter token is far more likely a variable than a keyword.
 */
const WORD = /(^|[^\w$.#@*:-])([A-Za-z][A-Za-z-]+)(?![\w$.-])/g;

export interface ValueLexicon {
  /** English word (lowercased) → the form to render in this language. */
  readonly words: ReadonlyMap<string, string>;
}

const cache = new WeakMap<LanguageLexicon, ValueLexicon>();

/**
 * Build the flat English→native map for a profile, merging `lexicon` categories
 * with `references` (me/it/you) and possessive adjectives, all of which appear
 * inside values.
 *
 * `lexicon.events` is deliberately NOT consulted. Event names already have a
 * dedicated renderer (`localizeEventName`) backed by a curated denylist of
 * events that must stay English to round-trip; localizing them a second time
 * here would bypass that decision.
 */
export function getValueLexicon(lexicon: LanguageLexicon, profile?: LanguageProfile): ValueLexicon {
  const cached = cache.get(lexicon);
  if (cached) return cached;

  const words = new Map<string, string>();
  const add = (english: string, native: string | undefined): void => {
    if (!native) return;
    const key = english.toLowerCase();
    // First writer wins, so category order above is the precedence rule.
    if (!words.has(key) && native !== english) words.set(key, native);
  };

  for (const category of LEXICON_CATEGORIES) {
    const entries = lexicon[category];
    if (!entries) continue;
    for (const [english, translation] of Object.entries(entries)) {
      add(english, translation.primary);
    }
  }
  // References (me/it/you) live on the profile and are needed inside values too.
  for (const [english, native] of Object.entries(profile?.references ?? {})) {
    add(english, native);
  }

  const built: ValueLexicon = { words };
  cache.set(lexicon, built);
  return built;
}

/**
 * Localize the interior of a value string.
 *
 * Returns the input unchanged when the language has no lexicon, so a language
 * that has not been populated degrades to English exactly as it does today.
 */
export function localizeValueInterior(
  raw: string,
  language: string,
  profile?: LanguageProfile
): string {
  if (!raw) return raw;
  // No registered lexicon means the language's `lexicons/{code}` module was not
  // imported — render the interior in English, the pre-lexicon behaviour.
  const lexicon = getLexicon(language);
  if (!lexicon) return raw;
  const { words } = getValueLexicon(lexicon, profile);
  if (words.size === 0) return raw;

  const spans: string[] = [];
  const masked = raw.replace(PROTECTED_SPAN, match => {
    spans.push(match);
    return `${MASK_OPEN}${spans.length - 1}${MASK_CLOSE}`;
  });

  const localized = masked.replace(WORD, (whole, lead: string, word: string) => {
    const hit = words.get(word.toLowerCase());
    return hit ? `${lead}${hit}` : whole;
  });

  return localized.replace(MASK_TOKEN, (_, index: string) => spans[Number(index)] ?? '');
}
