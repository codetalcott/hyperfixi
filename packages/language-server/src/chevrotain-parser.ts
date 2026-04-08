/**
 * Chevrotain-Based Parser for Language Server (Phase 5.2)
 *
 * Production-grade parser with automatic error recovery and content assist.
 * Uses Chevrotain's CstParser for structured parsing with recovery,
 * and the generated vocabulary from semantic profiles + command schemas.
 *
 * This module is LSP-only — not shipped to browser bundles.
 */

import { CstParser, type IToken, type CstNode, type IRecognitionException } from 'chevrotain';
import {
  hyperscriptLexer,
  allTokens,
  COMMAND_SCHEMAS,
  COMMAND_TOKEN_MAP,
  type CommandSchemaInfo,
  // Tokens
  WhiteSpace,
  StringLiteral,
  TemplateLiteral,
  NumberLiteral,
  CSSSelector,
  AttributeSelector,
  HTMLSelector,
  LocalVariable,
  GlobalVariable,
  URLLiteral,
  Identifier,
  LParen,
  RParen,
  Comma,
  Dot,
  PossessiveS,
  // Structural keywords
  Kw_on,
  Kw_then,
  Kw_end,
  Kw_to,
  Kw_from,
  Kw_into,
  Kw_in,
  Kw_of,
  Kw_as,
  Kw_with,
  Kw_by,
  Kw_for,
  Kw_if,
  Kw_else,
  Kw_while,
  Kw_until,
  Kw_times,
  Kw_and,
  Kw_or,
  Kw_not,
  Kw_me,
  Kw_it,
  Kw_the,
  Kw_is,
  Kw_true,
  Kw_false,
  Kw_no,
  // Command tokens
  Cmd_toggle,
  Cmd_add,
  Cmd_remove,
  Cmd_put,
  Cmd_set,
  Cmd_show,
  Cmd_hide,
  Cmd_log,
  Cmd_fetch,
  Cmd_send,
  Cmd_trigger,
  Cmd_wait,
  Cmd_call,
  Cmd_go,
  Cmd_throw,
  Cmd_halt,
  Cmd_return,
  Cmd_transition,
  Cmd_increment,
  Cmd_decrement,
  Cmd_append,
  Cmd_prepend,
  Cmd_take,
  Cmd_settle,
  Cmd_js,
  Cmd_async,
  Cmd_tell,
  Cmd_repeat,
  Cmd_behavior,
  Cmd_install,
  Cmd_default,
  Cmd_init,
  Cmd_make,
  Cmd_clone,
  Cmd_measure,
  Cmd_swap,
  Cmd_morph,
  Cmd_beep,
  Cmd_copy,
  // Event tokens
  Event_click,
  Event_change,
  Event_submit,
  Event_load,
  Event_scroll,
  Event_resize,
  Event_input,
  Event_keydown,
  Event_keyup,
  Event_mousemove,
  Event_mousedown,
  Event_mouseup,
  Event_mouseenter,
  Event_mouseleave,
  Event_dblclick,
  Event_mutation,
  Event_intersection,
  Event_every,
} from './generated/chevrotain-vocabulary.js';
import type { TokenType } from 'chevrotain';

// =============================================================================
// Types
// =============================================================================

export interface ChevrotainDiagnostic {
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly code: string;
}

export interface ContentAssistSuggestion {
  readonly label: string;
  readonly kind: 'command' | 'event' | 'keyword' | 'selector' | 'variable';
  readonly detail?: string;
  readonly insertText?: string;
  readonly category?: string;
}

export interface ParseResult {
  readonly cst: CstNode | null;
  readonly diagnostics: readonly ChevrotainDiagnostic[];
  readonly tokens: readonly IToken[];
}

// =============================================================================
// Hyperscript CST Parser
// =============================================================================

/**
 * Chevrotain CstParser for hyperscript with error recovery.
 *
 * Grammar groups commands by category for better error messages:
 * - DOM commands: toggle, add, remove, show, hide, transition
 * - Content commands: put, append, prepend, set, get
 * - Flow commands: if, else, for, while, repeat, wait
 * - Event commands: on, send, trigger
 * - Execution commands: call, js, async, return, throw, halt
 */
class HyperscriptParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      maxLookahead: 3,
    });
    this.performSelfAnalysis();
  }

  // -------------------------------------------------------------------------
  // Top-level rules
  // -------------------------------------------------------------------------

  public program = this.RULE('program', () => {
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.eventHandler) },
      { ALT: () => this.SUBRULE(this.commandChain) },
      { ALT: () => this.SUBRULE(this.behaviorDef) },
    ]);
  });

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private eventHandler = this.RULE('eventHandler', () => {
    this.CONSUME(Kw_on);
    this.SUBRULE(this.eventName);
    this.OPTION(() => {
      this.SUBRULE(this.eventModifiers);
    });
    // Event filter: 'in <selector>' or 'from <selector>'
    this.OPTION2(() => {
      this.OR2([{ ALT: () => this.CONSUME(Kw_in) }, { ALT: () => this.CONSUME(Kw_from) }]);
      this.SUBRULE(this.selectorOrExpression);
    });
    this.OPTION3(() => {
      this.SUBRULE(this.commandChain);
    });
    this.OPTION4(() => {
      this.CONSUME(Kw_end);
    });
  });

  private eventName = this.RULE('eventName', () => {
    this.OR([
      { ALT: () => this.CONSUME(Event_click) },
      { ALT: () => this.CONSUME(Event_dblclick) },
      { ALT: () => this.CONSUME(Event_mousedown) },
      { ALT: () => this.CONSUME(Event_mouseup) },
      { ALT: () => this.CONSUME(Event_mousemove) },
      { ALT: () => this.CONSUME(Event_mouseenter) },
      { ALT: () => this.CONSUME(Event_mouseleave) },
      { ALT: () => this.CONSUME(Event_keydown) },
      { ALT: () => this.CONSUME(Event_keyup) },
      { ALT: () => this.CONSUME(Event_input) },
      { ALT: () => this.CONSUME(Event_change) },
      { ALT: () => this.CONSUME(Event_submit) },
      { ALT: () => this.CONSUME(Event_load) },
      { ALT: () => this.CONSUME(Event_scroll) },
      { ALT: () => this.CONSUME(Event_resize) },
      { ALT: () => this.CONSUME(Event_mutation) },
      { ALT: () => this.CONSUME(Event_intersection) },
      { ALT: () => this.CONSUME(Event_every) },
      { ALT: () => this.CONSUME(Identifier) }, // Custom event name
    ]);
  });

  private eventModifiers = this.RULE('eventModifiers', () => {
    this.MANY(() => {
      this.CONSUME(Dot);
      this.CONSUME(Identifier);
      this.OPTION(() => {
        this.CONSUME(LParen);
        this.SUBRULE(this.expression);
        this.CONSUME(RParen);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Command chain (commands connected by 'then')
  // -------------------------------------------------------------------------

  private commandChain = this.RULE('commandChain', () => {
    this.SUBRULE(this.command);
    this.MANY(() => {
      this.CONSUME(Kw_then);
      this.SUBRULE2(this.command);
    });
  });

  // -------------------------------------------------------------------------
  // Commands (grouped by category for error messages)
  // -------------------------------------------------------------------------

  private command = this.RULE('command', () => {
    this.OR([
      // DOM class/attribute
      { ALT: () => this.SUBRULE(this.toggleCommand) },
      { ALT: () => this.SUBRULE(this.addCommand) },
      { ALT: () => this.SUBRULE(this.removeCommand) },
      // DOM content
      { ALT: () => this.SUBRULE(this.putCommand) },
      { ALT: () => this.SUBRULE(this.setCommand) },
      { ALT: () => this.SUBRULE(this.appendCommand) },
      { ALT: () => this.SUBRULE(this.prependCommand) },
      // DOM visibility
      { ALT: () => this.SUBRULE(this.showCommand) },
      { ALT: () => this.SUBRULE(this.hideCommand) },
      { ALT: () => this.SUBRULE(this.transitionCommand) },
      // Variable
      { ALT: () => this.SUBRULE(this.logCommand) },
      { ALT: () => this.SUBRULE(this.incrementCommand) },
      { ALT: () => this.SUBRULE(this.decrementCommand) },
      // Async
      { ALT: () => this.SUBRULE(this.fetchCommand) },
      { ALT: () => this.SUBRULE(this.waitCommand) },
      // Event
      { ALT: () => this.SUBRULE(this.sendCommand) },
      { ALT: () => this.SUBRULE(this.triggerCommand) },
      // Navigation
      { ALT: () => this.SUBRULE(this.goCommand) },
      // Control flow
      { ALT: () => this.SUBRULE(this.ifCommand) },
      { ALT: () => this.SUBRULE(this.repeatCommand) },
      // Execution
      { ALT: () => this.SUBRULE(this.callCommand) },
      { ALT: () => this.SUBRULE(this.jsCommand) },
      { ALT: () => this.SUBRULE(this.returnCommand) },
      { ALT: () => this.SUBRULE(this.throwCommand) },
      { ALT: () => this.SUBRULE(this.haltCommand) },
    ]);
  });

  // --- DOM class/attribute ---

  private toggleCommand = this.RULE('toggleCommand', () => {
    this.CONSUME(Cmd_toggle);
    this.SUBRULE(this.selectorOrExpression);
    this.OPTION(() => {
      this.CONSUME(Kw_on);
      this.SUBRULE2(this.selectorOrExpression);
    });
  });

  private addCommand = this.RULE('addCommand', () => {
    this.CONSUME(Cmd_add);
    this.SUBRULE(this.selectorOrExpression);
    this.OPTION(() => {
      this.CONSUME(Kw_to);
      this.SUBRULE2(this.selectorOrExpression);
    });
  });

  private removeCommand = this.RULE('removeCommand', () => {
    this.CONSUME(Cmd_remove);
    this.SUBRULE(this.selectorOrExpression);
    this.OPTION(() => {
      this.CONSUME(Kw_from);
      this.SUBRULE2(this.selectorOrExpression);
    });
  });

  // --- DOM content ---

  private putCommand = this.RULE('putCommand', () => {
    this.CONSUME(Cmd_put);
    this.SUBRULE(this.expression);
    // 'into', 'before', 'after' are all valid markers; 'before'/'after' parsed as Identifier
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Kw_into) },
        { ALT: () => this.CONSUME(Identifier, { LABEL: 'putMarker' }) }, // before/after
      ]);
      this.SUBRULE2(this.selectorOrExpression);
    });
  });

  private setCommand = this.RULE('setCommand', () => {
    this.CONSUME(Cmd_set);
    this.SUBRULE(this.selectorOrExpression);
    this.CONSUME(Kw_to);
    this.SUBRULE2(this.expression);
  });

  private appendCommand = this.RULE('appendCommand', () => {
    this.CONSUME(Cmd_append);
    this.SUBRULE(this.expression);
    this.CONSUME(Kw_to);
    this.SUBRULE2(this.selectorOrExpression);
  });

  private prependCommand = this.RULE('prependCommand', () => {
    this.CONSUME(Cmd_prepend);
    this.SUBRULE(this.expression);
    this.CONSUME(Kw_to);
    this.SUBRULE2(this.selectorOrExpression);
  });

  // --- DOM visibility ---

  private showCommand = this.RULE('showCommand', () => {
    this.CONSUME(Cmd_show);
    this.OPTION(() => this.SUBRULE(this.selectorOrExpression));
  });

  private hideCommand = this.RULE('hideCommand', () => {
    this.CONSUME(Cmd_hide);
    this.OPTION(() => this.SUBRULE(this.selectorOrExpression));
  });

  private transitionCommand = this.RULE('transitionCommand', () => {
    this.CONSUME(Cmd_transition);
    this.SUBRULE(this.selectorOrExpression);
  });

  // --- Variable ---

  private logCommand = this.RULE('logCommand', () => {
    this.CONSUME(Cmd_log);
    this.SUBRULE(this.expression);
  });

  private incrementCommand = this.RULE('incrementCommand', () => {
    this.CONSUME(Cmd_increment);
    this.SUBRULE(this.selectorOrExpression);
    this.OPTION(() => {
      this.CONSUME(Kw_by);
      this.SUBRULE2(this.expression);
    });
  });

  private decrementCommand = this.RULE('decrementCommand', () => {
    this.CONSUME(Cmd_decrement);
    this.SUBRULE(this.selectorOrExpression);
    this.OPTION(() => {
      this.CONSUME(Kw_by);
      this.SUBRULE2(this.expression);
    });
  });

  // --- Async ---

  private fetchCommand = this.RULE('fetchCommand', () => {
    this.CONSUME(Cmd_fetch);
    this.SUBRULE(this.expression); // URL or expression
    this.OPTION(() => {
      this.CONSUME(Kw_as);
      this.CONSUME(Identifier, { LABEL: 'responseType' });
    });
  });

  private waitCommand = this.RULE('waitCommand', () => {
    this.CONSUME(Cmd_wait);
    this.OPTION(() => this.SUBRULE(this.expression));
  });

  // --- Event ---

  private sendCommand = this.RULE('sendCommand', () => {
    this.CONSUME(Cmd_send);
    this.CONSUME(Identifier, { LABEL: 'eventName' });
    this.OPTION(() => {
      this.CONSUME(Kw_to);
      this.SUBRULE(this.selectorOrExpression);
    });
  });

  private triggerCommand = this.RULE('triggerCommand', () => {
    this.CONSUME(Cmd_trigger);
    this.CONSUME(Identifier, { LABEL: 'eventName' });
    this.OPTION(() => {
      this.CONSUME(Kw_on);
      this.SUBRULE(this.selectorOrExpression);
    });
  });

  // --- Navigation ---

  private goCommand = this.RULE('goCommand', () => {
    this.CONSUME(Cmd_go);
    this.OPTION(() => this.CONSUME(Kw_to));
    this.SUBRULE(this.expression); // URL or expression
  });

  // --- Control flow ---

  private ifCommand = this.RULE('ifCommand', () => {
    this.CONSUME(Kw_if);
    this.SUBRULE(this.expression);
    this.OPTION(() => this.SUBRULE(this.commandChain));
    this.OPTION2(() => {
      this.CONSUME(Kw_else);
      this.OPTION3(() => this.SUBRULE2(this.commandChain));
    });
    this.OPTION4(() => this.CONSUME(Kw_end));
  });

  private repeatCommand = this.RULE('repeatCommand', () => {
    this.CONSUME(Cmd_repeat);
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.expression);
          this.CONSUME(Kw_times);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Kw_for);
          this.CONSUME(Identifier, { LABEL: 'loopVar' });
          this.CONSUME(Kw_in);
          this.SUBRULE2(this.expression);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Kw_while);
          this.SUBRULE3(this.expression);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Kw_until);
          this.SUBRULE4(this.expression);
        },
      },
      {
        ALT: () => {
          /* forever — no args */
        },
      },
    ]);
    this.OPTION(() => this.SUBRULE(this.commandChain));
    this.OPTION2(() => this.CONSUME(Kw_end));
  });

  // --- Execution ---

  private callCommand = this.RULE('callCommand', () => {
    this.CONSUME(Cmd_call);
    this.SUBRULE(this.expression);
  });

  private jsCommand = this.RULE('jsCommand', () => {
    this.CONSUME(Cmd_js);
    // JS block consumes everything until 'end'
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Identifier) },
        { ALT: () => this.CONSUME(StringLiteral) },
        { ALT: () => this.CONSUME(TemplateLiteral) },
        { ALT: () => this.CONSUME(NumberLiteral) },
        { ALT: () => this.CONSUME(CSSSelector) },
        { ALT: () => this.CONSUME(LocalVariable) },
        { ALT: () => this.CONSUME(LParen) },
        { ALT: () => this.CONSUME(RParen) },
        { ALT: () => this.CONSUME(Comma) },
        { ALT: () => this.CONSUME(Dot) },
      ]);
    });
    this.CONSUME(Kw_end);
  });

  private returnCommand = this.RULE('returnCommand', () => {
    this.CONSUME(Cmd_return);
    this.OPTION(() => this.SUBRULE(this.expression));
  });

  private throwCommand = this.RULE('throwCommand', () => {
    this.CONSUME(Cmd_throw);
    this.SUBRULE(this.expression);
  });

  private haltCommand = this.RULE('haltCommand', () => {
    this.CONSUME(Cmd_halt);
  });

  // -------------------------------------------------------------------------
  // Behavior definitions
  // -------------------------------------------------------------------------

  private behaviorDef = this.RULE('behaviorDef', () => {
    this.CONSUME(Cmd_behavior);
    this.CONSUME(Identifier, { LABEL: 'behaviorName' });
    this.OPTION(() => {
      this.CONSUME(LParen);
      this.AT_LEAST_ONE_SEP({
        SEP: Comma,
        DEF: () => this.CONSUME2(Identifier, { LABEL: 'param' }),
      });
      this.CONSUME(RParen);
    });
    this.MANY(() => this.SUBRULE(this.statement));
    this.CONSUME(Kw_end);
  });

  // -------------------------------------------------------------------------
  // Expressions (simplified for LSP — full expression parsing is in core)
  // -------------------------------------------------------------------------

  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.primaryExpression);
    this.MANY(() => {
      this.OR([
        {
          ALT: () => {
            this.OR2([
              { ALT: () => this.CONSUME(Kw_is) },
              { ALT: () => this.CONSUME(Kw_and) },
              { ALT: () => this.CONSUME(Kw_or) },
            ]);
            this.SUBRULE2(this.primaryExpression);
          },
        },
        {
          ALT: () => {
            this.CONSUME(Dot);
            this.CONSUME(Identifier);
          },
        },
        {
          // Possessive property access: #element's property
          ALT: () => {
            this.CONSUME(PossessiveS);
            this.CONSUME2(Identifier);
          },
        },
      ]);
    });
  });

  private primaryExpression = this.RULE('primaryExpression', () => {
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Kw_not) },
        { ALT: () => this.CONSUME(Kw_the) },
        { ALT: () => this.CONSUME(Kw_no) },
      ]);
    });
    this.OR2([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(TemplateLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(CSSSelector) },
      { ALT: () => this.CONSUME(AttributeSelector) },
      { ALT: () => this.CONSUME(HTMLSelector) },
      { ALT: () => this.CONSUME(LocalVariable) },
      { ALT: () => this.CONSUME(GlobalVariable) },
      { ALT: () => this.CONSUME(Kw_me) },
      { ALT: () => this.CONSUME(Kw_it) },
      { ALT: () => this.CONSUME(Kw_true) },
      { ALT: () => this.CONSUME(Kw_false) },
      { ALT: () => this.CONSUME(Identifier) },
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.expression);
          this.CONSUME(RParen);
        },
      },
    ]);
  });

  // -------------------------------------------------------------------------
  // Selectors or expressions
  // -------------------------------------------------------------------------

  private selectorOrExpression = this.RULE('selectorOrExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(CSSSelector) },
      { ALT: () => this.CONSUME(AttributeSelector) },
      { ALT: () => this.CONSUME(HTMLSelector) },
      { ALT: () => this.CONSUME(Kw_me) },
      { ALT: () => this.CONSUME(Kw_it) },
      { ALT: () => this.CONSUME(LocalVariable) },
      { ALT: () => this.CONSUME(GlobalVariable) },
      { ALT: () => this.CONSUME(Identifier) },
    ]);
  });
}

// Singleton parser instance
const parserInstance = new HyperscriptParser();

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse hyperscript code with error recovery.
 * Returns a CST, diagnostics, and tokens.
 */
export function parseWithRecovery(code: string): ParseResult {
  const lexResult = hyperscriptLexer.tokenize(code);

  // Convert lex errors to diagnostics
  const diagnostics: ChevrotainDiagnostic[] = lexResult.errors.map(err => ({
    message: err.message,
    severity: 'error' as const,
    startOffset: err.offset,
    endOffset: err.offset + (err.length || 1),
    startLine: err.line ?? 1,
    startColumn: err.column ?? 1,
    code: 'lex-error',
  }));

  // Filter whitespace for parser
  const nonWS = lexResult.tokens.filter(t => t.tokenType !== WhiteSpace);
  parserInstance.input = nonWS;
  const cst = parserInstance.program();

  // Convert parse errors to diagnostics
  for (const err of parserInstance.errors) {
    diagnostics.push(recognitionExceptionToDiagnostic(err));
  }

  return {
    cst,
    diagnostics,
    tokens: lexResult.tokens,
  };
}

/**
 * Get content assist suggestions at a given offset in the code.
 * Uses token analysis and schema info to compute valid completions.
 */
export function getContentAssist(code: string, offset: number): ContentAssistSuggestion[] {
  const lexResult = hyperscriptLexer.tokenize(code);
  const nonWS = lexResult.tokens.filter(t => t.tokenType !== WhiteSpace);
  const suggestions: ContentAssistSuggestion[] = [];

  // Find the token at or just before the offset
  const tokenBefore = findTokenBefore(nonWS, offset);
  const context = inferContextFromTokens(nonWS, tokenBefore);

  switch (context) {
    case 'start':
    case 'after-then':
      // Suggest commands
      suggestions.push(...getCommandSuggestions());
      suggestions.push({
        label: 'on',
        kind: 'keyword',
        detail: 'Event handler',
        insertText: 'on ',
      });
      break;

    case 'after-on':
      // Suggest event names
      suggestions.push(...getEventSuggestions());
      break;

    case 'after-command':
      // Suggest role markers based on the last command
      if (tokenBefore) {
        suggestions.push(...getRoleMarkerSuggestions(tokenBefore));
      }
      break;

    case 'after-marker':
      // Suggest selectors and expressions
      suggestions.push(...getSelectorSuggestions());
      break;

    default:
      // General suggestions
      suggestions.push(...getCommandSuggestions());
      suggestions.push(...getSelectorSuggestions());
      break;
  }

  return suggestions;
}

/**
 * Validate code and return diagnostics only (no CST needed).
 */
export function validateCode(code: string): readonly ChevrotainDiagnostic[] {
  return parseWithRecovery(code).diagnostics;
}

// =============================================================================
// Internal Helpers
// =============================================================================

function recognitionExceptionToDiagnostic(err: IRecognitionException): ChevrotainDiagnostic {
  const token = err.token;
  const startOffset = token.startOffset ?? 0;
  const endOffset = token.endOffset ?? startOffset + 1;

  // Create user-friendly message based on error type
  let message = err.message;
  const match = message.match(/Expecting (.*?) but found/);
  if (match) {
    // Simplify Chevrotain's verbose error messages
    const expected = match[1]
      .replace(/token of type --> /g, '')
      .replace(/ <--/g, '')
      .replace(/one of these possible Token Types:\s*/g, '')
      .replace(/\[.*?\]/g, m => {
        // Extract just token names
        const names = m
          .slice(1, -1)
          .split(',')
          .map(n => n.trim());
        return names.slice(0, 5).join(', ') + (names.length > 5 ? '...' : '');
      });
    message = `Expected ${expected}`;
    if (token.image) {
      message += ` but found '${token.image}'`;
    }
  }

  return {
    message,
    severity: 'error',
    startOffset,
    endOffset,
    startLine: token.startLine ?? 1,
    startColumn: token.startColumn ?? 1,
    code: 'parse-error',
  };
}

function findTokenBefore(tokens: IToken[], offset: number): IToken | null {
  let best: IToken | null = null;
  for (const t of tokens) {
    if (t.startOffset <= offset) {
      best = t;
    } else {
      break;
    }
  }
  return best;
}

type ContextType =
  | 'start'
  | 'after-on'
  | 'after-then'
  | 'after-command'
  | 'after-marker'
  | 'general';

function inferContextFromTokens(tokens: IToken[], tokenBefore: IToken | null): ContextType {
  if (!tokenBefore || tokens.length === 0) return 'start';

  const type = tokenBefore.tokenType;

  if (type === Kw_on) return 'after-on';
  if (type === Kw_then) return 'after-then';

  // Check if it's a command keyword
  if (type.name.startsWith('Cmd_')) return 'after-command';

  // Check if it's a marker
  const markers = [Kw_to, Kw_from, Kw_into, Kw_in, Kw_of, Kw_on, Kw_as, Kw_with];
  if (markers.includes(type)) return 'after-marker';

  return 'general';
}

function getCommandSuggestions(): ContentAssistSuggestion[] {
  return COMMAND_SCHEMAS.map(schema => ({
    label: schema.action,
    kind: 'command' as const,
    detail: getCategoryLabel(schema.category),
    insertText: schema.action + ' ',
    category: schema.category,
  }));
}

function getEventSuggestions(): ContentAssistSuggestion[] {
  const events = [
    'click',
    'dblclick',
    'mousedown',
    'mouseup',
    'mousemove',
    'mouseenter',
    'mouseleave',
    'keydown',
    'keyup',
    'keypress',
    'input',
    'change',
    'submit',
    'focus',
    'blur',
    'load',
    'scroll',
    'resize',
    'mutation',
    'intersection',
    'every',
  ];
  return events.map(e => ({
    label: e,
    kind: 'event' as const,
    detail: `${e} event`,
    insertText: e + ' ',
  }));
}

function getRoleMarkerSuggestions(commandToken: IToken): ContentAssistSuggestion[] {
  const cmdName = commandToken.tokenType.name.replace('Cmd_', '');
  const schema = COMMAND_SCHEMAS.find(s => s.action === cmdName);
  if (!schema) return [];

  const suggestions: ContentAssistSuggestion[] = [];
  for (const role of schema.roles) {
    if (role.role === schema.primaryRole) continue; // Primary role doesn't need a marker
    // Add common markers for this role type
    const markers = getRoleMarkers(role.role);
    for (const marker of markers) {
      suggestions.push({
        label: marker,
        kind: 'keyword',
        detail: `${role.role} marker`,
        insertText: marker + ' ',
      });
    }
  }
  return suggestions;
}

function getSelectorSuggestions(): ContentAssistSuggestion[] {
  return [
    { label: 'me', kind: 'keyword', detail: 'Current element' },
    { label: 'it', kind: 'keyword', detail: 'Last result' },
    { label: '.', kind: 'selector', detail: 'CSS class selector', insertText: '.' },
    { label: '#', kind: 'selector', detail: 'CSS ID selector', insertText: '#' },
    { label: '@', kind: 'selector', detail: 'Attribute selector', insertText: '@' },
    { label: ':', kind: 'variable', detail: 'Local variable', insertText: ':' },
    { label: '$', kind: 'variable', detail: 'Global variable', insertText: '$' },
  ];
}

function getRoleMarkers(role: string): string[] {
  switch (role) {
    case 'destination':
      return ['to', 'into'];
    case 'source':
      return ['from'];
    case 'target':
      return ['on'];
    case 'container':
      return ['in'];
    case 'instrument':
      return ['with'];
    case 'beneficiary':
      return ['for'];
    default:
      return [];
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'dom-class': 'DOM Class/Attribute',
    'dom-content': 'DOM Content',
    'dom-visibility': 'DOM Visibility',
    variable: 'Variable',
    event: 'Event',
    async: 'Async',
    navigation: 'Navigation',
    'control-flow': 'Control Flow',
  };
  return labels[category] || category;
}
