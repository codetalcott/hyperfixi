/**
 * Basic HyperScript Parser
 * 
 * Implements a simple recursive descent parser for hyperscript syntax
 * Compatible with _hyperscript parser patterns
 */

import { Lexer, Tokens } from './tokenizer';
import type { ASTNode, ParseError, ParseResult } from './types/core';

/**
 * AST Node types for hyperscript
 */
export interface HyperscriptASTNode extends ASTNode {
  type: string;
  source?: string;
  children?: HyperscriptASTNode[];
}

export interface CommandNode extends HyperscriptASTNode {
  type: 'command';
  name: string;
  args: any[];
}

export interface ExpressionNode extends HyperscriptASTNode {
  type: 'expression';
  operator?: string;
  operands?: HyperscriptASTNode[];
  value?: any;
}

export interface FeatureNode extends HyperscriptASTNode {
  type: 'feature';
  keyword: string;
  body: HyperscriptASTNode[];
}

export interface ProgramNode extends HyperscriptASTNode {
  type: 'program';
  features: FeatureNode[];
  source: string;
}

/**
 * Parser class for hyperscript syntax
 */
export class HyperscriptParser {
  private tokens: Tokens;
  private source: string;

  constructor(source: string) {
    this.source = source;
    this.tokens = Lexer.tokenize(source);
  }

  /**
   * Parse a complete hyperscript program
   */
  parse(): ParseResult<ProgramNode> {
    try {
      const features: FeatureNode[] = [];
      
      while (this.tokens.hasMore() && this.tokens.currentToken().type !== 'EOF') {
        const feature = this.parseFeature();
        if (feature) {
          features.push(feature);
        }
      }

      const program: ProgramNode = {
        type: 'program',
        features,
        source: this.source,
        children: features
      };

      return {
        success: true,
        node: program,
        tokens: this.tokens.list
      };
    } catch (error) {
      const parseError: ParseError = {
        name: 'ParseError',
        message: error instanceof Error ? error.message : 'Unknown parse error',
        line: this.tokens.currentToken().line,
        column: this.tokens.currentToken().column,
        source: this.source
      };

      return {
        success: false,
        error: parseError,
        tokens: this.tokens.list
      };
    }
  }

  /**
   * Parse a hyperscript feature (on, def, etc.)
   */
  private parseFeature(): FeatureNode | null {
    const token = this.tokens.currentToken();
    
    if (token.type !== 'IDENTIFIER') {
      return null;
    }

    const keyword = token.value;

    // Handle different feature types
    switch (keyword) {
      case 'on':
        return this.parseOnFeature();
      case 'def':
        return this.parseDefFeature();
      case 'init':
        return this.parseInitFeature();
      default:
        // Try to parse as a command
        return this.parseCommandAsFeature();
    }
  }

  /**
   * Parse an 'on' event feature
   */
  private parseOnFeature(): FeatureNode {
    this.tokens.requireToken('on');

    // Parse event names (click, submit, etc.)
    // @ts-expect-error - Token captured for future validation
    const _eventToken = this.tokens.requireTokenType('IDENTIFIER');

    // Parse optional event details (from, etc.)
    const body: HyperscriptASTNode[] = [];
    
    // Parse commands until end of feature
    while (this.tokens.hasMore() && 
           this.tokens.currentToken().type !== 'EOF' &&
           !this.isFeatureStart()) {
      const command = this.parseCommand();
      if (command) {
        body.push(command);
      } else {
        break;
      }
    }

    return {
      type: 'feature',
      keyword: 'on',
      body,
      children: body,
      source: this.extractSource()
    };
  }

  /**
   * Parse a 'def' function definition feature
   */
  private parseDefFeature(): FeatureNode {
    this.tokens.requireToken('def');

    // @ts-expect-error - Token captured for future validation
    const _nameToken = this.tokens.requireTokenType('IDENTIFIER');

    // Parse parameter list
    this.tokens.requireOpToken('(');
    const params: string[] = [];
    
    while (this.tokens.currentToken().value !== ')') {
      if (this.tokens.currentToken().type === 'IDENTIFIER') {
        params.push(this.tokens.consumeToken().value);
        if (this.tokens.currentToken().value === ',') {
          this.tokens.consumeToken();
        }
      } else {
        break;
      }
    }
    
    this.tokens.requireOpToken(')');

    // Parse function body until 'end'
    const body: HyperscriptASTNode[] = [];
    while (this.tokens.hasMore() && this.tokens.currentToken().value !== 'end') {
      const command = this.parseCommand();
      if (command) {
        body.push(command);
      } else {
        break;
      }
    }

    this.tokens.requireToken('end');

    return {
      type: 'feature',
      keyword: 'def',
      body,
      children: body,
      source: this.extractSource()
    };
  }

  /**
   * Parse an 'init' initialization feature
   */
  private parseInitFeature(): FeatureNode {
    this.tokens.requireToken('init');
    
    const body: HyperscriptASTNode[] = [];
    
    // Parse commands until end of feature
    while (this.tokens.hasMore() && 
           this.tokens.currentToken().type !== 'EOF' &&
           !this.isFeatureStart()) {
      const command = this.parseCommand();
      if (command) {
        body.push(command);
      } else {
        break;
      }
    }

    return {
      type: 'feature',
      keyword: 'init',
      body,
      children: body,
      source: this.extractSource()
    };
  }

  /**
   * Parse a command as a top-level feature
   */
  private parseCommandAsFeature(): FeatureNode | null {
    const command = this.parseCommand();
    if (!command) {
      return null;
    }

    return {
      type: 'feature',
      keyword: 'command',
      body: [command],
      children: [command],
      source: this.extractSource()
    };
  }

  /**
   * Parse a hyperscript command
   */
  private parseCommand(): CommandNode | null {
    const token = this.tokens.currentToken();
    
    if (token.type !== 'IDENTIFIER') {
      return null;
    }

    const commandName = token.value;
    this.tokens.consumeToken();

    // Parse command arguments based on command type
    const args: any[] = this.parseCommandArgs(commandName);

    return {
      type: 'command',
      name: commandName,
      args,
      source: this.extractSource()
    };
  }

  /**
   * Parse arguments for a specific command
   */
  private parseCommandArgs(commandName: string): any[] {

    switch (commandName) {
      case 'put':
        return this.parsePutArgs();
      case 'add':
        return this.parseAddArgs();
      case 'remove':
        return this.parseRemoveArgs();
      case 'toggle':
        return this.parseToggleArgs();
      case 'set':
        return this.parseSetArgs();
      case 'log':
        return this.parseLogArgs();
      default:
        // Parse generic arguments until statement end
        return this.parseGenericArgs();
    }
  }

  /**
   * Parse PUT command arguments: put <expression> into <target>
   */
  private parsePutArgs(): any[] {
    const value = this.parseExpression();
    this.tokens.requireToken('into');
    const target = this.parseExpression();
    return [value, target];
  }

  /**
   * Parse ADD command arguments: add <class/attribute> to <target>
   */
  private parseAddArgs(): any[] {
    const item = this.parseExpression();
    this.tokens.requireToken('to');
    const target = this.parseExpression();
    return [item, target];
  }

  /**
   * Parse REMOVE command arguments: remove <class/attribute> from <target>
   */
  private parseRemoveArgs(): any[] {
    const item = this.parseExpression();
    this.tokens.requireToken('from');
    const target = this.parseExpression();
    return [item, target];
  }

  /**
   * Parse TOGGLE command arguments: toggle <class/attribute> on <target>
   */
  private parseToggleArgs(): any[] {
    const item = this.parseExpression();
    if (this.tokens.matchToken('on')) {
      const target = this.parseExpression();
      return [item, target];
    }
    return [item];
  }

  /**
   * Parse SET command arguments: set <variable> to <value>
   */
  private parseSetArgs(): any[] {
    const variable = this.parseExpression();
    this.tokens.requireToken('to');
    const value = this.parseExpression();
    return [variable, value];
  }

  /**
   * Parse LOG command arguments: log <expression>
   */
  private parseLogArgs(): any[] {
    const expression = this.parseExpression();
    return [expression];
  }

  /**
   * Parse generic command arguments
   */
  private parseGenericArgs(): any[] {
    const args: any[] = [];
    
    while (this.tokens.hasMore() && 
           this.tokens.currentToken().type !== 'EOF' &&
           !this.isStatementEnd()) {
      const expr = this.parseExpression();
      if (expr) {
        args.push(expr);
      } else {
        break;
      }
    }

    return args;
  }

  /**
   * Parse a hyperscript expression
   */
  private parseExpression(): ExpressionNode | null {
    return this.parseOrExpression();
  }

  /**
   * Parse OR expressions (lowest precedence)
   */
  private parseOrExpression(): ExpressionNode | null {
    let left = this.parseAndExpression();
    
    while (this.tokens.matchToken('or')) {
      const right = this.parseAndExpression();
      left = {
        type: 'expression',
        operator: 'or',
        operands: [left!, right!],
        source: this.extractSource()
      };
    }
    
    return left;
  }

  /**
   * Parse AND expressions
   */
  private parseAndExpression(): ExpressionNode | null {
    let left = this.parseEqualityExpression();
    
    while (this.tokens.matchToken('and')) {
      const right = this.parseEqualityExpression();
      left = {
        type: 'expression',
        operator: 'and',
        operands: [left!, right!],
        source: this.extractSource()
      };
    }
    
    return left;
  }

  /**
   * Parse equality expressions (==, !=)
   */
  private parseEqualityExpression(): ExpressionNode | null {
    let left = this.parseComparisonExpression();
    
    while (this.tokens.currentToken().type === 'EQ' || 
           this.tokens.currentToken().type === 'NEQ') {
      const op = this.tokens.consumeToken();
      const right = this.parseComparisonExpression();
      left = {
        type: 'expression',
        operator: op.value,
        operands: [left!, right!],
        source: this.extractSource()
      };
    }
    
    return left;
  }

  /**
   * Parse comparison expressions (<, >, <=, >=)
   */
  private parseComparisonExpression(): ExpressionNode | null {
    let left = this.parseAdditiveExpression();
    
    while (this.tokens.currentToken().type === 'L_ANG' || 
           this.tokens.currentToken().type === 'R_ANG' ||
           this.tokens.currentToken().type === 'LTE_ANG' ||
           this.tokens.currentToken().type === 'GTE_ANG') {
      const op = this.tokens.consumeToken();
      const right = this.parseAdditiveExpression();
      left = {
        type: 'expression',
        operator: op.value,
        operands: [left!, right!],
        source: this.extractSource()
      };
    }
    
    return left;
  }

  /**
   * Parse additive expressions (+, -)
   */
  private parseAdditiveExpression(): ExpressionNode | null {
    let left = this.parseMultiplicativeExpression();
    
    while (this.tokens.currentToken().type === 'PLUS' || 
           this.tokens.currentToken().type === 'MINUS') {
      const op = this.tokens.consumeToken();
      const right = this.parseMultiplicativeExpression();
      left = {
        type: 'expression',
        operator: op.value,
        operands: [left!, right!],
        source: this.extractSource()
      };
    }
    
    return left;
  }

  /**
   * Parse multiplicative expressions (*, /, %)
   */
  private parseMultiplicativeExpression(): ExpressionNode | null {
    let left = this.parsePrimaryExpression();
    
    while (this.tokens.currentToken().type === 'MULTIPLY' || 
           this.tokens.currentToken().type === 'DIVIDE' ||
           this.tokens.currentToken().type === 'PERCENT') {
      const op = this.tokens.consumeToken();
      const right = this.parsePrimaryExpression();
      left = {
        type: 'expression',
        operator: op.value,
        operands: [left!, right!],
        source: this.extractSource()
      };
    }
    
    return left;
  }

  /**
   * Parse primary expressions (identifiers, literals, parenthesized expressions)
   */
  private parsePrimaryExpression(): ExpressionNode | null {
    const token = this.tokens.currentToken();

    switch (token.type) {
      case 'NUMBER':
        this.tokens.consumeToken();
        return {
          type: 'expression',
          value: parseFloat(token.value),
          source: this.extractSource()
        };

      case 'STRING':
        this.tokens.consumeToken();
        // Remove quotes from string value
        const stringValue = token.value.slice(1, -1);
        return {
          type: 'expression',
          value: stringValue,
          source: this.extractSource()
        };

      case 'IDENTIFIER':
        return this.parseIdentifierExpression();

      case 'CLASS_REF':
      case 'ID_REF':
      case 'ATTRIBUTE_REF':
        this.tokens.consumeToken();
        return {
          type: 'expression',
          value: token.value,
          source: this.extractSource()
        };

      case 'L_PAREN':
        return this.parseParenthesizedExpression();

      default:
        return null;
    }
  }

  /**
   * Parse identifier expressions (including possessive)
   */
  private parseIdentifierExpression(): ExpressionNode | null {
    const nameToken = this.tokens.requireTokenType('IDENTIFIER');
    let expr: ExpressionNode = {
      type: 'expression',
      value: nameToken.value,
      source: this.extractSource()
    };

    // Handle possessive expressions (foo's bar)
    if (this.tokens.currentToken().type === "APOSTROPHE" || this.tokens.currentToken().value === "'") {
      this.tokens.consumeToken(); // consume apostrophe
      this.tokens.requireToken('s');
      const property = this.tokens.requireTokenType('IDENTIFIER');
      
      expr = {
        type: 'expression',
        operator: 'possessive',
        operands: [expr, {
          type: 'expression',
          value: property.value,
          source: this.extractSource()
        }],
        source: this.extractSource()
      };
    }

    return expr;
  }

  /**
   * Parse parenthesized expressions
   */
  private parseParenthesizedExpression(): ExpressionNode | null {
    this.tokens.requireOpToken('(');
    const expr = this.parseExpression();
    this.tokens.requireOpToken(')');
    return expr;
  }

  /**
   * Check if current token starts a new feature
   */
  private isFeatureStart(): boolean {
    const token = this.tokens.currentToken();
    return token.type === 'IDENTIFIER' && 
           ['on', 'def', 'init'].includes(token.value);
  }

  /**
   * Check if current position is end of a statement
   */
  private isStatementEnd(): boolean {
    const token = this.tokens.currentToken();
    return token.type === 'EOF' || 
           this.isFeatureStart() ||
           token.value === 'then' ||
           token.value === 'else' ||
           token.value === 'end';
  }

  /**
   * Extract source text for current position (placeholder)
   */
  private extractSource(): string {
    return ''; // TODO: Implement source extraction
  }
}

/**
 * Parse hyperscript source code
 */
export function parseHyperscript(source: string): ParseResult<ProgramNode> {
  const parser = new HyperscriptParser(source);
  return parser.parse();
}