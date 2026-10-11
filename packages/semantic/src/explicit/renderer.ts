/**
 * Explicit Mode Renderer
 *
 * Renders semantic nodes to explicit [command role:value] syntax.
 * Also renders to natural language syntax for any supported language.
 */

import type {
  ActionType,
  SemanticNode,
  SemanticRole,
  EventHandlerSemanticNode,
  ErrorClauses,
  CompoundSemanticNode,
  CommandSemanticNode,
  ConditionalSemanticNode,
  LoopSemanticNode,
  BlockCommandSemanticNode,
  BehaviorSemanticNode,
  DefSemanticNode,
  FeatureSemanticNode,
  SemanticValue,
  SemanticRenderer as ISemanticRenderer,
  LanguagePattern,
  PatternToken,
  ReferenceValue,
  PropertyPathValue,
  ExtractionRule,
} from '../types';
import { createCommandNode, createSelector, isBlockCommand } from '../types';

/**
 * Loop/tell/view-transition block-header commands: their body follows the header
 * directly, with no chain word between the header and its first body command. The
 * explicit loop/tell/view-transition subset of the schema `hasBody` flag — `hasBody` also covers if/on/async/js/
 * behavior/… which render through their own node kinds/paths and keep their chain
 * word. Shared by renderCompound and joinStatements.
 */
const BLOCK_HEADER_ACTIONS = new Set<ActionType>([
  'repeat',
  'for',
  'while',
  'tell',
  'viewTransition',
]);

/**
 * What a render can write in the language's own words that its reader may
 * misread, so the verified render re-reads it ({@link SemanticRendererImpl.takeNativeWords}):
 * `value`, a value's grammar word (a query's `in`, a conversion's `as`, `the X
 * of Y`; M2 sheet A3–A5); `case`, a pronoun in the case its marker takes (N3).
 */
export type NativeWordKind = 'value' | 'case';

/**
 * Commands whose destination is where something is, not where it goes: their
 * marker takes a location's case (de `auf mir`, ru `на мне`), as a query's
 * `in` does. Every other destination is a direction (de `in mich`).
 */
const LOCATION_DESTINATIONS: ReadonlySet<string> = new Set(['toggle', 'trigger']);

/** Commands that are features when written at the top of a script (see tryParseProgram). */
const TOP_LEVEL_FEATURE_COMMANDS: ReadonlySet<string> = new Set(['bind', 'set', 'install', 'js']);

/**
 * A compound tryParseProgram made: two or more top-level features (handlers,
 * defs, behaviors, feature blocks, top-level `bind`/`set`/`install`/`js`), at
 * least one of them more than such a command.
 */
function isProgram(node: CompoundSemanticNode): boolean {
  if (node.statements.length < 2) return false;
  const feature = (s: SemanticNode): boolean =>
    ['event-handler', 'def', 'behavior', 'feature'].includes(s.kind) ||
    (s.kind === 'command' && TOP_LEVEL_FEATURE_COMMANDS.has(s.action));
  return node.statements.every(feature) && node.statements.some(s => s.kind !== 'command');
}

/**
 * A block header still FLAT in its statement list: its body is the statements
 * after it. A `tell` or view transition the parser nested is a command too, with
 * its body attached, and renders and closes itself (renderBlockCommand).
 */
function isFlatBlockHeader(node: SemanticNode): boolean {
  return node.kind === 'command' && BLOCK_HEADER_ACTIONS.has(node.action) && !isBlockCommand(node);
}

/**
 * Commands whose captured body is an open-ended block that must be closed by an
 * explicit `end`. `js` captures its raw JavaScript body as an expression;
 * without a closing `end` the following hyperscript (`js foo() then add …`)
 * bleeds into the JS body and the canonical `js` command's `new Function(...)`
 * throws.
 *
 * The `end` used to be emitted only when a sibling FOLLOWED — a trailing `js`
 * was left open, on the grounds that its body runs to the end of the enclosing
 * block anyway. That is true of execution and false of round-tripping: an
 * unterminated block is not a block the parser can claim, so `consumeJsBlock`
 * (which needs the closing `end` to know where the opaque span stops) declined
 * and the per-language `js` PATTERN took over — which re-spaces the JavaScript
 * and, in zh, splits the `JS执行` compound verb and swallows the rest of the
 * body. `js … end` is the canonical form, the engine accepts it in every
 * position, and it is what the reference source itself is written as; so it is
 * now emitted unconditionally, by `render` itself rather than by the two
 * statement-joining paths.
 */
const BLOCK_NEEDS_TRAILING_END = new Set<ActionType>(['js']);
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguageAndCommand, tryGetProfile } from '../registry';
import { getSupportedLanguages as getTokenizerLanguages, tokenize } from '../tokenizers';
import { localizeEventName } from '../patterns/event-handler';
import {
  getOfPossessiveMarker,
  loneKeywordKind,
  PROPERTY_NAME_LEXICON,
} from '../parser/utils/expression-lexicon';
import { OR_WORDS_BY_LANG } from '../parser/utils/or-words';
import { notThrowWords } from '../parser/utils/not-throw';
import { grammarWord } from '../parser/utils/grammar-words';
import { elementScopeWord } from '../element-scope';
import { PatternMatcher } from '../parser/pattern-matcher';
import {
  localizeValueInterior,
  nativeValueWords,
  outsideCallArguments,
  type ValueWords,
} from './value-lexicon';
import { expressionNames, isVariableName } from './expression-variables';
import { OF_PHRASE, convertedAt, ofPhraseProperties } from './of-phrases';
import { renderExplicit as renderExplicitBase } from '@lokascript/framework';

/**
 * Score a role slot nested inside an OPTIONAL group. Lower than the top-level
 * bonus on purpose: it must break a tie between two patterns that are otherwise
 * equal (the handcrafted `toggle-{L}-full` versus the generated pattern that
 * also carries `[{duration}]`) without ever outweighing a top-level difference.
 */
const NESTED_ROLE_BONUS = 5;

/** Whether the node carries a real (authored, not defaulted) role besides `role`. */
function hasOtherRealRole(node: SemanticNode, role: SemanticRole): boolean {
  for (const [name, value] of node.roles) {
    if (name !== role && !(value as { implicit?: unknown }).implicit) return true;
  }
  return false;
}

/**
 * Score against a pattern that has no slot for a role the node carries. Larger
 * than any priority gap between a command's patterns (80–100), so rendering
 * the role always beats a more idiomatic form that drops it.
 */
const UNCOVERED_ROLE_PENALTY = 30;

/**
 * The literal a pattern pins a role to, normalized for comparison: an
 * extraction default, or a fixed value the pattern records when it matches.
 * The second is how `go`'s url variant says what it means (`go url /page`
 * records `method: 'url'`); reading only defaults let that variant render every
 * `go`, so `go back` came out as `go url back`: a navigation to a page named
 * "back" in every language.
 */
function pinnedLiteral(rule: ExtractionRule | undefined): string | undefined {
  if (rule?.default?.type === 'literal') return String(rule.default.value).trim().toLowerCase();
  if (rule?.value !== undefined) return String(rule.value).trim().toLowerCase();
  return undefined;
}

/**
 * The English DOM-property words a possessive can name, taken from the same
 * table the parser's property matchers consult. Used to keep the English
 * `<prop> of <selector>` → `<selector>'s <prop>` fold off ordinary `of` phrases
 * (`the first of .items`).
 */
const EN_PROPERTY_WORDS: ReadonlySet<string> = new Set(
  Object.values(PROPERTY_NAME_LEXICON).flatMap(map => Object.values(map))
);

/** Apply `rewrite` outside every quoted string, which a translation writes as written. */
function outsideQuotes(raw: string, rewrite: (text: string) => string): string {
  if (!/["'`]/.test(raw)) return rewrite(raw);
  const spans: string[] = [];
  const masked = raw.replace(/"[^"]*"|`[^`]*`|'(?!s\b)[^']*'/g, quoted => {
    spans.push(quoted);
    return `${spans.length - 1}`;
  });
  return rewrite(masked).replace(/(\d+)/g, (_, index: string) => spans[Number(index)]!);
}

/**
 * A quoted string, written back. Double quotes, as the reader takes either
 * kind; but a text holding an unescaped `"` (the author wrote `'<div
 * _="…">'`) is written in single quotes, or with its `"` escaped when it holds
 * an unescaped `'` too. Wrapped in double quotes as it was, the inner quote
 * closed the string.
 */
function quoteText(text: string): string {
  if (!/(?<!\\)"/.test(text)) return `"${text}"`;
  if (!/(?<!\\)'/.test(text)) return `'${text}'`;
  return `"${text.replace(/(?<!\\)"/g, '\\"')}"`;
}

// =============================================================================
// Semantic Renderer Implementation
// =============================================================================

export class SemanticRendererImpl implements ISemanticRenderer {
  /** Rewrites each expression value's English before it is localized (renderWith). */
  private valueGuard: ((raw: string) => string) | undefined;

  /** Write every variable as spelled (renderSpellingVariables). */
  private spellVariables = false;

  /** A variable was written in the language's own word during this render. */
  private localizedVariable = false;

  /** The kinds of native word this render writes plain (renderPlainWords). */
  private plainWords: ReadonlySet<NativeWordKind> = new Set();

  /** The kinds of native word written since the last takeNativeWords. */
  private nativeWritten = new Set<NativeWordKind>();

  /** The grammar words a value is written with in this render: a query's `in`, a conversion's `as`. */
  private valueWords(language: string): ValueWords {
    const words = this.plainWords.has('value')
      ? { queryIn: 'in', conversionAs: 'as' }
      : nativeValueWords(language);
    const scopeIn = (reference: string): string | undefined =>
      this.obliquePhrase(language, words.queryIn, reference, 'location');
    return { ...words, wrote: () => this.nativeWritten.add('value'), scopeIn };
  }

  /**
   * The kinds of native word a render wrote since the last call, which the
   * verified render re-reads. A value's grammar word (`value`: es
   * `<button/> en yo`, M2 sheet A5; es `ello como String`, A4) can be read as
   * a marker the command wants (es `en`, ko `로`) or another sense (th `เป็น`
   * is also `is`); a pronoun in the case its marker takes (`case`: es
   * `en mí`, N3) can be a form the reader does not bring back.
   */
  takeNativeWords(): ReadonlySet<NativeWordKind> {
    const wrote = this.nativeWritten;
    this.nativeWritten = new Set();
    return wrote;
  }

  /**
   * Run `render` with these kinds of native word written plain (the verified
   * render's fallbacks): a value's grammar words in English's, a pronoun in
   * the nominative.
   */
  renderPlainWords<T>(render: () => T, kinds: readonly NativeWordKind[] = ['value', 'case']): T {
    const previous = this.plainWords;
    this.plainWords = new Set([...previous, ...kinds]);
    try {
      return render();
    } finally {
      this.plainWords = previous;
    }
  }

  /**
   * Render, and say whether a variable was written in the language's own word
   * (`localizedName`): read alone, that word is the same value, but beside its
   * neighbours it can fuse into another (vi `đặt` + `giá trị` is `set`), so the
   * verified render re-reads such a render.
   */
  renderNoting(
    node: SemanticNode,
    language: string,
    guard?: (raw: string) => string
  ): { text: string; localizedVariable: boolean } {
    this.localizedVariable = false;
    const text = guard ? this.renderWith(node, language, guard) : this.render(node, language);
    return { text, localizedVariable: this.localizedVariable };
  }

  /** Render with every variable written as spelled (the verified render's fallback). */
  renderSpellingVariables(
    node: SemanticNode,
    language: string,
    guard?: (raw: string) => string
  ): string {
    this.spellVariables = true;
    try {
      return guard ? this.renderWith(node, language, guard) : this.render(node, language);
    } finally {
      this.spellVariables = false;
    }
  }

  /**
   * Render a node with each expression value's English rewritten by `guard`
   * first: the verified render (`verified-render.ts`) spells a colliding
   * variable `(si)` this way.
   */
  renderWith(node: SemanticNode, language: string, guard: (raw: string) => string): string {
    const previous = this.valueGuard;
    this.valueGuard = guard;
    try {
      return this.render(node, language);
    } finally {
      this.valueGuard = previous;
    }
  }

  /**
   * Render a semantic node in the specified language.
   */
  render(node: SemanticNode, language: string): string {
    // A clause the command's pattern does not model, written back as written.
    const clause = (node as CommandSemanticNode).verbatimClause;
    if (clause) {
      const { verbatimClause: _c, ...rest } = node as CommandSemanticNode;
      const space = clause.startsWith(',') ? '' : ' ';
      return `${this.render(rest as SemanticNode, language)}${space}${clause}`;
    }
    // Upstream's statement modifier, after its command (`toggle .foo unless I
    // match .bar`): set by toUpstreamSpelling, for an English render.
    const postfix = (node as { postfixUnless?: SemanticValue }).postfixUnless;
    if (postfix) {
      const { postfixUnless: _p, ...rest } = node as SemanticNode & {
        postfixUnless?: SemanticValue;
      };
      const cond = this.valueToNaturalString(postfix, language);
      return `${this.render(rest as SemanticNode, language)} ${this.keyword(language, 'unless')} ${cond}`;
    }
    // A handler's error clauses follow its commands (the patterns know neither).
    if (node.kind === 'event-handler') {
      const {
        catchName: _n,
        catchBody,
        finallyBody,
        ...handler
      } = node as EventHandlerSemanticNode;
      if (catchBody || finallyBody) {
        return (
          this.render(handler as SemanticNode, language) +
          this.renderErrorClauses(node as EventHandlerSemanticNode, language)
        );
      }
    }
    // Handle compound nodes specially (e.g., "cmd1 then cmd2")
    if (node.kind === 'compound') {
      return this.renderCompound(node as CompoundSemanticNode, language);
    }
    // Block constructs render to multi-line target-language source so a whole
    // behavior/function round-trips between languages (Phase 4).
    if (node.kind === 'behavior') {
      return this.renderBehavior(node as BehaviorSemanticNode, language);
    }
    if (node.kind === 'def') {
      return this.renderDef(node as DefSemanticNode, language);
    }
    // A block FEATURE (`live` / `socket` / `eventsource` / `worker` /
    // `intercept`) carries its statements in `body`, never in roles — so without
    // a case here it fell to the pattern path, which rendered the bare keyword
    // and dropped the name and the entire body: `socket ChatSocket … on message
    // put it into #chat end` became es `socket`, ja `ソケット`, de `arbeiter`.
    // Every command inside was lost, which is why these five corpus patterns
    // reported ACTION loss in all 23 languages at once.
    if (node.kind === 'feature') {
      return this.renderFeature(node as FeatureSemanticNode, language);
    }
    // A conditional carries its branches in thenBranch/elseBranch, never in roles.
    // Without this the pattern path renders the head only (`if <cond>`) and drops
    // the body + `end` — the canonical parser then rejects the dangling condition.
    if (node.kind === 'conditional') {
      return this.renderConditional(node as ConditionalSemanticNode, language);
    }
    // A loop carries its body in `body`, never in roles: the head renders
    // through the pattern path and the loop closes with `end` where its body
    // stops, so a command after the loop stays after it.
    if (node.kind === 'loop') {
      return this.renderLoop(node as LoopSemanticNode, language);
    }
    // So do a `tell` and a view transition, which close the same way.
    if (isBlockCommand(node)) {
      return this.renderBlockCommand(node, language);
    }

    // `js` renders VERB-INITIAL in the SOV six, against their own word order.
    //
    // Its body is raw JavaScript — an opaque span, not natural language — so the
    // generated SOV pattern's verb-final order (`<body> を JS実行 終わり`) puts an
    // unbounded foreign-code span BEFORE the only token that identifies the
    // clause. Nothing preceding it can then be attributed: rendering
    // `if confirmRemoval js(me) … end` gave ja
    // `もし confirmRemoval (me) ⏎ <body> を JS実行 終わり`, where `(me)` opens the
    // js clause and only the trailing verb says so. The conditional head was
    // swallowed into the body, the `end` count went off by one, and every command
    // AFTER the conditional was dropped — behavior-removable in bn/hi/ja/ko/qu/tr.
    //
    // Verb-initial is also what the corpus and the engine already use: the i18n
    // transformer leaves `js(me) … end` verbatim in every language, canonical
    // hyperscript has no other form, and `consumeJsBlock` (head-anchored) parses
    // it in all 23. `consumeVerbFinalJsBlock` stays for INPUT tolerance — this
    // changes what we emit, not what we accept.
    //
    // SOV-gated deliberately: he and zh render verb-initial already, WITH their
    // pre-posed patient marker (`js את …`, `JS执行 把 …`), which the head-form
    // walk strips back off. Routing them through here would drop a marker they
    // legitimately carry.
    if (node.action === 'js' && tryGetProfile(language)?.wordOrder === 'SOV') {
      const body = node.roles.get('patient' as SemanticRole);
      const raw = body && body.type === 'expression' ? body.raw : '';
      const head = this.keyword(language, 'js');
      const end = this.keyword(language, 'end');
      return raw ? `${head} ${raw} ${end}` : `${head} ${end}`;
    }

    const patterns = getPatternsForLanguageAndCommand(language, node.action);

    if (patterns.length === 0) {
      // Fall back to explicit syntax if no patterns
      return this.renderExplicit(node);
    }

    // Find the best pattern for rendering (prefer patterns that match our roles)
    const bestPattern = this.findBestPattern(node, patterns);

    if (!bestPattern) {
      return this.renderExplicit(node);
    }

    const rendered = this.renderWithPattern(node, bestPattern);
    return BLOCK_NEEDS_TRAILING_END.has(node.action)
      ? `${rendered} ${this.keyword(language, 'end')}`
      : rendered;
  }

  /**
   * Render a compound node (multiple statements chained with then/and).
   */
  private renderCompound(node: CompoundSemanticNode, language: string): string {
    // A compound whose every statement is an event handler is a multi-handler
    // PROGRAM (produced by tryParseProgram), not a then-chain. Render each handler
    // closed by `end` — the end-delimited form tryParseProgram splits on — so it
    // round-trips. Joining handlers with the chain word instead collapses them
    // back into a single handler with a merged body on re-parse. Mirrors
    // renderBehavior's handler loop (no indent — these are top-level features).
    if (node.statements.length > 1 && node.statements.every(s => s.kind === 'event-handler')) {
      const endKw = this.keyword(language, 'end');
      const lines: string[] = [];
      for (const handler of node.statements) {
        lines.push(this.render(handler, language), endKw);
      }
      return lines.join('\n');
    }
    // A PROGRAM of features (tryParseProgram): each on its own line, a handler
    // closed by `end` (a def or feature block closes itself). Joined by the chain
    // word, `def a … end then on click …` is no script either engine reads.
    if (isProgram(node)) {
      const endKw = this.keyword(language, 'end');
      const lines: string[] = [];
      node.statements.forEach((feature, i) => {
        lines.push(this.render(feature, language));
        if (feature.kind === 'event-handler') lines.push(endKw);
        // A command feature (`bind`, `set`, `install`) closed by an `end`, as
        // upstream allows, where the next feature has no head word a reader
        // splits at (`bind $x to me end` then `live …`). Read back without one,
        // the two ran together as one command sequence; before a handler, its
        // head word does the work.
        const next = node.statements[i + 1];
        if (feature.kind === 'command' && next && next.kind !== 'event-handler') {
          lines.push(endKw);
        }
      });
      return lines.join('\n');
    }
    const renderedStatements = node.statements.map(stmt => this.render(stmt, language));
    const chainWord = this.getChainWord(node.chainType, language);
    // A loop/tell HEADER takes its body directly — canonical hyperscript rejects a
    // chain word between the header and its first body command (`repeat 3 times add
    // …`, not `repeat 3 times then add …`; `tell #panel add …`, not `tell #panel
    // then add …`). A loop the parser nested renders its own head and body
    // (renderLoop); a header still FLAT in this list — a `tell`, or a loop head
    // with no body — takes its body from the siblings after it, so
    // suppress the chain word immediately after any block-header command
    // (BLOCK_HEADER_ACTIONS).
    // A `then` BETWEEN body commands stays valid, so every other join keeps the
    // chain word.
    let out = renderedStatements[0] ?? '';
    for (let i = 1; i < renderedStatements.length; i++) {
      const prev = node.statements[i - 1];
      const cur = node.statements[i];
      const afterBlockHeader = isFlatBlockHeader(prev);
      // Consecutive top-level `bind` / `install` features are separate features,
      // not a then-chain — `bind $x to #a then bind $x to #b` is rejected
      // (`Unexpected Token : then` between features), as is `install A then
      // install B`. Space-join them (each clause is self-delimiting; canonical
      // accepts both space and newline separation). Neither is ever a command
      // in a body.
      const featureOnly = (n: SemanticNode): boolean =>
        n.kind === 'command' && (n.action === 'bind' || n.action === 'install');
      const betweenBindFeatures = featureOnly(prev) && featureOnly(cur);
      // A `js` (or other open-body) block that is FOLLOWED by a command must close
      // with `end` first, so its body doesn't swallow the sibling.
      const sep = afterBlockHeader || betweenBindFeatures ? ' ' : ` ${chainWord} `;
      out += sep + renderedStatements[i];
    }
    return this.closeBlockHeaders(out, node.statements, language);
  }

  /**
   * Render a conditional (`if <cond> <then-body> [else <else-body>] end`). The
   * branches carry the block structure, so they close with an explicit `end` (the
   * canonical block delimiter) — mirrors renderCompound's block awareness. Branch
   * bodies join like a statement list (a `then` between siblings, none after a
   * loop/tell header).
   */
  private renderConditional(node: ConditionalSemanticNode, language: string): string {
    const cond = node.roles.get('condition' as SemanticRole);
    const condStr = cond ? this.valueToNaturalString(cond, language) : '';
    const parts = [`${this.keyword(language, 'if')} ${condStr}`.trim()];
    const thenBody = this.joinStatements(node.thenBranch, language);
    if (thenBody) parts.push(thenBody);
    // An empty block keeps its `then` (`if x then end`): that is how the reader
    // tells it from a stray `if`.
    else if (!node.elseBranch?.length) parts.push(this.keyword(language, 'then'));
    // An else branch that is one conditional is an `else if` chain, and its
    // last `if` writes the chain's one `end`: upstream reads `else if` as a
    // chain, so an `end` per `if` closed the handler, or a behavior, early.
    const chained = node.elseBranch?.length === 1 && node.elseBranch[0].kind === 'conditional';
    if (node.elseBranch && node.elseBranch.length > 0) {
      // A branch that opens with a conditional and runs on after it puts the
      // `if` on a line of its own: on the `else`'s line upstream reads a chain,
      // and the commands after the inner `end` would leave the else branch.
      const ownLine = !chained && node.elseBranch[0]?.kind === 'conditional';
      const elseBody = this.joinStatements(node.elseBranch, language);
      const elseWord = this.keyword(language, 'else');
      if (ownLine) parts.push(`${elseWord}\n${elseBody}`);
      else parts.push(elseWord, elseBody);
    }
    if (!chained) parts.push(this.keyword(language, 'end'));
    return parts.join(' ');
  }

  /**
   * Render a loop: `<head> <body> end`. The head is the flat command the parser
   * matched (`repeat 3 times`, `for item in $items`), rendered by its own
   * pattern; the body follows it directly, as canonical hyperscript requires
   * (`repeat 3 times add …`, never `… times then add …`).
   */
  private renderLoop(node: LoopSemanticNode, language: string): string {
    if (node.bottomTested) return this.renderBottomTestedLoop(node, language);
    const head = createCommandNode(node.action, Object.fromEntries(node.roles), node.metadata);
    const parts = [this.render(head, language)];
    // `index i`, in the language's own word (grammar-words.ts): the parser
    // reads it right after the loop head. Core's `with index` (it binds
    // `index`) is read too and written the same way, `index index`: upstream
    // has only this form.
    if (node.indexVariable) {
      parts.push(`${grammarWord(language, 'index')} ${node.indexVariable}`);
    }
    const body = this.joinStatements(node.body, language);
    if (body) parts.push(body);
    parts.push(this.keyword(language, 'end'));
    return parts.join(' ');
  }

  /**
   * `repeat forever <body> until|while <condition> end`: upstream reads a test
   * after the body of a `repeat` (bare or `forever`) as the loop's, read after
   * each pass. The head is written `forever`, the form every language reads.
   */
  private renderBottomTestedLoop(node: LoopSemanticNode, language: string): string {
    const head = createCommandNode(
      'repeat',
      { loopType: { type: 'literal', value: 'forever' } },
      node.metadata
    );
    const parts = [this.render(head, language)];
    const body = this.joinStatements(node.body, language);
    if (body) parts.push(body);
    const cond = node.roles.get('condition' as SemanticRole);
    const word = this.keyword(language, node.loopVariant === 'until' ? 'until' : 'while');
    parts.push(`${word} ${cond ? this.valueToNaturalString(cond, language) : ''}`.trim());
    parts.push(this.keyword(language, 'end'));
    return parts.join(' ');
  }

  /**
   * Render a block command: `tell <target> <body> end`, `start view transition
   * [using "<type>"] <body> end`. The head renders through its pattern (a view
   * transition's is the same English words in every language) and the body
   * follows it directly, as a loop's does.
   */
  private renderBlockCommand(node: BlockCommandSemanticNode, language: string): string {
    const head = createCommandNode(node.action, Object.fromEntries(node.roles), node.metadata);
    const parts = [this.render(head, language)];
    const body = this.joinStatements(node.body, language);
    if (body) parts.push(body);
    parts.push(this.keyword(language, 'end'));
    return parts.join(' ');
  }

  /**
   * Join a statement list the way a block body reads: the target language's `then`
   * between siblings, but a single space immediately after a loop/tell block header
   * (whose body follows directly). Used by renderConditional's branches;
   * renderCompound keeps its own copy because it also handles the multi-handler
   * and bind-feature cases.
   *
   * The chain word is localized (`this.keyword(language, 'then')`) for the same
   * reason renderCompound localizes it: a hardcoded English `then` leaks into every
   * non-en block body (`もし … 削除 then 追加`), which no target-language tokenizer
   * recognizes as a connector.
   */
  private joinStatements(statements: readonly SemanticNode[], language: string): string {
    const rendered = statements.map(s => this.render(s, language));
    const thenKw = this.keyword(language, 'then');
    let out = rendered[0] ?? '';
    for (let i = 1; i < rendered.length; i++) {
      const prev = statements[i - 1];
      const afterBlockHeader = isFlatBlockHeader(prev);
      out += (afterBlockHeader ? ' ' : ` ${thenKw} `) + rendered[i];
    }
    return this.closeBlockHeaders(out, statements, language);
  }

  /**
   * Close every block header in a flattened statement list with an explicit `end`.
   *
   * A header can still reach the renderer FLATTENED — `[header, stmt, stmt, …]`
   * with no body attached: every `tell`, and a loop head the parse gave no body
   * or built outside the clause walkers (every other loop arrives as a
   * LoopSemanticNode and renders through renderLoop). A flat header's extent is,
   * as far as the model is concerned, "everything after it". Rendering that
   * without a closing `end` produced a surface the structural layer cannot
   * segment: `block-parser.ts` counts `repeat`/`for`/`while` as depth OPENERS, so
   * the enclosing handler's own `end` was consumed closing the loop and the next
   * feature was swallowed into the handler body. That is what merged the `init`
   * block into the `on pointerdown` handler of `behavior-sortable` in 13
   * languages, and it is why the round-trip — every fidelity score at 1.0 —
   * was the only signal that saw it.
   *
   * Emitting the `end` is also the canonical form: `repeat … end` is required by
   * the engine, so the unterminated render was invalid English as well as
   * unparseable input.
   *
   * One `end` per header, appended at the end: the flat model cannot express a
   * header whose body STOPS before the list does, so closing them all at the tail
   * is the only rendering faithful to what the parser actually captured.
   */
  private closeBlockHeaders(
    rendered: string,
    statements: readonly SemanticNode[],
    language: string
  ): string {
    const headers = statements.filter(isFlatBlockHeader).length;
    if (headers === 0) return rendered;
    const endKw = this.keyword(language, 'end');
    return `${rendered}${` ${endKw}`.repeat(headers)}`;
  }

  /**
   * Resolve a structural keyword (`behavior`/`def`/`init`/`end`) in the target
   * language, falling back to the English form when the profile has no translation.
   */
  private keyword(language: string, action: string): string {
    return tryGetProfile(language)?.keywords?.[action]?.primary ?? action;
  }

  /** `Name` or `Name(p1, p2)` — the parameter list renders verbatim (identifiers). */
  private renderBlockHeader(keyword: string, name: string, parameters: readonly string[]): string {
    return parameters.length > 0
      ? `${keyword} ${name}(${parameters.join(', ')})`
      : `${keyword} ${name}`;
  }

  /**
   * Render a behavior block to target-language source:
   * `<behavior> Name(params)` + optional `init` block + each handler (closed by
   * `end`) + closing `end`. Handlers/commands render through the normal paths.
   *
   * `init` comes first because core runs it first, before attaching any
   * handler; upstream installs features in source order. Written after the
   * handlers, `on click from triggerEl` evaluated `triggerEl` on upstream
   * before `init` had set it.
   */
  private renderBehavior(node: BehaviorSemanticNode, language: string): string {
    const endKw = this.keyword(language, 'end');
    const lines = [
      this.renderBlockHeader(this.keyword(language, 'behavior'), node.name, node.parameters),
    ];
    if (node.initBlock && node.initBlock.length > 0) {
      lines.push(`  ${this.keyword(language, 'init')}`);
      for (const cmd of node.initBlock) lines.push(`    ${this.render(cmd, language)}`);
      lines.push(`  ${endKw}`);
    }
    for (const handler of node.eventHandlers) {
      lines.push(`  ${this.render(handler, language)}`, `  ${endKw}`);
    }
    lines.push(endKw);
    return lines.join('\n');
  }

  /**
   * Render a function definition to target-language source:
   * `<def> name(params)` + body commands + closing `end`, `def` in the
   * language's own word (M2 sheet B1: the noun "function", es `función`).
   */
  private renderDef(node: DefSemanticNode, language: string): string {
    const lines = [
      this.renderBlockHeader(grammarWord(language, 'def'), node.name, node.parameters),
    ];
    for (const cmd of node.body) lines.push(`  ${this.render(cmd, language)}`);
    if (node.catchBody) {
      lines.push(`${grammarWord(language, 'catch')} ${node.catchName ?? 'e'}`);
      for (const cmd of node.catchBody) lines.push(`  ${this.render(cmd, language)}`);
    }
    if (node.finallyBody) {
      lines.push(grammarWord(language, 'finally'));
      for (const cmd of node.finallyBody) lines.push(`  ${this.render(cmd, language)}`);
    }
    lines.push(this.keyword(language, 'end'));
    return lines.join('\n');
  }

  /**
   * A handler's error clauses after its commands: ` catch e <commands>` and
   * ` finally <commands>`, the commands chained as a body's are. The words are
   * the language's (grammar-words.ts, M2 sheet A9, B2), or English's where it
   * has none.
   */
  private renderErrorClauses(node: ErrorClauses, language: string): string {
    const chain = this.getChainWord('then', language);
    const statements = (body: readonly SemanticNode[]): string =>
      body.map(cmd => this.render(cmd, language)).join(` ${chain} `);
    let out = '';
    if (node.catchBody) {
      out += ` ${grammarWord(language, 'catch')} ${node.catchName ?? 'e'}`;
      if (node.catchBody.length) out += ` ${statements(node.catchBody)}`;
    }
    if (node.finallyBody) {
      out += ` ${grammarWord(language, 'finally')}`;
      if (node.finallyBody.length) out += ` ${statements(node.finallyBody)}`;
    }
    return out;
  }

  /**
   * Render a block feature to target-language source:
   * `<keyword> [name]` + body + closing `end`.
   *
   * Mirrors {@link renderBehavior}, including its handling of event-handler
   * children: a handler carries its own body and needs its own `end`, so it
   * closes before the feature's does. `live` and `intercept` declare no name and
   * emit the keyword alone as their header; the reactive `when` emits its
   * watched expression between the head word and the `changes` word — see
   * {@link featureHeader}.
   *
   * `intercept` always parses with an empty body (opaque by design), so it
   * renders as a bare `<keyword> … end` — correct, and the reason the loop
   * tolerates an empty body rather than asserting one.
   */
  private renderFeature(node: FeatureSemanticNode, language: string): string {
    const endKw = this.keyword(language, 'end');
    const lines = [this.featureHeader(node, language)];
    for (const child of node.body) {
      lines.push(`  ${this.render(child, language)}`);
      // An event handler opens a block of its own; close it before the feature.
      if (child.kind === 'event-handler') lines.push(`  ${endKw}`);
    }
    lines.push(endKw);
    return lines.join('\n');
  }

  /**
   * A feature's header line. `<keyword> [name]` for the named features; for the
   * reactive observer, `<when-word> <expr> <changes-word>` — the watched
   * expression rides in `condition`, and the REQUIRED trailing `changes` literal
   * is what the parser bounds it with (and what keeps the head apart from the
   * temporal `when {event}` handler patterns, which is why it can never be
   * dropped). Head-first in every language: it is the order the i18n
   * transformer wrote the corpus rows in, and the one the structural parser
   * reads. The expression is localized like a conditional's (`or` → `または`).
   */
  private featureHeader(node: FeatureSemanticNode, language: string): string {
    const keyword = this.keyword(language, node.action);
    if (node.action === 'when') {
      const watched = node.roles.get('condition' as SemanticRole);
      const expr = watched ? this.valueToNaturalString(watched, language) : '';
      return [keyword, expr, this.keyword(language, 'changes')].filter(Boolean).join(' ');
    }
    if (node.immediately) return `${keyword} immediately`;
    const head = node.name ? `${keyword} ${node.name}` : keyword;
    // The header's URL, verbatim (it is code): `socket Name <url>`, and
    // `eventsource Name <from> <url>` with the language's source marker on the
    // side it takes.
    const source = node.roles.get('source' as SemanticRole);
    const url = source?.type === 'expression' ? source.raw : undefined;
    if (url && node.action === 'socket') return `${head} ${url}`;
    if (url && node.action === 'eventsource') {
      const marker = tryGetProfile(language)?.roleMarkers?.source;
      const word = marker?.primary ?? 'from';
      return marker?.position === 'after' ? `${head} ${url} ${word}` : `${head} ${word} ${url}`;
    }
    return head;
  }

  /**
   * Get the translated chain word for the given language.
   */
  private getChainWord(chainType: 'then' | 'and' | 'async', language: string): string {
    const profile = tryGetProfile(language);
    if (!profile?.keywords) {
      // Fall back to English
      return chainType;
    }

    // Map chain types to keyword lookup
    const keyword = profile.keywords[chainType];
    return keyword?.primary ?? chainType;
  }

  /**
   * Render a semantic node in explicit mode.
   * Delegates to @lokascript/framework/ir for the core logic.
   */
  renderExplicit(node: SemanticNode): string {
    // The framework IR renderer predates the `behavior` block kind and types its
    // input to the single-statement node union. A behavior block is not rendered
    // through the explicit IR path, so bridge the (structurally compatible) type
    // at this boundary rather than widen the framework package's union.
    return renderExplicitBase(node as Parameters<typeof renderExplicitBase>[0]);
  }

  /**
   * Get all supported languages.
   */
  supportedLanguages(): string[] {
    return getTokenizerLanguages();
  }

  /**
   * Find the best pattern for rendering a semantic node.
   *
   * For rendering, we prefer "standard" patterns (e.g., "on click") over
   * native idiom patterns (e.g., "when clicked") because standard patterns
   * are more recognizable and closer to the original hyperscript syntax.
   */
  private findBestPattern(node: SemanticNode, patterns: LanguagePattern[]): LanguagePattern | null {
    // Event-handler nodes carry their commands in `body`, never in roles. The
    // 'on' pattern set also contains fused `<command>-event-*` patterns (e.g.
    // `toggle-event-ko-sov-simple`, template `<event> 할 때 토글`) that exist to
    // PARSE single-line fused commands. Selecting one to *render* a handler emits
    // its trailing verb literal as a phantom command ahead of the real body — the
    // `切り替え / 토글 / değiştir / بدّل / переключить` (toggle) injection seen in
    // ja/ko/tr/ar/ru. At render time a handler is only ever a trigger, so restrict
    // candidates to pure event-trigger patterns (ids without the `-event-`
    // fused-command segment: `on-*`, `event-*`, `event-handler-*`). The fused
    // patterns stay available for parsing.
    let candidates = patterns;
    if (node.kind === 'event-handler') {
      const triggers = patterns.filter(pattern => !/-event-/i.test(pattern.id));
      if (triggers.length > 0) candidates = triggers;
    }

    // Which literal values does the candidate set pin, per role? A value that is
    // pinned by SOME candidate is a real alternative the pattern set distinguishes
    // (put's manner: before / after / at end of), so choosing a pattern pinned to a
    // different one would silently change meaning. A value nothing pins is not an
    // alternative — it is just the value that came out of the parse — and must not
    // disqualify anything. That distinction is what keeps `repeat until event X`
    // renderable: a zh parse yields loopType `until` while the English pattern that
    // carries the event pins `until-event`, and nothing pins bare `until`.
    const pinnedValues = new Map<string, Set<string>>();
    for (const pattern of candidates) {
      for (const [role, rule] of Object.entries(pattern.extraction ?? {})) {
        const key = pinnedLiteral(rule);
        if (key === undefined) continue;
        const set = pinnedValues.get(role) ?? new Set<string>();
        set.add(key);
        pinnedValues.set(role, set);
      }
    }

    // Score patterns by how well they match our roles
    const scored = candidates.map(pattern => {
      let score = pattern.priority;

      // Check each role token in the pattern, INCLUDING the ones nested inside
      // optional groups. Scoring only the top level made a slot the pattern
      // really has invisible: every `[for {duration}]` / `[with {style}]` group
      // lives one level down, so a handcrafted pattern without the slot tied
      // with the generated one that has it and won on order — `toggle .loading
      // for 2s` rendered as `alternar .loading` in es/it/pl/ru/uk/vi/zh, the
      // duration dropped in silence.
      //
      // A role inside a group is scored as PRESENT-only: its absence is what
      // "optional" means, and the group's own role tokens are not consistently
      // flagged `optional` (a handcrafted `[en {destination}]` writes the role
      // bare), so reading the flag there would apply the missing-role penalty to
      // a slot that is optional by construction.
      // An implicit REFERENCE role (`destination: me, implicit: true`) is a
      // matcher-injected default, not something the author wrote — scoring it
      // as present picked hi's `{patient} को {destination} पर टॉगल` for a node
      // whose only real roles were patient + duration, and the duration
      // dropped in silence (toggle-class-temporary hi/qu). Treat it as absent
      // for selection; a pattern that REQUIRES the role then takes the
      // missing-role penalty, exactly as if the parse had never injected the
      // default. Scoped to reference values: an implicit LITERAL (repeat's
      // `loopType:"forever"`) is structural — the loop variant the surface
      // means — and discounting it un-selects every pattern that renders the
      // loop word (measured: repeat-forever went unparseable in 22 languages).
      // An implicit `quantity` (increment's default 1) is absent too: scored as
      // present, it picked de's `erhöhe {patient} um {quantity}` and wrote a
      // `um 1` the author never did.
      const hasRealRole = (role: string): boolean => {
        const val = node.roles.get(role as SemanticRole) as
          { implicit?: unknown; type?: string } | undefined;
        return (
          val !== undefined &&
          !(val.implicit === true && (val.type === 'reference' || role === 'quantity'))
        );
      };
      const scoreTokens = (tokens: readonly PatternToken[], inGroup: boolean): void => {
        for (const token of tokens) {
          if (token.type === 'group') {
            scoreTokens(token.tokens, true);
          } else if (token.type === 'role') {
            if (hasRealRole(token.role)) {
              // Bonus for patterns that use roles we have. A nested slot scores
              // LESS than a top-level one, so carrying an extra optional slot
              // breaks a tie without ever outweighing a top-level difference —
              // measured: at equal weight it also re-ordered the pl behavior
              // handler and three qu positional rows.
              score += inGroup ? NESTED_ROLE_BONUS : 10;
            } else if (!inGroup && !token.optional) {
              // Heavy penalty for patterns that require roles we DON'T have
              // This prevents selecting "source" patterns when there's no source
              score -= 50;
            }
          }
        }
      };
      scoreTokens(pattern.template.tokens, false);

      // A pattern with no slot for a role the node really carries drops it in
      // silence, so it loses to one that renders it. The bonuses above only
      // reward coverage, which let a slot-less pattern win on a top-level-vs-
      // nested difference: once show's patient became optional, zh `显示
      // {patient}` beat the generated `显示 [把 {patient}] [用 {style}]` and
      // `show #modal with *opacity` rendered without its strategy (bn/hi/zh).
      const slots = new Set<string>();
      const collectSlots = (tokens: readonly PatternToken[]): void => {
        for (const token of tokens) {
          if (token.type === 'group') collectSlots(token.tokens);
          else if (token.type === 'role') slots.add(token.role);
        }
      };
      collectSlots(pattern.template.tokens);
      for (const role of node.roles.keys()) {
        if (hasRealRole(role) && !slots.has(role)) score -= UNCOVERED_ROLE_PENALTY;
      }

      // Value-pinned variants. A positional pattern (`put X before Y`, `at end
      // of`, `after`) carries its position as a baked-in literal plus an
      // extraction default that records which value it means:
      //   put-es-before -> extraction.manner.default = 'before'
      //   put-es-at-end -> extraction.manner.default = 'at end of'
      // while the neutral `put-es-full` pins nothing. So the pattern set already
      // says which surface each value selects; scoring just has to read it.
      //
      // The rule: a pattern that pins a role to a literal may be chosen ONLY when
      // the node carries that exact value. Matching is a strong preference (the
      // pinned form is the whole reason the value exists); mismatching — or the
      // node not carrying the role at all — disqualifies it, so a plain
      // `put X into Y` can never render as `poner X en fin de Y`.
      //
      // This replaces an id-regex that penalized every `-at-end|-before|-after`
      // pattern unconditionally. That kept plain puts safe but made the positional
      // forms unreachable: `put "<p>" before me` rendered with the into-pattern in
      // all 23 languages, losing the distinction the source drew.
      for (const [role, rule] of Object.entries(pattern.extraction ?? {})) {
        const pinnedKey = pinnedLiteral(rule);
        if (pinnedKey === undefined) continue;
        const actual = node.roles.get(role as SemanticRole);
        // The value as the pattern would produce it: a literal, or an
        // expression where the rule says so (`go back`).
        const actualKey =
          actual?.type === (rule.valueIsExpression ? 'expression' : 'literal')
            ? String(
                actual.type === 'expression'
                  ? (actual as { raw?: unknown }).raw
                  : (actual as { value?: unknown }).value
              )
                .trim()
                .toLowerCase()
            : undefined;

        if (actualKey === pinnedKey) {
          // The pinned form is the whole reason this value exists — prefer it
          // decisively over the neutral pattern, whatever the parse priorities say.
          score += 60;
        } else if (actualKey === undefined || pinnedValues.get(role)?.has(actualKey)) {
          // Either the node has no such value (so this pattern would invent one:
          // a plain `put X into Y` must never render as `put X at end of Y`), or it
          // has a DIFFERENT value that the pattern set treats as an alternative.
          // Both are wrong surfaces; disqualify.
          score -= 200;
        }
        // Otherwise the node's value is not one of the pinned alternatives, so this
        // pattern is still the best available carrier for it — leave the score alone
        // and let priority and role coverage decide.
      }

      // For English rendering, prefer "standard" patterns over "native idiom" patterns
      // This ensures "on click" is preferred over "when clicked" for English output
      // Only apply this boost for English - other languages should use their native idioms
      if (pattern.language === 'en') {
        if (pattern.id.includes('standard') || pattern.id.includes('en-source')) {
          score += 20; // Boost standard patterns for English rendering
        }
        // Penalize English "when" and "upon" variants (good for parsing, not output)
        if (pattern.id.includes('-when') || pattern.id.includes('-upon')) {
          score -= 15;
        }
      }

      return { pattern, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].pattern : null;
  }

  /**
   * Write a `wait for`'s extras back around its event: the first event's params
   * glued on, each further alternative after it (`<or> pointerup(clientY)`,
   * `<or> 1s`), then the source (`from X`, or `X から` where the marker follows
   * its noun) — the shape the parser's tryWaitAlternatives reads. The source
   * follows the run in every language, never precedes the event: that is
   * where an SOV loop head puts its own. The patterns render the first event
   * only.
   */
  private spliceWaitAlternatives(
    node: CommandSemanticNode,
    parts: string[],
    eventPart: number,
    language: string
  ): void {
    const alternatives = node.waitAlternatives;
    if (!alternatives || alternatives.length === 0 || eventPart < 0) return;
    const withParams = (params?: readonly string[]) =>
      params && params.length > 0 ? `(${params.join(', ')})` : '';
    const [first, ...rest] = alternatives;
    if ('event' in first) parts[eventPart] += withParams(first.params);
    const or = [...(OR_WORDS_BY_LANG[language] ?? [])][0] ?? 'or';
    const legs = rest.map(alt =>
      'event' in alt
        ? `${or} ${this.renderEventName({ type: 'literal', value: alt.event }, language)}${withParams(alt.params)}`
        : `${or} ${alt.duration}`
    );
    parts.splice(eventPart + 1, 0, ...legs);
    const source = node.waitSource;
    if (!source) return;
    const noun = this.valueToNaturalString(source, language);
    const marker = tryGetProfile(language)?.roleMarkers?.source;
    const word = marker?.primary ?? 'from';
    const phrase = marker?.position === 'after' ? `${noun} ${word}` : `${word} ${noun}`;
    parts.splice(eventPart + 1 + legs.length, 0, phrase);
  }

  /**
   * Emit a handler's `or <event>` alternatives right after its event. The
   * parser captures them (`additionalEvents`), and nothing rendered them, so
   * every translation of `on click or keydown …` listened for `click` alone.
   * The language's own or-word there parses back in all 23 languages
   * (measured); a leg's `[filter]` travels glued to it, as the event's does.
   */
  private spliceOrEvents(
    node: EventHandlerSemanticNode,
    parts: string[],
    eventPart: number,
    language: string
  ): void {
    const legs = node.additionalEvents ?? [];
    if (legs.length === 0) return;
    const or = [...(OR_WORDS_BY_LANG[language] ?? [])][0] ?? 'or';
    const rendered = legs.map(leg => `${or} ${this.renderEventName(leg, language)}`);
    parts.splice(eventPart >= 0 ? eventPart + 1 : parts.length, 0, ...rendered);
  }

  /**
   * Emit an event handler's modifiers into the rendered head. They live in
   * `eventModifiers`, not in roles, so no pattern slot ever rendered them: every
   * `on X from <source>` lost its source in all 23 languages, silently (the
   * parse consumed the tokens, so no coverage diagnostic fired), and the book's
   * abort button listened on the wrong element in every language.
   *
   * Placement follows what each language's parser recovers:
   * - `.once` / `.queue(x)` glue to the event token (the tokenizer's
   *   event-modifier form, which the canonical engine also accepts).
   * - the source goes where the profile's source marker sits — prepositional
   *   markers (en from, es de, de von, ar من, zh 从) right after the event, where
   *   the matcher's source-clause window and the generated `[من {source}]`
   *   groups look; postpositional markers (ja から, ko 에서, bn থেকে, hi से, tr
   *   den, qu manta) fronted before the whole head, the `[{source} から] {event}`
   *   shape the SOV head patterns and ko's `{source} 에서 {event} 할 때` declare.
   * - `debounced at` / `throttled at` follow the source, in English: every
   *   parser's standalone-modifier pre-pass reads that phrase, and the engine
   *   rejects the other order (`debounced at 200ms from window`).
   */
  private spliceEventModifiers(
    node: EventHandlerSemanticNode,
    parts: string[],
    eventPart: number,
    language: string
  ): void {
    const em = node.eventModifiers ?? {};
    if (!node.eventModifiers && !node.headClause) return;
    if (eventPart >= 0 && em.queue) parts[eventPart] += `.queue(${em.queue})`;
    if (em.every) {
      if (language === 'en' && eventPart >= 0) parts[eventPart] = `every ${parts[eventPart]}`;
      else parts.unshift('every');
    }
    if (em.once && em.onceAsFirst) {
      // `on first click`, the form both engines run once; every other
      // language a leading `first` in its own word (es `primero`, M2 sheet
      // A7), as its leading `once` below.
      if (language === 'en' && eventPart >= 0) parts[eventPart] = `first ${parts[eventPart]}`;
      else parts.unshift(this.localizeValue('first', language));
    } else if (em.once) {
      // en: `click.once`, the form core (the English executor) reads — it
      // rejects `on click once`. Every other language: a leading `once`, the
      // one position the parser's standalone-modifier pre-pass reads in all 23
      // (and where the retired transformer put it); a glued `クリック.once`
      // tokenizes as one word in bn/ja/ko/tr/zh and the handler is lost.
      if (language === 'en' && eventPart >= 0) parts[eventPart] += '.once';
      else parts.unshift('once');
    }
    const tail: string[] = [];
    if (em.from) {
      // `from elsewhere`: the language's own word (grammar-words.ts), which the
      // parser reads against its `from` marker.
      const elsewhere = em.from.type === 'expression' && em.from.raw === 'elsewhere';
      const noun = elsewhere
        ? grammarWord(language, 'elsewhere')
        : this.valueToNaturalString(em.from, language);
      const marker = tryGetProfile(language)?.roleMarkers?.source;
      const word = marker?.primary ?? 'from';
      if (marker?.position === 'after') {
        parts.unshift(`${noun} ${word}`);
      } else {
        tail.push(`${word} ${noun}`);
      }
    }
    const duration = (ms: number): string => (ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`);
    if (typeof em.debounce === 'number') tail.push(`debounced at ${duration(em.debounce)}`);
    if (typeof em.throttle === 'number') tail.push(`throttled at ${duration(em.throttle)}`);
    // What upstream's `on` reads that no pattern models, as written, after the
    // whole head (zh's closes on 就, after its event).
    if (node.headClause) parts.push(node.headClause);
    if (tail.length === 0) return;
    // After the event when the head carries one; else after the head (SOV heads
    // end in their event marker, which the modifiers must follow).
    const at =
      eventPart >= 0 && tryGetProfile(language)?.roleMarkers?.source?.position !== 'after'
        ? eventPart + 1
        : parts.length;
    parts.splice(at, 0, ...tail);
  }

  /**
   * Render a semantic node using a specific pattern.
   */
  private renderWithPattern(node: SemanticNode, pattern: LanguagePattern): string {
    const parts: string[] = [];
    const language = pattern.language;
    let eventPart = -1;

    const tokens = pattern.template.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const oblique = this.obliqueAt(tokens, i, node, language);
      if (oblique !== undefined) {
        parts.push(oblique);
        i++;
        continue;
      }
      const token = tokens[i]!;
      const rendered = this.renderPatternToken(token, node, language);
      if (rendered !== null) {
        parts.push(rendered);
        // A marker-less wait renders its event through the duration slot.
        if (
          token.type === 'role' &&
          (token.role === 'event' || (token.role === 'duration' && node.action === 'wait'))
        ) {
          eventPart = parts.length - 1;
        }
      }
    }

    if (node.action === 'wait' && node.kind === 'command') {
      this.spliceWaitAlternatives(node as CommandSemanticNode, parts, eventPart, language);
    }

    // `fetch … do not throw`, in the language's own words, after the whole
    // command, where the parser reads it (not-throw.ts).
    if (node.action === 'fetch' && (node as CommandSemanticNode).doNotThrow) {
      parts.push(notThrowWords(language).join(' '));
    }

    // `smoothly`/`instantly` after a go or scroll: English in every language,
    // after the whole command, where tryScrollModifiers reads it back.
    const scrollBehavior = (node as CommandSemanticNode).scrollBehavior;
    if (scrollBehavior && (node.action === 'go' || node.action === 'scroll')) {
      parts.push(scrollBehavior);
    }

    if (node.kind === 'event-handler') {
      // Event parameters glue to the event token, `pointerdown(clientX,
      // clientY)`: the form every language's parser reads (the SOV heads expect
      // the phrase between the event and its marker). They were never written,
      // so every head lost them, and the `from` that followed them in English.
      const params = (node as EventHandlerSemanticNode).parameterNames;
      if (params && params.length > 0 && eventPart >= 0) {
        parts[eventPart] += `(${params.join(', ')})`;
      }
      // The or-legs first, while `eventPart` still indexes the event: the
      // modifiers may unshift. A `from` then lands between the event and its
      // alternatives, which is how the parser reads a source (the first leg's).
      this.spliceOrEvents(node as EventHandlerSemanticNode, parts, eventPart, language);
      this.spliceEventModifiers(node as EventHandlerSemanticNode, parts, eventPart, language);
    }

    // Handle event handler body (render separately after pattern).
    //
    // Space-joined, NOT via joinStatements: a chain word between sibling body
    // commands is optional in canonical hyperscript (`on click wait 2s remove me`
    // and `… wait 2s then remove me` both parse clean on the 0.9.9x engine), and a
    // multi-element body only ever arises from a FOREIGN parse — the en parse folds
    // its body into a single compound node, which renderCompound already joins with
    // the chain word. Routing this through joinStatements was measured over the
    // 3744-row corpus (2026-08-07): canonical validity −2 (both on an already-broken
    // row), round-trip action fidelity unchanged at 0.95566, and 167 rows moved AWAY
    // from their English reference, which omits the optional `then`. So the join
    // stays as-is; see the F5 note in the hyperscript-adapter handoff.
    if (node.kind === 'event-handler') {
      const eventNode = node as EventHandlerSemanticNode;
      if (eventNode.body && eventNode.body.length > 0) {
        const bodyParts = eventNode.body.map(n => this.render(n, language));
        parts.push(bodyParts.join(' '));
      }
    }

    return parts.join(' ');
  }

  /**
   * A marker and the reference beside it, as one phrase in the case the
   * marker takes (M2 N3): es `en` + `me` → `en mí`, ru `к` → `ко мне`, de `in`
   * → `in mich` (a direction) or `in mir` (a location). From the profile's
   * `obliqueReferences`; undefined where the language keeps the nominative.
   */
  private obliquePhrase(
    language: string,
    marker: string,
    reference: string | undefined,
    sense: 'direction' | 'location'
  ): string | undefined {
    if (this.plainWords.has('case') || reference === undefined) return undefined;
    const form = tryGetProfile(language)?.obliqueReferences?.[reference]?.[marker];
    if (!form) return undefined;
    this.nativeWritten.add('case');
    return typeof form === 'string' ? form : form[sense];
  }

  /**
   * Tokens `i` and `i + 1`, a marker and the role it marks (a destination, a
   * source, or a patient that has one: `set $x to me`, es `a mí`),
   * written as one oblique phrase (obliquePhrase): the marker is the literal's
   * last word (`antes de`), or its first where markers follow their noun (hi).
   * undefined where they are not such a pair.
   */
  private obliqueAt(
    tokens: readonly PatternToken[],
    i: number,
    node: SemanticNode,
    language: string
  ): string | undefined {
    const first = tokens[i];
    const second = tokens[i + 1];
    const roleToken = first?.type === 'role' ? first : second;
    if (roleToken?.type !== 'role') return undefined;
    const role = roleToken.role;
    if (role !== 'destination' && role !== 'source' && role !== 'patient') return undefined;
    const after = tryGetProfile(language)?.roleMarkers[role]?.position === 'after';
    const [literal, roleAt] = after ? [second, first] : [first, second];
    if (roleAt !== roleToken || literal?.type !== 'literal') return undefined;
    // A go/scroll position renders its own way (`top of me`).
    if (role === 'destination' && (node as CommandSemanticNode).scrollPosition) return undefined;
    const words = literal.value.split(' ');
    const marker = after ? words[0]! : words[words.length - 1]!;
    const sense =
      role === 'destination' && LOCATION_DESTINATIONS.has(node.action) ? 'location' : 'direction';
    const value = node.roles.get(role);
    const reference = value?.type === 'reference' ? value.value : undefined;
    const phrase = this.obliquePhrase(language, marker, reference, sense);
    if (phrase === undefined) return undefined;
    return (after ? [phrase, ...words.slice(1)] : [...words.slice(0, -1), phrase]).join(' ');
  }

  /**
   * Render a single pattern token.
   */
  private renderPatternToken(token: any, node: SemanticNode, language: string): string | null {
    switch (token.type) {
      case 'literal':
        // Parse-only markers (renderSuppress) consume input but never render —
        // e.g. fetch's `from`, which parses `fetch from /api` yet must be absent
        // from output (`fetch from "/api"` is invalid canonical _hyperscript).
        return token.renderSuppress ? null : token.value;

      case 'role': {
        const value = node.roles.get(token.role);
        if (!value) {
          // `wait` has ONE slot in its schema — `duration`, described as
          // "Duration or event to wait for" — and the parser re-types a known
          // event name out of it into `event` (normalizeCommandRoles, gated on
          // WAITABLE_EVENT_WORDS) so the waitMapper can emit the runtime's
          // `modifiers.for` wait. Only the English `wait-en-for-event` head
          // declares an `event` slot, so in the other 23 languages the
          // generated `wait {duration}` pattern found nothing to put in its one
          // slot and the event vanished: `wait for transitionend` rendered as
          // bare `esperar` / `待つ` / `ждать`, which does not even re-parse.
          //
          // Route it back through the duration slot — the exact inverse of the
          // parse-side relabel, which is why the round trip closes: every
          // target parser recovers `wait.event` from the marker-less surface
          // (`esperar transitionend`), including a LOCALIZED name, since
          // eventNameTranslations normalizes `carga` / `ロード` back to `load`
          // before the relabel runs. en is untouched — its `event`-slotted head
          // outscores this pattern and never reaches here.
          if (token.role === 'duration' && node.action === 'wait') {
            const event = node.roles.get('event');
            if (event) return this.renderEventName(event, language);
          }
          if (token.optional) return null;
          // Use default if available
          return null;
        }
        // An `event` role names a DOM event — always a bare identifier, never a
        // quoted string. Render it via renderEventName (localizes for the target
        // language; identity for en) so `wait for transitionend` / `send click`
        // stay unquoted. A known DOM event name arrives as a string `literal`
        // (renderEventName strips the quotes); expression/namespaced events fall
        // through unchanged. Previously scoped to event-handler nodes only, which
        // left `wait for {event}` rendering the quoted `wait for "transitionend"`
        // the canonical parser rejects.
        if (token.role === 'event') {
          return this.renderEventName(value, language);
        }
        // A go/scroll position renders just before its element, in English in
        // every language, where tryScrollModifiers reads it back: `go top of #d1`.
        const scrollPosition = (node as CommandSemanticNode).scrollPosition;
        if (
          scrollPosition &&
          token.role === 'destination' &&
          (node.action === 'go' || node.action === 'scroll')
        ) {
          return `${scrollPosition} of ${this.valueToNaturalString(value, language)}`;
        }
        // `halt` takes an idiomatic article in canonical hyperscript — `halt the
        // event` (`halt event` is rejected). The parser strips the leaked article
        // (skipNoiseWords) so the value is the bare `event` reference; re-add `the`
        // at render. Scoped to en (the article is English syntax); other languages
        // render the reference alone.
        if (
          language === 'en' &&
          node.action === 'halt' &&
          token.role === 'patient' &&
          value.type === 'reference' &&
          value.value === 'event'
        ) {
          return `the ${this.valueToNaturalString(value, language)}`;
        }
        // `render <tmpl> with <named-args>` takes a bare `key: value` list, not a
        // braced object literal — `render #row with {row:$data}` is rejected but
        // `render #row with row: $data` is valid. The parser captures the args as
        // an object-literal expression; strip the outer braces for render's `with`
        // (style) role. NOT applied to fetch's `with {…}`, whose braced options
        // object IS canonical (different command, so scoped by action).
        if (node.action === 'render' && token.role === 'style' && value.type === 'expression') {
          const raw = value.raw.trim();
          if (raw.startsWith('{') && raw.endsWith('}')) {
            return raw.slice(1, -1).trim();
          }
        }
        // A `js` body is raw JavaScript, not vocabulary. `localizeValueInterior`
        // rewrites the words it recognizes, which inside a js block means the
        // CODE gets translated: `js(me) …` came out as de `js (ich) …`, tr
        // `js (ben) …` — the argument list renamed, and any `window`/`true`/…
        // in the body with it. That is the one role whose value must survive a
        // translation untouched, and it is why every non-English
        // behavior-removable row differed from its own English round-trip while
        // scoring 1.0 on every fidelity metric.
        if (node.action === 'js' && value.type === 'expression') return value.raw;
        // A fixed keyword phrase (`using view transition`, `in new window`) is
        // English in every language: its marker is, so its value is too.
        // `window` is a reference, which renderReference localizes (es
        // `ventana`), and `in new ventana` is a phrase in no language.
        if (token.valueShape === 'keyword') {
          if (value.type === 'reference') return value.value;
          if (value.type === 'expression') return value.raw;
          if (value.type === 'literal' && value.dataType !== 'string') return String(value.value);
        }
        // A fetch's response type (`as text`, `as html`) names a format core
        // reads, not a word: localized through the value lexicon (ms `teks`,
        // ru `текст`, th `ข้อความ`), no parser read it back, and on the direct
        // path the fetch threw before its request. It is English in every
        // language, as `json` (which no lexicon translates) already was.
        if (
          node.action === 'fetch' &&
          token.role === 'responseType' &&
          value.type === 'expression'
        ) {
          return value.raw;
        }
        // `pick characters 0 to 5 of #note` captures its range as ONE canonical
        // English expression, and the renderer emitted it verbatim — so the
        // separator stayed English while every other word localized. The parser
        // wants the language's OWN joiner (`PICK_RANGE_SEPARATORS_BY_LANG`);
        // twenty-two languages happened to accept English `to` as well, but pl's
        // `to` tokenizes as the PRONOUN `it`, so the range and the source were
        // both lost and the whole `pick` action dropped (pl pick-text-range).
        if (node.action === 'pick' && token.role === 'patient' && value.type === 'expression') {
          const separator = PatternMatcher.rangeSeparatorFor(language);
          if (separator) return value.raw.replace(/(?<=\s)to(?=\s)/g, separator);
        }
        return this.valueToNaturalString(value, language);
      }

      case 'group': {
        // Check if we have all required roles in the group
        const hasRequired = token.tokens
          .filter((t: any) => t.type === 'role' && !t.optional)
          .every((t: any) => node.roles.has(t.role));

        if (!hasRequired && token.optional) {
          return null;
        }

        // Skip an optional group whose destination/source/patient role is the
        // implicit `me` default (the parser injects it when unspecified). This
        // avoids the redundant `on me` / `to me` / `from me` / `of me` — `add
        // .active`, not `add .active to me`; `remove me`, not `remove me from me`;
        // `measure my x`, not `measure my x of me`. The `on` event-source renders
        // via its own path, so it is untouched here.
        //
        // A bare `show` / `settle` stays bare for the same reason, and one place
        // it is not redundant: inside a `tell`, a bare `show` shows the told
        // element, and upstream reads a written `show me` as the handler's own.
        if (token.optional) {
          for (const roleName of ['destination', 'source', 'patient'] as const) {
            const roleToken = token.tokens.find(
              (t: any) => t.type === 'role' && t.role === roleName
            );
            if (!roleToken) continue;
            const roleValue = node.roles.get(roleName);
            if (roleValue?.type !== 'reference' || roleValue.value !== 'me') continue;
            // Only the matcher-materialized default is redundant. An AUTHORED
            // `to me` / `from me` (qu `noqa man`, zh `给 我`) must survive the
            // round-trip — dropping it made `add .active to me` and bare
            // `add .active` render identically (#874's qu deferral blocker).
            if (!roleValue.implicit) continue;
            // Keep an explicit destination when the patient is string content —
            // canonical `add "<p>Line</p>" to me` requires it (`add "<p>Line</p>"`
            // alone is rejected: `add` expects a class/attribute reference). A
            // class/attribute patient defaults to `me` fine, so it stays suppressed.
            if (roleName === 'destination') {
              const patient = node.roles.get('patient');
              if (patient?.type === 'literal' && patient.dataType === 'string') continue;
            }
            // Keep the implicit patient when another role follows it: a verb
            // followed directly by its marker (`show with *opacity`) is read as
            // verb + object by the fused handler patterns — ms `tunjuk dengan
            // *opacity` took `dengan` as the patient, hi `*opacity से दिखाएं`
            // bound `से` (from) as the handler's source (hi/ms/th/tl/vi).
            if (roleName === 'patient' && hasOtherRealRole(node, 'patient')) continue;
            return null; // Skip rendering the implicit "me" destination/source/patient
          }
        }

        // For optional groups with a `quantity` role, skip the default the
        // parser injected (`quantity: 1, implicit`) for increment/decrement when
        // none was written: rendering it produces a "by 1" the author never wrote
        // — harmless in most languages but a real bug in vi, where the quantity
        // marker `thêm` is also the `add` keyword, so `tăng :count thêm 1`
        // re-parses as increment + a phantom `add`. A WRITTEN `by 1` stays: a
        // translation keeps what the author wrote, and a value it drops reads as
        // lost (explicit/lossy.ts).
        if (token.optional) {
          const qtyToken = token.tokens.find(
            (t: any) => t.type === 'role' && t.role === 'quantity'
          );
          if (qtyToken) {
            const qtyValue = node.roles.get('quantity') as { implicit?: unknown } | undefined;
            if (qtyValue?.implicit === true) {
              return null; // Skip rendering the default quantity of 1
            }
          }
        }

        const groupParts: string[] = [];
        let hasRoleValue = false;
        for (let i = 0; i < token.tokens.length; i++) {
          const oblique = this.obliqueAt(token.tokens, i, node, language);
          if (oblique !== undefined) {
            groupParts.push(oblique);
            hasRoleValue = true;
            i++;
            continue;
          }
          const subToken = token.tokens[i];
          const rendered = this.renderPatternToken(subToken, node, language);
          if (rendered !== null) {
            groupParts.push(rendered);
            if (subToken.type === 'role') hasRoleValue = true;
          }
        }

        // Don't emit an optional group that DECLARES a role slot and did not
        // fill it — e.g. don't emit a dangling "with" when the style role is
        // absent from "hide #output".
        //
        // …unless the group is `renderRequired`: a MARKER wrapped on its own by
        // `profile.markersOptional` (tr, where the case suffix may be dropped
        // colloquially, so the parse side has to accept both forms). Dropping
        // those cost tr every role marker in every rendered command —
        // `add .selected to #item` came out `#item .selected ekle` where the
        // corpus has `#item e .selected i ekle`, and the marker-less surface
        // re-parses as a one-role `add` with the destination defaulted to `me`.
        if (token.optional && !hasRoleValue && !token.renderRequired) return null;

        return groupParts.length > 0 ? groupParts.join(' ') : null;
      }

      default:
        return null;
    }
  }

  /**
   * Render an event-handler's event name in the target language (Phase 1b).
   *
   * Only a known DOM event name arrives as a `literal`; namespaced (`htmx:load`)
   * and unknown/custom events arrive as `expression` and pass through unchanged.
   * Compound triggers (`click or keydown`) are one combined literal — localize
   * each sub-name and keep the English ` or ` connector (a native connector adds
   * no round-trip benefit, and ja/zh/ko cannot re-parse compound triggers either
   * way — a documented pre-existing limitation).
   */
  private renderEventName(value: SemanticValue, language: string): string {
    if (value.type !== 'literal' || typeof value.value !== 'string') {
      return this.valueToNaturalString(value, language);
    }
    const raw = value.value;
    // Written in quotes, written back in quotes, untranslated (see LiteralValue.quoted).
    if (value.quoted) return raw.includes('"') ? `'${raw}'` : `"${raw}"`;
    const localizeOne = (name: string): string =>
      name.includes(':') ? name : localizeEventName(name, language);
    if (raw.includes(' or ')) {
      return raw
        .split(' or ')
        .map(part => localizeOne(part.trim()))
        .join(' or ');
    }
    return localizeOne(raw);
  }

  /**
   * Convert a semantic value to natural language string.
   * Uses language-specific possessive rendering when language is provided.
   */
  private valueToNaturalString(value: SemanticValue, language: string = 'en'): string {
    switch (value.type) {
      case 'literal':
        // A quoted string is author text and is emitted verbatim; a bare literal
        // is vocabulary (`true`, `null`) and localizes like any other value word.
        if (typeof value.value === 'string' && value.dataType === 'string') {
          // A naked `${…}` URL stays naked: quoted, it interpolates on neither
          // engine (see LiteralValue.interpolates).
          return value.interpolates ? value.value : quoteText(value.value);
        }
        return this.localizeValue(String(value.value), language);

      case 'selector':
        // A scoped query writes the language's `in` (es `<button/> en yo`), as
        // a positional query's does (value-lexicon.ts): every reader takes it
        // there, and English's.
        if (!value.scope) return value.value;
        {
          const words = this.valueWords(language);
          if (words.queryIn !== 'in') words.wrote?.();
          // `in me` in the case the `in` takes, a location (de `in mir`, N3).
          const scope =
            (tryGetProfile(language)?.roleMarkers.destination?.position !== 'after' &&
              value.scope.type === 'reference' &&
              this.obliquePhrase(language, words.queryIn, value.scope.value, 'location')) ||
            `${words.queryIn} ${this.valueToNaturalString(value.scope, language)}`;
          return `${value.value} ${scope}`;
        }

      case 'reference':
        return this.renderReference(value, language);

      case 'property-path':
        return this.renderPropertyPath(value, language);

      case 'expression':
        // `raw` is the English source of the expression. Emitting it unchanged
        // is what made the target-language parser drop the role — it could not
        // bind an English interior. Localize the vocabulary inside it; strings,
        // selectors and unknown identifiers are left alone by the localizer.
        // A POSSESSIVE inside the expression is localized first, structurally:
        // `'s` is English syntax, not vocabulary, and the word-level localizer
        // cannot touch it.
        // A variable keeps its spelling where its localized word would read
        // back as another variable (`localizedName`), and so does a property
        // name the reader would not bring back (`propertyReadsBack`). A call's
        // arguments are written as written: every reader takes them so.
        if (/^[A-Za-z_$][\w$]*$/.test(value.raw)) return this.renderLoneName(value.raw, language);
        return this.localizeValue(
          outsideCallArguments(this.valueGuard?.(value.raw) ?? value.raw, text =>
            this.localizeInteriorPossessives(text, language)
          ),
          language,
          this.wordsKeptAsSpelled(value.raw, language)
        );

      case 'flag':
        return this.localizeValue(value.name, language);
    }
  }

  /**
   * A variable's localized word, where the reader takes that word alone for
   * the same value (es `ello` is `it`); undefined where it reads as a variable
   * instead — a structure word, a verb or an event name (`set when to 1` wrote
   * es `cuando`), or a word it does not know (`valor`, bn `সূচক`). There a
   * translation writes the variable as spelled (was OPEN_ITEMS P49, P28).
   */
  private localizedName(name: string, language: string): string | undefined {
    const localized = this.localizeValue(name, language);
    if (localized === name) return name;
    if (this.spellVariables) return undefined;
    const [only, ...rest] = tokenize(localized, language).tokens;
    const readsAsValue =
      rest.length === 0 &&
      only?.kind === 'keyword' &&
      (only.normalized ?? only.value).toLowerCase() === name.toLowerCase() &&
      !loneKeywordKind(only);
    if (!readsAsValue) return undefined;
    this.localizedVariable = true;
    return localized;
  }

  /** A value that is one name: vocabulary is localized, a variable as {@link localizedName} says. */
  private renderLoneName(name: string, language: string): string {
    const guarded = this.valueGuard?.(name) ?? name;
    if (guarded !== name) return guarded;
    if (!isVariableName(name)) return this.localizeValue(name, language);
    return this.localizedName(name, language) ?? name;
  }

  /**
   * The words of an expression the localizer must leave as spelled: its
   * variables that {@link localizedName} keeps (`value + 1`), and its property
   * names the reader would not bring back (`the children of #bar`).
   */
  private wordsKeptAsSpelled(raw: string, language: string): ReadonlySet<string> | undefined {
    if (language === 'en') return undefined;
    const { variables, properties } = expressionNames(raw);
    const kept = [
      ...[...variables].filter(name => this.localizedName(name, language) === undefined),
      ...[...properties].filter(name => !this.propertyReadsBack(name, language)),
    ];
    return kept.length ? new Set(kept) : undefined;
  }

  /**
   * Whether the reader brings a property name's localized word back as that
   * name: through its property table (es `valor` is `value`) or as a keyword
   * (es `primero` is `first`). Elsewhere a translation writes the name as
   * spelled, since a property is the runtime's name: es wrote `my children` as
   * `mi hijos` and `my style["color"]` as `mi estilo["color"]`, which read back
   * as properties named `hijos` and `estilo`, in every language whose table
   * lacks the word.
   */
  private propertyReadsBack(name: string, language: string): boolean {
    const localized = this.localizeValue(name, language);
    if (localized === name) return true;
    if (PROPERTY_NAME_LEXICON[language]?.[localized.toLowerCase()] === name.toLowerCase()) {
      return true;
    }
    const [only, ...rest] = tokenize(localized, language).tokens;
    return (
      rest.length === 0 &&
      only?.kind === 'keyword' &&
      (only.normalized ?? '').toLowerCase() === name.toLowerCase()
    );
  }

  /** A property path's property: localized where {@link propertyReadsBack}, else as written. */
  private localizeProperty(property: string, language: string): string {
    const head = /^[A-Za-z][\w-]*/.exec(property)?.[0];
    if (head && !this.propertyReadsBack(head, language)) return property;
    return this.localizeValue(property, language);
  }

  /**
   * Localize the vocabulary inside a value, when the target profile carries a
   * lexicon. English is a no-op, and a profile without a lexicon degrades to
   * the previous behaviour (English interior) rather than failing.
   */
  private localizeValue(raw: string, language: string, keep?: ReadonlySet<string>): string {
    if (language === 'en') return raw;
    return localizeValueInterior(
      raw,
      language,
      tryGetProfile(language),
      keep,
      this.valueWords(language)
    );
  }

  /**
   * Render a reference value in the target language.
   */
  private renderReference(value: ReferenceValue, language: string): string {
    // An element-scoped name, in the language's own `element` (M2 sheet A10):
    // es `elemento x`. `the element's x` and `element's x` are the same name
    // on both engines.
    const scoped = /^(?:the\s+)?element(?:'s)?\s+([A-Za-z_]\w*)$/.exec(value.value);
    if (scoped && language !== 'en') return `${elementScopeWord(language)} ${scoped[1]}`;
    const profile = tryGetProfile(language);
    if (!profile?.references) {
      return value.value; // Fall back to English reference
    }
    return profile.references[value.value] ?? value.value;
  }

  /**
   * The base of a DOT access — the part before the first `.`.
   *
   * A selector is code and renders verbatim. A REFERENCE is the interesting
   * case, and it is not simply "localize it": the parser's dot path gates on
   * `isValidReference(base)`, an English-word test, so the plain localized
   * pronoun is exactly the form that CANNOT be read back. Measured across the
   * corpus: `it.name` rendered as es `ello.name`, pt `ele.name`, zh `它.name`,
   * de `es.error`, fr `il.error`, vi `nó.data` — every one of them fails to
   * parse, and the role is lost.
   *
   * The POSSESSIVE form does parse (es `su.name`, de `sein.error`, pt
   * `seu.name`, it `suo.name`), and it is what the i18n corpus renders, so it
   * is preferred where the profile has one. Eight languages have no possessive
   * form for `it` and NO language has one for `event`, and a multi-word form
   * (vi `của nó`) cannot carry a dot chain — in those cases the English
   * reference is kept, which parses everywhere precisely because the dot path
   * is English-gated. Less localized, but the role survives, and a lost role is
   * the worse outcome.
   */
  private renderDotBase(
    object: SemanticValue,
    language: string,
    profile: ReturnType<typeof tryGetProfile>
  ): string {
    if (object.type !== 'reference') {
      return this.valueToNaturalString(object, language);
    }
    const possessive = profile?.possessive?.specialForms?.[object.value];
    if (possessive && !/\s/.test(possessive)) return possessive;
    // English base: language-invariant, and the only form the dot path accepts
    // when the language offers no single-word possessive.
    return object.value;
  }

  /**
   * Rewrite an English possessive inside an expression into the target
   * language's own construction: `#price's value` → qu `#price pa chanin`, ja
   * `#priceの値`, es `valor de #price`.
   *
   * The word-level localizer cannot do this — `'s` is SYNTAX, and the owner and
   * the property have to move relative to each other. Left alone, a watched
   * expression came out as `(#price's value * #qty's chanin)`: half English, and
   * unreadable to any language whose tokenizer does not split the English
   * clitic. Quechua is the case that forces it — `'` is a word character there
   * (`t'ikray`, `llamk'aq`), so `#qty's` tokenizes as `#qty'` + `s` and the
   * property is lost (qu when-value-changes).
   *
   * Gated to a SELECTOR owner (`#`/`.`-prefixed): that is the shape
   * `renderPropertyPath` is written for, and it is the one that cannot occur as
   * ordinary prose inside a quoted string. English is a no-op.
   */
  private localizeInteriorPossessives(raw: string, language: string): string {
    // English is the OTHER direction: a foreign possessive re-parses into a raw
    // expression whose join emits the English locative (`value of #price`), so
    // rendering that back to English has to fold it into the clitic form the
    // reference is written in. Gated to a curated DOM-property word, so an
    // ordinary `of` phrase (`the first of .items`) is untouched.
    // A conversion after the phrase binds differently to the two forms:
    // `#a's textContent as Int` converts the text, `textContent of #a as Int`
    // converts `#a` (upstream's reading, and core's). So a phrase before `as`
    // keeps its binding: English leaves the `of` form as it is, and another
    // language parenthesizes a property-first rendering.
    if (language === 'en') {
      return raw.replace(
        /\b(?:the\s+)?([A-Za-z][\w-]*)\s+of\s+([#.][\w-]+)/g,
        (whole, property: string, owner: string, offset: number, text: string) =>
          EN_PROPERTY_WORDS.has(property.toLowerCase()) && !convertedAt(text, offset + whole.length)
            ? `${owner}'s ${property}`
            : whole
      );
    }
    const link = (object: SemanticValue, property: string): string =>
      this.renderPropertyPath(
        { type: 'property-path', object, property, access: 'possessive' } as PropertyPathValue,
        language
      );
    const ofForms = this.localizeOfPossessives(raw, link);
    if (!ofForms.includes("'s")) return ofForms;
    return ofForms.replace(
      /([#.][\w-]+)((?:'s\s+[A-Za-z][\w-]*)+)/g,
      (whole, owner: string, chain: string, offset: number, text: string) => {
        const [first, ...rest] = [...chain.matchAll(/'s\s+([A-Za-z][\w-]*)/g)].map(m => m[1]!);
        let rendered = link(createSelector(owner), first!);
        if (!rendered) return whole;
        const propertyFirst = !rendered.startsWith(owner);
        // A chain nests in the `of` form, each link the next one's owner:
        // `#a's textContent's length` is es `length de textContent de #a`, read
        // right to left as upstream reads `length of textContent of #a`. Only
        // the first link used to move, and `textContent de #a's length` read
        // as the textContent of `#a's length`. An owner-first rendering (ja
        // `#aのtextContent`) keeps its tail, which its parser reads.
        if (propertyFirst) {
          for (const property of rest) rendered = link(createSelector(rendered), property);
        } else {
          rendered += rest.map(property => `'s ${property}`).join('');
        }
        return convertedAt(text, offset + whole.length) && propertyFirst
          ? `(${rendered})`
          : rendered;
      }
    );
  }

  /**
   * `the X of Y` inside an expression, in the language's own construction (M2,
   * vocabulary sheet A3): es `( valor de #price ) + 1`, ja `( #priceの値 ) + 1`,
   * as a top-level property path already was. It was English in every
   * translation (`( the valor of #price ) + 1`). A chain nests, each link the
   * next one's owner: `innerHTML of parentElement of .divs` is `.divs's
   * parentElement's innerHTML`, so it renders as the possessive pass renders
   * that. `the` goes, as the engine reads the phrase the same without it.
   *
   * Only a selector owner, which every reader takes after its of-word; and
   * only a property, a style or an attribute, never a positional word (`the
   * first of .items`). Before `as` the phrase converts its owner (`the value of
   * #price as Number` is `value of (#price as Number)`), which a property-first
   * rendering keeps and an owner-first one (`#priceの値 として Number`) would
   * not, so there an owner-first language keeps the English; so it does for a
   * one-link phrase that is the whole value (`set @role of #x`), which it would
   * read back as a property path where English reads an expression. The verified
   * render re-reads a translation that wrote one, and writes the English where
   * it does not read back (renderPlainWords).
   */
  private localizeOfPossessives(
    raw: string,
    link: (object: SemanticValue, property: string) => string
  ): string {
    if (this.plainWords.has('value') || !/\bof\b/.test(raw)) return raw;
    return outsideQuotes(raw, text =>
      text.replace(
        OF_PHRASE,
        (whole, lead: string, chain: string, owner: string, offset: number) => {
          const properties = ofPhraseProperties(chain);
          if (!properties) return whole;
          const [innermost, ...outer] = properties.reverse();
          let rendered = link(createSelector(owner), innermost!);
          if (!rendered) return whole;
          const propertyFirst = !rendered.startsWith(owner);
          if (!propertyFirst && convertedAt(text, offset + whole.length)) return whole;
          // One link that is the whole value, written possessive-first (ja
          // `#xの@role`), reads back as a property path, where English read an
          // expression: a role of another type. (A chain reads back an
          // expression, `#d1's parentNode's innerHTML`.)
          const wholeValue = offset === 0 && whole.length === text.trimEnd().length;
          if (!propertyFirst && outer.length === 0 && wholeValue) return whole;
          if (propertyFirst) {
            for (const property of outer) rendered = link(createSelector(rendered), property);
          } else {
            rendered += outer.map(property => `'s ${property}`).join('');
          }
          this.nativeWritten.add('value');
          return `${lead}${rendered}`;
        }
      )
    );
  }

  /**
   * Render a property-path value (possessive expression) in the target language.
   *
   * Examples by language:
   * - English: "my value", "its opacity", "#el's value"
   * - Japanese: "自分の value", "それの opacity"
   * - Korean: "내 value", "그것의 opacity"
   * - Spanish: "mi value", "su opacity"
   * - Chinese: "我的 value", "它的 opacity"
   */
  private renderPropertyPath(value: PropertyPathValue, language: string): string {
    const profile = tryGetProfile(language);

    // A DOT access is a JS/DOM member expression, and its surface is
    // language-invariant: `#input.value` is written that way in every language,
    // which is exactly why every tokenizer can read it back. Applying the
    // target language's POSSESSIVE construction to it instead — `#input de
    // valor`, `#input wert`, `#input قيمة` — produces a surface no target
    // parser binds as a property path, so the role was lost (and in de/ar the
    // whole `set` died with it).
    //
    // The object still localizes, because it is a reference the language does
    // translate (`its.name` -> es `su.name`); the property never does, because
    // it names a real DOM member. A property already beginning with `.` or `?.`
    // carries its own connector (`my?.dataset?.customValue`), so it is glued
    // rather than given a second dot.
    if (value.access === 'dot') {
      const object = this.renderDotBase(value.object, language, profile);
      const property = value.property;
      return /^[.?]/.test(property) ? `${object}${property}` : `${object}.${property}`;
    }

    // A BARE property word is vocabulary and localizes where the reader brings
    // it back (`my value` -> `mi valor`, `私の 値`; `my children` stays); a
    // DOTTED path is a JS/DOM member expression and must not (`#output.innerText`,
    // `my value.length` stay verbatim in every language). The localizer's word
    // rule already refuses dot-attached tokens.
    const property = this.localizeProperty(value.property, language);

    // Get the object reference
    const objectRef = value.object.type === 'reference' ? value.object.value : null;

    // Check for special possessive forms (e.g., me → my, it → its)
    if (profile?.possessive && objectRef) {
      const specialForm =
        profile.possessive.specialForms?.[objectRef] ??
        possessiveAdjectiveFor(profile.possessive.keywords, objectRef);
      if (specialForm) {
        // The possessive ADJECTIVE precedes the property in every language that
        // has one — es `mi valor`, de `mein wert`, ko `내 값`, sw `yangu thamani`.
        //
        // This used to branch on `markerPosition === 'after-object'` and emit it
        // AFTER for ar/id/pl/ru/sw/uk (`قيمة لي`, `nilai saya`, `thamani yangu`),
        // an order that does not parse back. Measured in all four sampled
        // languages: `weka thamani yangu kwa #out` returns NULL in sw/ar/id and
        // mis-types the patient as `expression` in pl, while
        // `weka yangu thamani kwa #out` parses as a property-path.
        //
        // The mistake was reading one field for two questions. `markerPosition`
        // says where a MARKER sits relative to the OWNER; it says nothing about
        // where an ADJECTIVE sits relative to the PROPERTY. Marker-based owners
        // still consult it, in the switch further down.
        return `${specialForm} ${property}`;
      }
    }

    // Get the rendered object string
    const objectStr = this.valueToNaturalString(value.object, language);

    // An EXPRESSION owner is a positional query (`the textContent of the previous
    // <output/>`; see the of-possessive matcher). It is a phrase, not a word, so
    // it takes each language's phrasal "of" construction, never an owner-glued
    // clitic or English `'s`:
    //  - en: `the X of <owner>`. `previous <output/>'s textContent` is rejected
    //    by the engine (measured on hyperscript.org 0.9.93).
    //  - owner-first clitic languages (ja/ko/zh/bn/hi, and vi): `<owner> の X`,
    //    SPACED — the owner ends in a query literal the particle cannot glue to,
    //    and the positional-possessive matcher reads the spaced form.
    //  - th and the of-marker languages: property-first `X <of> <owner>`, which
    //    the of-possessive matcher reads with a positional owner.
    if (value.object.type === 'expression') {
      if (language === 'en' || !profile?.possessive) return `the ${property} of ${objectStr}`;
      const { marker, markerPosition } = profile.possessive;
      if (marker && markerPosition === 'between' && language !== 'th') {
        return `${objectStr} ${marker} ${property}`;
      }
      const ofMarker = language === 'th' ? marker : getOfPossessiveMarker(profile);
      if (ofMarker) return `${property} ${ofMarker} ${objectStr}`;
      return `the ${property} of ${objectStr}`;
    }

    // Use language-specific possessive construction
    if (profile?.possessive) {
      const { marker, markerPosition, usePossessiveAdjectives } = profile.possessive;

      // Languages that use possessive adjectives without explicit object reference
      // Same rule as the special-form branch above: the adjective precedes the
      // property. `saya nilai`, not `nilai saya`.
      if (usePossessiveAdjectives && objectRef) {
        return `${objectStr} ${property}`;
      }

      // Particle/marker-based languages, OBJECT-first. Only `between` belongs
      // here: ja `#pickerの 値`, zh `#picker的 值`, ko/bn/hi/th alike, which is
      // what both the corpus and the of-possessive matcher expect.
      //
      // Gluing the marker onto the owner is only safe where the tokenizer can
      // take it back off. ko/bn/hi/ja/zh split a trailing particle from the
      // preceding word, so `#pickerর মান` tokenizes as `#picker` + `র` + `মান`.
      // tl and vi declare NO `tokenization` block at all — no particle
      // extraction of any kind — so the glued marker fused INTO the selector
      // token: tl `#pickerng` came back as one selector, and vi split the
      // marker itself, `#pickerc` + `ủa`. The possessive was unrecoverable, and
      // neither surface is even well-formed in those languages, where the
      // marker is a free word rather than a clitic. Space it there.
      if (marker && markerPosition === 'between') {
        // th's between-marker is a genitive "of" linker whose direction is
        // the REVERSE of the ja/zh/ko/bn/hi clitic: `X ของ Y` means "X of Y"
        // (Y owns X), so the property comes FIRST. Rendering it object-first
        // emitted `#themeของ*background-color` — which the of-possessive
        // matcher (correctly) read back INVERTED, object and property swapped
        // (set-color-variable th, bind-explicit-property th). vi's `của` has
        // the same direction, but its parser cannot yet read the
        // property-first surface (`giá trị của #picker` returns no parse), so
        // vi keeps the old order until that is fixed — flipping only the
        // render would trade a wrong-order surface that parses for a
        // right-order one that does not.
        if (language === 'th') {
          return `${property} ${marker} ${objectStr}`;
        }
        const tokenizerSplitsParticles = profile.tokenization !== undefined;
        if (profile.usesSpaces && !tokenizerSplitsParticles) {
          return `${objectStr} ${marker} ${property}`;
        }
        return profile.usesSpaces
          ? `${objectStr}${marker} ${property}`
          : `${objectStr}${marker}${property}`;
      }

      // Everything else is PROPERTY-first: es `valor de #picker`, de `wert von
      // #picker`, ar `قيمة لـ #picker`, id `nilai dari #picker`. That is what the
      // i18n corpus emits and — the part that actually broke — the only order
      // the parser's of-possessive matcher accepts. Measured: es
      // `valor de #picker` parses back as property-path, `#picker de valor` as a
      // bare selector, and the property is lost.
      //
      // The marker comes from the shared of-marker table rather than
      // `possessive.marker`, which is EMPTY for de/ar/id/pl/ru/sw/uk/ms — those
      // languages skipped the switch below entirely and fell through to the
      // English `'s`, which is why corpus rows read `#picker's wartość`.
      //
      // SELECTOR objects only. A REFERENCE object (`my value`) reaches here when
      // the language has no possessive special form, and rewriting it as
      // `nilai daripada saya` was measured to BREAK ms/others that render it
      // fine today — the of-possessive matcher is gated on a selector following
      // the marker, so a pronoun there is not the construction it recognizes.
      // NOT English: en has its own `#picker's value` construction (the default
      // below), and R4 renders foreign->English — changing en output here would
      // move a gate that has nothing to do with this fix. Measured: without this
      // guard, en emitted `value from #picker`.
      const ofMarker =
        language !== 'en' && value.object.type === 'selector'
          ? getOfPossessiveMarker(profile)
          : undefined;
      if (ofMarker) {
        return `${property} ${ofMarker} ${objectStr}`;
      }

      // A REFERENCE owner keeps the construction it always had. qu
      // `noqa-pa *opacity` is the case that proves this must stay: dropping the
      // after-object marker cost four qu rows their `set.destination`.
      if (marker) {
        switch (markerPosition) {
          case 'after-object':
            // Quechua: "ñuqapa value"
            return `${objectStr}${marker} ${property}`;
          case 'before-property':
            return `${objectStr} ${marker} ${property}`;
        }
      }
    }

    // Default: English-style possessive "'s"
    // Handle special English cases
    if (language === 'en' || !profile?.possessive) {
      if (objectStr === 'me') {
        return `my ${property}`;
      }
      if (objectStr === 'it') {
        return `its ${property}`;
      }
      return `${objectStr}'s ${property}`;
    }

    // Generic fallback
    return `${objectStr} ${property}`;
  }
}

/**
 * The possessive adjective for a reference, derived from the profile's own
 * `possessive.keywords` when it declares no `specialForms`.
 *
 * `keywords` is the PARSE direction — `{ 私の: 'me', その: 'it' }` — and only 3
 * of 23 profiles carry the render-direction `specialForms` alongside it. Without
 * a fallback, bn/hi/ja fell through to the marker construction and emitted
 * `আমি` + `র` = `আমির`, `मैं` + `का` = `मैंका`, `自分の` — none of which their own
 * parser accepts, even respaced. Their `keywords` already hold the right words
 * (`আমার`, `मेरा`, `私の`), which are exactly what the i18n corpus emits, so
 * inverting that map is a derivation rather than new data — and it keeps ONE
 * authoring site instead of a parallel table that can drift from it.
 *
 * First declaration wins where several map to the same reference (hi lists
 * मेरा/मेरी/मेरे for `me`); the profiles list the citation form first, which is
 * the form the corpus uses.
 */
function possessiveAdjectiveFor(
  keywords: Record<string, string> | undefined,
  reference: string
): string | undefined {
  if (!keywords) return undefined;
  for (const [native, mapped] of Object.entries(keywords)) {
    if (mapped === reference) return native;
  }
  return undefined;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton renderer instance.
 */
export const semanticRenderer = new SemanticRendererImpl();

/**
 * Render a semantic node in the specified language.
 */
export function render(node: SemanticNode, language: string): string {
  return semanticRenderer.render(node, language);
}

/**
 * Render a semantic node in explicit mode.
 */
export function renderExplicit(node: SemanticNode): string {
  return semanticRenderer.renderExplicit(node);
}
