/**
 * Every language's `or` conjunction, by SURFACE form.
 *
 * Only some tokenizers normalize their or-word to `or` (ja `または`, ko `또는`,
 * es/it `o`, tr `veya`, …); in the rest it is a bare identifier (de `oder`, fr/pt
 * `ou`, ru `или`, uk `або`, ar `أو`, th `หรือ`, tl `o`, qu `utaq`, ms `atau`,
 * he `או`). Two seams need to see through that: the multi-event handler
 * excision in the parser (`on click or keyup …`) and the watched-expression
 * join of the reactive `when <expr> or <expr> changes` head, whose `raw` must be
 * evaluable/renderable English (`$a oder $b` is rejected by the canonical
 * parser: "Expected 'changes' but found 'oder'"). Kept in one table so the two
 * cannot drift.
 */
export const OR_WORDS: ReadonlySet<string> = new Set([
  'or', // EN
  'أو', // AR
  'o', // ES, IT, TL
  'ou', // PT, FR
  'oder', // DE
  'atau', // ID, MS
  '或', // ZH
  'または', // JA
  '또는', // KO
  'veya', // TR
  'অথবা', // BN (tokenizes as a bare identifier; matched here by surface form)
  'utaq', // QU
  'au', // SW
  'або', // UK
  'или', // RU
  'hoặc', // VI
  'lub', // PL
  'או', // HE
  'หรือ', // TH
  'या', // HI (idem)
]);

/** Whether a token is an `or` conjunction, by normalized form or by surface. */
export function isOrWordToken(token: { value: string; normalized?: string }): boolean {
  const norm = (token.normalized ?? token.value).toLowerCase();
  return norm === 'or' || OR_WORDS.has(token.value) || OR_WORDS.has(norm);
}
