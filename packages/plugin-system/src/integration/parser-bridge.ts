/**
 * Parser Integration Bridge
 * Bridges plugin-system commands with the core hyperfixi parser
 */

import type { CommandPlugin, ParseContext as PluginParseContext, Token } from '../types';
import { PluginParseError } from '../errors';

/**
 * Extended ParseContext that bridges plugin-system context with core parser context
 * This provides plugin command parsers with access to core parser functionality
 */
export interface ExtendedParseContext extends PluginParseContext {
  // Token navigation
  advance(): Token;
  peek(): Token;
  previous(): Token;
  check(type: string): boolean;
  match(...types: string[]): boolean;
  isAtEnd(): boolean;

  // Expression parsing (delegated to core parser)
  parseExpression?(): any;
  parsePrimary?(): any;

  // Utility
  getPosition(): number;
  consume(type: string, errorMessage: string): Token;

  // Error handling
  addError(message: string): void;
  addWarning(message: string): void;
}

/**
 * Configuration for parser bridge
 */
export interface ParserBridgeConfig {
  /** Whether to allow plugin commands to override built-in commands */
  allowOverrides?: boolean;
  /** Prefix for plugin command names to avoid conflicts */
  commandPrefix?: string;
  /** Custom error handler */
  onParseError?: (error: PluginParseError) => void;
}

/**
 * Result of registering a plugin with the parser
 */
export interface PluginRegistration {
  commandName: string;
  originalName: string;
  parser: (ctx: ExtendedParseContext) => any;
  pattern: RegExp;
}

/**
 * Parser Bridge
 * Provides integration between plugin-system and core hyperfixi parser
 */
export class ParserBridge {
  private registeredCommands = new Map<string, PluginRegistration>();
  private config: Required<ParserBridgeConfig>;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(config: ParserBridgeConfig = {}) {
    this.config = {
      allowOverrides: false,
      commandPrefix: '',
      onParseError: () => {},
      ...config,
    };
  }

  /**
   * Register a command plugin with the parser bridge
   */
  registerCommand(plugin: CommandPlugin): PluginRegistration {
    const commandName = this.config.commandPrefix
      ? `${this.config.commandPrefix}${plugin.name}`
      : plugin.name;

    if (this.registeredCommands.has(commandName) && !this.config.allowOverrides) {
      throw new PluginParseError(
        `Command '${commandName}' is already registered`,
        { input: plugin.name }
      );
    }

    const pattern =
      typeof plugin.pattern === 'string' ? new RegExp(`^${plugin.pattern}`) : plugin.pattern;

    const registration: PluginRegistration = {
      commandName,
      originalName: plugin.name,
      parser: plugin.parse
        ? (ctx: ExtendedParseContext) => plugin.parse!(ctx)
        : this.createDefaultParser(plugin),
      pattern,
    };

    this.registeredCommands.set(commandName, registration);
    return registration;
  }

  /**
   * Unregister a command from the parser bridge
   */
  unregisterCommand(commandName: string): boolean {
    return this.registeredCommands.delete(commandName);
  }

  /**
   * Get a registered command parser
   */
  getCommandParser(commandName: string): PluginRegistration | undefined {
    return this.registeredCommands.get(commandName);
  }

  /**
   * Check if a command is registered
   */
  hasCommand(commandName: string): boolean {
    return this.registeredCommands.has(commandName);
  }

  /**
   * Get all registered command names
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.registeredCommands.keys());
  }

  /**
   * Create an extended parse context from a basic plugin parse context
   * This is used when the plugin doesn't have access to the full parser
   */
  createExtendedContext(baseContext: PluginParseContext): ExtendedParseContext {
    let current = 0;
    const tokens = baseContext.tokens;
    const errors: string[] = [];
    const warnings: string[] = [];

    const ctx: ExtendedParseContext = {
      ...baseContext,

      advance(): Token {
        if (current < tokens.length) {
          current++;
        }
        return tokens[current - 1];
      },

      peek(): Token {
        return tokens[current] || { type: 'eof', value: '', position: baseContext.input.length };
      },

      previous(): Token {
        return tokens[current - 1] || tokens[0];
      },

      check(type: string): boolean {
        if (current >= tokens.length) return false;
        return tokens[current].type === type;
      },

      match(...types: string[]): boolean {
        for (const type of types) {
          if (ctx.check(type)) {
            ctx.advance();
            return true;
          }
        }
        return false;
      },

      isAtEnd(): boolean {
        return current >= tokens.length || tokens[current]?.type === 'eof';
      },

      getPosition(): number {
        return current;
      },

      consume(type: string, errorMessage: string): Token {
        if (ctx.check(type)) {
          return ctx.advance();
        }
        throw new PluginParseError(errorMessage, {
          input: baseContext.input,
          position: current,
          expected: type,
        });
      },

      addError(message: string): void {
        errors.push(message);
      },

      addWarning(message: string): void {
        warnings.push(message);
      },
    };

    // Sync currentToken with position
    Object.defineProperty(ctx, 'currentToken', {
      get: () => tokens[current] || { type: 'eof', value: '', position: baseContext.input.length },
    });

    Object.defineProperty(ctx, 'position', {
      get: () => current,
      set: (value: number) => {
        current = value;
      },
    });

    return ctx;
  }

  /**
   * Wrap a core parser context to be compatible with plugin parse context
   * This is used when integrating with the actual core parser
   */
  wrapCoreParserContext(coreContext: any): ExtendedParseContext {
    // Create a plugin-compatible context that delegates to the core parser
    return {
      input: coreContext.getInputSlice?.(0) || '',
      position: coreContext.getPosition?.() || 0,
      tokens: coreContext.tokens || [],
      currentToken:
        coreContext.peek?.() || { type: 'eof', value: '', position: 0 },

      // Delegate navigation to core parser
      advance: () => coreContext.advance?.(),
      peek: () => coreContext.peek?.(),
      previous: () => coreContext.previous?.(),
      check: (type: string) => coreContext.check?.(type),
      match: (...types: string[]) => coreContext.match?.(...types),
      isAtEnd: () => coreContext.isAtEnd?.(),
      getPosition: () => coreContext.getPosition?.(),
      consume: (type: string, msg: string) => coreContext.consume?.(type, msg),

      // Delegate expression parsing to core parser
      parseExpression: () => coreContext.parseExpression?.(),
      parsePrimary: () => coreContext.parsePrimary?.(),

      // Error handling
      addError: (msg: string) => coreContext.addError?.(msg),
      addWarning: (msg: string) => coreContext.addWarning?.(msg),
    };
  }

  /**
   * Parse a command using a registered plugin parser
   */
  parseCommand(commandName: string, context: ExtendedParseContext): any {
    const registration = this.registeredCommands.get(commandName);
    if (!registration) {
      throw new PluginParseError(`Unknown command: ${commandName}`, {
        input: context.input,
        position: context.position,
      });
    }

    try {
      return registration.parser(context);
    } catch (error) {
      if (error instanceof PluginParseError) {
        this.config.onParseError(error);
        throw error;
      }
      throw new PluginParseError(`Failed to parse command '${commandName}'`, {
        input: context.input,
        position: context.position,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Try to match and parse any registered command
   */
  tryParseAnyCommand(context: ExtendedParseContext): { command: string; result: any } | null {
    const token = context.peek();
    const tokenValue = token.value.toLowerCase();

    for (const [commandName, registration] of this.registeredCommands) {
      if (registration.pattern.test(tokenValue)) {
        const result = this.parseCommand(commandName, context);
        return { command: commandName, result };
      }
    }

    return null;
  }

  /**
   * Create a default parser for plugins that don't provide custom parsing
   * This creates a simple command node with the command name
   */
  private createDefaultParser(plugin: CommandPlugin) {
    return (ctx: ExtendedParseContext): any => {
      const startToken = ctx.advance(); // consume the command token

      // Collect arguments until end of command
      const args: any[] = [];
      while (!ctx.isAtEnd()) {
        const nextToken = ctx.peek();

        // Stop at command terminators
        if (
          nextToken.type === 'keyword' &&
          ['then', 'end', 'else', 'otherwise'].includes(nextToken.value.toLowerCase())
        ) {
          break;
        }

        // Stop at next command
        if (this.isCommandToken(nextToken)) {
          break;
        }

        args.push(ctx.advance());
      }

      // Return a simple command node structure
      return {
        type: 'command',
        name: plugin.name,
        args,
        position: {
          start: startToken.position,
          end: ctx.getPosition(),
        },
      };
    };
  }

  /**
   * Check if a token represents a command
   */
  private isCommandToken(token: Token): boolean {
    if (token.type !== 'identifier' && token.type !== 'keyword') {
      return false;
    }
    const value = token.value.toLowerCase();
    return this.registeredCommands.has(value) || this.isBuiltInCommand(value);
  }

  /**
   * Check if a command name is a built-in hyperscript command
   */
  private isBuiltInCommand(name: string): boolean {
    const builtInCommands = [
      'add',
      'append',
      'async',
      'beep',
      'break',
      'call',
      'continue',
      'copy',
      'decrement',
      'default',
      'exit',
      'fetch',
      'for',
      'get',
      'go',
      'halt',
      'hide',
      'if',
      'increment',
      'install',
      'js',
      'log',
      'make',
      'measure',
      'morph',
      'on',
      'pick',
      'process',
      'push',
      'put',
      'remove',
      'render',
      'repeat',
      'replace',
      'return',
      'send',
      'set',
      'settle',
      'show',
      'swap',
      'take',
      'tell',
      'throw',
      'toggle',
      'transition',
      'trigger',
      'unless',
      'wait',
      'while',
    ];
    return builtInCommands.includes(name);
  }

  /**
   * Get collected errors
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Get collected warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Clear collected errors and warnings
   */
  clearDiagnostics(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Export command registrations for use with core parser
   * Returns a map of command names to parser functions
   */
  exportForCoreParser(): Map<string, (ctx: any) => any> {
    const exports = new Map<string, (ctx: any) => any>();

    for (const [name, registration] of this.registeredCommands) {
      exports.set(name, (coreCtx: any) => {
        const pluginCtx = this.wrapCoreParserContext(coreCtx);
        return registration.parser(pluginCtx);
      });
    }

    return exports;
  }
}

/**
 * Factory function to create a parser bridge with plugins pre-registered
 */
export function createParserBridge(
  plugins: CommandPlugin[],
  config?: ParserBridgeConfig
): ParserBridge {
  const bridge = new ParserBridge(config);

  for (const plugin of plugins) {
    bridge.registerCommand(plugin);
  }

  return bridge;
}

/**
 * Simple tokenizer for basic plugin parsing
 * Used when the full parser is not available
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Skip whitespace
    if (/\s/.test(input[pos])) {
      pos++;
      continue;
    }

    // String literals
    if (input[pos] === '"' || input[pos] === "'") {
      const quote = input[pos];
      const start = pos;
      pos++;
      while (pos < input.length && input[pos] !== quote) {
        if (input[pos] === '\\') pos++; // skip escaped char
        pos++;
      }
      pos++; // consume closing quote
      tokens.push({
        type: 'string',
        value: input.slice(start, pos),
        position: start,
      });
      continue;
    }

    // Numbers
    if (/\d/.test(input[pos])) {
      const start = pos;
      while (pos < input.length && /[\d.]/.test(input[pos])) {
        pos++;
      }
      tokens.push({
        type: 'number',
        value: input.slice(start, pos),
        position: start,
      });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(input[pos])) {
      const start = pos;
      while (pos < input.length && /[a-zA-Z0-9_$-]/.test(input[pos])) {
        pos++;
      }
      const value = input.slice(start, pos);
      tokens.push({
        type: isKeyword(value) ? 'keyword' : 'identifier',
        value,
        position: start,
      });
      continue;
    }

    // Selectors (# and .)
    if (input[pos] === '#' || input[pos] === '.') {
      const start = pos;
      pos++;
      while (pos < input.length && /[a-zA-Z0-9_-]/.test(input[pos])) {
        pos++;
      }
      tokens.push({
        type: 'selector',
        value: input.slice(start, pos),
        position: start,
      });
      continue;
    }

    // Operators and symbols
    const opStart = pos;
    tokens.push({
      type: 'symbol',
      value: input[pos],
      position: opStart,
    });
    pos++;
  }

  // Add EOF token
  tokens.push({
    type: 'eof',
    value: '',
    position: input.length,
  });

  return tokens;
}

/**
 * Check if a word is a hyperscript keyword
 */
function isKeyword(word: string): boolean {
  const keywords = [
    'on',
    'then',
    'end',
    'else',
    'otherwise',
    'if',
    'unless',
    'for',
    'in',
    'to',
    'from',
    'by',
    'with',
    'as',
    'at',
    'into',
    'onto',
    'and',
    'or',
    'not',
    'is',
    'of',
    'the',
    'a',
    'an',
    'true',
    'false',
    'null',
    'undefined',
    'me',
    'my',
    'it',
    'its',
    'you',
    'your',
    'result',
    'event',
  ];
  return keywords.includes(word.toLowerCase());
}
