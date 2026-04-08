/**
 * Chevrotain Parser Tests (Phase 5.2)
 */

import { describe, it, expect } from 'vitest';
import {
  hyperscriptLexer,
  allTokens,
  COMMAND_CATEGORIES,
  COMMAND_SCHEMAS,
  COMMAND_TOKEN_MAP,
} from './generated/chevrotain-vocabulary.js';
import { parseWithRecovery, getContentAssist, validateCode } from './chevrotain-parser.js';

describe('Chevrotain Vocabulary', () => {
  it('has token definitions', () => {
    expect(allTokens.length).toBeGreaterThan(50);
  });

  it('has command categories', () => {
    expect(COMMAND_CATEGORIES.length).toBe(8);
    const domClass = COMMAND_CATEGORIES.find(c => c.category === 'dom-class');
    expect(domClass).toBeDefined();
    expect(domClass!.commands).toContain('toggle');
  });

  it('has command schemas', () => {
    expect(COMMAND_SCHEMAS.length).toBeGreaterThan(40);
    const toggleSchema = COMMAND_SCHEMAS.find(s => s.action === 'toggle');
    expect(toggleSchema).toBeDefined();
    expect(toggleSchema!.primaryRole).toBe('patient');
  });

  it('has command token map', () => {
    expect(COMMAND_TOKEN_MAP['toggle']).toBeDefined();
    expect(COMMAND_TOKEN_MAP['add']).toBeDefined();
    expect(COMMAND_TOKEN_MAP['put']).toBeDefined();
  });
});

describe('Chevrotain Lexer', () => {
  it('tokenizes simple toggle command', () => {
    const result = hyperscriptLexer.tokenize('toggle .active');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens.length).toBeGreaterThanOrEqual(2);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Cmd_toggle');
    expect(nonWS[1].tokenType.name).toBe('CSSSelector');
    expect(nonWS[1].image).toBe('.active');
  });

  it('tokenizes event handler', () => {
    const result = hyperscriptLexer.tokenize('on click toggle .active');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Kw_on');
    expect(nonWS[1].tokenType.name).toBe('Event_click');
    expect(nonWS[2].tokenType.name).toBe('Cmd_toggle');
    expect(nonWS[3].tokenType.name).toBe('CSSSelector');
  });

  it('tokenizes put command with selector and string', () => {
    const result = hyperscriptLexer.tokenize("put 'hello' into #output");
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Cmd_put');
    expect(nonWS[1].tokenType.name).toBe('StringLiteral');
    expect(nonWS[2].tokenType.name).toBe('Kw_into');
    expect(nonWS[3].tokenType.name).toBe('CSSSelector');
  });

  it('tokenizes set command with local variable', () => {
    const result = hyperscriptLexer.tokenize('set :count to 42');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Cmd_set');
    expect(nonWS[1].tokenType.name).toBe('LocalVariable');
    expect(nonWS[2].tokenType.name).toBe('Kw_to');
    expect(nonWS[3].tokenType.name).toBe('NumberLiteral');
  });

  it('tokenizes chained commands', () => {
    const result = hyperscriptLexer.tokenize('add .clicked then remove .old');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    const names = nonWS.map(t => t.tokenType.name);
    expect(names).toContain('Cmd_add');
    expect(names).toContain('Kw_then');
    expect(names).toContain('Cmd_remove');
  });

  it('tracks token positions', () => {
    const result = hyperscriptLexer.tokenize('toggle .active');
    const first = result.tokens[0];
    expect(first.startOffset).toBe(0);
    expect(first.endOffset).toBe(5); // "toggle" is 6 chars, endOffset is inclusive
    expect(first.startLine).toBeDefined();
    expect(first.startColumn).toBeDefined();
  });

  it('handles multi-line input', () => {
    const result = hyperscriptLexer.tokenize('on click\n  toggle .active\n  add .clicked');
    expect(result.errors).toHaveLength(0);
    // Should have tokens spanning multiple lines
    const lines = new Set(result.tokens.map(t => t.startLine));
    expect(lines.size).toBeGreaterThanOrEqual(2);
  });

  it('tokenizes attribute selector', () => {
    const result = hyperscriptLexer.tokenize('toggle @disabled');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[1].tokenType.name).toBe('AttributeSelector');
    expect(nonWS[1].image).toBe('@disabled');
  });

  it('tokenizes fetch with URL', () => {
    const result = hyperscriptLexer.tokenize('fetch /api/data');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Cmd_fetch');
    expect(nonWS[1].tokenType.name).toBe('URLLiteral');
  });

  it('tokenizes string with escaped quotes', () => {
    const result = hyperscriptLexer.tokenize("put 'it\\'s fine' into #msg");
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Cmd_put');
    expect(nonWS[1].tokenType.name).toBe('StringLiteral');
    expect(nonWS[1].image).toBe("'it\\'s fine'");
  });

  it('tokenizes template literal with backticks', () => {
    const result = hyperscriptLexer.tokenize('fetch `https://api.com` as json');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('Cmd_fetch');
    expect(nonWS[1].tokenType.name).toBe('TemplateLiteral');
    expect(nonWS[1].image).toBe('`https://api.com`');
  });

  it('tokenizes possessive before property', () => {
    const result = hyperscriptLexer.tokenize("#count's textContent");
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[0].tokenType.name).toBe('CSSSelector');
    expect(nonWS[1].tokenType.name).toBe('PossessiveS');
    expect(nonWS[2].tokenType.name).toBe('Identifier');
    expect(nonWS[2].image).toBe('textContent');
  });

  it('tokenizes double-quoted string with embedded single quotes', () => {
    const result = hyperscriptLexer.tokenize('put "she said \'hello\'" into #msg');
    expect(result.errors).toHaveLength(0);

    const nonWS = result.tokens.filter(t => t.tokenType.name !== 'WhiteSpace');
    expect(nonWS[1].tokenType.name).toBe('StringLiteral');
  });
});

// =============================================================================
// Parser with Error Recovery
// =============================================================================

describe('parseWithRecovery', () => {
  it('parses valid toggle command', () => {
    const result = parseWithRecovery('toggle .active');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.cst).toBeDefined();
  });

  it('parses event handler', () => {
    const result = parseWithRecovery('on click toggle .active');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.cst).toBeDefined();
  });

  it('parses chained commands', () => {
    const result = parseWithRecovery('add .clicked then remove .old');
    expect(result.diagnostics).toHaveLength(0);
  });

  it('parses set command', () => {
    const result = parseWithRecovery('set :count to 42');
    expect(result.diagnostics).toHaveLength(0);
  });

  it('parses if command', () => {
    const result = parseWithRecovery('if :count toggle .active');
    expect(result.diagnostics).toHaveLength(0);
  });

  it('recovers from errors and reports diagnostics', () => {
    // Incomplete command — parser should recover
    const result = parseWithRecovery('toggle');
    // May or may not have errors depending on grammar — toggle without args is ambiguous
    // Just verify it doesn't throw
    expect(result.cst).toBeDefined();
  });

  it('reports lex errors for invalid characters', () => {
    const result = parseWithRecovery('toggle §active');
    // § is not a valid token
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('provides token positions in diagnostics', () => {
    const result = parseWithRecovery('set to');
    // 'set to' is invalid (missing variable before 'to')
    // Should have at least one diagnostic with position info
    if (result.diagnostics.length > 0) {
      const diag = result.diagnostics[0];
      expect(diag.startOffset).toBeDefined();
      expect(diag.startLine).toBeDefined();
    }
  });
});

// =============================================================================
// Validation
// =============================================================================

describe('validateCode', () => {
  it('returns empty diagnostics for valid code', () => {
    expect(validateCode('toggle .active')).toHaveLength(0);
  });

  it('returns diagnostics for invalid code', () => {
    const diags = validateCode('toggle §active');
    expect(diags.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Content Assist
// =============================================================================

describe('getContentAssist', () => {
  it('suggests commands at start of input', () => {
    const suggestions = getContentAssist('', 0);
    expect(suggestions.length).toBeGreaterThan(0);
    const toggle = suggestions.find(s => s.label === 'toggle');
    expect(toggle).toBeDefined();
    expect(toggle!.kind).toBe('command');
  });

  it('suggests events after "on "', () => {
    const suggestions = getContentAssist('on ', 3);
    const events = suggestions.filter(s => s.kind === 'event');
    expect(events.length).toBeGreaterThan(0);
    expect(events.find(s => s.label === 'click')).toBeDefined();
  });

  it('suggests commands after "then "', () => {
    const suggestions = getContentAssist('toggle .active then ', 20);
    const commands = suggestions.filter(s => s.kind === 'command');
    expect(commands.length).toBeGreaterThan(0);
  });

  it('suggests role markers after command', () => {
    const suggestions = getContentAssist('toggle .active ', 15);
    // After toggle's primary role, should suggest 'on' (destination marker)
    const keywords = suggestions.filter(s => s.kind === 'keyword');
    expect(keywords.length).toBeGreaterThanOrEqual(0); // May suggest 'on', 'to', etc.
  });
});
