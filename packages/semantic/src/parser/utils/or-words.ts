/**
 * Every language's `or` conjunction, BY LANGUAGE.
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
 *
 * Keyed BY LANGUAGE because the surfaces collide across languages: `o` is the
 * or-word in es/it/tl and the BY-marker in pl (`zwiększ #score o 10`). Matched
 * language-blind, pl's `o` was re-kinded as a conjunction and the fused event
 * slot swallowed `o 10` into the event name — `on click or 10 increment …`
 * (pl increment-by-amount). Callers that know the language should pass it; the
 * language-blind form remains for the seams that do not.
 */
export const OR_WORDS_BY_LANG: Readonly<Record<string, ReadonlySet<string>>> = {
  ar: new Set(['أو']),
  bn: new Set(['অথবা']), // tokenizes as a bare identifier; matched by surface
  de: new Set(['oder']),
  en: new Set(['or']),
  es: new Set(['o']),
  fr: new Set(['ou']),
  he: new Set(['או']),
  hi: new Set(['या']), // idem
  id: new Set(['atau']),
  it: new Set(['o']),
  ja: new Set(['または']),
  ko: new Set(['또는']),
  ms: new Set(['atau']),
  pl: new Set(['lub']),
  pt: new Set(['ou']),
  qu: new Set(['utaq']),
  ru: new Set(['или']),
  sw: new Set(['au']),
  th: new Set(['หรือ']),
  tl: new Set(['o']),
  tr: new Set(['veya']),
  uk: new Set(['або']),
  vi: new Set(['hoặc']),
  zh: new Set(['或']),
};

/**
 * Every or-word surface, language-blind. Kept for the seams with no language in
 * hand; prefer {@link isOrWordToken} with a language where one is available.
 */
export const OR_WORDS: ReadonlySet<string> = new Set(
  Object.values(OR_WORDS_BY_LANG).flatMap(set => [...set])
);

/**
 * Whether a token is an `or` conjunction, by normalized form or by surface.
 *
 * With a `language`, only that language's own surface counts (plus the English
 * literal and the normalized form, both of which survive translation) — which is
 * what keeps pl's `o` a BY-marker. Without one, any language's surface matches,
 * the pre-2026-08-27 behaviour.
 */
export function isOrWordToken(
  token: { value: string; normalized?: string },
  language?: string
): boolean {
  const norm = (token.normalized ?? token.value).toLowerCase();
  if (norm === 'or') return true;
  const surfaces = language === undefined ? OR_WORDS : OR_WORDS_BY_LANG[language];
  if (!surfaces) return false;
  return surfaces.has(token.value) || surfaces.has(norm);
}
