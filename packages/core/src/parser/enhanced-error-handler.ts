/**
 * Enhanced Parser Error Handler
 * Provides better error messages, recovery strategies, and detailed error detection
 */

import type { Token, ParseError } from '../types/core.js';
import { TokenType } from './tokenizer.js';

export interface ErrorContext {
  parsing: 'expression' | 'binary_op' | 'unary_op' | 'call' | 'member' | 'primary' | 'parentheses' | 'string' | 'command';
  expected?: string[];
  operators?: string[];
  lastValidToken?: Token;
}

export interface EnhancedParseError extends ParseError {
  context?: ErrorContext;
  suggestion?: string;
  recovery?: string;
}

export class EnhancedErrorHandler {
  private errors: EnhancedParseError[] = [];
  private tokens: Token[];
  private position: number;

  constructor(tokens: Token[], position: number = 0) {
    this.tokens = tokens;
    this.position = position;
  }

  /**
   * Add an error with enhanced context and suggestions
   */
  addError(message: string, context: ErrorContext, token?: Token): EnhancedParseError {
    const currentToken = token || this.getCurrentToken();
    const enhancedMessage = this.enhanceErrorMessage(message, context, currentToken);
    const suggestion = this.generateSuggestion(context, currentToken);
    const recovery = this.generateRecoveryStrategy(context);

    const error: EnhancedParseError = {
      message: enhancedMessage,
      position: currentToken.start,
      line: currentToken.line,
      column: currentToken.column,
      context,
      suggestion,
      recovery
    };

    this.errors.push(error);
    return error;
  }

  /**
   * Get the most recent error (primary error)
   */
  getPrimaryError(): EnhancedParseError | undefined {
    return this.errors[this.errors.length - 1];
  }

  /**
   * Get all errors collected
   */
  getAllErrors(): EnhancedParseError[] {
    return [...this.errors];
  }

  /**
   * Enhance error message with context-specific information
   */
  private enhanceErrorMessage(message: string, context: ErrorContext, token: Token): string {
    const baseMessage = message;
    
    switch (context.parsing) {
      case 'binary_op':
        if (message.includes('Expected expression after')) {
          const operator = context.operators?.[0] || 'operator';
          return `Expected expression after '${operator}' operator. Binary operators require both left and right operands.`;
        }
        break;

      case 'parentheses':
        if (message.includes('Expected') && message.includes(')')) {
          return `Unclosed parenthesis: expected closing ')' to match opening parenthesis. Check that all parentheses are properly paired.`;
        }
        break;

      case 'member':
        if (message.includes('property')) {
          return `Expected property name after '.' operator. Member access requires an identifier following the dot.`;
        }
        break;

      case 'string':
        if (message.includes('string')) {
          return `Unclosed string literal: expected closing quote. String literals must be properly terminated.`;
        }
        break;

      case 'call':
        if (message.includes('argument')) {
          return `Expected function argument or closing ')'. Function calls require proper argument syntax.`;
        }
        break;

      case 'command':
        if (context.expected?.includes('element')) {
          return `Command requires a target element or CSS selector. Use 'me', 'you', or a selector like '#id' or '.class'.`;
        }
        if (context.expected?.includes('time')) {
          return `Wait command requires a time duration. Use formats like '500ms', '2s', or '1.5seconds'.`;
        }
        break;
    }

    return baseMessage;
  }

  /**
   * Generate helpful suggestions based on context
   */
  private generateSuggestion(context: ErrorContext, token: Token): string | undefined {
    switch (context.parsing) {
      case 'binary_op':
        if (context.operators?.includes('+')) {
          return "Try: '5 + 3' instead of '5 +'";
        }
        if (context.operators?.includes('*')) {
          return "Try: 'a * b' instead of 'a *'";
        }
        break;

      case 'parentheses':
        return "Add closing ')' to match opening parenthesis";

      case 'member':
        return "Add property name after '.', like '.property' or '.method()'";

      case 'string':
        return `Add closing quote: ${token.value.startsWith('"') ? '"' : "'"}`;

      case 'command':
        if (context.expected?.includes('element')) {
          return "Try: 'hide me' or 'hide #modal' or 'hide .dialog'";
        }
        if (context.expected?.includes('time')) {
          return "Try: 'wait 500ms' or 'wait 2s'";
        }
        break;
    }

    // Check for common typos
    if (token.type === TokenType.IDENTIFIER) {
      const suggestions = this.checkTypos(token.value);
      if (suggestions.length > 0) {
        return `Did you mean: ${suggestions.join(', ')}?`;
      }
    }

    return undefined;
  }

  /**
   * Generate recovery strategy suggestions
   */
  private generateRecoveryStrategy(context: ErrorContext): string | undefined {
    switch (context.parsing) {
      case 'binary_op':
        return "Add the missing operand or remove the extra operator";

      case 'parentheses':
        return "Add missing closing parenthesis or remove extra opening parenthesis";

      case 'member':
        return "Complete the member access with a property name";

      case 'string':
        return "Close the string literal with a matching quote";

      case 'command':
        return "Provide the required command arguments";

      default:
        return "Check syntax and ensure all expressions are complete";
    }
  }

  /**
   * Check for common typos and suggest corrections
   */
  private checkTypos(value: string): string[] {
    const suggestions: string[] = [];
    const lowerValue = value.toLowerCase();

    // Common boolean typos
    if (this.isTypo(lowerValue, 'true', 2)) suggestions.push('true');
    if (this.isTypo(lowerValue, 'false', 2)) suggestions.push('false');
    if (this.isTypo(lowerValue, 'null', 2)) suggestions.push('null');

    // Common context variable typos
    if (this.isTypo(lowerValue, 'me', 1)) suggestions.push('me');
    if (this.isTypo(lowerValue, 'it', 1)) suggestions.push('it');
    if (this.isTypo(lowerValue, 'you', 1)) suggestions.push('you');

    // Common command typos
    if (this.isTypo(lowerValue, 'hide', 1)) suggestions.push('hide');
    if (this.isTypo(lowerValue, 'show', 1)) suggestions.push('show');
    if (this.isTypo(lowerValue, 'wait', 1)) suggestions.push('wait');
    if (this.isTypo(lowerValue, 'add', 1)) suggestions.push('add');
    if (this.isTypo(lowerValue, 'remove', 1)) suggestions.push('remove');

    return suggestions;
  }

  /**
   * Check if a value is likely a typo of a target word
   */
  private isTypo(value: string, target: string, maxDistance: number): boolean {
    if (value === target) return false;
    return this.levenshteinDistance(value, target) <= maxDistance;
  }

  /**
   * Calculate Levenshtein distance for typo detection
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Advance to next position
   */
  advance(): void {
    if (this.position < this.tokens.length - 1) {
      this.position++;
    }
  }

  /**
   * Set position to specific index
   */
  setPosition(position: number): void {
    this.position = Math.max(0, Math.min(position, this.tokens.length - 1));
  }

  /**
   * Get current position
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Get current token for error reporting
   */
  private getCurrentToken(): Token {
    if (this.position >= this.tokens.length) {
      // Create a synthetic EOF token
      const lastToken = this.tokens[this.tokens.length - 1];
      return {
        type: 'EOF',
        value: '',
        start: lastToken ? lastToken.end : 0,
        end: lastToken ? lastToken.end : 0,
        line: lastToken ? lastToken.line : 1,
        column: lastToken ? lastToken.column + lastToken.value.length : 1
      };
    }
    return this.tokens[this.position];
  }

  /**
   * Detect specific error patterns in token sequence
   */
  static detectErrorPatterns(tokens: Token[]): EnhancedParseError[] {
    const errors: EnhancedParseError[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const next = tokens[i + 1];

      // Detect consecutive operators
      if (token.type === TokenType.OPERATOR && next?.type === TokenType.OPERATOR) {
        errors.push({
          message: `Consecutive operators '${token.value}' and '${next.value}' are not allowed`,
          position: token.start,
          line: token.line,
          column: token.column,
          context: { parsing: 'binary_op', operators: [token.value, next.value] },
          suggestion: `Remove one operator or add an operand between them`,
          recovery: 'Fix operator sequence'
        });
      }

      // Detect unclosed strings
      if (token.type === TokenType.STRING && !token.value.endsWith('"') && !token.value.endsWith("'")) {
        errors.push({
          message: `Unclosed string literal: ${token.value}`,
          position: token.start,
          line: token.line,
          column: token.column,
          context: { parsing: 'string' },
          suggestion: `Add closing quote: ${token.value.startsWith('"') ? '"' : "'"}`,
          recovery: 'Close the string literal'
        });
      }

      // Detect invalid operator combinations
      if (token.type === TokenType.OPERATOR && (token.value === '++' || token.value === '--')) {
        errors.push({
          message: `Invalid operator '${token.value}'. JavaScript-style increment/decrement operators are not supported`,
          position: token.start,
          line: token.line,
          column: token.column,
          context: { parsing: 'binary_op', operators: [token.value] },
          suggestion: `Use '${token.value === '++' ? 'value + 1' : 'value - 1'}' instead`,
          recovery: 'Replace with valid hyperscript syntax'
        });
      }
    }

    return errors;
  }
}

/**
 * Helper function to create enhanced error handler
 */
export function createEnhancedErrorHandler(tokens: Token[], position: number = 0): EnhancedErrorHandler {
  return new EnhancedErrorHandler(tokens, position);
}