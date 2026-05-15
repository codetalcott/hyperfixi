/**
 * Token Predicates Tests
 * Validates that predicate functions correctly classify tokens
 *
 */

import { describe, it, expect } from 'vitest';
import { tokenize, TokenKind } from './tokenizer';
import {
  TokenPredicates,
  isCommand,
  isKeyword,
  isEvent,
  isContextVar,
  isLogicalOperator,
  isComparisonOperator,
  isIdentifierLike,
  isSelector,
  isLiteral,
  isOperator,
  isReference,
  isPossessive,
  isDot,
  isOpenBracket,
  isOpenParen,
  canStartExpression,
  isCommandTerminator,
  hasValue,
  hasValueIn,
  isTimeExpression,
  isSymbol,
  isString,
  isNumber,
} from './token-predicates';
import type { Token } from '../types/core';

// Helper to create a mock token with TokenKind
function createToken(kind: TokenKind, value: string): Token {
  return { kind, value, start: 0, end: value.length, line: 1, column: 1 };
}

describe('Token Predicates', () => {
  describe('Semantic Predicates', () => {
    describe('isCommand', () => {
      it('should return true for IDENTIFIER that is a command', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'toggle');
        expect(isCommand(token)).toBe(true);
      });

      it('should return false for non-command IDENTIFIER', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'foo');
        expect(isCommand(token)).toBe(false);
      });

      it('should be case-insensitive', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'TOGGLE');
        expect(isCommand(token)).toBe(true);
      });

      it('should recognize all common commands', () => {
        const commands = ['add', 'remove', 'toggle', 'put', 'set', 'get', 'log', 'wait', 'fetch'];
        commands.forEach(cmd => {
          const token = createToken(TokenKind.IDENTIFIER, cmd);
          expect(isCommand(token)).toBe(true);
        });
      });

      it('should return false for non-IDENTIFIER kind', () => {
        const token = createToken(TokenKind.STRING, 'toggle');
        expect(isCommand(token)).toBe(false);
      });
    });

    describe('isKeyword', () => {
      it('should return true for IDENTIFIER that is a keyword', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'then');
        expect(isKeyword(token)).toBe(true);
      });

      it('should recognize common keywords', () => {
        const keywords = ['if', 'else', 'then', 'end', 'on', 'for', 'while', 'until'];
        keywords.forEach(kw => {
          const token = createToken(TokenKind.IDENTIFIER, kw);
          expect(isKeyword(token)).toBe(true);
        });
      });

      it('should return false for non-keywords', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'foo');
        expect(isKeyword(token)).toBe(false);
      });
    });

    describe('isEvent', () => {
      it('should return true for IDENTIFIER that is an event', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'click');
        expect(isEvent(token)).toBe(true);
      });

      it('should recognize common DOM events', () => {
        const events = ['click', 'mouseenter', 'mouseleave', 'focus', 'blur', 'input', 'change'];
        events.forEach(evt => {
          const token = createToken(TokenKind.IDENTIFIER, evt);
          expect(isEvent(token)).toBe(true);
        });
      });

      it('should return false for non-events', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'foo');
        expect(isEvent(token)).toBe(false);
      });
    });

    describe('isContextVar', () => {
      it('should return true for IDENTIFIER that is a context var', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'me');
        expect(isContextVar(token)).toBe(true);
      });

      it('should recognize all context variables', () => {
        const contextVars = ['me', 'it', 'you', 'result', 'my', 'its', 'your'];
        contextVars.forEach(cv => {
          const token = createToken(TokenKind.IDENTIFIER, cv);
          expect(isContextVar(token)).toBe(true);
        });
      });

      it('should return false for non-context vars', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'foo');
        expect(isContextVar(token)).toBe(false);
      });
    });

    describe('isLogicalOperator', () => {
      it('should return true for OPERATOR that is logical', () => {
        const token = createToken(TokenKind.OPERATOR, 'and');
        expect(isLogicalOperator(token)).toBe(true);
      });

      it('should return true for IDENTIFIER that is a logical operator', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'and');
        expect(isLogicalOperator(token)).toBe(true);
      });

      it('should recognize logical operators by value', () => {
        const ops = ['and', 'or', 'not', 'no'];
        ops.forEach(op => {
          const tokenOp = createToken(TokenKind.OPERATOR, op);
          const tokenId = createToken(TokenKind.IDENTIFIER, op);
          expect(isLogicalOperator(tokenOp)).toBe(true);
          expect(isLogicalOperator(tokenId)).toBe(true);
        });
      });
    });

    describe('isComparisonOperator', () => {
      it('should return true for OPERATOR that is comparison', () => {
        const token = createToken(TokenKind.OPERATOR, '==');
        expect(isComparisonOperator(token)).toBe(true);
      });

      it('should recognize comparison operators by value', () => {
        const ops = ['==', '!=', '<', '>', '<=', '>=', 'is', 'contains', 'matches'];
        ops.forEach(op => {
          const token = createToken(TokenKind.OPERATOR, op);
          expect(isComparisonOperator(token)).toBe(true);
        });
      });
    });
  });

  describe('Lexical Predicates', () => {
    describe('isIdentifierLike', () => {
      it('should return true for IDENTIFIER kind', () => {
        expect(isIdentifierLike(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(true);
      });

      it('should return false for STRING kind', () => {
        expect(isIdentifierLike(createToken(TokenKind.STRING, '"hello"'))).toBe(false);
      });

      it('should return false for NUMBER kind', () => {
        expect(isIdentifierLike(createToken(TokenKind.NUMBER, '42'))).toBe(false);
      });
    });

    describe('isSelector', () => {
      it('should return true for SELECTOR kind (ID)', () => {
        expect(isSelector(createToken(TokenKind.SELECTOR, '#myId'))).toBe(true);
      });

      it('should return true for SELECTOR kind (class)', () => {
        expect(isSelector(createToken(TokenKind.SELECTOR, '.myClass'))).toBe(true);
      });

      it('should return true for SELECTOR kind (query reference)', () => {
        expect(isSelector(createToken(TokenKind.SELECTOR, '<button/>'))).toBe(true);
      });

      it('should return false for IDENTIFIER kind', () => {
        expect(isSelector(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(false);
      });
    });

    describe('isLiteral', () => {
      it('should return true for STRING kind', () => {
        expect(isLiteral(createToken(TokenKind.STRING, '"hello"'))).toBe(true);
      });

      it('should return true for NUMBER kind', () => {
        expect(isLiteral(createToken(TokenKind.NUMBER, '42'))).toBe(true);
      });

      it('should return true for TEMPLATE kind', () => {
        expect(isLiteral(createToken(TokenKind.TEMPLATE, '`hello`'))).toBe(true);
      });

      it('should return false for IDENTIFIER kind', () => {
        expect(isLiteral(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(false);
      });
    });

    describe('isOperator', () => {
      it('should return true for OPERATOR kind', () => {
        expect(isOperator(createToken(TokenKind.OPERATOR, '+'))).toBe(true);
      });

      it('should return false for IDENTIFIER kind', () => {
        expect(isOperator(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(false);
      });
    });

    describe('isReference', () => {
      it('should return true for IDENTIFIER kind', () => {
        expect(isReference(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(true);
      });

      it('should return false for STRING kind', () => {
        expect(isReference(createToken(TokenKind.STRING, '"hello"'))).toBe(false);
      });
    });

    describe('isTimeExpression', () => {
      it('should return true for TIME kind', () => {
        expect(isTimeExpression(createToken(TokenKind.TIME, '500ms'))).toBe(true);
      });

      it('should return false for NUMBER kind', () => {
        expect(isTimeExpression(createToken(TokenKind.NUMBER, '500'))).toBe(false);
      });
    });

    describe('isSymbol', () => {
      it('should return true for SYMBOL kind', () => {
        expect(isSymbol(createToken(TokenKind.SYMBOL, '@data-value'))).toBe(true);
      });

      it('should return false for IDENTIFIER kind', () => {
        expect(isSymbol(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(false);
      });
    });
  });

  describe('Value Predicates', () => {
    describe('isPossessive', () => {
      it('should return true for possessive operator', () => {
        expect(isPossessive(createToken(TokenKind.OPERATOR, "'s"))).toBe(true);
      });

      it('should return false for other operators', () => {
        expect(isPossessive(createToken(TokenKind.OPERATOR, '+'))).toBe(false);
      });
    });

    describe('isDot', () => {
      it('should return true for dot operator', () => {
        expect(isDot(createToken(TokenKind.OPERATOR, '.'))).toBe(true);
      });

      it('should return false for other operators', () => {
        expect(isDot(createToken(TokenKind.OPERATOR, '+'))).toBe(false);
      });
    });

    describe('isOpenBracket', () => {
      it('should return true for opening bracket', () => {
        expect(isOpenBracket(createToken(TokenKind.OPERATOR, '['))).toBe(true);
      });

      it('should return false for closing bracket', () => {
        expect(isOpenBracket(createToken(TokenKind.OPERATOR, ']'))).toBe(false);
      });
    });

    describe('isOpenParen', () => {
      it('should return true for opening paren', () => {
        expect(isOpenParen(createToken(TokenKind.OPERATOR, '('))).toBe(true);
      });

      it('should return false for closing paren', () => {
        expect(isOpenParen(createToken(TokenKind.OPERATOR, ')'))).toBe(false);
      });
    });

    describe('hasValue', () => {
      it('should match exact value case-insensitively', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'Toggle');
        expect(hasValue(token, 'toggle')).toBe(true);
        expect(hasValue(token, 'TOGGLE')).toBe(true);
      });

      it('should return false for non-matching value', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'toggle');
        expect(hasValue(token, 'add')).toBe(false);
      });
    });

    describe('hasValueIn', () => {
      it('should match any value in list', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'toggle');
        expect(hasValueIn(token, ['add', 'toggle', 'remove'])).toBe(true);
      });

      it('should return false if not in list', () => {
        const token = createToken(TokenKind.IDENTIFIER, 'toggle');
        expect(hasValueIn(token, ['add', 'remove'])).toBe(false);
      });
    });
  });

  describe('Compound Predicates', () => {
    describe('canStartExpression', () => {
      it('should return true for IDENTIFIER kind', () => {
        expect(canStartExpression(createToken(TokenKind.IDENTIFIER, 'foo'))).toBe(true);
      });

      it('should return true for SELECTOR kind', () => {
        expect(canStartExpression(createToken(TokenKind.SELECTOR, '#id'))).toBe(true);
        expect(canStartExpression(createToken(TokenKind.SELECTOR, '.class'))).toBe(true);
      });

      it('should return true for literals', () => {
        expect(canStartExpression(createToken(TokenKind.STRING, '"hello"'))).toBe(true);
        expect(canStartExpression(createToken(TokenKind.NUMBER, '42'))).toBe(true);
      });

      it('should return true for opening parens/brackets', () => {
        expect(canStartExpression(createToken(TokenKind.OPERATOR, '('))).toBe(true);
        expect(canStartExpression(createToken(TokenKind.OPERATOR, '['))).toBe(true);
      });

      it('should return true for unary operators', () => {
        expect(canStartExpression(createToken(TokenKind.OPERATOR, '-'))).toBe(true);
        expect(canStartExpression(createToken(TokenKind.OPERATOR, '!'))).toBe(true);
      });

      it('should return false for binary-only operators', () => {
        expect(canStartExpression(createToken(TokenKind.OPERATOR, '*'))).toBe(false);
        expect(canStartExpression(createToken(TokenKind.OPERATOR, '/'))).toBe(false);
      });
    });

    describe('isCommandTerminator', () => {
      it('should return true for terminator keywords', () => {
        const terminators = ['then', 'and', 'else', 'end', 'on'];
        terminators.forEach(term => {
          const token = createToken(TokenKind.IDENTIFIER, term);
          expect(isCommandTerminator(token)).toBe(true);
        });
      });

      it('should be case-insensitive', () => {
        expect(isCommandTerminator(createToken(TokenKind.IDENTIFIER, 'THEN'))).toBe(true);
      });

      it('should return false for non-terminators', () => {
        expect(isCommandTerminator(createToken(TokenKind.IDENTIFIER, 'if'))).toBe(false);
      });
    });
  });

  describe('Integration with tokenize()', () => {
    it('should correctly classify tokens from real tokenization', () => {
      const tokens = tokenize('on click toggle .active');

      // 'on' should be keyword (semantically)
      expect(isKeyword(tokens[0])).toBe(true);
      expect(tokens[0].kind).toBe(TokenKind.IDENTIFIER);

      // 'click' should be event (semantically)
      expect(isEvent(tokens[1])).toBe(true);
      expect(tokens[1].kind).toBe(TokenKind.IDENTIFIER);

      // 'toggle' should be command (semantically)
      expect(isCommand(tokens[2])).toBe(true);
      expect(tokens[2].kind).toBe(TokenKind.IDENTIFIER);

      // '.active' should be selector (lexically)
      expect(isSelector(tokens[3])).toBe(true);
      expect(tokens[3].kind).toBe(TokenKind.SELECTOR);
    });

    it('should classify context variables correctly', () => {
      const tokens = tokenize("put me's value into it");

      expect(isContextVar(tokens[1])).toBe(true); // 'me'
      expect(isPossessive(tokens[2])).toBe(true); // "'s"
      expect(isContextVar(tokens[5])).toBe(true); // 'it'
    });

    it('should classify literals correctly', () => {
      const tokens = tokenize('set x to 42');

      expect(isCommand(tokens[0])).toBe(true); // 'set'
      expect(isNumber(tokens[3])).toBe(true); // '42'
    });

    it('should classify time expressions correctly', () => {
      const tokens = tokenize('wait 500ms');

      expect(isCommand(tokens[0])).toBe(true); // 'wait'
      expect(isTimeExpression(tokens[1])).toBe(true); // '500ms'
    });

    it('should classify symbols correctly', () => {
      const tokens = tokenize('get @data-value from #input');

      const symbolToken = tokens.find(t => t.kind === TokenKind.SYMBOL);
      expect(symbolToken).toBeDefined();
      expect(isSymbol(symbolToken!)).toBe(true);
    });
  });

  describe('TokenPredicates namespace export', () => {
    it('should export all predicates via namespace', () => {
      expect(typeof TokenPredicates.isCommand).toBe('function');
      expect(typeof TokenPredicates.isKeyword).toBe('function');
      expect(typeof TokenPredicates.isIdentifierLike).toBe('function');
      expect(typeof TokenPredicates.isSelector).toBe('function');
      expect(typeof TokenPredicates.isLiteral).toBe('function');
      expect(typeof TokenPredicates.canStartExpression).toBe('function');
    });
  });
});
