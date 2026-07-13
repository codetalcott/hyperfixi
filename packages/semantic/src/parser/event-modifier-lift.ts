/**
 * Event-modifier phrase lift (Arc F).
 *
 * Finds a mid-stream event-modifier phrase — `once`, `debounced at 300ms`,
 * `throttled at 100ms` — in a token stream and returns the captured modifiers
 * plus the exact character span to excise. The caller removes the span from
 * the source string and re-parses the reduced input, then re-attaches the
 * modifiers to the resulting event-handler node.
 *
 * Ground truth from the pattern corpus (patterns.db, 4 patterns × 24
 * languages): `debounced`/`throttled` are English loanwords in every render —
 * only the preposition between keyword and duration is translated (es `en`,
 * de `bei`, fr `à`, pl `przy`, ru `у`, th `ที่`, vi `tại`, zh `在`, ar `عند` …),
 * and he/zh interpose two connective tokens (`את at` / `把 在`). `once` is a
 * loanword in 21 languages and translated in three: ru `однажды`, uk
 * `один_раз` (underscore-shattered by the tokenizer into `один`+`_`+`раз`),
 * vi `một lần` (two tokens). Those translated forms live in a parser-local
 * table below (the OR_KEYWORDS precedent), NOT in profiles/dictionaries —
 * dictionary sources: i18n dictionaries ru.ts/uk.ts/vi.ts key `once`.
 *
 * Phantom protection:
 * - scan starts at index 1 — a LEADING phrase is extractStandaloneModifiers'
 *   job (semantic-parser.ts, the SOV/VSO head position);
 * - keyword match is whole-token equality (never substring — es `entonces`
 *   contains "once"), and the first token of a match must not be a selector
 *   (`add .once to me`), literal (`"once"`), url, or dot-syntax
 *   event-modifier token (`.debounce(300)`);
 * - `debounced`/`throttled` mid-stream REQUIRE a duration literal within two
 *   connective tokens — no duration, no lift (the leading path defaults a
 *   missing duration; the mid-stream path deliberately does not).
 */
import type { LanguageToken } from '../types';

export interface ModifierPhraseLift {
  readonly modifiers: { once?: boolean; debounce?: number; throttle?: number };
  /** Character offset of the first lifted token. */
  readonly start: number;
  /** Character offset just past the last lifted token. */
  readonly end: number;
}

const MODIFIER_KEYWORDS: Record<string, 'debounce' | 'throttle'> = {
  debounced: 'debounce',
  debounce: 'debounce',
  throttled: 'throttle',
  throttle: 'throttle',
};

/**
 * Surface-token sequences meaning `once`. Longest-match-first per start
 * token. Provenance: packages/i18n/src/dictionaries/{ru,uk,vi}.ts key `once`
 * (ru `однажды`, uk `один_раз`, vi `một lần`); the uk form is listed both
 * whole and underscore-shattered because tokenizers differ on `_` splitting.
 */
const ONCE_SEQUENCES: ReadonlyArray<readonly string[]> = [
  ['один', '_', 'раз'],
  ['один_раз'],
  ['однажды'],
  ['một', 'lần'],
  ['once'],
];

const DURATION_RE = /^(\d+)(ms|s|m)?$/;

/** Kinds that can never begin a modifier phrase (see phantom notes above). */
const EXCLUDED_FIRST_KINDS = new Set(['selector', 'literal', 'url', 'event-modifier']);

function durationToMs(value: string): number | null {
  const match = value.match(DURATION_RE);
  if (!match) return null;
  let ms = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  if (unit === 's') ms *= 1000;
  else if (unit === 'm') ms *= 60000;
  return ms;
}

export function findEventModifierPhrase(
  tokens: readonly LanguageToken[]
): ModifierPhraseLift | null {
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (EXCLUDED_FIRST_KINDS.has(tok.kind)) continue;
    const lower = tok.value.toLowerCase();

    const durType = MODIFIER_KEYWORDS[lower];
    if (durType) {
      // Duration within reach: up to two connective tokens (the translated
      // preposition, plus he `את`/zh `把` doubling) then the duration literal.
      let connectives = 0;
      for (let j = i + 1; j < tokens.length; j++) {
        const cand = tokens[j];
        const ms = durationToMs(cand.value);
        if (ms !== null) {
          return {
            modifiers: { [durType]: ms },
            start: tok.position.start,
            end: cand.position.end,
          };
        }
        // Selectors/literals/urls end the phrase window — only bare
        // connective words may sit between keyword and duration.
        if (cand.kind === 'selector' || cand.kind === 'literal' || cand.kind === 'url') break;
        if (++connectives > 2) break;
      }
      continue; // no duration in reach — not a modifier phrase, keep scanning
    }

    for (const seq of ONCE_SEQUENCES) {
      if (seq[0] !== lower) continue;
      if (i + seq.length > tokens.length) continue;
      let matched = true;
      for (let k = 1; k < seq.length; k++) {
        if (tokens[i + k].value.toLowerCase() !== seq[k]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return {
          modifiers: { once: true },
          start: tok.position.start,
          end: tokens[i + seq.length - 1].position.end,
        };
      }
    }
  }
  return null;
}
