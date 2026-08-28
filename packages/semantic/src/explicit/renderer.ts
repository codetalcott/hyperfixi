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
  CompoundSemanticNode,
  CommandSemanticNode,
  ConditionalSemanticNode,
  BehaviorSemanticNode,
  DefSemanticNode,
  FeatureSemanticNode,
  SemanticValue,
  SemanticRenderer as ISemanticRenderer,
  LanguagePattern,
  PatternToken,
  ReferenceValue,
  PropertyPathValue,
} from '../types';
import { createSelector } from '../types';

/**
 * Loop/tell block-header commands: their body follows the header directly, with no
 * chain word between the header and its first body command. The explicit loop/tell
 * subset of the schema `hasBody` flag — `hasBody` also covers if/on/async/js/
 * behavior/… which render through their own node kinds/paths and keep their chain
 * word. Shared by renderCompound and joinStatements.
 */
const BLOCK_HEADER_ACTIONS = new Set<ActionType>(['repeat', 'for', 'while', 'tell']);

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
import { getSupportedLanguages as getTokenizerLanguages } from '../tokenizers';
import { localizeEventName } from '../patterns/event-handler';
import { getOfPossessiveMarker, PROPERTY_NAME_LEXICON } from '../parser/utils/expression-lexicon';
import { PatternMatcher } from '../parser/pattern-matcher';
import { localizeValueInterior } from './value-lexicon';
import { renderExplicit as renderExplicitBase } from '@lokascript/framework';

/**
 * Score a role slot nested inside an OPTIONAL group. Lower than the top-level
 * bonus on purpose: it must break a tie between two patterns that are otherwise
 * equal (the handcrafted `toggle-{L}-full` versus the generated pattern that
 * also carries `[{duration}]`) without ever outweighing a top-level difference.
 */
const NESTED_ROLE_BONUS = 5;

/**
 * The English DOM-property words a possessive can name, taken from the same
 * table the parser's property matchers consult. Used to keep the English
 * `<prop> of <selector>` → `<selector>'s <prop>` fold off ordinary `of` phrases
 * (`the first of .items`).
 */
const EN_PROPERTY_WORDS: ReadonlySet<string> = new Set(
  Object.values(PROPERTY_NAME_LEXICON).flatMap(map => Object.values(map))
);

// =============================================================================
// Semantic Renderer Implementation
// =============================================================================

export class SemanticRendererImpl implements ISemanticRenderer {
  /**
   * Render a semantic node in the specified language.
   */
  render(node: SemanticNode, language: string): string {
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
    const renderedStatements = node.statements.map(stmt => this.render(stmt, language));
    const chainWord = this.getChainWord(node.chainType, language);
    // A loop/tell HEADER takes its body directly — canonical hyperscript rejects a
    // chain word between the header and its first body command (`repeat 3 times add
    // …`, not `repeat 3 times then add …`; `tell #panel add …`, not `tell #panel
    // then add …`). The parser flattens the block into this compound (no
    // LoopSemanticNode with an attached body reaches the renderer), so suppress the
    // chain word immediately after any block-header command (BLOCK_HEADER_ACTIONS).
    // A `then` BETWEEN body commands stays valid, so every other join keeps the
    // chain word.
    let out = renderedStatements[0] ?? '';
    for (let i = 1; i < renderedStatements.length; i++) {
      const prev = node.statements[i - 1];
      const cur = node.statements[i];
      const afterBlockHeader = prev.kind === 'command' && BLOCK_HEADER_ACTIONS.has(prev.action);
      // Consecutive top-level `bind` features are separate reactive features, not a
      // then-chain — `bind $x to #a then bind $x to #b` is rejected (`Unexpected
      // Token : then` between features). Space-join them (a bind clause is
      // self-delimiting; canonical accepts both space and newline separation).
      const betweenBindFeatures =
        prev.kind === 'command' &&
        prev.action === 'bind' &&
        cur.kind === 'command' &&
        cur.action === 'bind';
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
    if (node.elseBranch && node.elseBranch.length > 0) {
      parts.push(this.keyword(language, 'else'), this.joinStatements(node.elseBranch, language));
    }
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
      const afterBlockHeader = prev.kind === 'command' && BLOCK_HEADER_ACTIONS.has(prev.action);
      out += (afterBlockHeader ? ' ' : ` ${thenKw} `) + rendered[i];
    }
    return this.closeBlockHeaders(out, statements, language);
  }

  /**
   * Close every block header in a flattened statement list with an explicit `end`.
   *
   * A loop/tell block reaches the renderer FLATTENED — the parser emits
   * `[repeat-header, stmt, stmt, …]` with no body attachment (`LoopSemanticNode`
   * exists in the type model and nothing constructs one), so the header's extent
   * is, as far as the model is concerned, "everything after it". Rendering that
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
   * is the only rendering faithful to what the parser actually captured. Restoring
   * the true extent needs the parser to build a real loop node with a body — the
   * separate arc noted in docs-internal/PARSER_NEXT_STEPS.md.
   */
  private closeBlockHeaders(
    rendered: string,
    statements: readonly SemanticNode[],
    language: string
  ): string {
    const headers = statements.filter(
      s => s.kind === 'command' && BLOCK_HEADER_ACTIONS.has((s as CommandSemanticNode).action)
    ).length;
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
   * `<behavior> Name(params)` + each handler (closed by `end`) + optional `init`
   * block + closing `end`. Handlers/commands render through the normal paths.
   */
  private renderBehavior(node: BehaviorSemanticNode, language: string): string {
    const endKw = this.keyword(language, 'end');
    const lines = [
      this.renderBlockHeader(this.keyword(language, 'behavior'), node.name, node.parameters),
    ];
    for (const handler of node.eventHandlers) {
      lines.push(`  ${this.render(handler, language)}`, `  ${endKw}`);
    }
    if (node.initBlock && node.initBlock.length > 0) {
      lines.push(`  ${this.keyword(language, 'init')}`);
      for (const cmd of node.initBlock) lines.push(`    ${this.render(cmd, language)}`);
      lines.push(`  ${endKw}`);
    }
    lines.push(endKw);
    return lines.join('\n');
  }

  /**
   * Render a function definition to target-language source:
   * `<def> name(params)` + body commands + closing `end`.
   */
  private renderDef(node: DefSemanticNode, language: string): string {
    const lines = [
      this.renderBlockHeader(this.keyword(language, 'def'), node.name, node.parameters),
    ];
    for (const cmd of node.body) lines.push(`  ${this.render(cmd, language)}`);
    lines.push(this.keyword(language, 'end'));
    return lines.join('\n');
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
    return node.name ? `${keyword} ${node.name}` : keyword;
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
        const pinned = rule?.default;
        if (!pinned || pinned.type !== 'literal') continue;
        const key = String(pinned.value).trim().toLowerCase();
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
      const hasRealRole = (role: string): boolean => {
        const val = node.roles.get(role as SemanticRole) as
          { implicit?: unknown; type?: string } | undefined;
        return val !== undefined && !(val.implicit === true && val.type === 'reference');
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
        const pinned = rule?.default;
        if (!pinned || pinned.type !== 'literal') continue;
        const pinnedKey = String(pinned.value).trim().toLowerCase();
        const actual = node.roles.get(role as SemanticRole);
        const actualKey =
          actual?.type === 'literal' ? String(actual.value).trim().toLowerCase() : undefined;

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
        // Penalize English "when", "if", "upon" variants (good for parsing, not output)
        if (
          pattern.id.includes('-when') ||
          pattern.id.includes('-if') ||
          pattern.id.includes('-upon')
        ) {
          score -= 15;
        }
      }

      return { pattern, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].pattern : null;
  }

  /**
   * Render a semantic node using a specific pattern.
   */
  private renderWithPattern(node: SemanticNode, pattern: LanguagePattern): string {
    const parts: string[] = [];
    const language = pattern.language;

    for (const token of pattern.template.tokens) {
      const rendered = this.renderPatternToken(token, node, language);
      if (rendered !== null) {
        parts.push(rendered);
      }
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

        // Skip an optional group whose destination/source role is the implicit
        // `me` default (the parser injects it when unspecified). This avoids the
        // redundant `on me` / `to me` / `from me` / `of me` — `add .active`, not
        // `add .active to me`; `remove me`, not `remove me from me`; `measure my x`,
        // not `measure my x of me`. The `on` event-source renders via its own path,
        // so it is untouched here.
        if (token.optional) {
          for (const roleName of ['destination', 'source'] as const) {
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
            return null; // Skip rendering the implicit "me" destination/source
          }
        }

        // For optional groups with a `quantity` role, skip when it equals the
        // schema default (1). The parser injects `quantity: 1` for
        // increment/decrement even when unspecified, so rendering it produces a
        // redundant "by 1" — harmless in most languages but a real bug in vi,
        // where the quantity marker `thêm` is also the `add` keyword, so
        // `tăng :count thêm 1` re-parses as increment + a phantom `add`. Omitting
        // the default-1 quantity is recall-neutral (the action set is unchanged)
        // and renders increment/decrement naturally everywhere.
        if (token.optional) {
          const qtyToken = token.tokens.find(
            (t: any) => t.type === 'role' && t.role === 'quantity'
          );
          if (qtyToken) {
            const qtyValue = node.roles.get('quantity');
            if (qtyValue?.type === 'literal' && Number(qtyValue.value) === 1) {
              return null; // Skip rendering default quantity of 1
            }
          }
        }

        const groupParts: string[] = [];
        let hasRoleValue = false;
        for (const subToken of token.tokens) {
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
          return `"${value.value}"`;
        }
        return this.localizeValue(String(value.value), language);

      case 'selector':
        return value.value;

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
        return this.localizeValue(this.localizeInteriorPossessives(value.raw, language), language);

      case 'flag':
        return this.localizeValue(value.name, language);
    }
  }

  /**
   * Localize the vocabulary inside a value, when the target profile carries a
   * lexicon. English is a no-op, and a profile without a lexicon degrades to
   * the previous behaviour (English interior) rather than failing.
   */
  private localizeValue(raw: string, language: string): string {
    if (language === 'en') return raw;
    return localizeValueInterior(raw, language, tryGetProfile(language));
  }

  /**
   * Render a reference value in the target language.
   */
  private renderReference(value: ReferenceValue, language: string): string {
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
    if (language === 'en') {
      return raw.replace(
        /\b(?:the\s+)?([A-Za-z][\w-]*)\s+of\s+([#.][\w-]+)/g,
        (whole, property: string, owner: string) =>
          EN_PROPERTY_WORDS.has(property.toLowerCase()) ? `${owner}'s ${property}` : whole
      );
    }
    if (!raw.includes("'s")) return raw;
    return raw.replace(
      /([#.][\w-]+)'s\s+([A-Za-z][\w-]*)/g,
      (whole, owner: string, property: string) =>
        this.renderPropertyPath(
          {
            type: 'property-path',
            object: createSelector(owner),
            property,
            access: 'possessive',
          } as PropertyPathValue,
          language
        ) || whole
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

    // A BARE property word is vocabulary and localizes (`my value` -> `mi valor`,
    // `私の 値`); a DOTTED path is a JS/DOM member expression and must not
    // (`#output.innerText`, `my value.length` stay verbatim in every language).
    // The localizer's word rule already refuses dot-attached tokens, so this is
    // one call rather than a special case — and it matches what the corpus has
    // rendered all along.
    const property = this.localizeValue(value.property, language);

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
