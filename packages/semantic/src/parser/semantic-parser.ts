/**
 * Semantic Parser
 *
 * The main parser that converts natural language hyperscript to semantic nodes.
 * Combines tokenization and pattern matching.
 */

import type {
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  SemanticParser as ISemanticParser,
  SemanticValue,
  ActionType,
  LanguagePattern,
  LanguageToken,
} from '../types';
import {
  createCommandNode,
  createEventHandler,
  createCompoundNode,
  createSelector,
  createLiteral,
  createReference,
} from '../types';
import {
  tokenize as tokenizeInternal,
  getSupportedLanguages as getTokenizerLanguages,
  TokenStreamImpl,
} from '../tokenizers';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { patternMatcher } from './pattern-matcher';
import { eventNameTranslations } from '../patterns/event-handler/shared';
import { render as renderExplicitFn } from '../explicit/renderer';
import { parseExplicit as parseExplicitFn } from '../explicit/parser';

// =============================================================================
// Semantic Parser Implementation
// =============================================================================

export class SemanticParserImpl implements ISemanticParser {
  /**
   * Parse input in the specified language to a semantic node.
   */
  parse(input: string, language: string): SemanticNode {
    // Tokenize the input
    const tokens = tokenizeInternal(input, language);

    // Get patterns for this language
    const patterns = getPatternsForLanguage(language);

    if (patterns.length === 0) {
      throw new Error(`No patterns available for language: ${language}`);
    }

    // Sort patterns by priority (descending)
    const sortedPatterns = [...patterns].sort((a, b) => b.priority - a.priority);

    // Try to match event handler patterns first (they wrap commands)
    const eventPatterns = sortedPatterns.filter(p => p.command === 'on');
    const eventMatch = patternMatcher.matchBest(tokens, eventPatterns);

    if (eventMatch) {
      return this.buildEventHandler(eventMatch, tokens, language);
    }

    // Try command patterns
    const commandPatterns = sortedPatterns.filter(p => p.command !== 'on');
    const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);

    if (commandMatch) {
      return this.buildCommand(commandMatch, language);
    }

    // Try SOV event trigger extraction: detect embedded event keywords
    // (e.g., "クリック で" in JA, "클릭 에" in KO, "tıklama de" in TR)
    // and extract them to parse the remaining tokens as command body
    const sovResult = this.trySOVEventExtraction(input, language, sortedPatterns);
    if (sovResult) {
      return sovResult;
    }

    // Fallback: try parsing as multi-command compound (no event wrapper).
    // This handles patterns like "put X into Y then set Z to W" that have
    // then-keywords but no event trigger (e.g., custom events not in KNOWN_EVENTS).
    const compoundResult = this.tryCompoundCommandParsing(tokens, commandPatterns, language);
    if (compoundResult) {
      return compoundResult;
    }

    throw new Error(`Could not parse input in ${language}: ${input}`);
  }

  /**
   * Check if input can be parsed in the specified language.
   */
  canParse(input: string, language: string): boolean {
    try {
      this.parse(input, language);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported languages.
   */
  supportedLanguages(): string[] {
    return getTokenizerLanguages();
  }

  /**
   * Build a command semantic node from a pattern match.
   */
  private buildCommand(
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

    return createCommandNode(match.pattern.command, roles, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    });
  }

  /**
   * Build an event handler semantic node from a pattern match.
   */
  private buildEventHandler(
    match: ReturnType<typeof patternMatcher.matchPattern>,
    tokens: ReturnType<typeof tokenizeInternal>,
    language: string
  ): EventHandlerSemanticNode {
    if (!match) {
      throw new Error('No match to build event handler from');
    }

    // Extract the event name
    const eventValue = match.captured.get('event');
    if (!eventValue) {
      throw new Error('Event handler pattern matched but no event captured');
    }

    // Extract event modifiers (.once, .debounce(), .throttle(), etc.)
    const eventModifiers = patternMatcher.extractEventModifiers(tokens);

    let body: SemanticNode[];

    // Check if pattern captured an action (grammar-transformed patterns)
    // These patterns combine event + action in a single match
    const actionValue = match.captured.get('action');
    if (actionValue && actionValue.type === 'literal') {
      // Create a command node directly from captured roles
      const actionName = actionValue.value as string;
      const roles: Record<string, SemanticValue> = {};

      // Copy relevant roles (excluding event, action, and continues which are structural)
      for (const [role, value] of match.captured) {
        if (role !== 'event' && role !== 'action' && role !== 'continues') {
          roles[role] = value;
        }
      }

      const commandNode = createCommandNode(actionName as ActionType, roles, {
        sourceLanguage: language,
        patternId: match.pattern.id,
        confidence: match.confidence,
      });

      // Check if pattern has continuation marker (then-chains)
      const continuesValue = match.captured.get('continues');
      if (continuesValue && continuesValue.type === 'literal' && continuesValue.value === 'then') {
        // Parse remaining tokens as additional commands
        const commandPatterns = getPatternsForLanguage(language)
          .filter(p => p.command !== 'on')
          .sort((a, b) => b.priority - a.priority);

        // Include grammar-transformed continuation patterns (these have specific command types)
        // Continuation patterns have command !== 'on' and id includes 'continuation'
        const grammarContinuationPatterns = getPatternsForLanguage(language)
          .filter(p => p.id.startsWith('grammar-') && p.id.includes('-continuation'))
          .sort((a, b) => b.priority - a.priority);

        const remainingCommands = this.parseBodyWithGrammarPatterns(
          tokens,
          commandPatterns,
          grammarContinuationPatterns,
          language
        );

        if (remainingCommands.length > 0) {
          // Combine first command with remaining commands
          body = [commandNode, ...remainingCommands];
        } else {
          body = [commandNode];
        }
      } else {
        body = [commandNode];
      }
    } else {
      // Traditional parsing: parse remaining tokens as body commands
      const commandPatterns = getPatternsForLanguage(language)
        .filter(p => p.command !== 'on')
        .sort((a, b) => b.priority - a.priority);

      // Use parseBodyWithClauses() to properly handle multi-clause then-chains
      body = this.parseBodyWithClauses(tokens, commandPatterns, language);
    }

    return createEventHandler(eventValue, body, eventModifiers, {
      sourceLanguage: language,
      patternId: match.pattern.id,
      confidence: match.confidence,
    });
  }

  /**
   * Parse body with proper clause separation.
   * Splits the token stream at conjunction boundaries (then/それから/ثم/etc.)
   * and parses each clause independently.
   *
   * This handles multi-clause patterns like:
   * - "toggle .active then remove .hidden"
   * - ".active を 切り替え それから .hidden を 削除"
   * - "بدل .active ثم احذف .hidden"
   *
   * @param tokens Token stream to parse
   * @param commandPatterns Command patterns for the language
   * @param language Language code
   * @returns Array of semantic nodes (one per clause)
   */
  private parseBodyWithClauses(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    const clauses: SemanticNode[] = [];
    const currentClauseTokens: LanguageToken[] = [];

    while (!tokens.isAtEnd()) {
      const current = tokens.peek();
      if (!current) break;

      // Check if this is a conjunction token (clause boundary)
      const isConjunction =
        current.kind === 'conjunction' ||
        (current.kind === 'keyword' && this.isThenKeyword(current.value, language));

      // Check if this is an 'end' keyword (terminates block)
      const isEnd = current.kind === 'keyword' && this.isEndKeyword(current.value, language);

      if (isConjunction) {
        // We've reached a clause boundary - parse accumulated tokens
        if (currentClauseTokens.length > 0) {
          const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
          clauses.push(...clauseNodes);
          currentClauseTokens.length = 0; // Clear for next clause
        }
        tokens.advance(); // Consume conjunction token
        continue;
      }

      if (isEnd) {
        // End of block - parse final clause if any
        if (currentClauseTokens.length > 0) {
          const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
          clauses.push(...clauseNodes);
        }
        tokens.advance(); // Consume 'end' token
        break;
      }

      // Accumulate token for current clause
      currentClauseTokens.push(current);
      tokens.advance();
    }

    // Parse any remaining tokens as final clause
    if (currentClauseTokens.length > 0) {
      const clauseNodes = this.parseClause(currentClauseTokens, commandPatterns, language);
      clauses.push(...clauseNodes);
    }

    // If we have multiple clauses, wrap in CompoundSemanticNode
    if (clauses.length > 1) {
      return [createCompoundNode(clauses, 'then', { sourceLanguage: language })];
    }

    return clauses;
  }

  /**
   * Parse a single clause (sequence of tokens between conjunctions).
   * Returns array of semantic nodes parsed from the clause.
   */
  private parseClause(
    clauseTokens: LanguageToken[],
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    if (clauseTokens.length === 0) {
      return [];
    }

    // Create a TokenStream from the clause tokens
    const clauseStream = new TokenStreamImpl(clauseTokens, language);
    const commands: SemanticNode[] = [];

    while (!clauseStream.isAtEnd()) {
      // Try to match as a command
      const commandMatch = patternMatcher.matchBest(clauseStream, commandPatterns);
      if (commandMatch) {
        commands.push(this.buildCommand(commandMatch, language));
      } else {
        // Skip unrecognized token
        clauseStream.advance();
      }
    }

    // If pattern matching produced nothing, try verb-anchored SOV parsing.
    // The grammar transformer often puts the verb BETWEEN roles for two-role commands:
    //   e.g., "destination を verb patient に" instead of "destination を patient に verb"
    // Pattern matching fails because it expects strict SOV order (verb at end).
    if (commands.length === 0) {
      const sovCommands = this.parseSOVClauseByVerbAnchoring(clauseTokens, language);
      if (sovCommands.length > 0) {
        return sovCommands;
      }
    }

    return commands;
  }

  // ==========================================================================
  // SOV Verb-Anchored Clause Parsing
  // ==========================================================================

  /**
   * Build a lookup from native verb keywords to action names for a language profile.
   */
  private static buildVerbLookup(profile: {
    keywords: Record<string, { primary: string; alternatives?: string[]; normalized?: string }>;
  }): Map<string, string> {
    const lookup = new Map<string, string>();
    for (const [action, kw] of Object.entries(profile.keywords)) {
      // Skip non-command keywords (on, if, else, etc.)
      if (
        ['on', 'if', 'else', 'when', 'where', 'while', 'for', 'end', 'then', 'and'].includes(action)
      ) {
        continue;
      }
      lookup.set(kw.primary.toLowerCase(), action);
      if (kw.alternatives) {
        for (const alt of kw.alternatives) {
          lookup.set(alt.toLowerCase(), action);
        }
      }
    }
    return lookup;
  }

  /**
   * Build a lookup from role marker strings to role names.
   */
  private static buildMarkerToRoleLookup(profile: {
    roleMarkers: Record<string, { primary: string; alternatives?: string[] }>;
  }): Map<string, string> {
    const lookup = new Map<string, string>();
    for (const [role, marker] of Object.entries(profile.roleMarkers)) {
      if (!marker) continue;
      lookup.set(marker.primary, role);
      if (marker.alternatives) {
        for (const alt of marker.alternatives) {
          // Avoid overwriting more specific roles with generic ones
          if (!lookup.has(alt)) {
            lookup.set(alt, role);
          }
        }
      }
    }
    return lookup;
  }

  /**
   * Parse an SOV clause by finding command verbs and extracting roles from surrounding tokens.
   *
   * The grammar transformer often produces "verb-in-middle" order for two-role commands:
   *   "[role1] [marker1] [verb] [role2] [marker2]"
   *
   * This method:
   * 1. Scans for recognized command verbs in the token stream
   * 2. For each verb, extracts pre-verb and post-verb tokens as roles
   * 3. Uses marker tokens to determine which semantic role each value belongs to
   */
  private parseSOVClauseByVerbAnchoring(
    clauseTokens: LanguageToken[],
    language: string
  ): SemanticNode[] {
    const profile = tryGetProfile(language);
    if (!profile || profile.wordOrder !== 'SOV') return [];

    const verbLookup = SemanticParserImpl.buildVerbLookup(profile);
    const markerToRole = SemanticParserImpl.buildMarkerToRoleLookup(profile);
    const commands: SemanticNode[] = [];

    let pos = 0;

    while (pos < clauseTokens.length) {
      // Find the next verb token
      let verbIdx = -1;
      let verbAction = '';

      for (let i = pos; i < clauseTokens.length; i++) {
        const token = clauseTokens[i];
        const byValue = verbLookup.get(token.value.toLowerCase());
        const byNormalized = token.normalized
          ? verbLookup.get(token.normalized.toLowerCase())
          : undefined;
        const action = byValue || byNormalized;

        if (action) {
          verbIdx = i;
          verbAction = action;
          break;
        }
      }

      if (verbIdx === -1) break; // No more verbs found

      // Tokens before verb = pre-verb arguments
      const preVerbTokens = clauseTokens.slice(pos, verbIdx);

      // Find end of this command: next verb, then-keyword, or end of tokens
      let endIdx = clauseTokens.length;
      for (let i = verbIdx + 1; i < clauseTokens.length; i++) {
        const t = clauseTokens[i];
        // Stop at then-keywords
        if (t.kind === 'conjunction' || this.isThenKeyword(t.value, language)) {
          endIdx = i;
          break;
        }
        // Stop at the next verb (start of new command) — but only if preceded by a marker
        // This prevents stopping at "value" tokens that happen to match a verb name
        if (i > verbIdx + 1) {
          const nextAction =
            verbLookup.get(t.value.toLowerCase()) ||
            (t.normalized ? verbLookup.get(t.normalized.toLowerCase()) : undefined);
          if (nextAction) {
            endIdx = i;
            break;
          }
        }
      }

      // Tokens after verb = post-verb arguments
      const postVerbTokens = clauseTokens.slice(verbIdx + 1, endIdx);

      // Extract roles from pre-verb and post-verb tokens using markers
      const roles = this.extractRolesFromMarkedTokens(
        preVerbTokens,
        postVerbTokens,
        markerToRole,
        verbAction,
        language
      );

      commands.push(
        createCommandNode(verbAction as ActionType, roles, {
          sourceLanguage: language,
          confidence: 0.7,
        })
      );

      pos = endIdx;
      // Skip conjunction/then-keyword if present
      if (pos < clauseTokens.length) {
        const t = clauseTokens[pos];
        if (t.kind === 'conjunction' || this.isThenKeyword(t.value, language)) {
          pos++;
        }
      }
    }

    return commands;
  }

  /**
   * Extract semantic roles from pre-verb and post-verb token groups using marker analysis.
   *
   * Recognizes patterns like:
   *   pre-verb:  [expr] [を]   → patient (obj marker)
   *   post-verb: [expr] [に]   → destination (to marker)
   *   pre-verb:  [expr] [から] → source (from marker)
   */
  private extractRolesFromMarkedTokens(
    preVerbTokens: LanguageToken[],
    postVerbTokens: LanguageToken[],
    markerToRole: Map<string, string>,
    action: string,
    language: string
  ): Record<string, SemanticValue> {
    const roles: Record<string, SemanticValue> = {};

    // Process a group of tokens: collect value tokens until a marker is found
    const processGroup = (tokens: LanguageToken[]) => {
      let valueTokens: LanguageToken[] = [];

      for (const token of tokens) {
        const role = markerToRole.get(token.value);
        if (role && token.kind === 'particle' && valueTokens.length > 0) {
          // This is a marker — assign the preceding value tokens to this role
          const value = this.tokensToSemanticValue(valueTokens);
          if (value) {
            // Map the role name, avoiding overwrites of existing roles
            const roleKey = this.mapRoleForCommand(role, action, roles);
            if (roleKey) {
              roles[roleKey] = value;
            }
          }
          valueTokens = [];
        } else {
          valueTokens.push(token);
        }
      }

      // Remaining tokens without a following marker
      if (valueTokens.length > 0) {
        const value = this.tokensToSemanticValue(valueTokens);
        if (value) {
          // Unmarked trailing tokens: assign based on what's missing
          if (!roles.patient) {
            roles.patient = value;
          } else if (!roles.destination) {
            roles.destination = value;
          }
        }
      }
    };

    processGroup(preVerbTokens);
    processGroup(postVerbTokens);

    return roles;
  }

  /**
   * Map a marker-derived role name to the appropriate semantic role for a command,
   * handling cases where marker roles overlap (e.g., both patient and destination
   * use similar particles in some languages).
   */
  private mapRoleForCommand(
    markerRole: string,
    action: string,
    existingRoles: Record<string, SemanticValue>
  ): string | null {
    // Direct mapping — if the role isn't taken yet, use it
    if (!existingRoles[markerRole]) {
      return markerRole;
    }

    // If the marker role is already taken, try to assign to a related role
    // For "set" and "put": patient marker (を/i) is the destination, dest marker (に/e) is the patient value
    if (markerRole === 'patient' && !existingRoles.destination) {
      return 'destination';
    }
    if (markerRole === 'destination' && !existingRoles.patient) {
      return 'patient';
    }
    if (markerRole === 'source' && !existingRoles.source) {
      return 'source';
    }

    return null; // Can't assign
  }

  /**
   * Convert a sequence of tokens into a single SemanticValue.
   */
  private tokensToSemanticValue(tokens: LanguageToken[]): SemanticValue | null {
    if (tokens.length === 0) return null;

    // Filter out noise tokens (whitespace, etc.)
    const meaningful = tokens.filter(t => t.kind !== 'whitespace');
    if (meaningful.length === 0) return null;

    // Single token — use its type directly
    if (meaningful.length === 1) {
      return this.tokenToSemanticValue(meaningful[0]);
    }

    // Multiple tokens — concatenate values and infer type from the first token
    const combined = meaningful.map(t => t.value).join('');
    const first = meaningful[0];

    if (
      first.kind === 'selector' ||
      first.value.startsWith('#') ||
      first.value.startsWith('.') ||
      first.value.startsWith('@') ||
      first.value.startsWith('*')
    ) {
      return createSelector(combined);
    }
    if (first.kind === 'literal' || first.value.startsWith('"') || first.value.startsWith("'")) {
      return createLiteral(combined);
    }
    if (first.kind === 'reference') {
      return createReference(combined as 'me' | 'it' | 'you' | 'result');
    }

    return createLiteral(combined);
  }

  /**
   * Convert a single token to a SemanticValue.
   */
  private tokenToSemanticValue(token: LanguageToken): SemanticValue {
    const val = token.value;

    // Selectors: #id, .class, @attr, *cssProperty
    if (
      token.kind === 'selector' ||
      val.startsWith('#') ||
      val.startsWith('.') ||
      val.startsWith('@') ||
      val.startsWith('*')
    ) {
      return createSelector(val);
    }

    // String literals
    if (val.startsWith('"') || val.startsWith("'")) {
      return createLiteral(val);
    }

    // Numbers
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return createLiteral(parseFloat(val));
    }

    // Booleans (including translated forms)
    if (val === 'true' || val === '真' || val === '참' || val === 'doğru') {
      return createLiteral(true);
    }
    if (val === 'false' || val === '偽' || val === '거짓' || val === 'yanlış') {
      return createLiteral(false);
    }

    // References: me, it, you (check normalized form)
    const ref = token.normalized?.toLowerCase();
    if (ref === 'me' || ref === 'it' || ref === 'you' || ref === 'result' || ref === 'body') {
      return createReference(ref as 'me' | 'it' | 'you' | 'result');
    }
    if (token.kind === 'reference') {
      return createReference((token.normalized as 'me' | 'it' | 'you') || 'me');
    }

    // Default to literal
    return createLiteral(val);
  }

  /**
   * Parse body commands with support for grammar-transformed patterns.
   * Used after a grammar-transformed pattern with continuation marker.
   */
  private parseBodyWithGrammarPatterns(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    grammarPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    const commands: SemanticNode[] = [];

    while (!tokens.isAtEnd()) {
      const current = tokens.peek();

      // Check for 'then' keyword - skip it and continue parsing
      if (current && this.isThenKeyword(current.value, language)) {
        tokens.advance();
        continue;
      }

      // Check for 'end' keyword - terminates block
      if (current && this.isEndKeyword(current.value, language)) {
        tokens.advance();
        break;
      }

      let matched = false;

      // Try grammar-transformed continuation patterns first
      // These patterns have command set to the actual command type (e.g., 'remove', 'toggle')
      if (grammarPatterns.length > 0) {
        const grammarMatch = patternMatcher.matchBest(tokens, grammarPatterns);
        if (grammarMatch) {
          // Use the pattern's command field as the action
          const actionName = grammarMatch.pattern.command;
          const roles: Record<string, SemanticValue> = {};

          // Copy relevant roles (excluding structural roles)
          for (const [role, value] of grammarMatch.captured) {
            if (role !== 'event' && role !== 'action' && role !== 'continues') {
              roles[role] = value;
            }
          }

          const commandNode = createCommandNode(actionName as ActionType, roles, {
            sourceLanguage: language,
            patternId: grammarMatch.pattern.id,
          });
          commands.push(commandNode);
          matched = true;

          // Check if this pattern also has continuation
          const continuesValue = grammarMatch.captured.get('continues');
          if (
            continuesValue &&
            continuesValue.type === 'literal' &&
            continuesValue.value === 'then'
          ) {
            // Continue parsing for more commands
            continue;
          }
        }
      }

      // Try regular command patterns
      if (!matched) {
        const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);
        if (commandMatch) {
          commands.push(this.buildCommand(commandMatch, language));
          matched = true;
        }
      }

      // Skip unrecognized token
      if (!matched) {
        tokens.advance();
      }
    }

    return commands;
  }

  // ==========================================================================
  // Multi-Command Compound Fallback
  // ==========================================================================

  /**
   * Try parsing input as a multi-command compound (no event wrapper).
   * Handles standalone command sequences separated by then-keywords.
   * Used as a last resort when no event trigger is detected.
   */
  private tryCompoundCommandParsing(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode | null {
    // Only try if the input contains then-keywords (otherwise single-command already tried)
    const allTokens = tokens.tokens;
    const hasThenKeyword = allTokens.some(
      t =>
        t.kind === 'conjunction' || (t.kind === 'keyword' && this.isThenKeyword(t.value, language))
    );
    if (!hasThenKeyword) return null;

    // Reset token stream and parse using clause-based parsing
    const freshStream = new TokenStreamImpl(allTokens, language);
    const body = this.parseBodyWithClauses(freshStream, commandPatterns, language);

    if (body.length === 0) return null;

    // Return the compound node (or single command if only one clause parsed)
    if (body.length === 1) {
      return body[0];
    }
    return createCompoundNode(body, 'then', {
      sourceLanguage: language,
      confidence: 0.65,
    });
  }

  // ==========================================================================
  // SOV Event Trigger Extraction
  // ==========================================================================

  /**
   * Known event names for detection (common DOM events).
   */
  private static readonly KNOWN_EVENTS = new Set([
    'click',
    'dblclick',
    'input',
    'change',
    'submit',
    'keydown',
    'keyup',
    'keypress',
    'mouseover',
    'mouseout',
    'mousedown',
    'mouseup',
    'focus',
    'blur',
    'load',
    'scroll',
    'resize',
    'contextmenu',
  ]);

  /**
   * SOV event marker particles per language (postpositions that mark the event role).
   * Korean has no event marker particle -- the event keyword stands alone.
   */
  private static readonly SOV_EVENT_MARKERS: Record<string, Set<string>> = {
    ja: new Set(['で']),
    ko: new Set(), // Korean doesn't use event marker particles
    tr: new Set(['de', 'da', 'te', 'ta']),
  };

  /**
   * SOV source markers ("from" equivalents) and window tokens per language.
   * Used to strip "from window/elsewhere" event modifiers.
   */
  private static readonly SOV_SOURCE_MARKERS: Record<
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
  };

  /**
   * Try to extract an embedded event trigger from SOV grammar-transformed text.
   *
   * SOV languages embed the event trigger within the sentence:
   *   JA: ".active を クリック で 切り替え"  (patient event-marker action)
   *   KO: ".active 를 클릭 에 토글"          (patient event-marker action)
   *   TR: ".active i tıklama de değiştir"   (patient event-marker action)
   *
   * This method detects the [event_keyword] [event_particle] pair,
   * removes those tokens, and parses the remaining tokens as command body.
   */
  private trySOVEventExtraction(
    input: string,
    language: string,
    patterns: LanguagePattern[]
  ): SemanticNode | null {
    const eventMarkers = SemanticParserImpl.SOV_EVENT_MARKERS[language];
    if (!eventMarkers) return null;

    const tokens = tokenizeInternal(input, language);
    const allTokens = tokens.tokens;

    // Build a set of native event names for this language (from eventNameTranslations)
    const langEvents = eventNameTranslations[language];
    const nativeEventNames = new Set<string>();
    if (langEvents) {
      for (const native of Object.keys(langEvents)) {
        nativeEventNames.add(native.toLowerCase());
      }
    }

    // Source markers for "from window/elsewhere" stripping per language
    const sourceMarkers = SemanticParserImpl.SOV_SOURCE_MARKERS[language];

    // Scan for event keyword + optional event marker particle pattern
    let eventIndex = -1;
    let eventName = '';
    let keyFilter = '';
    let tokensToRemove = 1; // How many tokens to strip (1 = event only, 2 = event + marker)

    for (let i = 0; i < allTokens.length; i++) {
      const token = allTokens[i];
      const tokenValue = token.value.toLowerCase();

      // Strip bracket key-filter from event token value for matching
      // e.g., "keydown[key==\"Escape\"]" → "keydown" (with filter extracted)
      let bareEventValue = tokenValue;
      let tokenKeyFilter = '';
      const bracketIdx = tokenValue.indexOf('[');
      if (bracketIdx > 0) {
        bareEventValue = tokenValue.slice(0, bracketIdx);
        tokenKeyFilter = token.value.slice(bracketIdx);
      }

      // Check if this token is a known event name (by normalized value, native text, or bare value)
      const normalizedLower = token.normalized?.toLowerCase();
      const isEventByNormalized =
        normalizedLower && SemanticParserImpl.KNOWN_EVENTS.has(normalizedLower);
      const isEventByNative =
        nativeEventNames.has(tokenValue) || nativeEventNames.has(bareEventValue);
      const isEventByBare = SemanticParserImpl.KNOWN_EVENTS.has(bareEventValue);

      if (isEventByNormalized || isEventByNative || isEventByBare) {
        // Resolve the English event name
        let resolvedName: string;
        if (isEventByNormalized) {
          resolvedName = normalizedLower!;
        } else if (isEventByNative) {
          resolvedName = langEvents?.[tokenValue] ?? langEvents?.[bareEventValue] ?? bareEventValue;
        } else {
          resolvedName = bareEventValue;
        }

        if (eventMarkers.size > 0) {
          // Languages with event markers (JA, TR): require marker after event keyword
          // The marker may be at i+1 (direct) or i+2 (if there's a bracket key-filter selector between)
          let markerOffset = 1;
          const nextToken = allTokens[i + 1];
          // Skip over bracket selector token (e.g., [key=="Escape"]) between event and marker
          if (nextToken && nextToken.kind === 'selector' && nextToken.value.startsWith('[')) {
            markerOffset = 2;
          }
          const markerToken = allTokens[i + markerOffset];
          if (
            markerToken &&
            markerToken.kind === 'particle' &&
            eventMarkers.has(markerToken.value)
          ) {
            eventIndex = i;
            eventName = resolvedName;
            keyFilter = tokenKeyFilter || (markerOffset === 2 ? allTokens[i + 1].value : '');
            tokensToRemove = markerOffset + 1; // Remove event keyword + optional filter + marker
            break;
          }
        } else {
          // Languages without event markers (KO): event keyword stands alone
          eventIndex = i;
          eventName = resolvedName;
          keyFilter = tokenKeyFilter;
          tokensToRemove = 1; // Remove event keyword only
          break;
        }
      }
    }

    if (eventIndex === -1) return null;

    // Build the list of indices to remove: event keyword + marker
    const removeIndices = new Set<number>();
    for (let i = eventIndex; i < eventIndex + tokensToRemove; i++) {
      removeIndices.add(i);
    }

    // Strip "from window/elsewhere" source modifiers near the event
    // Pattern: [source-marker] appears after event marker (JA: から, KO: 에서, TR: den/dan/ten/tan)
    // Or the source element (window/ウィンドウ/창/pencere) may appear before the event
    if (sourceMarkers) {
      const afterEventEnd = eventIndex + tokensToRemove;

      // Check for source marker right after event+marker (e.g., "keydown で から")
      if (afterEventEnd < allTokens.length) {
        const afterToken = allTokens[afterEventEnd];
        if (afterToken.kind === 'particle' && sourceMarkers.markers.has(afterToken.value)) {
          removeIndices.add(afterEventEnd);
        }
      }

      // Check for source element (window token) before the event
      // It could be immediately before, or earlier in the stream
      for (let i = 0; i < eventIndex; i++) {
        const t = allTokens[i];
        const tLower = t.value.toLowerCase();
        const tNorm = t.normalized?.toLowerCase();
        if (
          sourceMarkers.windowTokens.has(tLower) ||
          (tNorm && sourceMarkers.windowTokens.has(tNorm))
        ) {
          removeIndices.add(i);
          break;
        }
      }
    }

    // Remove marked tokens from the array
    const bodyTokens = allTokens.filter((_, idx) => !removeIndices.has(idx));

    if (bodyTokens.length === 0) return null;

    // Parse body tokens as command(s)
    const commandPatterns = patterns.filter(p => p.command !== 'on');
    const bodyStream = new TokenStreamImpl(bodyTokens, language);

    // Use clause-based parsing to handle then-chains
    const body = this.parseBodyWithClauses(bodyStream, commandPatterns, language);

    if (body.length === 0) return null;

    // Build event metadata including key filter and source info
    const metadata: Record<string, unknown> = {
      sourceLanguage: language,
      confidence: 0.75,
    };
    if (keyFilter) {
      metadata.keyFilter = keyFilter;
    }

    return createEventHandler({ type: 'literal', value: eventName }, body, undefined, metadata);
  }

  /**
   * Check if a token is a 'then' keyword in the given language.
   */
  private isThenKeyword(value: string, language: string): boolean {
    const thenKeywords: Record<string, Set<string>> = {
      en: new Set(['then']),
      ja: new Set(['それから', '次に', 'そして']),
      ar: new Set(['ثم', 'بعدها', 'ثمّ']),
      es: new Set(['entonces', 'luego', 'después']),
      ko: new Set(['그다음', '그리고', '그런후', '그러면']),
      zh: new Set(['然后', '接着', '之后']),
      tr: new Set(['sonra', 'ardından', 'daha sonra']),
      pt: new Set(['então', 'depois', 'logo']),
      fr: new Set(['puis', 'ensuite', 'alors']),
      de: new Set(['dann', 'danach', 'anschließend']),
      id: new Set(['lalu', 'kemudian', 'setelah itu']),
      qu: new Set(['chaymantataq', 'hinaspa', 'chaymanta']),
      sw: new Set(['kisha', 'halafu', 'baadaye']),
    };
    const keywords = thenKeywords[language] || thenKeywords.en;
    return keywords.has(value.toLowerCase());
  }

  /**
   * Check if a token is an 'end' keyword in the given language.
   */
  private isEndKeyword(value: string, language: string): boolean {
    const endKeywords: Record<string, Set<string>> = {
      en: new Set(['end']),
      ja: new Set(['終わり', '終了', 'おわり']),
      ar: new Set(['نهاية', 'انتهى', 'آخر']),
      es: new Set(['fin', 'final', 'terminar']),
      ko: new Set(['끝', '종료', '마침']),
      zh: new Set(['结束', '终止', '完']),
      tr: new Set(['son', 'bitiş', 'bitti']),
      pt: new Set(['fim', 'final', 'término']),
      fr: new Set(['fin', 'terminer', 'finir']),
      de: new Set(['ende', 'beenden', 'fertig']),
      id: new Set(['selesai', 'akhir', 'tamat']),
      qu: new Set(['tukukuy', 'tukuy', 'puchukay']),
      sw: new Set(['mwisho', 'maliza', 'tamati']),
    };
    const keywords = endKeywords[language] || endKeywords.en;
    return keywords.has(value.toLowerCase());
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton parser instance.
 */
export const semanticParser = new SemanticParserImpl();

/**
 * Parse input in the specified language.
 */
export function parse(input: string, language: string): SemanticNode {
  return semanticParser.parse(input, language);
}

/**
 * Check if input can be parsed.
 */
export function canParse(input: string, language: string): boolean {
  return semanticParser.canParse(input, language);
}

/**
 * Parse and return command type if parseable.
 */
export function getCommandType(input: string, language: string): ActionType | null {
  try {
    const node = semanticParser.parse(input, language);
    return node.action;
  } catch {
    return null;
  }
}

// =============================================================================
// Additional Public API Functions
// =============================================================================

/**
 * Tokenize input for a specific language.
 */
export function tokenize(input: string, language: string) {
  return tokenizeInternal(input, language);
}

/**
 * Get list of supported languages.
 */
export function getSupportedLanguages(): string[] {
  return getTokenizerLanguages();
}

/**
 * Translate hyperscript between languages.
 */
export function translate(input: string, sourceLang: string, targetLang: string): string {
  const node = parse(input, sourceLang);
  return render(node, targetLang);
}

/**
 * Get translations for all supported languages.
 */
export function getAllTranslations(input: string, sourceLang: string): Record<string, string> {
  const node = parse(input, sourceLang);
  const result: Record<string, string> = {};
  for (const lang of getSupportedLanguages()) {
    try {
      result[lang] = render(node, lang);
    } catch {
      // Skip languages that can't render this command
    }
  }
  return result;
}

/**
 * Create a semantic analyzer for parsing with confidence scores.
 */
export function createSemanticAnalyzer() {
  return {
    analyze(input: string, language: string) {
      try {
        const node = parse(input, language);
        return { node, confidence: 1.0, success: true };
      } catch (error) {
        return { node: null, confidence: 0, success: false, error };
      }
    },
  };
}

/**
 * Render a SemanticNode to hyperscript in a specific language.
 */
export function render(node: SemanticNode, language: string): string {
  return renderExplicitFn(node, language);
}

/**
 * Render a SemanticNode in explicit syntax format.
 */
export function renderExplicit(node: SemanticNode): string {
  return renderExplicitFn(node, 'explicit');
}

/**
 * Parse explicit syntax format.
 */
export function parseExplicit(input: string): SemanticNode {
  return parseExplicitFn(input);
}

/**
 * Convert natural language to explicit syntax.
 */
export function toExplicit(input: string, language: string): string {
  const node = parse(input, language);
  return renderExplicit(node);
}

/**
 * Convert explicit syntax to natural language.
 */
export function fromExplicit(input: string, targetLang: string): string {
  const node = parseExplicit(input);
  return render(node, targetLang);
}

/**
 * Round-trip conversion for testing.
 */
export function roundTrip(input: string, language: string): string {
  const explicit = toExplicit(input, language);
  return fromExplicit(explicit, language);
}
