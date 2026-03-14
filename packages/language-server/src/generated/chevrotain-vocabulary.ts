/**
 * Generated Chevrotain Vocabulary (Phase 5.2)
 *
 * Auto-generated from semantic profiles and command schemas.
 * DO NOT EDIT — regenerate with: npx tsx scripts/generate-chevrotain-grammar.ts
 *
 * Source: 25 language profiles, 54 command schemas
 * Keywords indexed: 2396
 */

import { createToken, Lexer, type ITokenConfig, type TokenType } from 'chevrotain';

// =============================================================================
// Token Definitions
// =============================================================================

export const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u09FF\u0E00-\u0E7F\u3040-\u9FFF\uAC00-\uD7AF][\w\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u09FF\u0E00-\u0E7F\u3040-\u9FFF\uAC00-\uD7AF'-]*/ });

// --- whitespace ---
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/ });

// --- literal ---
export const StringLiteral = createToken({ name: 'StringLiteral', pattern: /'[^']*'|"[^"]*"/ });
export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /\d+(\.\d+)?/ });
export const URLLiteral = createToken({ name: 'URLLiteral', pattern: /\/[a-zA-Z0-9_\-.\/]+/ });

// --- selector ---
export const CSSSelector = createToken({ name: 'CSSSelector', pattern: /[#.][a-zA-Z_][\w-]*/ });
export const AttributeSelector = createToken({ name: 'AttributeSelector', pattern: /@[a-zA-Z_][\w-]*/ });
export const HTMLSelector = createToken({ name: 'HTMLSelector', pattern: /<[a-zA-Z][\w.-]*\/>/ });

// --- variable ---
export const LocalVariable = createToken({ name: 'LocalVariable', pattern: /:[a-zA-Z_][\w]*/ });
export const GlobalVariable = createToken({ name: 'GlobalVariable', pattern: /\$[a-zA-Z_][\w]*/ });

// --- structural ---
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });

// --- keyword ---
export const Kw_previous = createToken({ name: 'Kw_previous', pattern: /previous/, longer_alt: Identifier });
export const Kw_closest = createToken({ name: 'Kw_closest', pattern: /closest/, longer_alt: Identifier });
export const Kw_while = createToken({ name: 'Kw_while', pattern: /while/, longer_alt: Identifier });
export const Kw_until = createToken({ name: 'Kw_until', pattern: /until/, longer_alt: Identifier });
export const Kw_times = createToken({ name: 'Kw_times', pattern: /times/, longer_alt: Identifier });
export const Kw_first = createToken({ name: 'Kw_first', pattern: /first/, longer_alt: Identifier });
export const Kw_false = createToken({ name: 'Kw_false', pattern: /false/, longer_alt: Identifier });
export const Kw_then = createToken({ name: 'Kw_then', pattern: /then/, longer_alt: Identifier });
export const Kw_else = createToken({ name: 'Kw_else', pattern: /else/, longer_alt: Identifier });
export const Kw_from = createToken({ name: 'Kw_from', pattern: /from/, longer_alt: Identifier });
export const Kw_into = createToken({ name: 'Kw_into', pattern: /into/, longer_alt: Identifier });
export const Kw_with = createToken({ name: 'Kw_with', pattern: /with/, longer_alt: Identifier });
export const Kw_have = createToken({ name: 'Kw_have', pattern: /have/, longer_alt: Identifier });
export const Kw_last = createToken({ name: 'Kw_last', pattern: /last/, longer_alt: Identifier });
export const Kw_next = createToken({ name: 'Kw_next', pattern: /next/, longer_alt: Identifier });
export const Kw_true = createToken({ name: 'Kw_true', pattern: /true/, longer_alt: Identifier });
export const Kw_null = createToken({ name: 'Kw_null', pattern: /null/, longer_alt: Identifier });
export const Kw_end = createToken({ name: 'Kw_end', pattern: /end/, longer_alt: Identifier });
export const Kw_for = createToken({ name: 'Kw_for', pattern: /for/, longer_alt: Identifier });
export const Kw_and = createToken({ name: 'Kw_and', pattern: /and/, longer_alt: Identifier });
export const Kw_not = createToken({ name: 'Kw_not', pattern: /not/, longer_alt: Identifier });
export const Kw_has = createToken({ name: 'Kw_has', pattern: /has/, longer_alt: Identifier });
export const Kw_you = createToken({ name: 'Kw_you', pattern: /you/, longer_alt: Identifier });
export const Kw_its = createToken({ name: 'Kw_its', pattern: /its/, longer_alt: Identifier });
export const Kw_the = createToken({ name: 'Kw_the', pattern: /the/, longer_alt: Identifier });
export const Kw_on = createToken({ name: 'Kw_on', pattern: /on/, longer_alt: Identifier });
export const Kw_if = createToken({ name: 'Kw_if', pattern: /if/, longer_alt: Identifier });
export const Kw_to = createToken({ name: 'Kw_to', pattern: /to/, longer_alt: Identifier });
export const Kw_in = createToken({ name: 'Kw_in', pattern: /in/, longer_alt: Identifier });
export const Kw_of = createToken({ name: 'Kw_of', pattern: /of/, longer_alt: Identifier });
export const Kw_as = createToken({ name: 'Kw_as', pattern: /as/, longer_alt: Identifier });
export const Kw_at = createToken({ name: 'Kw_at', pattern: /at/, longer_alt: Identifier });
export const Kw_by = createToken({ name: 'Kw_by', pattern: /by/, longer_alt: Identifier });
export const Kw_or = createToken({ name: 'Kw_or', pattern: /or/, longer_alt: Identifier });
export const Kw_is = createToken({ name: 'Kw_is', pattern: /is/, longer_alt: Identifier });
export const Kw_me = createToken({ name: 'Kw_me', pattern: /me/, longer_alt: Identifier });
export const Kw_it = createToken({ name: 'Kw_it', pattern: /it/, longer_alt: Identifier });
export const Kw_my = createToken({ name: 'Kw_my', pattern: /my/, longer_alt: Identifier });
export const Kw_no = createToken({ name: 'Kw_no', pattern: /no/, longer_alt: Identifier });

// --- cmd-dom-visibility ---
export const Cmd_transition = createToken({ name: 'Cmd_transition', pattern: /transition/, longer_alt: Identifier });
export const Cmd_show = createToken({ name: 'Cmd_show', pattern: /show/, longer_alt: Identifier });
export const Cmd_hide = createToken({ name: 'Cmd_hide', pattern: /hide/, longer_alt: Identifier });

// --- cmd-variable ---
export const Cmd_increment = createToken({ name: 'Cmd_increment', pattern: /increment/, longer_alt: Identifier });
export const Cmd_decrement = createToken({ name: 'Cmd_decrement', pattern: /decrement/, longer_alt: Identifier });
export const Cmd_default = createToken({ name: 'Cmd_default', pattern: /default/, longer_alt: Identifier });
export const Cmd_beep = createToken({ name: 'Cmd_beep', pattern: /beep/, longer_alt: Identifier });
export const Cmd_pick = createToken({ name: 'Cmd_pick', pattern: /pick/, longer_alt: Identifier });
export const Cmd_set = createToken({ name: 'Cmd_set', pattern: /set/, longer_alt: Identifier });
export const Cmd_log = createToken({ name: 'Cmd_log', pattern: /log/, longer_alt: Identifier });
export const Cmd_get = createToken({ name: 'Cmd_get', pattern: /get/, longer_alt: Identifier });

// --- cmd-control-flow ---
export const Cmd_continue = createToken({ name: 'Cmd_continue', pattern: /continue/, longer_alt: Identifier });
export const Cmd_behavior = createToken({ name: 'Cmd_behavior', pattern: /behavior/, longer_alt: Identifier });
export const Cmd_compound = createToken({ name: 'Cmd_compound', pattern: /compound/, longer_alt: Identifier });
export const Cmd_install = createToken({ name: 'Cmd_install', pattern: /install/, longer_alt: Identifier });
export const Cmd_unless = createToken({ name: 'Cmd_unless', pattern: /unless/, longer_alt: Identifier });
export const Cmd_repeat = createToken({ name: 'Cmd_repeat', pattern: /repeat/, longer_alt: Identifier });
export const Cmd_return = createToken({ name: 'Cmd_return', pattern: /return/, longer_alt: Identifier });
export const Cmd_throw = createToken({ name: 'Cmd_throw', pattern: /throw/, longer_alt: Identifier });
export const Cmd_break = createToken({ name: 'Cmd_break', pattern: /break/, longer_alt: Identifier });
export const Cmd_halt = createToken({ name: 'Cmd_halt', pattern: /halt/, longer_alt: Identifier });
export const Cmd_call = createToken({ name: 'Cmd_call', pattern: /call/, longer_alt: Identifier });
export const Cmd_tell = createToken({ name: 'Cmd_tell', pattern: /tell/, longer_alt: Identifier });
export const Cmd_init = createToken({ name: 'Cmd_init', pattern: /init/, longer_alt: Identifier });
export const Cmd_exit = createToken({ name: 'Cmd_exit', pattern: /exit/, longer_alt: Identifier });
export const Cmd_js = createToken({ name: 'Cmd_js', pattern: /js/, longer_alt: Identifier });

// --- cmd-event ---
export const Cmd_trigger = createToken({ name: 'Cmd_trigger', pattern: /trigger/, longer_alt: Identifier });
export const Cmd_send = createToken({ name: 'Cmd_send', pattern: /send/, longer_alt: Identifier });

// --- cmd-dom-content ---
export const Cmd_prepend = createToken({ name: 'Cmd_prepend', pattern: /prepend/, longer_alt: Identifier });
export const Cmd_measure = createToken({ name: 'Cmd_measure', pattern: /measure/, longer_alt: Identifier });
export const Cmd_append = createToken({ name: 'Cmd_append', pattern: /append/, longer_alt: Identifier });
export const Cmd_render = createToken({ name: 'Cmd_render', pattern: /render/, longer_alt: Identifier });
export const Cmd_clone = createToken({ name: 'Cmd_clone', pattern: /clone/, longer_alt: Identifier });
export const Cmd_focus = createToken({ name: 'Cmd_focus', pattern: /focus/, longer_alt: Identifier });
export const Cmd_morph = createToken({ name: 'Cmd_morph', pattern: /morph/, longer_alt: Identifier });
export const Cmd_take = createToken({ name: 'Cmd_take', pattern: /take/, longer_alt: Identifier });
export const Cmd_make = createToken({ name: 'Cmd_make', pattern: /make/, longer_alt: Identifier });
export const Cmd_blur = createToken({ name: 'Cmd_blur', pattern: /blur/, longer_alt: Identifier });
export const Cmd_swap = createToken({ name: 'Cmd_swap', pattern: /swap/, longer_alt: Identifier });
export const Cmd_copy = createToken({ name: 'Cmd_copy', pattern: /copy/, longer_alt: Identifier });
export const Cmd_put = createToken({ name: 'Cmd_put', pattern: /put/, longer_alt: Identifier });

// --- cmd-dom-class ---
export const Cmd_toggle = createToken({ name: 'Cmd_toggle', pattern: /toggle/, longer_alt: Identifier });
export const Cmd_remove = createToken({ name: 'Cmd_remove', pattern: /remove/, longer_alt: Identifier });
export const Cmd_add = createToken({ name: 'Cmd_add', pattern: /add/, longer_alt: Identifier });

// --- cmd-async ---
export const Cmd_settle = createToken({ name: 'Cmd_settle', pattern: /settle/, longer_alt: Identifier });
export const Cmd_fetch = createToken({ name: 'Cmd_fetch', pattern: /fetch/, longer_alt: Identifier });
export const Cmd_async = createToken({ name: 'Cmd_async', pattern: /async/, longer_alt: Identifier });
export const Cmd_wait = createToken({ name: 'Cmd_wait', pattern: /wait/, longer_alt: Identifier });

// --- cmd-navigation ---
export const Cmd_go = createToken({ name: 'Cmd_go', pattern: /go/, longer_alt: Identifier });

// --- event ---
export const Event_intersection = createToken({ name: 'Event_intersection', pattern: /intersection/, longer_alt: Identifier });
export const Event_mouseenter = createToken({ name: 'Event_mouseenter', pattern: /mouseenter/, longer_alt: Identifier });
export const Event_mouseleave = createToken({ name: 'Event_mouseleave', pattern: /mouseleave/, longer_alt: Identifier });
export const Event_mousedown = createToken({ name: 'Event_mousedown', pattern: /mousedown/, longer_alt: Identifier });
export const Event_mousemove = createToken({ name: 'Event_mousemove', pattern: /mousemove/, longer_alt: Identifier });
export const Event_dblclick = createToken({ name: 'Event_dblclick', pattern: /dblclick/, longer_alt: Identifier });
export const Event_keypress = createToken({ name: 'Event_keypress', pattern: /keypress/, longer_alt: Identifier });
export const Event_mutation = createToken({ name: 'Event_mutation', pattern: /mutation/, longer_alt: Identifier });
export const Event_mouseup = createToken({ name: 'Event_mouseup', pattern: /mouseup/, longer_alt: Identifier });
export const Event_keydown = createToken({ name: 'Event_keydown', pattern: /keydown/, longer_alt: Identifier });
export const Event_change = createToken({ name: 'Event_change', pattern: /change/, longer_alt: Identifier });
export const Event_submit = createToken({ name: 'Event_submit', pattern: /submit/, longer_alt: Identifier });
export const Event_scroll = createToken({ name: 'Event_scroll', pattern: /scroll/, longer_alt: Identifier });
export const Event_resize = createToken({ name: 'Event_resize', pattern: /resize/, longer_alt: Identifier });
export const Event_click = createToken({ name: 'Event_click', pattern: /click/, longer_alt: Identifier });
export const Event_keyup = createToken({ name: 'Event_keyup', pattern: /keyup/, longer_alt: Identifier });
export const Event_input = createToken({ name: 'Event_input', pattern: /input/, longer_alt: Identifier });
export const Event_every = createToken({ name: 'Event_every', pattern: /every/, longer_alt: Identifier });
export const Event_load = createToken({ name: 'Event_load', pattern: /load/, longer_alt: Identifier });

// --- identifier ---

// =============================================================================
// Token Vocabulary (order matters: keywords before Identifier)
// =============================================================================

export const allTokens: TokenType[] = [
  // Whitespace
  WhiteSpace,
  // Literals
  StringLiteral, NumberLiteral, URLLiteral,
  // Selectors
  CSSSelector, AttributeSelector, HTMLSelector,
  // Variables
  LocalVariable, GlobalVariable,
  // Punctuation
  LParen, RParen, Comma, Dot,
  // Event names
  Event_intersection, Event_mouseenter, Event_mouseleave, Event_mousedown, Event_mousemove, Event_dblclick, Event_keypress, Event_mutation, Event_mouseup, Event_keydown, Event_change, Event_submit, Event_scroll, Event_resize, Event_click, Event_keyup, Event_input, Event_every, Event_load,
  // Command keywords
  Cmd_transition, Cmd_increment, Cmd_decrement, Cmd_continue, Cmd_behavior, Cmd_compound, Cmd_trigger, Cmd_prepend, Cmd_default, Cmd_install, Cmd_measure, Cmd_toggle, Cmd_remove, Cmd_append, Cmd_settle, Cmd_unless, Cmd_repeat, Cmd_return, Cmd_render, Cmd_fetch, Cmd_throw, Cmd_clone, Cmd_focus, Cmd_async, Cmd_morph, Cmd_break, Cmd_show, Cmd_hide, Cmd_wait, Cmd_take, Cmd_make, Cmd_halt, Cmd_send, Cmd_blur, Cmd_call, Cmd_tell, Cmd_init, Cmd_swap, Cmd_beep, Cmd_copy, Cmd_exit, Cmd_pick, Cmd_add, Cmd_put, Cmd_set, Cmd_log, Cmd_get, Cmd_go, Cmd_js,
  // Structural keywords
  Kw_previous, Kw_closest, Kw_while, Kw_until, Kw_times, Kw_first, Kw_false, Kw_then, Kw_else, Kw_from, Kw_into, Kw_with, Kw_have, Kw_last, Kw_next, Kw_true, Kw_null, Kw_end, Kw_for, Kw_and, Kw_not, Kw_has, Kw_you, Kw_its, Kw_the, Kw_on, Kw_if, Kw_to, Kw_in, Kw_of, Kw_as, Kw_at, Kw_by, Kw_or, Kw_is, Kw_me, Kw_it, Kw_my, Kw_no,
  // Identifier (catch-all)
  Identifier,
];

export const hyperscriptLexer = new Lexer(allTokens, {
  positionTracking: 'full',
  ensureOptimizations: true,
});

// =============================================================================
// Command Categories (from command schemas)
// =============================================================================

export interface CommandCategoryGroup {
  readonly category: string;
  readonly label: string;
  readonly commands: readonly string[];
}

export const COMMAND_CATEGORIES: readonly CommandCategoryGroup[] = [
  { category: 'dom-class', label: 'DOM Class/Attribute', commands: ['add', 'remove', 'toggle'] },
  { category: 'dom-content', label: 'DOM Content', commands: ['append', 'blur', 'clone', 'copy', 'focus', 'make', 'measure', 'morph', 'prepend', 'put', 'render', 'swap', 'take'] },
  { category: 'variable', label: 'Variable Operations', commands: ['beep', 'decrement', 'default', 'get', 'increment', 'log', 'pick', 'set'] },
  { category: 'dom-visibility', label: 'DOM Visibility', commands: ['hide', 'show', 'transition'] },
  { category: 'event', label: 'Event Handling', commands: ['on', 'send', 'trigger'] },
  { category: 'async', label: 'Async Operations', commands: ['async', 'fetch', 'settle', 'wait'] },
  { category: 'control-flow', label: 'Control Flow', commands: ['behavior', 'break', 'call', 'compound', 'continue', 'else', 'exit', 'for', 'halt', 'if', 'init', 'install', 'js', 'repeat', 'return', 'tell', 'throw', 'unless', 'while'] },
  { category: 'navigation', label: 'Navigation', commands: ['go'] },
];

// =============================================================================
// Command Schema Info (for content assist and validation)
// =============================================================================

export interface SchemaRoleInfo {
  readonly role: string;
  readonly required: boolean;
  readonly expectedTypes: readonly string[];
}

export interface CommandSchemaInfo {
  readonly action: string;
  readonly category: string;
  readonly roles: readonly SchemaRoleInfo[];
  readonly primaryRole: string;
}

export const COMMAND_SCHEMAS: readonly CommandSchemaInfo[] = [
  { action: 'toggle', category: 'dom-class', roles: [{ role: 'patient', required: true, expectedTypes: ['selector'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'add', category: 'dom-class', roles: [{ role: 'patient', required: true, expectedTypes: ['selector'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'remove', category: 'dom-class', roles: [{ role: 'patient', required: true, expectedTypes: ['selector'] }, { role: 'source', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'put', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'selector', 'reference', 'expression'] }, { role: 'destination', required: true, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'set', category: 'variable', roles: [{ role: 'destination', required: true, expectedTypes: ['selector', 'reference', 'expression'] }, { role: 'patient', required: true, expectedTypes: ['literal', 'expression', 'reference'] }], primaryRole: 'destination' },
  { action: 'show', category: 'dom-visibility', roles: [{ role: 'patient', required: true, expectedTypes: ['selector', 'reference'] }, { role: 'style', required: false, expectedTypes: ['literal'] }], primaryRole: 'patient' },
  { action: 'hide', category: 'dom-visibility', roles: [{ role: 'patient', required: true, expectedTypes: ['selector', 'reference'] }, { role: 'style', required: false, expectedTypes: ['literal'] }], primaryRole: 'patient' },
  { action: 'on', category: 'event', roles: [{ role: 'event', required: true, expectedTypes: ['literal'] }, { role: 'source', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'event' },
  { action: 'trigger', category: 'event', roles: [{ role: 'event', required: true, expectedTypes: ['literal', 'expression'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'event' },
  { action: 'wait', category: 'async', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'expression'] }], primaryRole: 'patient' },
  { action: 'fetch', category: 'async', roles: [{ role: 'source', required: true, expectedTypes: ['literal', 'expression'] }, { role: 'responseType', required: false, expectedTypes: ['literal', 'expression'] }, { role: 'method', required: false, expectedTypes: ['literal'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'source' },
  { action: 'increment', category: 'variable', roles: [{ role: 'patient', required: true, expectedTypes: ['selector', 'reference', 'expression'] }, { role: 'quantity', required: false, expectedTypes: ['literal'] }], primaryRole: 'patient' },
  { action: 'decrement', category: 'variable', roles: [{ role: 'patient', required: true, expectedTypes: ['selector', 'reference', 'expression'] }, { role: 'quantity', required: false, expectedTypes: ['literal'] }], primaryRole: 'patient' },
  { action: 'append', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'selector', 'expression'] }, { role: 'destination', required: true, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'prepend', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'selector', 'expression'] }, { role: 'destination', required: true, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'log', category: 'variable', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'selector', 'reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'get', category: 'variable', roles: [{ role: 'source', required: true, expectedTypes: ['selector', 'reference', 'expression'] }, { role: 'destination', required: false, expectedTypes: ['reference'] }], primaryRole: 'source' },
  { action: 'take', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['selector'] }, { role: 'source', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'make', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'selector'] }], primaryRole: 'patient' },
  { action: 'halt', category: 'control-flow', roles: [{ role: 'patient', required: false, expectedTypes: ['literal', 'reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'settle', category: 'async', roles: [{ role: 'patient', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'throw', category: 'control-flow', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'expression'] }], primaryRole: 'patient' },
  { action: 'send', category: 'event', roles: [{ role: 'event', required: true, expectedTypes: ['literal', 'expression'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'event' },
  { action: 'if', category: 'control-flow', roles: [{ role: 'condition', required: true, expectedTypes: ['expression'] }], primaryRole: 'condition' },
  { action: 'unless', category: 'control-flow', roles: [{ role: 'condition', required: true, expectedTypes: ['expression'] }], primaryRole: 'condition' },
  { action: 'else', category: 'control-flow', roles: [], primaryRole: 'patient' },
  { action: 'repeat', category: 'control-flow', roles: [{ role: 'loopType', required: true, expectedTypes: ['literal'] }, { role: 'quantity', required: false, expectedTypes: ['literal', 'expression'] }, { role: 'event', required: false, expectedTypes: ['literal', 'expression'] }, { role: 'source', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'loopType' },
  { action: 'for', category: 'control-flow', roles: [{ role: 'patient', required: true, expectedTypes: ['reference'] }, { role: 'source', required: true, expectedTypes: ['selector', 'reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'while', category: 'control-flow', roles: [{ role: 'condition', required: true, expectedTypes: ['expression'] }], primaryRole: 'condition' },
  { action: 'continue', category: 'control-flow', roles: [], primaryRole: 'patient' },
  { action: 'go', category: 'navigation', roles: [{ role: 'destination', required: true, expectedTypes: ['literal', 'expression'] }], primaryRole: 'destination' },
  { action: 'transition', category: 'dom-visibility', roles: [{ role: 'patient', required: true, expectedTypes: ['literal'] }, { role: 'goal', required: true, expectedTypes: ['literal', 'expression'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }, { role: 'duration', required: false, expectedTypes: ['literal'] }, { role: 'style', required: false, expectedTypes: ['literal'] }], primaryRole: 'patient' },
  { action: 'clone', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['selector', 'reference'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'focus', category: 'dom-content', roles: [{ role: 'patient', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'blur', category: 'dom-content', roles: [{ role: 'patient', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'call', category: 'control-flow', roles: [{ role: 'patient', required: true, expectedTypes: ['expression', 'reference'] }], primaryRole: 'patient' },
  { action: 'return', category: 'control-flow', roles: [{ role: 'patient', required: false, expectedTypes: ['literal', 'expression', 'reference'] }], primaryRole: 'patient' },
  { action: 'js', category: 'control-flow', roles: [{ role: 'patient', required: false, expectedTypes: ['expression'] }], primaryRole: 'patient' },
  { action: 'async', category: 'async', roles: [], primaryRole: 'patient' },
  { action: 'tell', category: 'control-flow', roles: [{ role: 'destination', required: true, expectedTypes: ['selector', 'reference'] }], primaryRole: 'destination' },
  { action: 'default', category: 'variable', roles: [{ role: 'destination', required: true, expectedTypes: ['reference'] }, { role: 'patient', required: true, expectedTypes: ['literal', 'expression'] }], primaryRole: 'destination' },
  { action: 'init', category: 'control-flow', roles: [], primaryRole: 'patient' },
  { action: 'behavior', category: 'control-flow', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'install', category: 'control-flow', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'reference', 'expression'] }, { role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'measure', category: 'dom-content', roles: [{ role: 'patient', required: false, expectedTypes: ['literal', 'expression'] }, { role: 'source', required: false, expectedTypes: ['selector', 'reference'] }], primaryRole: 'patient' },
  { action: 'swap', category: 'dom-content', roles: [{ role: 'method', required: false, expectedTypes: ['literal'] }, { role: 'destination', required: true, expectedTypes: ['selector', 'reference'] }, { role: 'patient', required: false, expectedTypes: ['literal', 'expression', 'selector'] }], primaryRole: 'destination' },
  { action: 'morph', category: 'dom-content', roles: [{ role: 'destination', required: true, expectedTypes: ['selector', 'reference'] }, { role: 'patient', required: true, expectedTypes: ['literal', 'expression', 'selector'] }], primaryRole: 'destination' },
  { action: 'beep', category: 'variable', roles: [{ role: 'patient', required: false, expectedTypes: ['literal', 'selector', 'reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'break', category: 'control-flow', roles: [], primaryRole: 'patient' },
  { action: 'copy', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'selector', 'reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'exit', category: 'control-flow', roles: [], primaryRole: 'patient' },
  { action: 'pick', category: 'variable', roles: [{ role: 'patient', required: true, expectedTypes: ['literal', 'expression', 'reference'] }, { role: 'source', required: false, expectedTypes: ['reference', 'expression'] }], primaryRole: 'patient' },
  { action: 'render', category: 'dom-content', roles: [{ role: 'patient', required: true, expectedTypes: ['selector', 'reference', 'expression'] }, { role: 'style', required: false, expectedTypes: ['expression', 'reference'] }], primaryRole: 'patient' },
  { action: 'compound', category: 'control-flow', roles: [], primaryRole: 'patient' },
];

/** Maps command action name to its token */
export const COMMAND_TOKEN_MAP: Record<string, TokenType> = {
  'transition': Cmd_transition,
  'increment': Cmd_increment,
  'decrement': Cmd_decrement,
  'continue': Cmd_continue,
  'behavior': Cmd_behavior,
  'compound': Cmd_compound,
  'trigger': Cmd_trigger,
  'prepend': Cmd_prepend,
  'default': Cmd_default,
  'install': Cmd_install,
  'measure': Cmd_measure,
  'toggle': Cmd_toggle,
  'remove': Cmd_remove,
  'append': Cmd_append,
  'settle': Cmd_settle,
  'unless': Cmd_unless,
  'repeat': Cmd_repeat,
  'return': Cmd_return,
  'render': Cmd_render,
  'fetch': Cmd_fetch,
  'throw': Cmd_throw,
  'clone': Cmd_clone,
  'focus': Cmd_focus,
  'async': Cmd_async,
  'morph': Cmd_morph,
  'break': Cmd_break,
  'show': Cmd_show,
  'hide': Cmd_hide,
  'wait': Cmd_wait,
  'take': Cmd_take,
  'make': Cmd_make,
  'halt': Cmd_halt,
  'send': Cmd_send,
  'blur': Cmd_blur,
  'call': Cmd_call,
  'tell': Cmd_tell,
  'init': Cmd_init,
  'swap': Cmd_swap,
  'beep': Cmd_beep,
  'copy': Cmd_copy,
  'exit': Cmd_exit,
  'pick': Cmd_pick,
  'add': Cmd_add,
  'put': Cmd_put,
  'set': Cmd_set,
  'log': Cmd_log,
  'get': Cmd_get,
  'go': Cmd_go,
  'js': Cmd_js,
  'on': Kw_on,
  'if': Kw_if,
  'else': Kw_else,
  'for': Kw_for,
  'while': Kw_while,
};
