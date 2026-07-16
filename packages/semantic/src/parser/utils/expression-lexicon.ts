/**
 * Expression-internal vocabulary lexicon (foreign surface → English keyword).
 *
 * LokaScript translates COMMAND and ROLE-MARKER vocabulary via the pattern
 * matchers and `joinTokenText` normalization, but the LEAVES of an expression —
 * possessive property names, comparison/existence operators, connectives — are
 * captured verbatim from the source language. When the parse is rendered (or
 * executed) as English, those leaves leak the foreign surface: `put my value`
 * authored as es `poner mi valor` rendered `put my valor` (invalid English) and
 * would read a non-existent `.valor` DOM property at runtime.
 *
 * This module is the reverse lexicon the expression layer consults to normalize
 * those leaves to English, so the rendered/executed expression is canonical. It
 * fixes both production paths at once (foreign→English transpile AND
 * foreign→AST→execute), which is why the normalization happens at PARSE time
 * (see the foreign→English canonical-validity burndown,
 * docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md).
 *
 * Phase 1 covers possessive property NAMES. Surfaces come from the per-language
 * i18n dictionaries (`packages/i18n/src/dictionaries/{code}.ts`) — semantic is
 * upstream of i18n in the build order, so the subset is copied here by
 * `packages/i18n/scripts/extract-property-lexicon.ts`. Regenerate with that
 * script if the dictionaries gain property translations. Identity properties
 * (`innerHTML`, `textContent`, and `checked` in most languages) need no entry:
 * an unlisted surface passes through unchanged.
 */

// prettier-ignore
export const PROPERTY_NAME_LEXICON: Record<string, Record<string, string>> = {
  ar: { "قيمة": "value" },
  bn: { "অক্ষম": "disabled", "চেক করা": "checked", "দৈর্ঘ্য": "length", "মান": "value" },
  de: { "wert": "value" },
  es: { "valor": "value" },
  fr: { "valeur": "value" },
  hi: { "अक्षम": "disabled", "चेक": "checked", "छिपा": "hidden", "मान": "value" },
  id: { "nilai": "value" },
  it: { "valore": "value" },
  ja: { "値": "value" },
  ko: { "값": "value" },
  ms: { "dilumpuhkan": "disabled", "ditanda": "checked", "nilai": "value", "panjang": "length" },
  pl: { "wartość": "value" },
  pt: { "valor": "value" },
  qu: { "chanin": "value" },
  ru: { "значение": "value", "отключено": "disabled", "отмечено": "checked", "скрыто": "hidden" },
  sw: { "thamani": "value" },
  th: { "ความยาว": "length", "ค่า": "value", "ปิดใช้งาน": "disabled", "เลือกแล้ว": "checked" },
  tl: { "haba": "length", "halaga": "value", "hindi_pinagana": "disabled", "naka_tsek": "checked" },
  tr: { "değer": "value" },
  uk: { "вимкнено": "disabled", "значення": "value", "позначено": "checked", "приховано": "hidden" },
  vi: { "ẩn": "hidden", "được chọn": "checked", "giá trị": "value", "vô hiệu": "disabled" },
  zh: { "值": "value" },
};

/**
 * Map a possessive property surface to its English DOM-property name.
 *
 * Only consulted at a slot already determined to be a property head (inside the
 * possessive matchers), so it is safe: an unlisted surface — an English property
 * (`value`, `innerHTML`), a member-access chain (`.style.display`), or any word
 * with no dictionary entry — is returned unchanged. English (`en`) and any
 * language whose property surface equals English have no table and pass through.
 */
export function translatePropertyName(languageCode: string, surface: string): string {
  const map = PROPERTY_NAME_LEXICON[languageCode];
  if (!map) return surface;
  return map[surface.toLowerCase()] ?? surface;
}
