/**
 * Name collisions: a variable spelled like a structure word
 * =========================================================
 * A translation writes a variable verbatim, so a variable spelled like one of
 * a language's structure words reaches that language's reader as the word: es
 * `si` (if), pl `w` (in), tr `al` (get), de `um` (by). Where it stands is all
 * a reader has to tell them apart (parser/value-reading.ts), and a name that
 * is a PRONOUN there (pt `eu` is `me`) cannot be told apart at all.
 *
 * `nameCollision` says which names are exposed, for any identifier and any
 * language. `findNameCollisions` finds them in a program: the variables its
 * parse reads that collide in its own language, where each is read as the
 * variable, and a name to rename it to. The language server reports them as
 * warnings with a rename, and so does MCP `validate_hyperscript`
 * (`NAME_COLLISION`).
 */
import { tokenize } from './tokenizers';
import { setStructureNamePredicate, tryGetProfile } from './registry';
import { commandSchemas } from './generators/command-schemas';
import { loneKeywordKind, translateConnective } from './parser/utils/expression-lexicon';
import { parseExpression } from './ast-builder/expression-parser/parser';
import { parseWithConfidence } from './utils/confidence-calculator';
import { render } from './explicit/renderer';
import { ofPhrasesAsPossessives } from './explicit/of-phrases';
import type { LanguageToken, SemanticNode } from './types';
import { VALUE_WORDS } from './value-words';

/** What a variable named like a word of the language collides with. */
export type NameCollision = 'structure' | 'pronoun';

/** English words every language's reader treats as structure: the articles its role capture skips. */
const ENGLISH_NOISE_WORDS: ReadonlySet<string> = new Set(['a', 'an', 'the']);

/** The pronouns among the value words, which a collision's message names so. */
const PRONOUNS: ReadonlySet<string> = new Set([
  'me',
  'my',
  'you',
  'your',
  'it',
  'its',
  'result',
  'event',
]);

const schemaMarkerMemo = new Map<string, ReadonlySet<string>>();

/** The role markers the command schemas override or vary for a language. */
function schemaMarkers(language: string): ReadonlySet<string> {
  let markers = schemaMarkerMemo.get(language);
  if (!markers) {
    markers = new Set(
      Object.values(commandSchemas).flatMap(schema =>
        schema.roles.flatMap(role =>
          [role.markerOverride?.[language], ...(role.markerVariants?.[language] ?? [])].filter(
            (word): word is string => typeof word === 'string' && word.length > 0
          )
        )
      )
    );
    schemaMarkerMemo.set(language, markers);
  }
  return markers;
}

/** The word a colliding name is, in the language. */
interface Reading {
  readonly collision: NameCollision;
  /** A keyword, a role marker or particle, a connective, an article, a pronoun, or several tokens. */
  readonly word: 'keyword' | 'marker' | 'connective' | 'article' | 'pronoun' | 'words';
  /** Its English sense (`if`, `and`, `me`), for a keyword, a connective or a pronoun. */
  readonly sense?: string | undefined;
}

function readingOf(name: string, language: string): Reading | null {
  const tokens = tokenize(name, language).tokens;
  const token = tokens[0];
  if (tokens.length !== 1 || !token) return { collision: 'structure', word: 'words' };
  const normalized = token.normalized !== name ? token.normalized : undefined;
  if (token.kind === 'keyword' && VALUE_WORDS.has(normalized ?? '')) {
    return { collision: 'pronoun', word: 'pronoun', sense: normalized };
  }
  if (token.kind === 'identifier' && !normalized) {
    // Structure the tokenizer does not mark: a schema's role marker (de `um`),
    // a connective the join reads (tl `o`, `or`), an English article.
    if (schemaMarkers(language).has(name)) return { collision: 'structure', word: 'marker' };
    const connective = translateConnective(language, name);
    if (connective !== name) {
      return { collision: 'structure', word: 'connective', sense: connective };
    }
    return ENGLISH_NOISE_WORDS.has(name.toLowerCase())
      ? { collision: 'structure', word: 'article' }
      : null;
  }
  // A particle's normalized form is the role it marks, not a word.
  if (token.kind === 'particle') return { collision: 'structure', word: 'marker' };
  return { collision: 'structure', word: 'keyword', sense: normalized };
}

/**
 * Does a variable named `name` collide with a word of `language`?
 *
 * - `'pronoun'`: the language's tokenizer reads it as a reference (pt `eu` is
 *   `me`); no spelling of the name tells the two apart;
 * - `'structure'`: the tokenizer reads it as anything but one plain
 *   identifier — a particle, a connective, a copula, a verb, a keyword, or
 *   several tokens — or it is a command schema's role marker there (de `um`,
 *   which the tokenizer leaves an identifier), a connective the reader
 *   translates (tl `o`, `or`), or an English article (the role capture skips
 *   one in every language);
 * - `null`: it reads as the plain identifier it is.
 */
export function nameCollision(name: string, language: string): NameCollision | null {
  const key = `${language}\u0000${name}`;
  let collision = collisionMemo.get(key);
  if (collision === undefined) {
    collision = readingOf(name, language)?.collision ?? null;
    collisionMemo.set(key, collision);
  }
  return collision;
}

const collisionMemo = new Map<string, NameCollision | null>();

// The reader fuses `(word)` into a name where the word spells structure.
setStructureNamePredicate((word, language) => nameCollision(word, language) === 'structure');

/**
 * `raw`, an English expression, with each variable that collides with a
 * structure word of `language` in parentheses: es `si + 1` → `(si) + 1`. A
 * variable is an identifier of the expression that is not a property, a
 * method, a conversion's type, or English vocabulary; one already in
 * parentheses stays as it is. The reader fuses `(si)` into one name
 * (`registry.tokenize`).
 */
export function parenthesizeCollidingNames(raw: string, language: string): string {
  const parsed = parseExpression(raw);
  if (!parsed.success || !parsed.node) return raw;
  const spans: Array<[number, number]> = [];
  const walk = (expr: unknown, key: string | undefined): void => {
    if (Array.isArray(expr)) {
      for (const item of expr) walk(item, key);
      return;
    }
    if (!expr || typeof expr !== 'object') return;
    const n = expr as { type?: string; name?: string; start?: number; end?: number };
    if (
      n.type === 'identifier' &&
      key !== 'property' &&
      key !== 'targetType' &&
      typeof n.name === 'string' &&
      n.start !== undefined &&
      n.end !== undefined &&
      raw.slice(n.start, n.end) === n.name &&
      !isEnglishKeyword(n.name) &&
      nameCollision(n.name, language) === 'structure'
    ) {
      spans.push([n.start, n.end]);
    }
    for (const [k, v] of Object.entries(expr)) if (v && typeof v === 'object') walk(v, k);
  };
  walk(parsed.node, undefined);
  let out = raw;
  for (const [start, end] of spans.sort((a, b) => b[0] - a[0])) {
    if (out[start - 1] === '(' && out[end] === ')') continue;
    out = `${out.slice(0, start)}(${out.slice(start, end)})${out.slice(end)}`;
  }
  return out;
}

/** A name alone in parentheses, not a call's: `(si)` → `si`, for comparing two readings. */
function withoutNameParens(code: string): string {
  return code.replace(/(^|[^\p{L}\p{N}_$)\]])\(([\p{L}_$][\p{L}\p{M}\p{N}_$]*)\)/gu, '$1$2');
}

/**
 * Does `code`, in `language`, read as `node` does: the same reading (its
 * English, and no input left bound to no role), a name in parentheses aside?
 */
export function readsAs(code: string, language: string, node: SemanticNode): boolean {
  const back = parseWithConfidence(code, language).node;
  return !!back && sameReading(readingOfNode(back), readingOfNode(node));
}

/**
 * Two English readings, alike up to a name in parentheses and the spelling
 * of a possessive: a translation reads `valor de #price` back as `value of
 * #price` and ja `#priceの値` as `#price's value`, which both engines read as
 * `the value of #price` (M2, sheet A3).
 */
function sameReading(a: string, b: string): boolean {
  const canonical = (reading: string): string => ofPhrasesAsPossessives(withoutNameParens(reading));
  return canonical(a) === canonical(b);
}

/** A variable of a program that collides with a word of the program's language. */
export interface NameCollisionFinding {
  /** The variable, as written. */
  readonly name: string;
  readonly collision: NameCollision;
  /** Where the parse reads the name as the variable: offsets into the code, in order. */
  readonly occurrences: ReadonlyArray<{ readonly start: number; readonly end: number }>;
  /** A name that collides with nothing in the language and that the code does not use. */
  readonly rename: string | undefined;
  /** What the name collides with, and why it matters, in a sentence. */
  readonly message: string;
}

/**
 * Is `word` English vocabulary (a keyword or a reference), not a name? The
 * articles are names, and so is a keyword the reader takes for a variable when
 * it stands alone as a value: a structure word, a verb or an event name (`set
 * if to 1`, `put "a" into input`, which upstream runs on variables; was
 * OPEN_ITEMS P49).
 */
function isEnglishKeyword(word: string): boolean {
  if (word === 'a' || word === 'an') return false;
  // Upstream's first person: `I` is always `me` on both engines, never a
  // variable. Parenthesized as one (tr, pl), `(I) match` hid it from the
  // third-person rewrite that writes the language's own words (M2, A2).
  if (word === 'I') return true;
  const tokens = tokenize(word, 'en').tokens;
  return tokens.length === 1 && tokens[0]?.kind !== 'identifier' && !loneKeywordKind(tokens[0]);
}

/**
 * The variables a parse reads: every identifier of an expression value that is
 * not a property, a method, a conversion's type, or English vocabulary.
 */
function variablesOf(node: SemanticNode): Set<string> {
  const names = new Set<string>();
  const seen = new Set<unknown>();
  const walkExpression = (expr: unknown, key: string | undefined): void => {
    if (Array.isArray(expr)) {
      for (const item of expr) walkExpression(item, key);
      return;
    }
    if (!expr || typeof expr !== 'object') return;
    const n = expr as { type?: string; name?: string };
    if (
      n.type === 'identifier' &&
      key !== 'property' &&
      key !== 'targetType' &&
      typeof n.name === 'string' &&
      !isEnglishKeyword(n.name)
    ) {
      names.add(n.name);
    }
    for (const [k, v] of Object.entries(expr)) if (v && typeof v === 'object') walkExpression(v, k);
  };
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const v = value as { type?: string; raw?: unknown };
    if (v.type === 'expression' && typeof v.raw === 'string') {
      const parsed = parseExpression(v.raw);
      if (parsed.success && parsed.node) walkExpression(parsed.node, undefined);
    }
    for (const child of value instanceof Map ? value.values() : Object.values(value)) walk(child);
  };
  walk(node);
  return names;
}

/** The input a parse left bound to no role (its `unconsumed-input` diagnostics). */
function unconsumedOf(node: SemanticNode): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const diagnostics = (value as { diagnostics?: unknown }).diagnostics;
    if (Array.isArray(diagnostics)) {
      for (const d of diagnostics as Array<{ code?: string; message?: string }>) {
        if (d.code === 'unconsumed-input' && d.message) out.push(d.message);
      }
    }
    for (const child of value instanceof Map ? value.values() : Object.values(value)) walk(child);
  };
  walk(node);
  return out;
}

/**
 * How a parse reads its code: its English, and the input it left bound to no
 * role (the English cannot show a token the parse dropped).
 */
function readingOfNode(node: SemanticNode): string {
  return [render(node, 'en'), ...unconsumedOf(node)].join('\n');
}

/** Is `name` a whole word of `code`? */
function usesName(code: string, name: string): boolean {
  return wholeWord(name, 'u').test(code);
}

/** A pattern for `name` as a whole word (not inside a longer name). */
function wholeWord(name: string, flags: string): RegExp {
  const escaped = name.replace(/[$]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}_$])${escaped}(?![\\p{L}\\p{N}_$])`, flags);
}

/**
 * A name `code` does not use that reads as a plain identifier in each of
 * `languages`, from `candidates` in order.
 */
function freeName(code: string, languages: readonly string[], candidates: readonly string[]) {
  return candidates.find(
    name => !usesName(code, name) && languages.every(language => readingOf(name, language) === null)
  );
}

/**
 * Renames for `name`, in the order a finding offers them. A digit splits the
 * word in some tokenizers (tr, qu): the candidates are checked, not assumed.
 */
function renamesFor(name: string): string[] {
  return [
    `${name}1`,
    `${name}2`,
    `${name}Value`,
    `${name}Var`,
    `my${name[0]!.toUpperCase()}${name.slice(1)}`,
  ];
}

/**
 * Where the parse of `code` (in `language`) reads `name` as the variable.
 * Taken in order, an occurrence is the variable when writing an unambiguous
 * name in its place, and in the places already taken, leaves the program's
 * reading unchanged. Undefined when no unambiguous name is free.
 */
function occurrencesOf(
  code: string,
  language: string,
  tokens: readonly LanguageToken[],
  reading: string,
  name: string
): Array<{ start: number; end: number }> | undefined {
  const probe = freeName(
    code,
    [language],
    [...'abcdefghijklmnopqrstuvwxyz'].map(c => `zqv${c}`)
  );
  if (!probe) return undefined;
  const asName = wholeWord(probe, 'gu');
  const occurrences: Array<{ start: number; end: number }> = [];
  for (const token of tokens) {
    const start = token.position?.start;
    const end = token.position?.end;
    if (token.value !== name || start === undefined || end === undefined) continue;
    if (token.kind === 'literal' || token.kind === 'selector') continue;
    const probed = parseWithConfidence(
      withName(code, [...occurrences, { start, end }], probe),
      language
    ).node;
    if (probed && readingOfNode(probed).replace(asName, name) === reading) {
      occurrences.push({ start, end });
    }
  }
  return occurrences;
}

/** `code` with each span replaced by `name`. */
function withName(
  code: string,
  spans: ReadonlyArray<{ start: number; end: number }>,
  name: string
): string {
  let out = code;
  for (const { start, end } of [...spans].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, start) + name + out.slice(end);
  }
  return out;
}

/** What `name` collides with in `language`, and why it matters. */
function describe(name: string, reading: Reading, language: string): string {
  const is = {
    keyword: reading.sense
      ? `the word for \`${reading.sense}\` in ${language}`
      : `a keyword in ${language}`,
    marker: `a role marker in ${language}`,
    connective: `the word for \`${reading.sense}\` in ${language}`,
    article: 'an English article, which the reader of every language skips',
    pronoun: PRONOUNS.has(reading.sense ?? '')
      ? `the pronoun \`${reading.sense}\` in ${language}`
      : `the word for \`${reading.sense}\` in ${language}`,
    words: `more than one word in ${language}`,
  }[reading.word];
  return reading.collision === 'pronoun'
    ? `Variable \`${name}\` is also ${is}: no reader can tell them apart.`
    : `Variable \`${name}\` is also ${is}: a reader tells them apart only by where it stands, or when it is written \`(${name})\`.`;
}

/** What a translation into `language` reads `name` as, and what to do about it. */
function describeInTranslation(name: string, reading: Reading, language: string): string {
  const word = PRONOUNS.has(reading.sense ?? '')
    ? `the pronoun \`${reading.sense}\``
    : `the word for \`${reading.sense}\``;
  const into = tryGetProfile(language)?.name ?? language;
  return `Variable \`${name}\` is ${word} in ${into}: a translation into ${into} reads it as that word, and no spelling tells them apart. Rename it before translating.`;
}

/**
 * The variables of `code` (in `language`) that collide with a word of the
 * language, and where the parse reads each as the variable.
 *
 * Which occurrences are the variable is the parser's call. Taken in order, an
 * occurrence is the variable when writing an unambiguous name in its place,
 * and in the places already taken, leaves the program's reading unchanged. So
 * renaming them keeps the program's meaning, and an occurrence the parse reads
 * as the word is left alone: the es `y` of `si a y b` ("if a and b"), or a tr
 * accusative `i` after a variable `i` — which alone, the parse would take as
 * the variable, and the variable as the particle.
 *
 * English reports nothing: a keyword cannot be a variable there at all, and
 * the articles, which can, are read by where they stand (PR 75). A pronoun
 * collision in the code's own language is found only where the parse reads
 * the name as a variable, since elsewhere it reads the pronoun.
 */
export function findNameCollisions(code: string, language: string): NameCollisionFinding[] {
  if (language === 'en') return [];
  const { node } = parseWithConfidence(code, language);
  if (!node) return [];
  const reading = readingOfNode(node);
  const findings: NameCollisionFinding[] = [];
  let tokens: readonly LanguageToken[] | undefined;
  for (const name of variablesOf(node)) {
    const collision = readingOf(name, language);
    if (!collision) continue;
    tokens ??= tokenize(code, language).tokens;
    const occurrences = occurrencesOf(code, language, tokens, reading, name);
    if (!occurrences) break;
    if (occurrences.length === 0) continue;
    findings.push({
      name,
      collision: collision.collision,
      occurrences,
      rename: freeName(code, [language], renamesFor(name)),
      message: describe(name, collision, language),
    });
  }
  return findings;
}

/**
 * The variables of `code` (in `from`) that its translation into `to` cannot
 * keep: each is a value word there, a pronoun (tl `ako` is `me`, it `io`) or
 * another reference (es `objetivo` is `target`), so the translation reads the
 * value. No spelling tells the two apart — the verified render's parentheses
 * are for structure words, and a value word in parentheses is still the value
 * — so renaming the variable before translating is the only fix. (A structure
 * collision needs none: the render writes `(si)` where the plain spelling
 * would misread.) The rename reads as a plain name in both languages.
 */
export function findTranslationCollisions(
  code: string,
  from: string,
  to: string
): NameCollisionFinding[] {
  const { node } = parseWithConfidence(code, from);
  if (!node) return [];
  const reading = readingOfNode(node);
  const findings: NameCollisionFinding[] = [];
  let tokens: readonly LanguageToken[] | undefined;
  for (const name of variablesOf(node)) {
    const collision = readingOf(name, to);
    if (collision?.collision !== 'pronoun') continue;
    tokens ??= tokenize(code, from).tokens;
    const occurrences = occurrencesOf(code, from, tokens, reading, name);
    if (!occurrences?.length) continue;
    findings.push({
      name,
      collision: 'pronoun',
      occurrences,
      rename: freeName(code, [from, to], renamesFor(name)),
      message: describeInTranslation(name, collision, to),
    });
  }
  return findings;
}
