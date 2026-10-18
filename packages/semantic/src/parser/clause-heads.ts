/**
 * Building a command from a pattern match, and the clause heads the walk
 * tests: a pseudo-command (`call`-less `f()`), the head clause before a body,
 * and an `else if` chain.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  CommandSemanticNode,
  SemanticValue,
  ActionType,
  LanguagePattern,
  LanguageToken,
  TokenStream,
} from '../types';
import { createCommandNode } from '../types';
import { tokenize as tokenizeInternal } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { patternMatcher } from './pattern-matcher';
import { isElseKeyword, isIfKeyword, isUnlessKeyword } from './clause-keywords';
import { type ParserState } from './parser-state';
import { rewritePseudoCommand } from './pseudo-command';
import { tokensBeginCommand } from './sov-clause';
import { keepVerbatimClause, registerBoundIdentifiers } from './coverage';
import { isRepeatToken } from './loop-walk';

/**
 * The words that open what upstream's `on` reads between the event and the
 * body (besides a count): `elsewhere`, `in #d1`, `of attributes` (mutation),
 * `or click from #d2`, `queue first`, `having threshold 0.1`.
 */
export const HEAD_OPENERS: ReadonlySet<string> = new Set([
  'elsewhere',
  'in',
  'of',
  'or',
  'queue',
  'having',
]);

/** The most words a head clause holds: upstream's are short (`of attributes from #d1`). */
export const HEAD_CLAUSE_WORDS = 8;

/**
 * An English pseudo-command at the stream's position, parsed as its `call`
 * equivalent (see `./pseudo-command`). The rewrite is matched by the ordinary
 * `call` patterns and must be consumed in full, so the node is exactly what
 * `call <target>.<method>(<args>)` parses to — renders and round-trips
 * included. Advances `stream` only on success.
 */
export function tryParsePseudoCommand(
  state: ParserState,
  stream: TokenStream,
  commandPatterns: LanguagePattern[],
  language: string
): CommandSemanticNode | null {
  if (language !== 'en') return null;
  const rewrite = rewritePseudoCommand(
    stream.tokens,
    stream.position(),
    tryGetProfile(language),
    t => !!getSchema((t.normalized ?? t.value).toLowerCase() as ActionType)
  );
  if (!rewrite) return null;
  const rewritten = tokenizeInternal(rewrite.text, language);
  const match = patternMatcher.matchBest(
    rewritten,
    commandPatterns.filter(p => p.command === 'call')
  );
  if (!match || !rewritten.isAtEnd()) return null;
  for (let n = 0; n < rewrite.consumed; n++) stream.advance();
  return buildCommand(state, match, language);
}

/**
 * Build a command semantic node from a pattern match.
 */
export function buildCommand(
  state: ParserState,
  match: ReturnType<typeof patternMatcher.matchPattern>,
  language: string
): CommandSemanticNode {
  if (!match) {
    throw new Error('No match to build command from');
  }

  const roles: Record<string, SemanticValue> = {};
  for (const [role, value] of match.captured) {
    roles[role] = value;
  }

  const node = createCommandNode(match.pattern.command, roles, {
    sourceLanguage: language,
    patternId: match.pattern.id,
    confidence: match.confidence,
  });
  registerBoundIdentifiers(state, node);
  return node;
}

/**
 * What upstream's `on` reads between the event and the body and no event
 * pattern models (`on click elsewhere`, `on click 1 to 2`, `on mutation of
 * attributes`, `on foo queue first`, `on x having threshold 0.1`), taken as
 * the handler's head clause, kept as written (M1 phase 3). It opens with a
 * word of upstream's `on` grammar or a count, and runs to the first command;
 * the guards of a command's clause apply (keepVerbatimClause).
 */
export function takeHeadClause(
  state: ParserState,
  tokens: TokenStream,
  commandPatterns: LanguagePattern[],
  language: string
): string | undefined {
  const all = tokens.tokens as LanguageToken[];
  const start = tokens.position();
  const first = all[start];
  if (!first) return undefined;
  const opens = HEAD_OPENERS.has(first.value.toLowerCase()) || /^\d+$/.test(first.value);
  if (!opens) return undefined;
  let end = start + 1;
  while (end < all.length && end - start <= HEAD_CLAUSE_WORDS) {
    if (tokensBeginCommand(all.slice(end), commandPatterns, language)) break;
    end++;
  }
  if (end >= all.length || end - start > HEAD_CLAUSE_WORDS) return undefined;
  const run = all.slice(start, end);
  // A count is upstream's `1` or `1 to 2`, where no command begins at the
  // number: a body can open with one where the head ends (ja `2 is in [1, 2]
  // を #out に 置く`, an SOV loop's `3 + 3 times`), and it is the body's there.
  // `クリックで 1 xを 10に 設定` is the count, then the body.
  const words = run.map(t => t.value).join(' ');
  if (/^\d/.test(first.value)) {
    if (!/^\d+(?: to \d+)?$/.test(words)) return undefined;
    if (tokensBeginCommand(all.slice(start), commandPatterns, language)) return undefined;
  }
  const holder = { kind: 'command', action: 'on' } as unknown as SemanticNode;
  if (!keepVerbatimClause(state, holder, run, all[start - 1], language)) return undefined;
  while (tokens.position() < end) tokens.advance();
  return (holder as { verbatimClause?: string }).verbatimClause;
}

/**
 * Does this `if` continue an `else if` chain? Only on the `else`'s line, as
 * upstream reads it: an `if` on the next line opens a block of its own, with
 * its own `end`, and the else branch runs on after it. Read as a chain, the
 * commands after that block left the else branch and ran either way.
 */
export function isElseIfChain(
  t: LanguageToken,
  prev: LanguageToken | undefined,
  language: string
): boolean {
  return !!prev && isElseKeyword(prev.value, language) && !t.metadata?.lineStart;
}

/**
 * A token opening a block whose own `end` the conditional fold must skip: a
 * nested `if`/`unless`, or a loop head (`repeat`, `for`). Counting only the
 * conditionals let a loop's `end` close the `if` around it, and the `if`'s
 * own `end` then ended the enclosing body: `if x repeat 3 times … end end
 * then remove .b from me` lost the `remove`. A `for` right after `repeat`
 * names the loop's form (`repeat for …`) and opens nothing. The English
 * `repeat` counts in every language, as `end` does in endWordKind: the SOV
 * counted-loop head keeps it untranslated (ja/ko/tr `3 times を repeat`),
 * where it tokenizes as an identifier.
 *
 * An `if` right after `else`, on its line, opens nothing: it continues the chain, which one
 * `end` closes, as upstream reads it. Counted as a nested `if`, the chain
 * wanted a second `end`, and `if a … else if b … end then c` put `c` in the
 * else branch, running only when `a` was false.
 */
export function opensNestedBlock(
  t: LanguageToken,
  prev: LanguageToken | undefined,
  language: string
): boolean {
  const tv = (t.normalized ?? t.value).toLowerCase();
  if (isIfKeyword(tv, language)) return !isElseIfChain(t, prev, language);
  if (isUnlessKeyword(tv, language)) return true;
  if (tv === 'repeat') return t.kind === 'keyword' || t.kind === 'identifier';
  if (tv !== 'for' || t.kind !== 'keyword') return false;
  return !(prev && isRepeatToken(prev));
}
