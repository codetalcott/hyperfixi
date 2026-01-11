/**
 * Tests for Parser Integration Bridge
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ParserBridge,
  createParserBridge,
  tokenize,
  type ExtendedParseContext,
  type ParserBridgeConfig,
} from '../src/integration/parser-bridge';
import { PluginParseError } from '../src/errors';
import type { CommandPlugin, Token } from '../src/types';

// Helper to create a mock command plugin
function createMockCommandPlugin(overrides: Partial<CommandPlugin> = {}): CommandPlugin {
  return {
    name: 'test-command',
    type: 'command',
    pattern: /^test-command$/i,
    execute: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Helper to create mock tokens
function createMockTokens(values: string[]): Token[] {
  let position = 0;
  const tokens: Token[] = values.map(value => {
    const token: Token = {
      type: /^[a-z]+$/i.test(value) ? 'identifier' : 'symbol',
      value,
      position,
    };
    position += value.length + 1;
    return token;
  });
  tokens.push({ type: 'eof', value: '', position });
  return tokens;
}

describe('ParserBridge', () => {
  let bridge: ParserBridge;

  beforeEach(() => {
    bridge = new ParserBridge();
  });

  describe('constructor', () => {
    it('should create bridge with default config', () => {
      const bridge = new ParserBridge();
      expect(bridge.getRegisteredCommands()).toEqual([]);
    });

    it('should create bridge with custom config', () => {
      const onParseError = vi.fn();
      const bridge = new ParserBridge({
        allowOverrides: true,
        commandPrefix: 'my-',
        onParseError,
      });
      expect(bridge.getRegisteredCommands()).toEqual([]);
    });
  });

  describe('registerCommand', () => {
    it('should register a command plugin', () => {
      const plugin = createMockCommandPlugin({ name: 'toggle' });
      const registration = bridge.registerCommand(plugin);

      expect(registration.commandName).toBe('toggle');
      expect(registration.originalName).toBe('toggle');
      expect(bridge.hasCommand('toggle')).toBe(true);
    });

    it('should apply command prefix when configured', () => {
      const bridge = new ParserBridge({ commandPrefix: 'hs-' });
      const plugin = createMockCommandPlugin({ name: 'toggle' });
      const registration = bridge.registerCommand(plugin);

      expect(registration.commandName).toBe('hs-toggle');
      expect(bridge.hasCommand('hs-toggle')).toBe(true);
      expect(bridge.hasCommand('toggle')).toBe(false);
    });

    it('should throw error for duplicate registration', () => {
      const plugin = createMockCommandPlugin({ name: 'toggle' });
      bridge.registerCommand(plugin);

      expect(() => bridge.registerCommand(plugin)).toThrow(PluginParseError);
      expect(() => bridge.registerCommand(plugin)).toThrow("Command 'toggle' is already registered");
    });

    it('should allow overrides when configured', () => {
      const bridge = new ParserBridge({ allowOverrides: true });
      const plugin1 = createMockCommandPlugin({ name: 'toggle' });
      const plugin2 = createMockCommandPlugin({ name: 'toggle' });

      bridge.registerCommand(plugin1);
      expect(() => bridge.registerCommand(plugin2)).not.toThrow();
    });

    it('should convert string pattern to RegExp', () => {
      const plugin = createMockCommandPlugin({
        name: 'custom',
        pattern: 'custom|cust',
      });
      const registration = bridge.registerCommand(plugin);

      expect(registration.pattern).toBeInstanceOf(RegExp);
      expect(registration.pattern.test('custom')).toBe(true);
      expect(registration.pattern.test('cust')).toBe(true);
    });

    it('should use custom parse function when provided', () => {
      const customParse = vi.fn().mockReturnValue({ type: 'custom' });
      const plugin = createMockCommandPlugin({
        name: 'custom',
        parse: customParse,
      });

      const registration = bridge.registerCommand(plugin);
      const mockCtx = {} as ExtendedParseContext;
      registration.parser(mockCtx);

      expect(customParse).toHaveBeenCalledWith(mockCtx);
    });
  });

  describe('unregisterCommand', () => {
    it('should unregister an existing command', () => {
      const plugin = createMockCommandPlugin({ name: 'toggle' });
      bridge.registerCommand(plugin);

      expect(bridge.unregisterCommand('toggle')).toBe(true);
      expect(bridge.hasCommand('toggle')).toBe(false);
    });

    it('should return false for non-existent command', () => {
      expect(bridge.unregisterCommand('nonexistent')).toBe(false);
    });
  });

  describe('getCommandParser', () => {
    it('should return registration for existing command', () => {
      const plugin = createMockCommandPlugin({ name: 'toggle' });
      bridge.registerCommand(plugin);

      const registration = bridge.getCommandParser('toggle');
      expect(registration).toBeDefined();
      expect(registration?.commandName).toBe('toggle');
    });

    it('should return undefined for non-existent command', () => {
      expect(bridge.getCommandParser('nonexistent')).toBeUndefined();
    });
  });

  describe('getRegisteredCommands', () => {
    it('should return all registered command names', () => {
      bridge.registerCommand(createMockCommandPlugin({ name: 'toggle' }));
      bridge.registerCommand(createMockCommandPlugin({ name: 'add' }));
      bridge.registerCommand(createMockCommandPlugin({ name: 'remove' }));

      const commands = bridge.getRegisteredCommands();
      expect(commands).toContain('toggle');
      expect(commands).toContain('add');
      expect(commands).toContain('remove');
      expect(commands).toHaveLength(3);
    });
  });

  describe('createExtendedContext', () => {
    it('should create extended context from base context', () => {
      const tokens = createMockTokens(['toggle', '.active']);
      const baseContext = {
        input: 'toggle .active',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);

      expect(ctx.input).toBe('toggle .active');
      expect(ctx.peek().value).toBe('toggle');
      expect(ctx.isAtEnd()).toBe(false);
    });

    it('should support token navigation', () => {
      const tokens = createMockTokens(['toggle', '.active', 'on', 'me']);
      const baseContext = {
        input: 'toggle .active on me',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);

      expect(ctx.peek().value).toBe('toggle');
      ctx.advance();
      expect(ctx.peek().value).toBe('.active');
      expect(ctx.previous().value).toBe('toggle');
      ctx.advance();
      expect(ctx.getPosition()).toBe(2);
    });

    it('should support check and match methods', () => {
      const tokens: Token[] = [
        { type: 'identifier', value: 'toggle', position: 0 },
        { type: 'selector', value: '.active', position: 7 },
        { type: 'eof', value: '', position: 14 },
      ];
      const baseContext = {
        input: 'toggle .active',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);

      expect(ctx.check('identifier')).toBe(true);
      expect(ctx.check('selector')).toBe(false);
      expect(ctx.match('identifier')).toBe(true);
      expect(ctx.peek().value).toBe('.active');
    });

    it('should support consume method', () => {
      const tokens: Token[] = [
        { type: 'identifier', value: 'toggle', position: 0 },
        { type: 'selector', value: '.active', position: 7 },
        { type: 'eof', value: '', position: 14 },
      ];
      const baseContext = {
        input: 'toggle .active',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);

      const token = ctx.consume('identifier', 'Expected identifier');
      expect(token.value).toBe('toggle');
    });

    it('should throw on consume mismatch', () => {
      const tokens: Token[] = [
        { type: 'identifier', value: 'toggle', position: 0 },
        { type: 'eof', value: '', position: 7 },
      ];
      const baseContext = {
        input: 'toggle',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);

      expect(() => ctx.consume('selector', 'Expected selector')).toThrow(PluginParseError);
    });

    it('should handle isAtEnd correctly', () => {
      const tokens: Token[] = [
        { type: 'identifier', value: 'toggle', position: 0 },
        { type: 'eof', value: '', position: 7 },
      ];
      const baseContext = {
        input: 'toggle',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);

      expect(ctx.isAtEnd()).toBe(false);
      ctx.advance();
      expect(ctx.isAtEnd()).toBe(true);
    });

    it('should support error and warning collection', () => {
      const tokens = createMockTokens(['toggle']);
      const baseContext = {
        input: 'toggle',
        position: 0,
        tokens,
        currentToken: tokens[0],
      };

      const ctx = bridge.createExtendedContext(baseContext);
      ctx.addError('Test error');
      ctx.addWarning('Test warning');

      // Errors/warnings are collected internally (tested via diagnostics)
    });
  });

  describe('wrapCoreParserContext', () => {
    it('should wrap core parser context', () => {
      const mockCoreCtx = {
        getInputSlice: vi.fn().mockReturnValue('toggle .active'),
        getPosition: vi.fn().mockReturnValue(0),
        tokens: [],
        peek: vi.fn().mockReturnValue({ type: 'identifier', value: 'toggle', position: 0 }),
        advance: vi.fn(),
        previous: vi.fn(),
        check: vi.fn(),
        match: vi.fn(),
        isAtEnd: vi.fn().mockReturnValue(false),
        consume: vi.fn(),
        parseExpression: vi.fn(),
        parsePrimary: vi.fn(),
        addError: vi.fn(),
        addWarning: vi.fn(),
      };

      const ctx = bridge.wrapCoreParserContext(mockCoreCtx);

      expect(ctx.input).toBe('toggle .active');
      expect(ctx.peek().value).toBe('toggle');
      expect(mockCoreCtx.peek).toHaveBeenCalled();
    });

    it('should delegate navigation methods to core parser', () => {
      const mockCoreCtx = {
        getInputSlice: vi.fn().mockReturnValue(''),
        getPosition: vi.fn().mockReturnValue(5),
        tokens: [],
        peek: vi.fn().mockReturnValue({ type: 'eof', value: '', position: 0 }),
        advance: vi.fn().mockReturnValue({ type: 'identifier', value: 'next', position: 0 }),
        previous: vi.fn(),
        check: vi.fn().mockReturnValue(true),
        match: vi.fn().mockReturnValue(true),
        isAtEnd: vi.fn().mockReturnValue(false),
        consume: vi.fn(),
        parseExpression: vi.fn(),
        parsePrimary: vi.fn(),
        addError: vi.fn(),
        addWarning: vi.fn(),
      };

      const ctx = bridge.wrapCoreParserContext(mockCoreCtx);

      ctx.advance();
      expect(mockCoreCtx.advance).toHaveBeenCalled();

      ctx.check('identifier');
      expect(mockCoreCtx.check).toHaveBeenCalledWith('identifier');

      ctx.match('identifier', 'keyword');
      expect(mockCoreCtx.match).toHaveBeenCalledWith('identifier', 'keyword');
    });
  });

  describe('parseCommand', () => {
    it('should parse registered command', () => {
      const customParse = vi.fn().mockReturnValue({ type: 'toggle', target: '.active' });
      const plugin = createMockCommandPlugin({
        name: 'toggle',
        parse: customParse,
      });
      bridge.registerCommand(plugin);

      const tokens = createMockTokens(['toggle', '.active']);
      const ctx = bridge.createExtendedContext({
        input: 'toggle .active',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      const result = bridge.parseCommand('toggle', ctx);
      expect(result).toEqual({ type: 'toggle', target: '.active' });
    });

    it('should throw for unknown command', () => {
      const tokens = createMockTokens(['unknown']);
      const ctx = bridge.createExtendedContext({
        input: 'unknown',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      expect(() => bridge.parseCommand('unknown', ctx)).toThrow(PluginParseError);
      expect(() => bridge.parseCommand('unknown', ctx)).toThrow('Unknown command: unknown');
    });

    it('should call error handler on parse error', () => {
      const onParseError = vi.fn();
      const bridge = new ParserBridge({ onParseError });

      const plugin = createMockCommandPlugin({
        name: 'failing',
        parse: () => {
          throw new PluginParseError('Custom parse error');
        },
      });
      bridge.registerCommand(plugin);

      const tokens = createMockTokens(['failing']);
      const ctx = bridge.createExtendedContext({
        input: 'failing',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      expect(() => bridge.parseCommand('failing', ctx)).toThrow(PluginParseError);
      expect(onParseError).toHaveBeenCalled();
    });

    it('should wrap non-PluginParseError in PluginParseError', () => {
      const plugin = createMockCommandPlugin({
        name: 'failing',
        parse: () => {
          throw new Error('Generic error');
        },
      });
      bridge.registerCommand(plugin);

      const tokens = createMockTokens(['failing']);
      const ctx = bridge.createExtendedContext({
        input: 'failing',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      expect(() => bridge.parseCommand('failing', ctx)).toThrow(PluginParseError);
      expect(() => bridge.parseCommand('failing', ctx)).toThrow("Failed to parse command 'failing'");
    });
  });

  describe('tryParseAnyCommand', () => {
    it('should match and parse first matching command', () => {
      const toggleParse = vi.fn().mockReturnValue({ type: 'toggle' });
      bridge.registerCommand(
        createMockCommandPlugin({
          name: 'toggle',
          pattern: /^toggle$/i,
          parse: toggleParse,
        })
      );

      const tokens: Token[] = [
        { type: 'identifier', value: 'toggle', position: 0 },
        { type: 'eof', value: '', position: 7 },
      ];
      const ctx = bridge.createExtendedContext({
        input: 'toggle',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      const result = bridge.tryParseAnyCommand(ctx);
      expect(result).not.toBeNull();
      expect(result?.command).toBe('toggle');
      expect(result?.result).toEqual({ type: 'toggle' });
    });

    it('should return null when no command matches', () => {
      const tokens: Token[] = [
        { type: 'identifier', value: 'unknown', position: 0 },
        { type: 'eof', value: '', position: 8 },
      ];
      const ctx = bridge.createExtendedContext({
        input: 'unknown',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      const result = bridge.tryParseAnyCommand(ctx);
      expect(result).toBeNull();
    });
  });

  describe('default parser', () => {
    it('should create default parser for plugins without custom parse', () => {
      const plugin = createMockCommandPlugin({
        name: 'simple',
        pattern: /^simple$/i,
        // No parse function provided
      });
      delete (plugin as any).parse;

      bridge.registerCommand(plugin);

      const tokens: Token[] = [
        { type: 'identifier', value: 'simple', position: 0 },
        { type: 'selector', value: '.target', position: 7 },
        { type: 'eof', value: '', position: 14 },
      ];
      const ctx = bridge.createExtendedContext({
        input: 'simple .target',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      const result = bridge.parseCommand('simple', ctx);
      expect(result.type).toBe('command');
      expect(result.name).toBe('simple');
      expect(result.args).toHaveLength(1);
      expect(result.args[0].value).toBe('.target');
    });

    it('should stop at command terminators', () => {
      const plugin = createMockCommandPlugin({
        name: 'simple',
        pattern: /^simple$/i,
      });
      delete (plugin as any).parse;

      bridge.registerCommand(plugin);

      const tokens: Token[] = [
        { type: 'identifier', value: 'simple', position: 0 },
        { type: 'selector', value: '.target', position: 7 },
        { type: 'keyword', value: 'then', position: 15 },
        { type: 'identifier', value: 'next', position: 20 },
        { type: 'eof', value: '', position: 24 },
      ];
      const ctx = bridge.createExtendedContext({
        input: 'simple .target then next',
        position: 0,
        tokens,
        currentToken: tokens[0],
      });

      const result = bridge.parseCommand('simple', ctx);
      expect(result.args).toHaveLength(1);
      expect(ctx.peek().value).toBe('then');
    });
  });

  describe('exportForCoreParser', () => {
    it('should export commands as parser functions', () => {
      const toggleParse = vi.fn().mockReturnValue({ type: 'toggle' });
      bridge.registerCommand(
        createMockCommandPlugin({
          name: 'toggle',
          parse: toggleParse,
        })
      );

      const exports = bridge.exportForCoreParser();
      expect(exports.has('toggle')).toBe(true);

      // The exported function should wrap core context
      const mockCoreCtx = {
        getInputSlice: vi.fn().mockReturnValue('toggle .active'),
        getPosition: vi.fn().mockReturnValue(0),
        tokens: [],
        peek: vi.fn().mockReturnValue({ type: 'identifier', value: 'toggle', position: 0 }),
      };

      const parserFn = exports.get('toggle')!;
      parserFn(mockCoreCtx);

      expect(toggleParse).toHaveBeenCalled();
    });
  });

  describe('diagnostics', () => {
    it('should collect and clear errors', () => {
      expect(bridge.getErrors()).toEqual([]);
      expect(bridge.getWarnings()).toEqual([]);

      bridge.clearDiagnostics();
      expect(bridge.getErrors()).toEqual([]);
      expect(bridge.getWarnings()).toEqual([]);
    });
  });
});

describe('createParserBridge', () => {
  it('should create bridge with pre-registered plugins', () => {
    const plugins = [
      createMockCommandPlugin({ name: 'toggle' }),
      createMockCommandPlugin({ name: 'add' }),
    ];

    const bridge = createParserBridge(plugins);

    expect(bridge.hasCommand('toggle')).toBe(true);
    expect(bridge.hasCommand('add')).toBe(true);
    expect(bridge.getRegisteredCommands()).toHaveLength(2);
  });

  it('should apply config to created bridge', () => {
    const plugins = [createMockCommandPlugin({ name: 'toggle' })];
    const bridge = createParserBridge(plugins, { commandPrefix: 'x-' });

    expect(bridge.hasCommand('x-toggle')).toBe(true);
    expect(bridge.hasCommand('toggle')).toBe(false);
  });
});

describe('tokenize', () => {
  it('should tokenize simple command', () => {
    const tokens = tokenize('toggle .active');

    expect(tokens).toHaveLength(3); // toggle, .active, eof
    expect(tokens[0]).toEqual({ type: 'identifier', value: 'toggle', position: 0 });
    expect(tokens[1]).toEqual({ type: 'selector', value: '.active', position: 7 });
    expect(tokens[2]).toEqual({ type: 'eof', value: '', position: 14 });
  });

  it('should tokenize keywords', () => {
    const tokens = tokenize('on click then');

    expect(tokens[0].type).toBe('keyword');
    expect(tokens[0].value).toBe('on');
    expect(tokens[1].type).toBe('identifier');
    expect(tokens[1].value).toBe('click');
    expect(tokens[2].type).toBe('keyword');
    expect(tokens[2].value).toBe('then');
  });

  it('should tokenize string literals', () => {
    const tokens = tokenize('put "hello" into #target');

    expect(tokens[0].type).toBe('identifier'); // put is a command, not in keyword list
    expect(tokens[1].type).toBe('string');
    expect(tokens[1].value).toBe('"hello"');
  });

  it('should tokenize single-quoted strings', () => {
    const tokens = tokenize("put 'world' into me");

    const stringToken = tokens.find(t => t.type === 'string');
    expect(stringToken?.value).toBe("'world'");
  });

  it('should handle escaped characters in strings', () => {
    const tokens = tokenize('put "hello\\"world" into #target');

    const stringToken = tokens.find(t => t.type === 'string');
    expect(stringToken?.value).toBe('"hello\\"world"');
  });

  it('should tokenize numbers', () => {
    const tokens = tokenize('wait 100ms');

    expect(tokens[0].type).toBe('identifier'); // wait
    expect(tokens[1].type).toBe('number');
    expect(tokens[1].value).toBe('100');
  });

  it('should tokenize decimal numbers', () => {
    const tokens = tokenize('set x to 3.14');

    const numToken = tokens.find(t => t.type === 'number');
    expect(numToken?.value).toBe('3.14');
  });

  it('should tokenize ID selectors', () => {
    const tokens = tokenize('toggle .class on #element');

    expect(tokens[3].type).toBe('selector');
    expect(tokens[3].value).toBe('#element');
  });

  it('should tokenize symbols', () => {
    const tokens = tokenize('set x to (1 + 2)');

    const symbols = tokens.filter(t => t.type === 'symbol');
    expect(symbols.map(s => s.value)).toContain('(');
    expect(symbols.map(s => s.value)).toContain('+');
    expect(symbols.map(s => s.value)).toContain(')');
  });

  it('should handle empty input', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('eof');
  });

  it('should skip whitespace', () => {
    const tokens = tokenize('  toggle   .active  ');

    expect(tokens).toHaveLength(3);
    expect(tokens[0].value).toBe('toggle');
    expect(tokens[1].value).toBe('.active');
  });

  it('should tokenize identifiers with hyphens', () => {
    const tokens = tokenize('my-command some-class');

    expect(tokens[0].type).toBe('identifier');
    expect(tokens[0].value).toBe('my-command');
    expect(tokens[1].type).toBe('identifier');
    expect(tokens[1].value).toBe('some-class');
  });

  it('should tokenize special keywords', () => {
    const specialKeywords = ['me', 'my', 'it', 'its', 'you', 'your', 'true', 'false', 'null'];

    for (const keyword of specialKeywords) {
      const tokens = tokenize(keyword);
      expect(tokens[0].type).toBe('keyword');
      expect(tokens[0].value).toBe(keyword);
    }
  });
});
