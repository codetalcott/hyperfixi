/**
 * An event handler's head, read without parser state: the SOV event markers
 * and their phrases, the source markers, the English event keywords, and the
 * modifiers around the event (`once`, `debounced at`, `async`, `or`-joined
 * events).
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { EventHandlerSemanticNode, SemanticValue, LanguageToken } from '../types';
import { tokenize as tokenizeInternal } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { isOrWordToken } from './utils/or-words';
import { eventNameTranslations } from '../patterns/event-handler';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS, matchEventParamPhrase } from './event-words';

/**
 * Whether the ENGLISH tokenizer classifies `word` as a keyword — which is
 * exactly how English decides a handler event is a `literal` rather than an
 * `expression` (see buildEventHandler). Memoized: this runs once per handler
 * built, and the answer is a property of the word alone.
 */
export const enEventKeywordCache = new Map<string, boolean>();

export function isEnEventKeyword(word: unknown): boolean {
  if (typeof word !== 'string') return false;
  const key = word.toLowerCase();
  const cached = enEventKeywordCache.get(key);
  if (cached !== undefined) return cached;
  let isKeyword = false;
  try {
    const tokens = tokenizeInternal(key, 'en').tokens;
    isKeyword = tokens.length === 1 && tokens[0]?.kind === 'keyword';
  } catch {
    isKeyword = false;
  }
  enEventKeywordCache.set(key, isKeyword);
  return isKeyword;
}

/**
 * SOV event marker particles per language (postpositions that mark the event role).
 * Korean has no event marker particle -- the event keyword stands alone.
 */
export const SOV_EVENT_MARKERS: Record<string, Set<string>> = {
  ja: new Set(['で']),
  ko: new Set(), // ko's marker is the two-token 할 때 phrase — see SOV_EVENT_MARKER_PHRASES
  tr: new Set(['de', 'da', 'te', 'ta']),
  bn: new Set(['এ']),
  qu: new Set(['pi']),
  // hi's event-on marker (`क्लिक पर` = "on click"). hi was the only priority SOV
  // language WITHOUT a Stage-3 SOV event-extraction fallback, so an event handler
  // whose generated pattern doesn't cover the emitted role order — notably the
  // patient-first 2-role shape `{patient} को {event} पर {verb} {destination} में`
  // (append-content) — used to survive only via the bare-event mis-anchor (the
  // fronted patient grabbed as a degenerate "event"). With the event-anchor guard
  // rejecting that, this fallback recovers the real `<known-event> पर` trigger and
  // re-parses the body. Stage 3 runs only when Stages 1–2 fail, and the known-event
  // gate + body re-parse keep it additive (NULL → parse, never overriding a match).
  hi: new Set(['पर']),
};

/**
 * OPTIONAL multi-token event-marker phrases consumed after the event token.
 * The ko i18n profile emits 할 때 after the event role; it tokenizes as TWO
 * tokens (할 identifier + 때 keyword), invisible to the single-token marker
 * check above. Unlike SOV_EVENT_MARKERS these never gate event detection —
 * ko events still anchor bare (pre-marker emissions, hand-written input) —
 * the phrase is just consumed when present so it doesn't leak into the body,
 * and it CONFIRMS a custom (identifier) event the way ja's で does.
 */
export const SOV_EVENT_MARKER_PHRASES: Record<string, string[][]> = {
  ko: [['할', '때'], ['할때']],
};

/** Lowercased surface forms (primary + alternatives) of a marker spec. */
function surfaceForms(
  spec: { primary?: string; alternatives?: readonly string[] } | undefined
): Set<string> {
  const set = new Set<string>();
  if (spec?.primary) set.add(spec.primary.toLowerCase());
  for (const alt of spec?.alternatives ?? []) set.add(alt.toLowerCase());
  return set;
}

/**
 * Is a bare event word the OBJECT of the verb after it, not a handler's event?
 * `afterIdx` is the token after the word (and its params). ko anchors an event
 * bare (above), so `로드 를 대기` (wait for load) read `on load` with `wait 를`
 * for its body: the object particle had nowhere else to go. A body never starts
 * with a particle. The one head that carries the object particle is the
 * generated `{event} 을 에`, where an event-marker form follows it.
 */
export function isEventWordObject(
  allTokens: readonly LanguageToken[],
  afterIdx: number,
  language: string
): boolean {
  const profile = tryGetProfile(language);
  const particle = allTokens[afterIdx];
  if (!profile || particle?.kind !== 'particle') return false;
  if (!surfaceForms(profile.roleMarkers?.patient).has(particle.value.toLowerCase())) return false;
  const next = allTokens[afterIdx + 1];
  return !next || !surfaceForms(profile.eventHandler?.eventMarker).has(next.value.toLowerCase());
}

/** Length (in tokens) of an event-marker phrase starting at startIdx, or 0. */
export function matchEventMarkerPhrase(
  allTokens: readonly LanguageToken[],
  startIdx: number,
  language: string
): number {
  const phrases = SOV_EVENT_MARKER_PHRASES[language];
  if (!phrases) return 0;
  for (const phrase of phrases) {
    if (phrase.every((w, j) => allTokens[startIdx + j]?.value === w)) return phrase.length;
  }
  return 0;
}

/**
 * Does the input carry an SOV event-handler head — a known-event token
 * immediately followed by this language's single-token event marker (ja で,
 * tr de/da/te/ta, …) or multi-token marker phrase (ko 할 때)?
 *
 * Used to distinguish a genuine standalone command from an event handler whose
 * verb is a command-homonym event word (scroll/resize/focus/…). With no
 * single-token event marker (ko), the Stage-1 fused event pattern can't anchor
 * once a `from <source>` clause (`창 에서`) splits the head, so Stage 2 matches the
 * homonym as its literal command and returns before the SOV extraction stage. This
 * structural cue (`<event> <marker>`) gates the Stage-2 preference for SOV
 * extraction, so a real bare command (`스크롤 #panel` — no marker) is untouched.
 * Returns false for languages with no SOV event-marker config.
 */
export function hasSOVEventMarkerHead(input: string, language: string): boolean {
  const eventMarkers = SOV_EVENT_MARKERS[language];
  if (eventMarkers === undefined) return false;

  const { tokens } = tokenizeInternal(input, language);
  const langEvents = eventNameTranslations[language];
  const nativeEventNames = new Set<string>();
  if (langEvents) {
    for (const native of Object.keys(langEvents)) nativeEventNames.add(native.toLowerCase());
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const value = token.value.toLowerCase();
    const normalized = token.normalized?.toLowerCase();
    const isEvent =
      (!!normalized && (KNOWN_EVENTS.has(normalized) || WAITABLE_EVENT_WORDS.has(normalized))) ||
      KNOWN_EVENTS.has(value) ||
      WAITABLE_EVENT_WORDS.has(value) ||
      nativeEventNames.has(value);
    if (!isEvent) continue;

    // A param phrase (`pointerdown(clientY)`) sits between the event keyword
    // and its marker — skip it, mirroring trySOVEventExtraction.
    const paramLen = matchEventParamPhrase(tokens, i + 1).len;
    const next = tokens[i + 1 + paramLen];
    if (
      next &&
      (next.kind === 'particle' || next.kind === 'keyword') &&
      eventMarkers.has(next.value)
    ) {
      return true;
    }
    if (matchEventMarkerPhrase(tokens, i + 1 + paramLen, language) > 0) return true;
  }
  return false;
}

/**
 * SOV source markers ("from" equivalents) and window tokens per language.
 * Used to strip "from window/elsewhere" event modifiers.
 */
export const SOV_SOURCE_MARKERS: Record<
  string,
  { markers: Set<string>; windowTokens: Set<string> }
> = {
  ja: {
    markers: new Set(['から']),
    windowTokens: new Set(['ウィンドウ', 'ドキュメント', 'window', 'document']),
  },
  ko: {
    markers: new Set(['에서']),
    windowTokens: new Set(['창', '윈도우', '문서', 'window', 'document']),
  },
  tr: {
    markers: new Set(['den', 'dan', 'ten', 'tan']),
    windowTokens: new Set(['pencere', 'belge', 'window', 'document']),
  },
  bn: {
    markers: new Set(['থেকে', 'মধ্যে']),
    windowTokens: new Set(['উইন্ডো', 'ডকুমেন্ট', 'window', 'document']),
  },
  qu: {
    markers: new Set(['manta']),
    windowTokens: new Set(['k_iri', 'ventana', 'window', 'document']),
  },
  hi: {
    markers: new Set(['से']),
    windowTokens: new Set(['विंडो', 'दस्तावेज़', 'window', 'document']),
  },
};

/**
 * Whether a token is a strippable event-source REFERENCE — a pronoun (`私`/
 * `나`/`ben`/`আমি`/`मैं`/`noqa`, all normalized `me`/`i`/`it`) or a window/
 * document token. The en reference drops the handler's `from me` phrase
 * entirely (event role only), so stripping the rendered pair matches it.
 * Deliberately NOT identifiers (`triggerEl から` stays in the body, where the
 * value-led skipped-run recovery reclaims it — behavior-removable relies on
 * that).
 */
export function isStrippableSourceRef(
  tok: LanguageToken | undefined,
  windowTokens: Set<string>
): boolean {
  if (!tok) return false;
  const norm = tok.normalized?.toLowerCase();
  if (tok.kind === 'keyword' && (norm === 'me' || norm === 'i' || norm === 'it')) return true;
  const v = tok.value.toLowerCase();
  return windowTokens.has(v) || (!!norm && windowTokens.has(norm));
}

/**
 * Standalone event modifier keywords (loanwords used across languages).
 * Pattern: `[modifier] [preposition?] [duration?] [rest...]`
 */
export const STANDALONE_MODIFIERS: Record<string, 'once' | 'debounce' | 'throttle'> = {
  once: 'once',
  debounced: 'debounce',
  debounce: 'debounce',
  throttled: 'throttle',
  throttle: 'throttle',
};

/**
 * "Or" conjunction keywords across languages for multiple events.
 * Maps lowercase keyword → true. Used to detect "click or keydown" patterns.
 */
/**
 * Extract standalone event modifiers from the beginning of input.
 * Returns the modifiers (if any) and the remaining input string.
 */
export function extractStandaloneModifiers(
  input: string,
  _language: string
): {
  modifiers: {
    once?: boolean;
    onceAsFirst?: boolean;
    every?: boolean;
    debounce?: number;
    throttle?: number;
  } | null;
  remainingInput: string | null;
} {
  const tokens = tokenizeInternal(input, _language);
  const allTokens = tokens.tokens;

  if (allTokens.length === 0) return { modifiers: null, remainingInput: null };

  const firstToken = allTokens[0];
  const firstLower = firstToken.value.toLowerCase();

  // `once` written as `first`: en `on first click …`, and every other
  // language's leading `first` (as its leading `once`), in English or in its
  // own word, which its tokenizer reads as `first` (es `primero`, M2 sheet
  // A7). Semantic had no reading for either: en dropped the whole head (`on
  // first click add …` rendered `add …`). A leading `first` before a selector
  // is a positional query instead (hand-written ja `first <li/> を 隠す`, hide
  // first <li/>).
  const word = (i: number) => allTokens[i]?.value.toLowerCase();
  const notQuery = (i: number) => !!allTokens[i] && allTokens[i].kind !== 'selector';
  const leadsWithFirst = (firstToken.normalized ?? firstLower).toLowerCase() === 'first';
  if (firstLower === 'on' && word(1) === 'first' && allTokens.length > 2) {
    return {
      modifiers: { once: true, onceAsFirst: true },
      remainingInput:
        input.slice(0, allTokens[1].position.start) + input.slice(allTokens[2].position.start),
    };
  }
  if (leadsWithFirst && notQuery(1)) {
    return {
      modifiers: { once: true, onceAsFirst: true },
      remainingInput: input.slice(allTokens[1].position.start),
    };
  }
  // `on every click …`, and every other language's leading `every`, read as
  // `first` is: semantic had no reading, and the head was lost.
  if (firstLower === 'on' && word(1) === 'every' && allTokens.length > 2) {
    return {
      modifiers: { every: true },
      remainingInput:
        input.slice(0, allTokens[1].position.start) + input.slice(allTokens[2].position.start),
    };
  }
  if (firstLower === 'every' && notQuery(1) && allTokens.length > 2) {
    return {
      modifiers: { every: true },
      remainingInput: input.slice(allTokens[1].position.start),
    };
  }

  const modType = STANDALONE_MODIFIERS[firstLower];

  if (!modType) return { modifiers: null, remainingInput: null };

  const modifiers: {
    once?: boolean;
    onceAsFirst?: boolean;
    every?: boolean;
    debounce?: number;
    throttle?: number;
  } = {};
  let tokensToSkip = 1; // At least the modifier keyword

  if (modType === 'once') {
    modifiers.once = true;
  } else {
    // debounce/throttle: look for optional preposition + duration
    let nextIdx = 1;

    // Skip preposition tokens (sa, عند, at, etc.)
    if (nextIdx < allTokens.length) {
      const nextToken = allTokens[nextIdx];
      // Skip keyword/particle tokens that are prepositions (not selectors, literals, etc.).
      // The SOV renders keep the en preposition untranslated (`debounced at
      // 300ms …`), where `at` tokenizes as a bare IDENTIFIER — left in place
      // it strands `at 300ms` junk at the clause head and the fused parse
      // loses its trailing reclaims (event-debounce responseType). Skip one
      // identifier only when a duration-shaped literal directly follows.
      const after = allTokens[nextIdx + 1];
      const identifierPreposition =
        nextToken.kind === 'identifier' &&
        after?.kind === 'literal' &&
        /^\d+(ms|s|m)?$/.test(after.value);
      if (nextToken.kind === 'keyword' || nextToken.kind === 'particle' || identifierPreposition) {
        nextIdx++;
        tokensToSkip++;
      }
    }

    // Look for duration (number with unit like "100ms", "300ms")
    if (nextIdx < allTokens.length) {
      const durToken = allTokens[nextIdx];
      if (durToken.kind === 'literal') {
        const match = durToken.value.match(/^(\d+)(ms|s|m)?$/);
        if (match) {
          let ms = parseInt(match[1], 10);
          const unit = match[2] || 'ms';
          if (unit === 's') ms *= 1000;
          else if (unit === 'm') ms *= 60000;
          modifiers[modType] = ms;
          tokensToSkip = nextIdx + 1;
        }
      }
    }

    // If no duration found, use default
    if (!modifiers[modType]) {
      modifiers[modType] = modType === 'debounce' ? 300 : 100;
    }
  }

  // Reconstruct remaining input from the tokens after the modifier
  const remainingTokens = allTokens.slice(tokensToSkip);
  if (remainingTokens.length === 0) return { modifiers: null, remainingInput: null };

  // Use position data to extract the remaining input string
  const startPos = remainingTokens[0].position.start;
  const remainingInput = input.slice(startPos);

  return { modifiers, remainingInput };
}

/**
 * Remove a transparent `async` command-modifier keyword from the input so the
 * following command (not `async`) is parsed as the action. The async keyword is
 * found anywhere in the stream (the grammar transformer relocates it by word
 * order — leading in VSO, after the event in SVO, verb-final in SOV) and matched
 * against the language profile's `async` form (primary + alternatives) plus the
 * English literal the transformer passes through for profiles without a native
 * form. Returns `remainingInput: null` when there's no async keyword, so the
 * normal path is byte-identical.
 */
export function stripAsyncModifier(
  input: string,
  language: string
): { remainingInput: string | null } {
  const kw = tryGetProfile(language)?.keywords?.async;
  const forms = new Set<string>(['async']);
  if (kw?.primary) forms.add(kw.primary.toLowerCase());
  kw?.alternatives?.forEach(a => forms.add(a.toLowerCase()));

  const allTokens = tokenizeInternal(input, language).tokens;
  const idx = allTokens.findIndex(t => forms.has(t.value.toLowerCase()));
  if (idx === -1) return { remainingInput: null };

  const tok = allTokens[idx];
  const stripped = (input.slice(0, tok.position.start) + input.slice(tok.position.end))
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (stripped.length === 0) return { remainingInput: null };
  return { remainingInput: stripped };
}

/**
 * Apply standalone modifiers to an event handler node.
 */
export function applyModifiers(
  node: EventHandlerSemanticNode,
  modifiers: {
    once?: boolean;
    onceAsFirst?: boolean;
    every?: boolean;
    debounce?: number;
    throttle?: number;
  }
): EventHandlerSemanticNode {
  return {
    ...node,
    eventModifiers: {
      ...node.eventModifiers,
      ...modifiers,
    },
  };
}

/**
 * Extract "or" conjunction events from the token stream.
 * If the next tokens follow the pattern "or EVENT [or EVENT ...]",
 * consume them and return the additional event values.
 *
 * The token stream is advanced past any consumed "or EVENT" tokens.
 */
export function extractOrConjunctionEvents(
  tokens: Pick<ReturnType<typeof tokenizeInternal>, 'peek' | 'advance' | 'mark' | 'reset'>,
  _language: string
): SemanticValue[] {
  const additionalEvents: SemanticValue[] = [];

  while (true) {
    const mark = tokens.mark();
    const orToken = tokens.peek();
    if (!orToken) break;

    if (!isOrWordToken(orToken, _language)) {
      tokens.reset(mark);
      break;
    }

    // Consume the "or" token
    tokens.advance();

    // Next token should be the event name
    const eventToken = tokens.peek();
    if (!eventToken) {
      // "or" at end of input — revert
      tokens.reset(mark);
      break;
    }

    // A native event name normalizes to the English one (`clic` → `click`);
    // a custom one keeps its case, which the DOM matches exactly: lowercased,
    // a translated `on click or myEvent` listened for `myevent`.
    const eventName = eventToken.normalized || eventToken.value;

    // Accept it as an event (could be native or English event name)
    tokens.advance();
    additionalEvents.push({ type: 'literal', value: eventName });
  }

  return additionalEvents;
}
