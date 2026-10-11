/**
 * Split a pronoun fused with its marker back into the two (M2 N3, wave 3).
 *
 * Where a language writes a marker and a pronoun as one word (tr `bana`, `ben`
 * + `e`, "to me"), a render writes the word (the profile's `obliqueReferences`
 * phrase of one word), and the reader would take it for a variable. Each such
 * word reads as the nominative pronoun and the marker it fuses, in the order
 * the language writes them apart (tr `ben` `e`), so the patterns read it as
 * they read the two. Only the profile's own fused words split: no stemming.
 * `docs-internal/multilingual/FUSED_FORMS.md`.
 */
import type { LanguageToken, TokenStream } from '../types';
import type { LanguageProfile } from '../generators/profiles/types';
import { TokenStreamImpl } from './token-utils';

/** A fused word → the nominative pronoun and the marker, in the order they are written apart. */
export function fusedForms(profile: LanguageProfile): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const [reference, forms] of Object.entries(profile.obliqueReferences ?? {})) {
    const pronoun = profile.references?.[reference];
    if (!pronoun) continue;
    for (const [marker, form] of Object.entries(forms)) {
      if (!marker) continue;
      for (const phrase of typeof form === 'string' ? [form] : [form.direction, form.location]) {
        if (!phrase || /\s/.test(phrase)) continue;
        const after = Object.values(profile.roleMarkers).some(
          m => m?.position === 'after' && (m.primary === marker || m.alternatives?.includes(marker))
        );
        out.set(phrase, after ? [pronoun, marker] : [marker, pronoun]);
      }
    }
  }
  return out;
}

/**
 * `stream` with each fused word replaced by its two tokens, as `tokenizeWord`
 * reads each part alone. The first part spans the word but its last character,
 * the second that character, so the positions still cover the input.
 */
export function splitFusedForms(
  stream: TokenStream,
  forms: ReadonlyMap<string, readonly string[]>,
  tokenizeWord: (word: string) => readonly LanguageToken[]
): TokenStream {
  const tokens = stream.tokens;
  if (!forms.size || !tokens.some(t => forms.has(t.value))) return stream;
  const out: LanguageToken[] = [];
  for (const token of tokens) {
    const parts = forms.get(token.value);
    const read = parts?.map(part => tokenizeWord(part));
    if (!parts || !read || read.some(r => r.length !== 1)) {
      out.push(token);
      continue;
    }
    const { start, end } = token.position;
    const cut = Math.max(start + 1, end - 1);
    out.push({ ...read[0]![0]!, position: { start, end: cut } });
    out.push({ ...read[1]![0]!, position: { start: cut, end } });
  }
  return new TokenStreamImpl(out, stream.language);
}
