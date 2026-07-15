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
  ConditionalSemanticNode,
  BehaviorSemanticNode,
  DefSemanticNode,
  SemanticValue,
  SemanticRenderer as ISemanticRenderer,
  LanguagePattern,
  ReferenceValue,
  PropertyPathValue,
} from '../types';

/**
 * Loop/tell block-header commands: their body follows the header directly, with no
 * chain word between the header and its first body command. The explicit loop/tell
 * subset of the schema `hasBody` flag — `hasBody` also covers if/on/async/js/
 * behavior/… which render through their own node kinds/paths and keep their chain
 * word. Shared by renderCompound and joinStatements.
 */
const BLOCK_HEADER_ACTIONS = new Set<ActionType>(['repeat', 'for', 'while', 'tell']);
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguageAndCommand, tryGetProfile } from '../registry';
import { getSupportedLanguages as getTokenizerLanguages } from '../tokenizers';
import { localizeEventName } from '../patterns/event-handler';
import { renderExplicit as renderExplicitBase } from '@lokascript/framework';

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

    return this.renderWithPattern(node, bestPattern);
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
      const sep = afterBlockHeader || betweenBindFeatures ? ' ' : ` ${chainWord} `;
      out += sep + renderedStatements[i];
    }
    return out;
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
   * Join a statement list the way a block body reads: ` then ` between siblings,
   * but a single space immediately after a loop/tell block header (whose body
   * follows directly). Shared by renderConditional's branches; renderCompound
   * keeps its own copy because it also handles the multi-handler and bind-feature
   * cases.
   */
  private joinStatements(statements: readonly SemanticNode[], language: string): string {
    const rendered = statements.map(s => this.render(s, language));
    let out = rendered[0] ?? '';
    for (let i = 1; i < rendered.length; i++) {
      const prev = statements[i - 1];
      const afterBlockHeader = prev.kind === 'command' && BLOCK_HEADER_ACTIONS.has(prev.action);
      out += (afterBlockHeader ? ' ' : ' then ') + rendered[i];
    }
    return out;
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

    // Score patterns by how well they match our roles
    const scored = candidates.map(pattern => {
      let score = pattern.priority;

      // Check each role token in the pattern
      for (const token of pattern.template.tokens) {
        if (token.type === 'role') {
          if (node.roles.has(token.role)) {
            // Bonus for patterns that use roles we have
            score += 10;
          } else if (!token.optional) {
            // Heavy penalty for patterns that require roles we DON'T have
            // This prevents selecting "source" patterns when there's no source
            score -= 50;
          }
        }
      }

      // Positional variants (`put X at end of Y`, `at start of`, `before`/`after`)
      // are handcrafted for PARSING that specific surface form; they carry the
      // position as baked-in literals, not a role, so role scoring can't distinguish
      // them from the canonical `put X into Y`. Several carry a higher parse priority
      // (e.g. `put-bn-at-end` at 110, the SOV `put-{ja,ko,hi,bn,tr,qu}-before/after`
      // at 105/106 — needed so the matcher prefers them over the into-form / the SOV
      // verb-anchoring fallback when the position word IS present) and would
      // otherwise win render selection, emitting the verbose positional form (or a
      // literal `before`/`after`) for every plain put. Penalize them for rendering
      // only — parsing is priority-ordered in the matcher, not here, so positional
      // INPUT still matches its pattern via the literals.
      if (/-at-end|-at-start|-before$|-after$/i.test(pattern.id)) {
        score -= 30;
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

    // Handle event handler body (render separately after pattern)
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

        // For optional groups with destination role, skip if destination is "me" (the default)
        // This avoids rendering "on me" / "en yo" when it's implicit
        if (token.optional) {
          const destToken = token.tokens.find(
            (t: any) => t.type === 'role' && t.role === 'destination'
          );
          if (destToken) {
            const destValue = node.roles.get('destination');
            // Keep an explicit destination when the patient is string content —
            // canonical `add "<p>Line</p>" to me` requires it (`add "<p>Line</p>"`
            // alone is rejected: `add` expects a class/attribute reference). A
            // class/attribute patient defaults to `me` fine, so it stays suppressed.
            const patient = node.roles.get('patient');
            const patientIsStringLiteral =
              patient?.type === 'literal' && patient.dataType === 'string';
            if (
              destValue?.type === 'reference' &&
              destValue.value === 'me' &&
              !patientIsStringLiteral
            ) {
              return null; // Skip rendering default "me" destination
            }
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

        // Don't emit an optional group that has only literals (markers) but no
        // actual role values — e.g. don't emit a dangling "with" when the
        // style role is absent from "hide #output".
        if (token.optional && !hasRoleValue) return null;

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
        if (typeof value.value === 'string' && value.dataType === 'string') {
          return `"${value.value}"`;
        }
        return String(value.value);

      case 'selector':
        return value.value;

      case 'reference':
        return this.renderReference(value, language);

      case 'property-path':
        return this.renderPropertyPath(value, language);

      case 'expression':
        return value.raw;

      case 'flag':
        return value.name;
    }
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
    const property = value.property;

    // Get the object reference
    const objectRef = value.object.type === 'reference' ? value.object.value : null;

    // Check for special possessive forms (e.g., me → my, it → its)
    if (profile?.possessive?.specialForms && objectRef) {
      const specialForm = profile.possessive.specialForms[objectRef];
      if (specialForm) {
        const { markerPosition, usePossessiveAdjectives } = profile.possessive;

        // Handle different word orders based on marker position
        if (usePossessiveAdjectives && markerPosition === 'after-object') {
          // Languages like Arabic, Indonesian: "value لي", "value saya"
          // Possessive pronoun comes after the property
          return `${property} ${specialForm}`;
        }
        // Languages like Spanish, German, French, Korean: "mi value", "mein value", "내 value"
        // Possessive pronoun comes before the property
        return `${specialForm} ${property}`;
      }
    }

    // Get the rendered object string
    const objectStr = this.valueToNaturalString(value.object, language);

    // Use language-specific possessive construction
    if (profile?.possessive) {
      const { marker, markerPosition, usePossessiveAdjectives } = profile.possessive;

      // Languages that use possessive adjectives without explicit object reference
      if (usePossessiveAdjectives && objectRef) {
        // Fall back to generic construction if no special form
        // e.g., Indonesian: "value saya" (property + possessor)
        if (markerPosition === 'after-object') {
          return `${property} ${objectStr}`;
        }
      }

      // Particle/marker-based languages
      if (marker) {
        switch (markerPosition) {
          case 'between':
            // Japanese: "自分の value", Chinese: "我的 value", Korean: "나의 value"
            return profile.usesSpaces
              ? `${objectStr}${marker} ${property}`
              : `${objectStr}${marker}${property}`;

          case 'after-object':
            // Quechua: "ñuqapa value"
            return `${objectStr}${marker} ${property}`;

          case 'before-property':
            // Spanish (with de): "value de yo" (rarely used, usually special forms)
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
