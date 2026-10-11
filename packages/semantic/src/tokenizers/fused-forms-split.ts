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
import type { CliticAttach, LanguageProfile } from '../generators/profiles/types';
import type { KeywordEntry } from './base';
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
 * Each fused word as a keyword of its reference, so a proclitic extractor
 * leaves it whole (ar `فيه` stays one word, not `ف` + `يه`) for the split.
 */
export function fusedKeywords(profile: LanguageProfile): KeywordEntry[] {
  const out: KeywordEntry[] = [];
  for (const [reference, forms] of Object.entries(profile.obliqueReferences ?? {}))
    for (const [marker, form] of Object.entries(forms))
      for (const phrase of typeof form === 'string' ? [form] : [form.direction, form.location])
        if (marker && phrase && !/\s/.test(phrase))
          out.push({ native: phrase, normalized: reference });
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

// ---------------------------------------------------------------------------
// A verb's object clitic (es `mostrarme`, pt `colocá-lo`, ar `ضعه`)
// ---------------------------------------------------------------------------

/** pt: the vowel an infinitive's `-r` leaves before `-lo` (`colocar` → `colocá-lo`). */
const PT_ACCENT: Readonly<Record<string, string>> = { a: 'á', e: 'ê', i: 'i' };

/** The verb with the clitic attached, or undefined where the verb is not a form it attaches to. */
export function attachClitic(
  attach: CliticAttach,
  verb: string,
  clitic: string
): string | undefined {
  switch (attach) {
    case 'infinitive':
      return /r$/.test(verb) ? verb + clitic : undefined;
    case 'infinitive-drop-e':
      return /re$/.test(verb) ? verb.slice(0, -1) + clitic : undefined;
    case 'hyphen': {
      if (!/[aei]r$/.test(verb)) return undefined;
      if (!clitic.startsWith('l')) return `${verb}-${clitic}`;
      const vowel = verb[verb.length - 2]!;
      return `${verb.slice(0, -2)}${PT_ACCENT[vowel]}-${clitic}`;
    }
    case 'suffix':
      return verb + clitic;
    case 'before':
      // An infinitive of one word; elided before a vowel or a mute h.
      if (!/^\p{L}+(?:er|ir|re)$/u.test(verb)) return undefined;
      return /^[aeiouyàâäéèêëîïôöùûüœh]/iu.test(verb)
        ? `${clitic.slice(0, -1)}'${verb}`
        : `${clitic} ${verb}`;
  }
}

/** The verb a word attaches `clitic` to (es `ponerlo` → `poner`), or undefined. */
function verbOf(attach: CliticAttach, word: string, clitic: string): string | undefined {
  if (word.length <= clitic.length || !word.endsWith(clitic)) return undefined;
  const stem = word.slice(0, -clitic.length);
  switch (attach) {
    case 'infinitive':
      return /r$/.test(stem) ? stem : undefined;
    case 'infinitive-drop-e':
      return /r$/.test(stem) ? `${stem}e` : undefined;
    case 'suffix':
      return stem;
    case 'hyphen':
    case 'before':
      return undefined;
  }
}

/** pt's verb before a hyphen: the infinitive (`colocá` before `lo` → `colocar`). */
function hyphenVerb(written: string, clitic: string): string {
  if (!clitic.startsWith('l')) return written;
  const vowel = Object.entries(PT_ACCENT).find(([, a]) => written.endsWith(a))?.[0];
  return vowel ? `${written.slice(0, -1)}${vowel}r` : written;
}

/**
 * Commands that take an object: a word splits only where its stem reads as
 * one of them, so a word that merely ends like a clitic stays a word.
 */
const OBJECT_VERBS: ReadonlySet<string> = new Set([
  'add',
  'append',
  'bind',
  'blur',
  'call',
  'clear',
  'clone',
  'close',
  'copy',
  'decrement',
  'default',
  'empty',
  'focus',
  'get',
  'hide',
  'increment',
  'log',
  'make',
  'measure',
  'morph',
  'open',
  'pick',
  'prepend',
  'put',
  'remove',
  'render',
  'reset',
  'return',
  'select',
  'send',
  'set',
  'show',
  'swap',
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
]);

/**
 * `stream` with each verb + object clitic read as the verb and the reference
 * (es `ponerlo` → `poner` `ello`; pt `colocá` `-` `lo` → `colocar` `ele`), as
 * `tokenizeWord` reads each part alone.
 */
export function splitObjectClitics(
  stream: TokenStream,
  profile: LanguageProfile,
  tokenizeWord: (word: string) => readonly LanguageToken[]
): TokenStream {
  const clitics = profile.objectClitics;
  if (!clitics) return stream;
  const entries = Object.entries(clitics.forms).flatMap(([reference, clitic]) => {
    const pronoun = profile.references?.[reference];
    return pronoun ? [{ clitic, pronoun }] : [];
  });
  const readsAsVerb = (verb: string): LanguageToken | undefined => {
    const read = tokenizeWord(verb);
    const token = read.length === 1 ? read[0] : undefined;
    return token?.kind === 'keyword' && OBJECT_VERBS.has(token.normalized ?? '')
      ? token
      : undefined;
  };
  const pronounOf = (pronoun: string): LanguageToken | undefined => {
    const read = tokenizeWord(pronoun);
    return read.length === 1 ? read[0] : undefined;
  };
  const tokens = stream.tokens;
  const out: LanguageToken[] = [];
  let changed = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (clitics.attach === 'before') {
      // fr `le mettre`, `l afficher` (spaceElisions): the verb, then its object.
      const word = token.value.toLowerCase();
      const entry = entries.find(e => e.clitic === word || e.clitic.slice(0, -1) === word);
      const next = tokens[i + 1];
      const verb = entry && next ? readsAsVerb(next.value) : undefined;
      const pronoun = entry && verb ? pronounOf(entry.pronoun) : undefined;
      if (verb && pronoun && next) {
        out.push({ ...verb, position: next.position });
        out.push({ ...pronoun, position: token.position });
        i += 1;
        changed = true;
        continue;
      }
      out.push(token);
      continue;
    }
    if (clitics.attach === 'hyphen') {
      const dash = tokens[i + 1];
      const after = tokens[i + 2];
      const entry = entries.find(e => e.clitic === after?.value);
      const verb =
        entry && dash?.value === '-'
          ? readsAsVerb(hyphenVerb(token.value, entry.clitic))
          : undefined;
      const pronoun = entry && verb ? pronounOf(entry.pronoun) : undefined;
      if (verb && pronoun && after) {
        out.push({ ...verb, position: token.position });
        out.push({
          ...pronoun,
          position: { start: dash!.position.start, end: after.position.end },
        });
        i += 2;
        changed = true;
        continue;
      }
      out.push(token);
      continue;
    }
    let split = false;
    for (const { clitic, pronoun } of entries) {
      const written = verbOf(clitics.attach, token.value, clitic);
      const verb = written ? readsAsVerb(written) : undefined;
      const reference = verb ? pronounOf(pronoun) : undefined;
      if (!verb || !reference) continue;
      const { start, end } = token.position;
      const cut = end - clitic.length;
      out.push({ ...verb, position: { start, end: cut } });
      out.push({ ...reference, position: { start: cut, end } });
      split = changed = true;
      break;
    }
    if (!split) out.push(token);
  }
  return changed ? new TokenStreamImpl(out, stream.language) : stream;
}
