/**
 * English left in a translation — the M2 naturalness gate
 * --------------------------------------------------------
 * Every other multilingual gate asks whether a translation means what the
 * source means. None asks whether it reads as the language: a Spanish render
 * that keeps `repeat`, `I match` or `debounced at` parses back perfectly and
 * passes all of them. Measured 2026-10-08, 18% of corpus renders and 24% of
 * the command-shape scripts' renders hold at least one English word.
 *
 * This gate counts three kinds of finding in a render of English `source`
 * into a language:
 *   - `word`   an English word the engine reads as grammar in the source (or a
 *              reference: `me`, `my`, `I`, `it`, …), written as English in the
 *              render;
 *   - `event`  an event the source handles or sends, written in English where
 *              the language's lexicon has a word for it and the pair is not on
 *              the renderer's denylist (OPEN_ITEMS N2);
 *   - `case`   the language's nominative `me` next to a role marker, in the
 *              languages where that form is wrong (N3, see CASE_LANGUAGES).
 *
 * ## What counts as English
 * Derived, never a hand list. A source's grammar words are the tokens the
 * engine's own parser matched as literal words while reading it
 * (`Parser.match`, which also consumes every command and feature keyword),
 * plus the references in its parse. A render word counts when it is one of
 * them (up to as many times as the source uses it as grammar, so a variable
 * named like a keyword is never counted), and the language has no word spelled
 * the same (es `a`, de `in`, it `in` are their own words). A property name
 * (`#a's children`) counts when the language's lexicon has a word for it.
 * Strings, `js` bodies and brace interiors (CSS, object literals) are code and
 * are not read.
 *
 * Each finding carries a context, for the report: `clause` (inside a clause
 * semantic keeps as written, M1's `verbatimClause` / `headClause`), `bracket`,
 * `call` (a call's arguments), `property`, or `plain`; and whether the
 * language has its own word for it (`hasWord`: then a renderer or reader can
 * write it; otherwise it is a vocabulary decision, roadmap policy 5).
 *
 * ## Inputs and baseline
 * Two halves, one rule. The corpus half renders every non-markup corpus row
 * (`render(parse(en), L)`, what `populate` writes) and needs a freshly
 * populated patterns.db, like the other corpus gates (`test:canonical`). The
 * command-shape half reads the renders the command-shape gate already makes
 * (`translate(src, 'en', L)`), in its shards. Each half's baseline lists, per
 * source, the findings of each language; the gate fails on a finding a pair
 * did not have, and on a listed finding that is gone (prune it with
 * tools/regen-english-leaks-baseline.ts), so the lists only shrink.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readerOf, type CaseResult, type CommandShapeCase } from './command-shapes';
import { FOREIGN_LANGUAGES } from './value-matrix';

const here = path.dirname(fileURLToPath(import.meta.url));

export const LEAK_BASELINE_PATHS = {
  corpus: path.resolve(here, '../../baselines/english-leaks.corpus.json'),
  shapes: path.resolve(here, '../../baselines/english-leaks.shapes.json'),
} as const;

export type LeakHalf = keyof typeof LEAK_BASELINE_PATHS;

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export type LeakKind = 'word' | 'event' | 'case';
export type LeakContext = 'plain' | 'clause' | 'bracket' | 'call' | 'property';

export interface LeakFinding {
  kind: LeakKind;
  /** The English word; for `event` the event name; for `case` the pronoun (`me`). */
  word: string;
  context: LeakContext;
  /** Does the language have its own word for it? */
  hasWord: boolean;
  /** English a recorded decision keeps ({@link KEPT_ENGLISH}): not counted toward M2's targets. */
  kept?: true;
}

/**
 * English a recorded decision keeps, so M2's words target does not count it
 * (the gate still does: it only shrinks). Contexts policy 6 keeps (roadmap §5),
 * and the vocabulary sheet's keep rows (`docs-internal/multilingual/
 * VOCABULARY_SHEET.md`, C1–C3, decided 2026-10-08).
 */
export const KEPT_ENGLISH: {
  readonly contexts: ReadonlySet<LeakContext>;
  readonly phrases: ReadonlyArray<{ readonly phrase: string; readonly why: string }>;
} = {
  // Policy 6: bracket and brace interiors, a call's arguments, a property name
  // its reader cannot bring back, and a clause no pattern models (M1).
  contexts: new Set(['bracket', 'call', 'property', 'clause']),
  phrases: [
    { phrase: 'debounced at', why: 'C1: a term of art with no settled native word' },
    { phrase: 'throttled at', why: 'C1: a term of art with no settled native word' },
    { phrase: 'url', why: 'C2: an international loanword (policy 6 keeps push/replace url)' },
    { phrase: 'dom', why: 'C3: an acronym' },
    {
      phrase: 'view transition',
      why: "C3: the web API's name (policy 6 keeps using view transition)",
    },
    { phrase: 'using', why: 'policy 6: `using view transition` (the phrase above holds the rest)' },
  ],
};

/** A finding as the baseline writes it: the word, or `event:<name>` / `case:<pronoun>`. */
export const findingKey = (f: Pick<LeakFinding, 'kind' | 'word'>): string =>
  f.kind === 'word' ? f.word : `${f.kind}:${f.word}`;

/**
 * Languages whose `me` word is nominative while a marker next to it wants
 * another case: es `a yo` (a mí), pt `a eu` (a mim), it `a io` (a me), de
 * `zu ich` (zu mir), pl `do ja` (do mnie), ru `к я` (ко мне), uk `до я`
 * (до мене), tr `ben e` (bana), ar `إلى أنا` (إليّ), he `אל אני` (אליי),
 * tl `sa ako` (sa akin), hi `मैं में` (मुझमें), bn `আমি তে` (আমাতে). The other
 * ten are right as written (fr `à moi`, ja `自分 に`, zh/id/ms/vi/th/ko/sw/qu
 * do not inflect the pronoun for case here). OPEN_ITEMS N3.
 */
export const CASE_LANGUAGES: ReadonlySet<string> = new Set([
  'ar',
  'bn',
  'de',
  'es',
  'he',
  'hi',
  'it',
  'pl',
  'pt',
  'ru',
  'tl',
  'tr',
  'uk',
]);

// ---------------------------------------------------------------------------
// What a source holds
// ---------------------------------------------------------------------------

export type LeakReader = 'program' | 'statements';

export interface SourceInfo {
  /** Words the engine read as grammar, with how often. */
  grammar: Map<string, number>;
  /** Property names in the source (`my value`, `#a's children`), with how often. */
  props: Map<string, number>;
  /** Events the source handles, sends or triggers, with how often. */
  events: Map<string, number>;
  /** `js` blocks: never translated, never read. */
  jsBodies: JsBlock[];
  /** Words of the clauses semantic keeps as written. */
  clauseWords: Set<string>;
}

/** References the engine reads as names; semantic translates them (`me` → es `yo`). */
const REFERENCE_NAMES: ReadonlySet<string> = new Set([
  'I',
  'me',
  'my',
  'it',
  'its',
  'you',
  'your',
  'result',
  'event',
  'target',
  'detail',
  'body',
  'document',
  'window',
]);

const bump = (map: Map<string, number>, key: string, by = 1): void => {
  map.set(key, (map.get(key) ?? 0) + by);
};

/** A `js` block: its parameter names (the script's, passed in) and its body (JavaScript). */
export interface JsBlock {
  params: string;
  body: string;
}

/** The `js` blocks of a source: `js`, an optional parameter list, a body, `end`. */
function jsBlocksOf(source: string): JsBlock[] {
  return [...source.matchAll(/\bjs\b\s*(?:\(([^)]*)\))?([\s\S]*?)\bend\b/g)]
    .map(m => ({ params: (m[1] ?? '').trim(), body: (m[2] ?? '').trim() }))
    .filter(b => b.body || b.params);
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// What a language holds
// ---------------------------------------------------------------------------

interface KeywordTranslationLike {
  primary?: string;
  alternatives?: readonly string[];
  render?: boolean;
}
interface ProfileLike {
  keywords?: Record<string, KeywordTranslationLike>;
  roleMarkers?: Record<string, KeywordTranslationLike & { position?: string }>;
  references?: Record<string, string>;
  possessive?: {
    marker?: string;
    specialForms?: Record<string, string>;
    keywords?: Record<string, string>;
  };
  eventHandler?: Record<string, unknown>;
}
type LexiconLike = Record<string, Record<string, KeywordTranslationLike> | undefined>;

const LEXICON_CATEGORIES = ['values', 'expressions', 'logical', 'temporal', 'attributes'] as const;

const wordsOf = (text: string | undefined): string[] => (text ?? '').split(/\s+/).filter(Boolean);
const spellings = (t: KeywordTranslationLike | undefined): string[] =>
  t ? [t.primary ?? '', ...(t.alternatives ?? [])].flatMap(wordsOf) : [];

interface LanguageWords {
  /** Every word the language writes: a render word spelled like one is its own. */
  native: Set<string>;
  /** English words the language has a word for (lexicon, keywords, references). */
  translated: Set<string>;
  /** Events its lexicon names, minus the renderer's denylist for it. */
  events: Set<string>;
  /** Its `me` word, and its role markers by side. */
  me: string | undefined;
  markersBefore: Set<string>;
  markersAfter: Set<string>;
}

function languageWords(
  profile: ProfileLike | undefined,
  lexicon: LexiconLike | undefined,
  denied: ReadonlySet<string> | undefined
): LanguageWords {
  const native = new Set<string>();
  const translated = new Set<string>();
  const add = (english: string, t: KeywordTranslationLike | undefined): void => {
    const forms = spellings(t);
    for (const w of forms) native.add(w);
    if (forms.length && !forms.includes(english))
      for (const w of wordsOf(english)) translated.add(w);
  };
  for (const [english, t] of Object.entries(profile?.keywords ?? {})) add(english, t);
  for (const t of Object.values(profile?.roleMarkers ?? {}))
    for (const w of spellings(t)) native.add(w);
  for (const [english, n] of Object.entries(profile?.references ?? {}))
    add(english, { primary: n });
  for (const [english, n] of Object.entries(profile?.possessive?.specialForms ?? {}))
    add(english === 'me' ? 'my' : english === 'it' ? 'its' : english === 'you' ? 'your' : english, {
      primary: n,
    });
  // Native form → the English reference it stands for (es `mi` → `me`).
  for (const n of Object.keys(profile?.possessive?.keywords ?? {}))
    for (const w of wordsOf(n)) native.add(w);
  for (const w of wordsOf(profile?.possessive?.marker)) native.add(w);
  const handler = JSON.stringify(profile?.eventHandler ?? {});
  for (const m of handler.matchAll(
    /"(?:primary|alternatives|temporalMarkers)":(\[[^\]]*\]|"[^"]*")/g
  ))
    for (const w of (JSON.parse(m[1] ?? '""') as string | string[]).toString().split(/[\s,]+/))
      if (w) native.add(w);
  for (const category of LEXICON_CATEGORIES)
    for (const [english, t] of Object.entries(lexicon?.[category] ?? {})) add(english, t);
  const events = new Set<string>();
  for (const [english, t] of Object.entries(lexicon?.events ?? {})) {
    for (const w of spellings(t)) native.add(w);
    if (t.render !== false && t.primary && t.primary !== english && !denied?.has(english))
      events.add(english);
  }
  const markersBefore = new Set<string>();
  const markersAfter = new Set<string>();
  for (const t of Object.values(profile?.roleMarkers ?? {}))
    for (const w of spellings(t)) (t.position === 'after' ? markersAfter : markersBefore).add(w);
  return {
    native,
    translated,
    events,
    me: profile?.references?.me,
    markersBefore,
    markersAfter,
  };
}

// ---------------------------------------------------------------------------
// Reading a render
// ---------------------------------------------------------------------------

/** Blank out `{…}` groups: CSS blocks and object literals are code. */
function blankBraces(text: string): string {
  let out = '';
  let depth = 0;
  for (const c of text) {
    if (c === '{') depth++;
    out += depth > 0 ? ' ' : c;
    if (c === '}' && depth > 0) depth--;
  }
  return out;
}

/** Strings, `js` bodies and brace interiors replaced by spaces (offsets kept). */
export function codeOnly(render: string, jsBlocks: readonly JsBlock[]): string {
  const blank = (m: string): string => ' '.repeat(m.length);
  let text = render;
  for (const { params, body } of jsBlocks) {
    const list = params
      ? `\\(\\s*${params
          .split(/\s*,\s*/)
          .map(escapeRegExp)
          .join('\\s*,\\s*')}\\s*\\)\\s*`
      : '';
    text = text.replace(new RegExp(`${list}${escapeRegExp(body)}`, 'g'), blank);
  }
  return blankBraces(text)
    .replace(/`[^`]*`/g, blank)
    .replace(/"(?:[^"\\]|\\.)*"/g, blank)
    .replace(/(?<![\p{L}\p{N}])'(?:[^'\\\n]|\\.)*'/gu, blank);
}

/** Where `[…]` groups and a call's `(…)` arguments sit, innermost last. */
function groupSpans(text: string): Array<[number, number, 'bracket' | 'call']> {
  const spans: Array<[number, number, 'bracket' | 'call']> = [];
  const open: Array<[number, string, boolean]> = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '[' || c === '(')
      open.push([i, c, c === '(' && i > 0 && /[\w$]/.test(text[i - 1] ?? '')]);
    else if ((c === ']' || c === ')') && open.length) {
      const [start, kind, call] = open.pop()!;
      if (kind === '[') spans.push([start, i, 'bracket']);
      else if (call) spans.push([start, i, 'call']);
    }
  }
  return spans.sort((a, b) => a[0] - b[0]);
}

interface RenderWord {
  word: string;
  offset: number;
}

/** The words of a render's code, each with its offset. */
function renderWords(text: string): RenderWord[] {
  const out: RenderWord[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    let token = m[0];
    let offset = m.index ?? 0;
    const lead = /^[([,]+/.exec(token)?.[0].length ?? 0;
    token = token.slice(lead);
    offset += lead;
    out.push({ word: token.replace(/[)\],;]+$/, '').replace(/'s$/, ''), offset });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The scanner
// ---------------------------------------------------------------------------

export interface LeakScanner {
  /** What the engine and semantic read in a source; `null` when the engine rejects it. */
  sourceInfo(source: string, reader: LeakReader): SourceInfo | null;
  /** The findings of one render of `info`'s source into `language`. */
  scan(render: string, info: SourceInfo, language: string): LeakFinding[];
}

interface EngineModule {
  register(...modules: unknown[]): void;
  everything: unknown[];
  parse(source: string): unknown;
  parseProgram(source: string): unknown;
  Parser: { prototype: { match(value: string, type?: string): unknown } };
}
interface SemanticModule {
  parse(source: string, language: string): unknown;
  tryGetProfile(language: string): unknown;
  getLexicon(language: string): unknown;
  getEventLocalizationDenylist(): Record<string, ReadonlySet<string>>;
}

/** Load the engine and semantic (ESM-only, so imported here) and return a scanner. */
export async function initLeakScanner(): Promise<LeakScanner> {
  const engine = (await import('@hyperfixi/engine')) as unknown as EngineModule;
  engine.register(...engine.everything);
  const semantic = (await import('@lokascript/semantic')) as unknown as SemanticModule;
  const denylist = semantic.getEventLocalizationDenylist();
  const languages = new Map<string, LanguageWords>();
  for (const language of FOREIGN_LANGUAGES) {
    languages.set(
      language,
      languageWords(
        semantic.tryGetProfile(language) as ProfileLike | undefined,
        semantic.getLexicon(language) as LexiconLike | undefined,
        denylist[language]
      )
    );
  }

  /** Parse with the engine, recording every token its grammar matched as a word. */
  const readGrammar = (
    source: string,
    reader: LeakReader
  ): { ast: unknown; matched: Set<object> } | null => {
    const proto = engine.Parser.prototype;
    const original = proto.match;
    const matched = new Set<object>();
    proto.match = function (this: unknown, value: string, type?: string) {
      const token = original.call(this, value, type);
      if (token && (type ?? 'IDENTIFIER') === 'IDENTIFIER') matched.add(token as object);
      return token;
    };
    try {
      return {
        ast: reader === 'program' ? engine.parseProgram(source) : engine.parse(source),
        matched,
      };
    } catch {
      return null;
    } finally {
      proto.match = original;
    }
  };

  return {
    sourceInfo(source, reader) {
      const read = readGrammar(source, reader);
      if (!read) return null;
      const grammar = new Map<string, number>();
      for (const token of read.matched) bump(grammar, (token as { value: string }).value);
      const references = new Map<string, number>();
      const props = new Map<string, number>();
      const events = new Map<string, number>();
      const seen = new WeakSet<object>();
      const walk = (value: unknown, key: string): void => {
        if (typeof value === 'string') {
          if (key === 'name' && REFERENCE_NAMES.has(value)) bump(references, value);
          else if (key === 'prop') bump(props, value);
          else if (key === 'on' || key === 'event') bump(events, value);
          return;
        }
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        for (const [k, v] of Object.entries(value))
          if (typeof v !== 'function') walk(v, Array.isArray(value) ? key : k);
      };
      walk(read.ast, '');
      for (const [word, n] of references) grammar.set(word, Math.max(grammar.get(word) ?? 0, n));

      const clauseWords = new Set<string>();
      let node: unknown = null;
      try {
        node = semantic.parse(source, 'en');
      } catch {
        // No clause words: every finding reads as plain.
      }
      const clauses = (n: unknown): void => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) return n.forEach(clauses);
        const record = n as Record<string, unknown>;
        for (const k of ['verbatimClause', 'headClause'])
          if (typeof record[k] === 'string')
            for (const w of wordsOf(record[k] as string)) clauseWords.add(w);
        for (const v of Object.values(record)) if (v && typeof v === 'object') clauses(v);
      };
      clauses(node);
      return { grammar, props, events, jsBodies: jsBlocksOf(source), clauseWords };
    },

    scan(render, info, language) {
      const lang = languages.get(language);
      if (!lang) throw new Error(`no vocabulary for ${language}`);
      const text = codeOnly(render, info.jsBodies);
      const spans = groupSpans(text);
      const contextAt = (offset: number): 'bracket' | 'call' | undefined => {
        let found: 'bracket' | 'call' | undefined;
        for (const [start, end, kind] of spans) if (start < offset && offset < end) found = kind;
        return found;
      };
      const keptSpans: Array<[number, number]> = [];
      for (const { phrase } of KEPT_ENGLISH.phrases)
        for (const m of text.matchAll(
          new RegExp(
            `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`,
            'gu'
          )
        ))
          keptSpans.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
      const isKept = (offset: number, context: LeakContext): boolean =>
        KEPT_ENGLISH.contexts.has(context) ||
        keptSpans.some(([start, end]) => start <= offset && offset < end);
      const findings: LeakFinding[] = [];
      const grammarLeft = new Map(info.grammar);
      const propsLeft = new Map(info.props);
      const eventsLeft = new Map(info.events);
      const words = renderWords(text);
      for (const { word, offset } of words) {
        if (!/^[A-Za-z]+$/.test(word) || lang.native.has(word)) continue;
        if ((eventsLeft.get(word) ?? 0) > 0) {
          eventsLeft.set(word, eventsLeft.get(word)! - 1);
          if (lang.events.has(word))
            findings.push({ kind: 'event', word, context: 'plain', hasWord: true });
          continue;
        }
        const grammar = (grammarLeft.get(word) ?? 0) > 0;
        const prop = !grammar && (propsLeft.get(word) ?? 0) > 0 && lang.translated.has(word);
        if (!grammar && !prop) continue;
        (grammar ? grammarLeft : propsLeft).set(
          word,
          (grammar ? grammarLeft : propsLeft).get(word)! - 1
        );
        const context: LeakContext = info.clauseWords.has(word)
          ? 'clause'
          : (contextAt(offset) ?? (prop ? 'property' : 'plain'));
        findings.push({
          kind: 'word',
          word,
          context,
          hasWord: lang.translated.has(word),
          ...(isKept(offset, context) ? { kept: true as const } : {}),
        });
      }
      if (CASE_LANGUAGES.has(language) && lang.me) {
        const tokens = words.map(w => w.word);
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] !== lang.me) continue;
          const before = tokens[i - 1];
          const after = tokens[i + 1];
          if ((before && lang.markersBefore.has(before)) || (after && lang.markersAfter.has(after)))
            findings.push({ kind: 'case', word: 'me', context: 'plain', hasWord: true });
        }
      }
      return findings;
    },
  };
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

/** One half's committed findings: per source, a findings string → the languages that have it. */
export interface LeakBaseline {
  description: string;
  /** Renders read, renders with a finding, and findings, at the last regeneration. */
  renders: number;
  leaky: number;
  findings: number;
  /** The same, per kind: `word.renders` is the leak rate's numerator. */
  kinds: Record<LeakKind, { renders: number; findings: number }>;
  /** Per source id: `"<finding> <finding> …"` (sorted keys) → languages (`*` for all 23). */
  entries: Record<string, Record<string, string>>;
  /**
   * Per source id, the languages with no render (the translation was refused).
   * A lane that starts to render is progress, not a leak: the gate reports it
   * as one to prune, and its English is counted from then on.
   */
  unrendered?: Record<string, string>;
}

/** The results of one half: per source id, per language, the findings (`null`: no render). */
export type LeakResults = Map<string, Map<string, LeakFinding[] | null>>;

const ALL = '*';
export function compressLanguages(languages: readonly string[]): string {
  const set = new Set(languages);
  return FOREIGN_LANGUAGES.every(l => set.has(l))
    ? ALL
    : FOREIGN_LANGUAGES.filter(l => set.has(l)).join(' ');
}
export function expandLanguages(text: string): string[] {
  return text === ALL ? [...FOREIGN_LANGUAGES] : text.split(' ').filter(Boolean);
}

export const keysOf = (findings: readonly LeakFinding[] | null): string[] =>
  (findings ?? []).map(findingKey).sort();

export function leakBaselineFrom(results: LeakResults, description: string): LeakBaseline {
  const doc: LeakBaseline = {
    description,
    renders: 0,
    leaky: 0,
    findings: 0,
    kinds: {
      word: { renders: 0, findings: 0 },
      event: { renders: 0, findings: 0 },
      case: { renders: 0, findings: 0 },
    },
    entries: {},
    unrendered: {},
  };
  for (const [id, byLanguage] of [...results].sort((a, b) => a[0].localeCompare(b[0]))) {
    const groups = new Map<string, string[]>();
    const unrendered: string[] = [];
    for (const [language, findings] of byLanguage) {
      if (!findings) {
        unrendered.push(language);
        continue;
      }
      doc.renders++;
      if (!findings.length) continue;
      doc.leaky++;
      doc.findings += findings.length;
      for (const kind of ['word', 'event', 'case'] as const) {
        const n = findings.filter(f => f.kind === kind).length;
        doc.kinds[kind].findings += n;
        if (n) doc.kinds[kind].renders++;
      }
      const key = keysOf(findings).join(' ');
      groups.set(key, [...(groups.get(key) ?? []), language]);
    }
    if (unrendered.length) doc.unrendered![id] = compressLanguages(unrendered);
    if (!groups.size) continue;
    doc.entries[id] = Object.fromEntries(
      [...groups]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, ls]) => [key, compressLanguages(ls)])
    );
  }
  return doc;
}

/** The findings a baseline lists for one (source, language). */
export function listedKeys(
  baseline: Pick<LeakBaseline, 'entries'>,
  id: string,
  language: string
): string[] {
  for (const [key, languages] of Object.entries(baseline.entries[id] ?? {}))
    if (expandLanguages(languages).includes(language)) return key.split(' ');
  return [];
}

export interface LeakChange {
  id: string;
  language: string;
  /** Findings the pair has now and the baseline does not list. */
  added: string[];
  /** Findings the baseline lists and the pair no longer has. */
  gone: string[];
  /** The baseline lists the pair as unrendered and it renders now: `added` is its English. */
  newRender?: boolean;
}

/** Multiset difference `a − b`. */
function minus(a: readonly string[], b: readonly string[]): string[] {
  const left = [...b];
  return a.filter(x => {
    const i = left.indexOf(x);
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
}

/** Compare results with a baseline, over the sources and languages that ran. */
export function diffLeakBaseline(
  results: LeakResults,
  baseline: Pick<LeakBaseline, 'entries' | 'unrendered'>
): LeakChange[] {
  const changes: LeakChange[] = [];
  for (const [id, byLanguage] of results) {
    const unrendered = expandLanguages(baseline.unrendered?.[id] ?? '');
    for (const [language, findings] of byLanguage) {
      const wasUnrendered = unrendered.includes(language);
      if (findings && wasUnrendered) {
        changes.push({ id, language, added: keysOf(findings), gone: [], newRender: true });
        continue;
      }
      const got = keysOf(findings);
      const listed = listedKeys(baseline, id, language);
      const added = minus(got, listed);
      const gone = minus(listed, got);
      if (added.length || gone.length) changes.push({ id, language, added, gone });
    }
  }
  return changes;
}

/** Findings a pair gained: a regression (a lane that starts to render is not one). */
export const gainedLeaks = (changes: readonly LeakChange[]): LeakChange[] =>
  changes.filter(c => c.added.length > 0 && !c.newRender);

/** Changes the baseline must be pruned for: findings gone, or a lane that renders now. */
export const prunableLeaks = (changes: readonly LeakChange[]): LeakChange[] =>
  changes.filter(c => c.gone.length > 0 || c.newRender);

export function loadLeakBaseline(half: LeakHalf): LeakBaseline {
  return JSON.parse(readFileSync(LEAK_BASELINE_PATHS[half], 'utf8')) as LeakBaseline;
}

// ---------------------------------------------------------------------------
// M2's exit targets
// ---------------------------------------------------------------------------

/**
 * M2's exit targets (decided 2026-10-08): the most of a language's renders that
 * may hold a finding of each kind, in EVERY language. Per language because a
 * reader reads one, and an average hid he (35% of corpus renders with an English
 * word where the others sit near 18%). Words count only English no recorded
 * decision keeps ({@link KEPT_ENGLISH}). Events are already net of the denylist,
 * whose entries carry reasons.
 */
export const LEAK_TARGETS: Readonly<Record<LeakHalf, Readonly<Record<LeakKind, number>>>> = {
  corpus: { word: 0.05, event: 0, case: 0 },
  shapes: { word: 0.1, event: 0, case: 0 },
};

const KINDS: readonly LeakKind[] = ['word', 'event', 'case'];

export interface LanguageLeakRates {
  renders: number;
  /** The share of the language's renders with a finding of each kind. */
  rate: Record<LeakKind, number>;
  /** Whether each rate is within {@link LEAK_TARGETS}. */
  met: Record<LeakKind, boolean>;
}

/** Each language's leak rates against the half's targets; a lane with no render is not counted. */
export function leakRatesByLanguage(
  results: LeakResults,
  half: LeakHalf
): Map<string, LanguageLeakRates> {
  const counts = new Map<string, { renders: number } & Record<LeakKind, number>>();
  for (const byLanguage of results.values()) {
    for (const [language, findings] of byLanguage) {
      if (!findings) continue;
      const row = counts.get(language) ?? { renders: 0, word: 0, event: 0, case: 0 };
      row.renders++;
      for (const kind of KINDS) if (findings.some(f => f.kind === kind && !f.kept)) row[kind]++;
      counts.set(language, row);
    }
  }
  const out = new Map<string, LanguageLeakRates>();
  for (const [language, row] of counts) {
    const rate = { word: 0, event: 0, case: 0 };
    const met = { word: true, event: true, case: true };
    for (const kind of KINDS) {
      rate[kind] = row[kind] / row.renders;
      met[kind] = rate[kind] <= LEAK_TARGETS[half][kind];
    }
    out.set(language, { renders: row.renders, rate, met });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The two inputs
// ---------------------------------------------------------------------------

/** The command-shape half: the renders the command-shape gate made for `results`. */
export function shapeLeaks(
  scanner: LeakScanner,
  results: readonly CaseResult[],
  cases: readonly CommandShapeCase[]
): LeakResults {
  const byId = new Map(cases.map(c => [c.id, c]));
  const out: LeakResults = new Map();
  for (const r of results) {
    const shape = byId.get(r.id);
    if (!shape) continue;
    const info = scanner.sourceInfo(shape.source, readerOf(shape));
    if (!info) continue;
    const byLanguage = new Map<string, LeakFinding[] | null>();
    for (const language of FOREIGN_LANGUAGES) {
      const rendered = r.lanes[language]?.rendered;
      byLanguage.set(
        language,
        rendered === undefined ? null : scanner.scan(rendered, info, language)
      );
    }
    out.set(r.id, byLanguage);
  }
  return out;
}

interface CorpusRow {
  id: string;
  rawCode: string;
}

/**
 * The corpus half: every non-markup row rendered as `populate` writes it
 * (`render(parse(en), L)`). A row the engine rejects has no grammar to read,
 * so it is skipped; the caller can count them from `skipped`.
 */
export async function corpusLeaks(
  scanner: LeakScanner,
  rows: readonly CorpusRow[]
): Promise<{ results: LeakResults; skipped: string[] }> {
  const { parse, render } = (await import('@lokascript/semantic')) as unknown as {
    parse(source: string, language: string): unknown;
    render(node: unknown, language: string): string;
  };
  const results: LeakResults = new Map();
  const skipped: string[] = [];
  for (const row of rows) {
    if (row.rawCode.trimStart().startsWith('<')) continue;
    const info = scanner.sourceInfo(row.rawCode, 'program');
    let node: unknown = null;
    try {
      node = parse(row.rawCode, 'en');
    } catch {
      node = null;
    }
    if (!info || !node) {
      skipped.push(row.id);
      continue;
    }
    const byLanguage = new Map<string, LeakFinding[] | null>();
    for (const language of FOREIGN_LANGUAGES) {
      let rendered: string | null = null;
      try {
        rendered = render(node, language);
      } catch {
        rendered = null;
      }
      byLanguage.set(language, rendered ? scanner.scan(rendered, info, language) : null);
    }
    results.set(row.id, byLanguage);
  }
  return { results, skipped };
}
