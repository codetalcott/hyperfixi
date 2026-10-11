/**
 * A role marker written onto the word before it, as ko, ja and bn write their
 * case particles (M2 N5, `docs-internal/multilingual/FUSED_FORMS.md` §3.3): ko
 * `#out에`, ja `#outに`, bn `#outকে`, where a render wrote `#out 에`. Their
 * readers already split a particle off the word before it, so this is the
 * render's half; the verified render keeps the attached form only where the
 * reader reads it as the spaced one.
 */
import type { LanguageProfile } from '../generators/profiles/types';
import { getSchema } from '../generators/command-schemas';
import type { ActionType } from '../types';
import { bengaliLocative } from '../tokenizers/bengali-script';

/**
 * Does `word` end in a letter of a script other than Latin, with any marks on
 * it (bn `বডি` ends in a vowel sign): a word of the language, not code.
 */
const endsInWord = (word: string): boolean => /[^\p{Script=Latin}\P{L}]\p{M}*$/u.test(word);

/** bn's locative, as a role marker and as the `on` word. */
const BN_LOCATIVE: ReadonlySet<string> = new Set(['তে', 'এ']);

/**
 * The marker the reader gives back for a suffix written onto a word: bn's
 * vowel sign `ে` reads as `তে` (bengali.ts); every other suffix reads as itself.
 */
export function attachedSuffixReads(profile: LanguageProfile | undefined, suffix: string): string {
  return profile?.code === 'bn' && suffix === '\u09c7' ? 'তে' : suffix;
}

/**
 * ko's particles that take another form after a vowel: the form after a
 * consonant (batchim) first. `으로`/`로` also takes `로` after ㄹ.
 */
const KO_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['을', '를'],
  ['이', '가'],
  ['은', '는'],
  ['과', '와'],
  ['으로', '로'],
];

/**
 * ko's particle in the form the word's last syllable takes (`나를`, `#out을`):
 * after a Hangul syllable, by its final consonant; after code, as the render
 * chose it (how a selector is read is not the text's).
 */
function koreanParticle(word: string, particle: string): string {
  const pair = KO_PAIRS.find(p => p.includes(particle));
  const last = word.codePointAt(word.length - 1) ?? 0;
  if (!pair || last < 0xac00 || last > 0xd7a3) return particle;
  const batchim = (last - 0xac00) % 28;
  if (batchim === 0 || (batchim === 8 && pair[0] === '으로')) return pair[1];
  return pair[0];
}

/**
 * Is `marker` the language's marker of `role` in `action`: the profile's, or
 * the command's own (`markerOverride`, `markerVariants`)? A literal that stands
 * after a role in a pattern can mark the role after it instead (bn's loop
 * `x এ <p/>`, English's order), and attaches only to the value it marks.
 */
export function marksRole(
  profile: LanguageProfile,
  action: string,
  role: string,
  marker: string
): boolean {
  const own = profile.roleMarkers[role as keyof typeof profile.roleMarkers];
  if (own && (own.primary === marker || own.alternatives?.includes(marker))) return true;
  const spec = getSchema(action as ActionType)?.roles.find(r => r.role === role);
  return (
    spec?.markerOverride?.[profile.code] === marker ||
    !!spec?.markerVariants?.[profile.code]?.includes(marker)
  );
}

/**
 * `word` with `marker` written onto it, or undefined where the language writes
 * the marker apart: it attaches no marker, `marker` is not one it attaches, or
 * `word` is a word of the language whose spelling the marker does not follow.
 * bn's locative takes the word's form (`ক্লিকে`, `জমাতে`: bengaliLocative).
 */
export function attachMarker(
  profile: LanguageProfile | undefined,
  word: string,
  marker: string
): string | undefined {
  const attached = profile?.attachedMarkers;
  if (!attached || !word || /\s$/.test(word) || !attached.markers.includes(marker)) {
    return undefined;
  }
  if (profile.code === 'bn' && endsInWord(word) && BN_LOCATIVE.has(marker)) {
    return bengaliLocative(word);
  }
  if (endsInWord(word) && attached.afterWords !== 'all' && !attached.afterWords?.includes(marker)) {
    return undefined;
  }
  return word + (profile.code === 'ko' ? koreanParticle(word, marker) : marker);
}
