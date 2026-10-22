/**
 * Host-parser validity gate (review item F8).
 *
 * After the preprocessor rewrites an attribute to English, the plugin asks
 * the HOST _hyperscript runtime — the same parser that will consume the
 * rewrite moments later — whether the result actually parses. On rejection
 * the plugin falls back to the author's original text, so any parse error
 * the author then sees names code they wrote, not invisible generated
 * English. This is the runtime analog of the offline R4 canonical-validity
 * gate, and the F5 arc measured its failure class shipping in practice:
 * until the whole-string-first reorder (#899), 256 corpus rows rendered
 * English the engine rejects, with no warning anywhere.
 *
 * The engine has two failure channels — `parse().errors` collects grammar
 * errors, and the tokenizer THROWS on an unknown character — folded here
 * the same way test/whole-string-first.test.ts folds them.
 *
 * Zero-dependency module: shared by the full, slim, and lite plugin
 * variants, which must not share heavier import chains (the slim/lite
 * bundles exclude the full semantic package by construction).
 */

/** The part of a host parse result the gate reads: grammar errors, and each handler's events. */
export interface HostParseResult {
  errors?: unknown[];
  features?: Array<{ events?: Array<{ on?: unknown }> }>;
}

export interface HyperscriptParseHost {
  parse?: (src: string) => HostParseResult | null | undefined;
}

/**
 * Names that are references, never events. A translation that reads one as a
 * handler's event parses cleanly and does nothing: the README's Japanese
 * example `on click .active を me で 切り替え` became `on click on me toggle
 * .active`, which the engine reads as an empty click handler plus a handler for
 * an event named `me`, and the button stayed dead. The host accepts that, so
 * the gate asks for it by name.
 */
const REFERENCE_NAMES = new Set(['me', 'my', 'i', 'it', 'its', 'you', 'your']);

/** The reference a parse result listens for as an event, if any. */
export function referenceReadAsEvent(
  result: HostParseResult | null | undefined
): string | undefined {
  for (const feature of result?.features ?? []) {
    for (const event of feature.events ?? []) {
      if (typeof event.on === 'string' && REFERENCE_NAMES.has(event.on.toLowerCase()))
        return event.on;
    }
  }
  return undefined;
}

/**
 * True when the host's parser accepts `src` and reads no reference as a
 * handler's event (see REFERENCE_NAMES). Also true when the host exposes no
 * `parse()` — with nothing to validate against, the gate degrades to a no-op
 * rather than suppressing translation on unusual builds (same graceful
 * posture as the `addBeforeProcessHook` check).
 */
export function acceptedByHost(hs: HyperscriptParseHost, src: string): boolean {
  return checkWithHost(hs, src).accepted;
}

/** The host's verdict on a translation, and the events its handlers listen for. */
export interface HostVerdict {
  accepted: boolean;
  events: string[];
}

/** `acceptedByHost`, keeping the handlers' event names from the same parse. */
export function checkWithHost(hs: HyperscriptParseHost, src: string): HostVerdict {
  if (typeof hs.parse !== 'function') return { accepted: true, events: [] };
  try {
    const result = hs.parse(src);
    if (result?.errors && result.errors.length > 0) return { accepted: false, events: [] };
    const events = (result?.features ?? []).flatMap(f =>
      (f.events ?? []).flatMap(e => (typeof e.on === 'string' ? [e.on] : []))
    );
    return { accepted: referenceReadAsEvent(result) === undefined, events };
  } catch {
    return { accepted: false, events: [] };
  }
}

/**
 * Events the DOM or the engine fires that an `on…` handler property may not name: none does
 * for `focusin`, and older DOMs (jsdom among them) lack the transition and animation ones.
 */
const EVENTS_WITHOUT_HANDLER = new Set([
  'focusin',
  'focusout',
  'mutation',
  'intersection',
  'transitionstart',
  'transitionrun',
  'transitionend',
  'transitioncancel',
  'animationstart',
  'animationiteration',
  'animationend',
  'animationcancel',
]);

/**
 * True when something fires an event by this name: an element, the document or the window
 * has its `on…` handler. Without a DOM nothing can be told, so every name passes.
 */
function isFiredEvent(name: string): boolean {
  const g = globalThis as { HTMLElement?: { prototype: object }; document?: object };
  if (!g.HTMLElement) return true;
  if (EVENTS_WITHOUT_HANDLER.has(name)) return true;
  const handler = 'on' + name;
  return (
    handler in g.HTMLElement.prototype ||
    (!!g.document && handler in g.document) ||
    handler in globalThis
  );
}

/**
 * The handler events of a translation that are a word the author wrote, which nothing fires:
 * a word the language's vocabulary does not know passes through as a custom event's name, and
 * the handler never runs (es `al pulsar …` is `on pulsar …`; 7.3.0 live test). A name written
 * as code (`miEvento`, `draggable:start`, `fx-swap`) is a custom event on purpose, and stays
 * quiet; so does any name the language translated, which the source does not contain.
 */
export function unknownEventWords(src: string, events: readonly string[]): string[] {
  return events.filter(
    name =>
      /^[\p{L}\p{M}]+$/u.test(name) &&
      !/\p{Lu}/u.test(name.slice(1)) &&
      src.includes(name) &&
      !isFiredEvent(name)
  );
}

/** (language, word) pairs already warned about this page load. */
const warnedUnknownEvent = new Set<string>();

/** Warn, once per language and word, about a handler event nothing fires. */
export function warnUnknownEvents(lang: string, src: string, events: readonly string[]): void {
  for (const word of unknownEventWords(src, events)) {
    const key = `${lang}\u0000${word}`;
    if (warnedUnknownEvent.has(key)) continue;
    warnedUnknownEvent.add(key);
    console.warn(
      `[hyperscript-i18n] lang="${lang}": "${word}" is not an event this language knows, so it ` +
        `runs as a custom event named "${word}", which nothing fires unless a script sends it. ` +
        `Source: "${src.length > 60 ? src.slice(0, 60) + '…' : src}".`
    );
  }
}

/** Languages already warned about a rejected translation this page load —
 *  same warn-once-per-lang convention as the unchanged-translation warning
 *  (and htmx-adapter's warnMissingLangOnce). */
const warnedRejectedLang = new Set<string>();

/** Reset the warn-once state. Mainly for tests. */
export function resetHostValidationWarnings(): void {
  warnedRejectedLang.clear();
  warnedLossyLang.clear();
  warnedUnknownEvent.clear();
}

export function warnRejectedOnce(lang: string, src: string, english: string): void {
  if (warnedRejectedLang.has(lang)) return;
  warnedRejectedLang.add(lang);
  console.warn(
    `[hyperscript-i18n] Translation for lang="${lang}" rendered hyperscript the host parser ` +
      `rejects (or reads as a handler for an event named like me/it/you) — falling back to the ` +
      `original text. ` +
      `Source: "${src.length > 60 ? src.slice(0, 60) + '…' : src}" → ` +
      `"${english.length > 60 ? english.slice(0, 60) + '…' : english}". ` +
      'Further elements in this language stay quiet — enable { debug: true } for per-element detail.'
  );
}

/**
 * A translation semantic refused because it would lose part of the script
 * (`LossyTranslationError`, read by name: the slim and lite plugins must not
 * import semantic's class). Keeping the author's text is the refusal at run
 * time: the engine then reports a parse error naming code the author wrote,
 * where the partial English would have run as though it were the whole.
 */
export interface LossyRefusal {
  /** What the translation would drop. */
  lost: readonly string[];
  /** The English it would have produced: NOT the whole script. */
  partial: string;
}

/** The refusal an error carries, when it is semantic's `LossyTranslationError`. */
export function lossyRefusalOf(error: unknown): LossyRefusal | undefined {
  if (!(error instanceof Error) || error.name !== 'LossyTranslationError') return undefined;
  const e = error as Error & { partial?: unknown; loss?: { lost?: unknown } };
  if (typeof e.partial !== 'string') return undefined;
  return { partial: e.partial, lost: Array.isArray(e.loss?.lost) ? e.loss.lost.map(String) : [] };
}

/** Languages already warned about a refused (lossy) translation this page load. */
const warnedLossyLang = new Set<string>();

export function warnLossyOnce(lang: string, src: string, refusal: LossyRefusal): void {
  if (warnedLossyLang.has(lang)) return;
  warnedLossyLang.add(lang);
  console.warn(
    `[hyperscript-i18n] Translation for lang="${lang}" would lose part of the script ` +
      `(${refusal.lost.join(', ')}) — keeping the original text, which the host will report. ` +
      `Source: "${src.length > 60 ? src.slice(0, 60) + '…' : src}". ` +
      'Further elements in this language stay quiet — enable { debug: true } for per-element detail.'
  );
}
