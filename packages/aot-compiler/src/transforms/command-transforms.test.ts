/**
 * Command Transforms Tests
 *
 * Unit tests for command code generators, covering both args-based
 * (core parser path) and roles-based (semantic parser path) input.
 */

import { describe, it, expect } from 'vitest';
import { generateCommand, commandCodegens } from './command-transforms.js';
import { ExpressionCodegen } from './expression-transforms.js';
import type {
  ASTNode,
  CommandNode,
  CodegenContext,
  AnalysisResult,
  CodegenOptions,
  GeneratedExpression,
} from '../types/aot-types.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockContext(): CodegenContext {
  const requiredHelpers = new Set<string>();

  // Create context with expression codegen wired up
  const ctx: CodegenContext = {
    handlerId: 'test_handler',
    generateId: (prefix = '_id') => `${prefix}_0`,
    generateExpression: null as unknown as (node: ASTNode) => string,
    implicitTarget: '_ctx.me',
    localVarDeclarations: '',
    canCacheSelector: () => false,
    getCachedSelector: sel => `document.querySelector('${sel}')`,
    requireHelper: name => {
      requiredHelpers.add(name);
    },
    requiredHelpers,
    analysis: {} as AnalysisResult,
    options: {} as CodegenOptions,
  };

  // Wire up expression codegen
  const exprCodegen = new ExpressionCodegen(ctx);
  ctx.generateExpression = (node: ASTNode) => exprCodegen.generate(node);

  return ctx;
}

function gen(node: CommandNode, ctx?: CodegenContext): GeneratedExpression | null {
  return generateCommand(node, ctx ?? createMockContext());
}

// =============================================================================
// SET COMMAND
// =============================================================================

describe('SetCodegen', () => {
  describe('args-based (core parser path)', () => {
    it('sets local variable', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [
          { type: 'variable', name: ':count', scope: 'local' },
          { type: 'literal', value: 5 },
        ],
        modifiers: { to: { type: 'literal', value: 5 } },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe("_ctx.locals.set('count', 5)");
      expect(result!.async).toBe(false);
      expect(result!.sideEffects).toBe(true);
    });

    it('sets global variable', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'set',
          args: [{ type: 'variable', name: '$total', scope: 'global' }],
          modifiers: { to: { type: 'literal', value: 100 } },
        },
        ctx
      );

      expect(result).not.toBeNull();
      // Note: codegen only strips ':' prefix, '$' is kept (valid in JS identifiers)
      expect(result!.code).toBe("_rt.globals.set('$total', 100)");
      expect(ctx.requiredHelpers.has('globals')).toBe(true);
    });

    it('sets possessive property', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [
          {
            type: 'possessive',
            object: { type: 'identifier', value: 'me' },
            property: 'textContent',
          },
        ],
        modifiers: { to: { type: 'literal', value: 'hello' } },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('_ctx.me.textContent = "hello"');
    });

    it('sets style property via possessive', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [
          {
            type: 'possessive',
            object: { type: 'identifier', value: 'me' },
            property: '*opacity',
          },
        ],
        modifiers: { to: { type: 'literal', value: '0.5' } },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('_ctx.me.style.opacity = "0.5"');
    });

    it('sets attribute via possessive', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [
          {
            type: 'possessive',
            object: { type: 'identifier', value: 'me' },
            property: '@disabled',
          },
        ],
        modifiers: { to: { type: 'literal', value: 'true' } },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('_ctx.me.setAttribute(\'disabled\', "true")');
    });

    it('sets member expression', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [
          {
            type: 'member',
            object: { type: 'identifier', value: 'me' },
            property: 'value',
          },
        ],
        modifiers: { to: { type: 'literal', value: 42 } },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('= 42');
    });

    it('returns null when no target or value', () => {
      expect(gen({ type: 'command', name: 'set' })).toBeNull();
      expect(
        gen({
          type: 'command',
          name: 'set',
          args: [{ type: 'variable', name: ':x', scope: 'local' }],
        })
      ).toBeNull();
    });
  });

  describe('roles-based (semantic parser path)', () => {
    it('sets local variable from roles', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [],
        roles: {
          destination: { type: 'variable', name: ':count', scope: 'local' },
          patient: { type: 'literal', value: 10 },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe("_ctx.locals.set('count', 10)");
    });

    it('sets possessive property from roles', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [],
        roles: {
          destination: {
            type: 'possessive',
            object: { type: 'identifier', value: 'me' },
            property: 'innerHTML',
          },
          patient: { type: 'literal', value: '<b>bold</b>' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('_ctx.me.innerHTML = "<b>bold</b>"');
    });

    it('prefers roles over args', () => {
      const result = gen({
        type: 'command',
        name: 'set',
        args: [
          { type: 'variable', name: ':wrong', scope: 'local' },
          { type: 'literal', value: 'wrong' },
        ],
        roles: {
          destination: { type: 'variable', name: ':right', scope: 'local' },
          patient: { type: 'literal', value: 'right' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('_ctx.locals.set(\'right\', "right")');
    });
  });
});

// =============================================================================
// PUT COMMAND
// =============================================================================

describe('PutCodegen', () => {
  describe('args-based (core parser path)', () => {
    it('puts content into target (default)', () => {
      const result = gen({
        type: 'command',
        name: 'put',
        args: [{ type: 'literal', value: 'Hello' }],
        target: { type: 'selector', value: '#output' },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('.innerHTML = "Hello"');
    });

    it('puts content before target', () => {
      const result = gen({
        type: 'command',
        name: 'put',
        args: [{ type: 'literal', value: '<li>item</li>' }],
        modifiers: {
          before: { type: 'selector', value: '#list' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('insertAdjacentHTML');
      expect(result!.code).toContain('beforebegin');
    });

    it('puts content after target', () => {
      const result = gen({
        type: 'command',
        name: 'put',
        args: [{ type: 'literal', value: '<p>new</p>' }],
        modifiers: {
          after: { type: 'selector', value: '#ref' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('insertAdjacentHTML');
      expect(result!.code).toContain('afterend');
    });

    it('returns null when no content', () => {
      expect(gen({ type: 'command', name: 'put' })).toBeNull();
    });
  });

  describe('roles-based (semantic parser path)', () => {
    it('puts content into target from roles', () => {
      const result = gen({
        type: 'command',
        name: 'put',
        args: [],
        roles: {
          patient: { type: 'literal', value: 'content' },
          destination: { type: 'selector', value: '#target' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('.innerHTML = "content"');
    });

    it('uses method role for position', () => {
      const result = gen({
        type: 'command',
        name: 'put',
        args: [],
        roles: {
          patient: { type: 'literal', value: '<span>x</span>' },
          destination: { type: 'selector', value: '#target' },
          method: { type: 'literal', value: 'before' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('beforebegin');
    });
  });
});

// =============================================================================
// INCREMENT / DECREMENT COMMANDS
// =============================================================================

describe('IncrementCodegen', () => {
  describe('args-based (core parser path)', () => {
    it('increments local variable by 1', () => {
      const result = gen({
        type: 'command',
        name: 'increment',
        args: [{ type: 'variable', name: ':count', scope: 'local' }],
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain("_ctx.locals.set('count'");
      expect(result!.code).toContain("_ctx.locals.get('count')");
      expect(result!.code).toContain('+ 1');
    });

    it('increments with custom amount via modifiers.by', () => {
      const result = gen({
        type: 'command',
        name: 'increment',
        args: [{ type: 'variable', name: ':count', scope: 'local' }],
        modifiers: { by: { type: 'literal', value: 5 } },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('+ 5');
    });

    it('increments global variable', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'increment',
          args: [{ type: 'variable', name: '$total', scope: 'global' }],
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain("_rt.globals.set('$total'");
      expect(ctx.requiredHelpers.has('globals')).toBe(true);
    });

    it('increments element textContent', () => {
      const result = gen({
        type: 'command',
        name: 'increment',
        args: [{ type: 'selector', value: '#counter' }],
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('textContent');
      expect(result!.code).toContain('parseFloat');
    });

    it('returns null with no args', () => {
      expect(gen({ type: 'command', name: 'increment' })).toBeNull();
    });
  });

  describe('roles-based (semantic parser path)', () => {
    it('increments from destination role', () => {
      const result = gen({
        type: 'command',
        name: 'increment',
        args: [],
        roles: {
          destination: { type: 'variable', name: ':count', scope: 'local' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain("_ctx.locals.set('count'");
      expect(result!.code).toContain('+ 1');
    });

    it('uses quantity role for amount', () => {
      const result = gen({
        type: 'command',
        name: 'increment',
        args: [],
        roles: {
          destination: { type: 'variable', name: ':count', scope: 'local' },
          quantity: { type: 'literal', value: 10 },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('+ 10');
    });

    it('falls back to patient role', () => {
      const result = gen({
        type: 'command',
        name: 'increment',
        args: [],
        roles: {
          patient: { type: 'variable', name: ':count', scope: 'local' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain("_ctx.locals.set('count'");
    });
  });
});

describe('DecrementCodegen', () => {
  it('decrements local variable by 1', () => {
    const result = gen({
      type: 'command',
      name: 'decrement',
      args: [{ type: 'variable', name: ':count', scope: 'local' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("_ctx.locals.set('count'");
    expect(result!.code).toContain('- 1');
  });

  it('decrements with roles', () => {
    const result = gen({
      type: 'command',
      name: 'decrement',
      args: [],
      roles: {
        destination: { type: 'variable', name: ':hp', scope: 'local' },
        quantity: { type: 'literal', value: 25 },
      },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('- 25');
  });

  it('decrements global variable', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'decrement',
        args: [],
        roles: {
          destination: { type: 'variable', name: '$balance', scope: 'global' },
        },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain("_rt.globals.set('$balance'");
    expect(result!.code).toContain('- 1');
  });
});

// =============================================================================
// FETCH COMMAND
// =============================================================================

describe('FetchCodegen', () => {
  describe('args-based (core parser path)', () => {
    it('fetches URL as text (default)', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'fetch',
          args: [{ type: 'literal', value: '/api/data' }],
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_rt.fetchText("/api/data")');
      expect(result!.async).toBe(true);
      expect(result!.sideEffects).toBe(true);
      expect(ctx.requiredHelpers.has('fetchText')).toBe(true);
    });

    it('fetches URL as json via modifier string', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'fetch',
          args: [{ type: 'literal', value: '/api/users' }],
          modifiers: { as: 'json' },
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_rt.fetchJSON("/api/users")');
      expect(ctx.requiredHelpers.has('fetchJSON')).toBe(true);
    });

    it('fetches URL as json via modifier node', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'fetch',
          args: [{ type: 'literal', value: '/api/users' }],
          modifiers: { as: { type: 'identifier', name: 'json', value: 'json' } },
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_rt.fetchJSON');
      expect(ctx.requiredHelpers.has('fetchJSON')).toBe(true);
    });

    it('fetches URL as html', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'fetch',
          args: [{ type: 'literal', value: '/page' }],
          modifiers: { as: 'html' },
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_rt.fetchHTML("/page")');
      expect(ctx.requiredHelpers.has('fetchHTML')).toBe(true);
    });

    it('stores result in _ctx.it', () => {
      const result = gen({
        type: 'command',
        name: 'fetch',
        args: [{ type: 'literal', value: '/api/data' }],
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_ctx.it = await');
    });

    it('returns null with no URL', () => {
      expect(gen({ type: 'command', name: 'fetch' })).toBeNull();
    });
  });

  describe('roles-based (semantic parser path)', () => {
    it('fetches from source role', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'fetch',
          args: [],
          roles: {
            source: { type: 'literal', value: '/api/items' },
          },
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_rt.fetchText("/api/items")');
    });

    it('uses responseType role for format', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'fetch',
          args: [],
          roles: {
            source: { type: 'literal', value: '/api/items' },
            responseType: { type: 'identifier', name: 'json', value: 'json' },
          },
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toContain('_rt.fetchJSON("/api/items")');
      expect(ctx.requiredHelpers.has('fetchJSON')).toBe(true);
    });

    it('prefers roles.source over args', () => {
      const result = gen({
        type: 'command',
        name: 'fetch',
        args: [{ type: 'literal', value: '/wrong' }],
        roles: {
          source: { type: 'literal', value: '/right' },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('"/right"');
    });
  });
});

// =============================================================================
// WAIT COMMAND
// =============================================================================

describe('WaitCodegen', () => {
  describe('args-based (core parser path)', () => {
    it('waits for numeric milliseconds', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'wait',
          args: [{ type: 'literal', value: 500 }],
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toBe('await _rt.wait(500)');
      expect(result!.async).toBe(true);
      expect(result!.sideEffects).toBe(false);
      expect(ctx.requiredHelpers.has('wait')).toBe(true);
    });

    it('parses string duration "100ms"', () => {
      const result = gen({
        type: 'command',
        name: 'wait',
        args: [{ type: 'literal', value: '100ms' }],
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('await _rt.wait(100)');
    });

    it('parses string duration "2s"', () => {
      const result = gen({
        type: 'command',
        name: 'wait',
        args: [{ type: 'literal', value: '2s' }],
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('await _rt.wait(2000)');
    });

    it('handles expression duration', () => {
      const result = gen({
        type: 'command',
        name: 'wait',
        args: [{ type: 'variable', name: ':delay', scope: 'local' }],
      });

      expect(result).not.toBeNull();
      expect(result!.code).toContain('await _rt.wait');
      expect(result!.code).toContain("_ctx.locals.get('delay')");
    });

    it('returns null with no duration', () => {
      expect(gen({ type: 'command', name: 'wait' })).toBeNull();
    });
  });

  describe('roles-based (semantic parser path)', () => {
    it('uses duration role', () => {
      const ctx = createMockContext();
      const result = gen(
        {
          type: 'command',
          name: 'wait',
          args: [],
          roles: {
            duration: { type: 'literal', value: 1000 },
          },
        },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.code).toBe('await _rt.wait(1000)');
      expect(ctx.requiredHelpers.has('wait')).toBe(true);
    });

    it('prefers duration role over args', () => {
      const result = gen({
        type: 'command',
        name: 'wait',
        args: [{ type: 'literal', value: 100 }],
        roles: {
          duration: { type: 'literal', value: 2000 },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.code).toBe('await _rt.wait(2000)');
    });
  });
});

// =============================================================================
// TOGGLE / ADD / REMOVE (existing commands, verify still work)
// =============================================================================

describe('ToggleCodegen', () => {
  it('toggles class on me', () => {
    const result = gen({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe("_ctx.me.classList.toggle('active')");
  });

  it('toggles class on target', () => {
    const result = gen({
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: '.active' }],
      target: { type: 'selector', value: '#panel' },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("classList.toggle('active')");
  });

  it('toggles attribute', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'identifier', value: '@disabled' }],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.toggleAttr');
    expect(ctx.requiredHelpers.has('toggleAttr')).toBe(true);
  });

  it('returns null with no args', () => {
    expect(gen({ type: 'command', name: 'toggle' })).toBeNull();
  });
});

describe('AddCodegen', () => {
  it('adds class to me', () => {
    const result = gen({
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.clicked' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe("_ctx.me.classList.add('clicked')");
  });

  it('adds class to target', () => {
    const result = gen({
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.highlight' }],
      target: { type: 'selector', value: '#item' },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("classList.add('highlight')");
  });
});

describe('RemoveCodegen', () => {
  it('removes class', () => {
    const result = gen({
      type: 'command',
      name: 'remove',
      args: [{ type: 'selector', value: '.hidden' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("classList.remove('hidden')");
  });

  it('removes element when no args', () => {
    const result = gen({
      type: 'command',
      name: 'remove',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('_ctx.me.remove()');
  });
});

// =============================================================================
// SEND COMMAND
// =============================================================================

describe('SendCodegen', () => {
  it('sends event to me', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'send',
        args: [{ type: 'literal', value: 'myEvent' }],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.send(_ctx.me, "myEvent"');
    expect(ctx.requiredHelpers.has('send')).toBe(true);
  });

  it('sends event to target', () => {
    const result = gen({
      type: 'command',
      name: 'send',
      args: [{ type: 'literal', value: 'update' }],
      target: { type: 'selector', value: '#other' },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.send(');
    expect(result!.code).toContain('"update"');
  });

  it('trigger is alias for send', () => {
    expect(commandCodegens.get('trigger')).toBeDefined();
    expect(commandCodegens.get('trigger')!.command).toBe('send');
  });
});

// =============================================================================
// OTHER COMMANDS
// =============================================================================

describe('ShowCodegen', () => {
  it('shows element', () => {
    const result = gen({ type: 'command', name: 'show' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("_ctx.me.style.display = ''");
  });
});

describe('HideCodegen', () => {
  it('hides element', () => {
    const result = gen({ type: 'command', name: 'hide' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("_ctx.me.style.display = 'none'");
  });
});

describe('FocusCodegen', () => {
  it('focuses element', () => {
    const result = gen({ type: 'command', name: 'focus' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('_ctx.me.focus()');
  });
});

describe('BlurCodegen', () => {
  it('blurs element', () => {
    const result = gen({ type: 'command', name: 'blur' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('_ctx.me.blur()');
  });
});

describe('LogCodegen', () => {
  it('logs values', () => {
    const result = gen({
      type: 'command',
      name: 'log',
      args: [
        { type: 'literal', value: 'hello' },
        { type: 'literal', value: 42 },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('console.log("hello", 42)');
  });

  it('logs empty string when no args', () => {
    const result = gen({ type: 'command', name: 'log' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("console.log('')");
  });
});

describe('HaltCodegen', () => {
  it('generates throw HALT', () => {
    const ctx = createMockContext();
    const result = gen({ type: 'command', name: 'halt' }, ctx);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('throw _rt.HALT');
    expect(ctx.requiredHelpers.has('HALT')).toBe(true);
  });
});

describe('ExitCodegen', () => {
  it('generates throw EXIT', () => {
    const ctx = createMockContext();
    const result = gen({ type: 'command', name: 'exit' }, ctx);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('throw _rt.EXIT');
    expect(ctx.requiredHelpers.has('EXIT')).toBe(true);
  });
});

describe('ReturnCodegen', () => {
  it('returns value', () => {
    const result = gen({
      type: 'command',
      name: 'return',
      args: [{ type: 'literal', value: 42 }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('return 42');
  });

  it('returns undefined when no args', () => {
    const result = gen({ type: 'command', name: 'return' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('return undefined');
  });
});

describe('ScrollCodegen', () => {
  it('scrolls element into view', () => {
    const result = gen({ type: 'command', name: 'scroll' });
    expect(result).not.toBeNull();
    expect(result!.code).toContain('scrollIntoView');
  });

  it('scrolls with smooth behavior', () => {
    const result = gen({
      type: 'command',
      name: 'scroll',
      modifiers: { smooth: true },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("'smooth'");
  });
});

describe('TakeCodegen', () => {
  it('takes class from siblings', () => {
    const result = gen({
      type: 'command',
      name: 'take',
      args: [{ type: 'selector', value: '.selected' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("classList.remove('selected')");
    expect(result!.code).toContain("classList.add('selected')");
  });
});

// =============================================================================
// COMMAND REGISTRY
// =============================================================================

describe('Command Registry', () => {
  it('has all expected commands registered', () => {
    const expected = [
      'toggle',
      'add',
      'remove',
      'set',
      'put',
      'show',
      'hide',
      'focus',
      'blur',
      'log',
      'wait',
      'fetch',
      'send',
      'trigger',
      'increment',
      'decrement',
      'halt',
      'exit',
      'return',
      'call',
      'scroll',
      'take',
      'unless',
      'throw',
      'default',
      'go',
      'append',
      'pick',
      'push-url',
      'replace-url',
      'get',
      'break',
      'continue',
      'beep',
      'js',
      'copy',
      'make',
    ];

    for (const cmd of expected) {
      expect(commandCodegens.has(cmd), `missing codegen for '${cmd}'`).toBe(true);
    }
  });

  it('returns null for unknown commands', () => {
    const result = generateCommand({ type: 'command', name: 'unknownCmd42' }, createMockContext());
    expect(result).toBeNull();
  });
});

// =============================================================================
// UNLESS COMMAND
// =============================================================================

describe('UnlessCodegen', () => {
  it('generates negated if', () => {
    const result = gen({
      type: 'command',
      name: 'unless',
      args: [{ type: 'identifier', value: 'loading' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('if (!(loading))');
    expect(result!.async).toBe(false);
  });

  it('returns null without condition', () => {
    const result = gen({ type: 'command', name: 'unless' });
    expect(result).toBeNull();
  });
});

// =============================================================================
// THROW COMMAND
// =============================================================================

describe('ThrowCodegen', () => {
  it('throws with message', () => {
    const result = gen({
      type: 'command',
      name: 'throw',
      args: [{ type: 'literal', value: 'Something went wrong' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('throw new Error("Something went wrong")');
    expect(result!.sideEffects).toBe(true);
  });

  it('throws default error without args', () => {
    const result = gen({ type: 'command', name: 'throw' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("throw new Error('Error')");
  });
});

// =============================================================================
// DEFAULT COMMAND
// =============================================================================

describe('DefaultCodegen', () => {
  it('defaults local variable', () => {
    const result = gen({
      type: 'command',
      name: 'default',
      args: [
        { type: 'variable', name: ':count', scope: 'local' },
        { type: 'literal', value: 0 },
      ],
      modifiers: { to: { type: 'literal', value: 0 } },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe("if (_ctx.locals.get('count') == null) _ctx.locals.set('count', 0)");
  });

  it('defaults global variable', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'default',
        args: [{ type: 'variable', name: '$theme', scope: 'global' }],
        modifiers: { to: { type: 'literal', value: 'light' } },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.globals.get');
    expect(result!.code).toContain('_rt.globals.set');
    expect(ctx.requiredHelpers.has('globals')).toBe(true);
  });

  it('returns null without target or value', () => {
    expect(gen({ type: 'command', name: 'default' })).toBeNull();
  });
});

// =============================================================================
// GO COMMAND
// =============================================================================

describe('GoCodegen', () => {
  it('navigates to URL', () => {
    const result = gen({
      type: 'command',
      name: 'go',
      args: [{ type: 'literal', value: '/home' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('window.location.href = "/home"');
  });

  it('goes back', () => {
    const result = gen({
      type: 'command',
      name: 'go',
      args: [{ type: 'identifier', value: 'back' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('history.back()');
  });

  it('goes forward', () => {
    const result = gen({
      type: 'command',
      name: 'go',
      args: [{ type: 'identifier', value: 'forward' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('history.forward()');
  });

  it('returns null without args', () => {
    expect(gen({ type: 'command', name: 'go' })).toBeNull();
  });
});

// =============================================================================
// APPEND COMMAND
// =============================================================================

describe('AppendCodegen', () => {
  it('appends content to self', () => {
    const result = gen({
      type: 'command',
      name: 'append',
      args: [{ type: 'literal', value: '<li>new</li>' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe(`_ctx.me.insertAdjacentHTML('beforeend', "<li>new</li>")`);
  });

  it('appends content to target', () => {
    const result = gen({
      type: 'command',
      name: 'append',
      args: [{ type: 'literal', value: 'text' }],
      target: { type: 'selector', value: '#list' },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('list')");
    expect(result!.code).toContain("insertAdjacentHTML('beforeend'");
  });

  it('returns null without content', () => {
    expect(gen({ type: 'command', name: 'append' })).toBeNull();
  });
});

// =============================================================================
// PICK COMMAND
// =============================================================================

describe('PickCodegen', () => {
  it('picks random from collection', () => {
    const result = gen({
      type: 'command',
      name: 'pick',
      args: [{ type: 'identifier', value: 'items' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('Math.floor(Math.random()');
    expect(result!.code).toContain('_ctx.it');
  });

  it('returns null without collection', () => {
    expect(gen({ type: 'command', name: 'pick' })).toBeNull();
  });
});

// =============================================================================
// PUSH-URL COMMAND
// =============================================================================

describe('PushUrlCodegen', () => {
  it('pushes URL to history', () => {
    const result = gen({
      type: 'command',
      name: 'push-url',
      args: [{ type: 'literal', value: '/page/2' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe(`history.pushState({}, '', "/page/2")`);
  });

  it('returns null without URL', () => {
    expect(gen({ type: 'command', name: 'push-url' })).toBeNull();
  });
});

// =============================================================================
// REPLACE-URL COMMAND
// =============================================================================

describe('ReplaceUrlCodegen', () => {
  it('replaces URL in history', () => {
    const result = gen({
      type: 'command',
      name: 'replace-url',
      args: [{ type: 'literal', value: '/new-path' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe(`history.replaceState({}, '', "/new-path")`);
  });

  it('returns null without URL', () => {
    expect(gen({ type: 'command', name: 'replace-url' })).toBeNull();
  });
});

// =============================================================================
// GET COMMAND
// =============================================================================

describe('GetCodegen', () => {
  it('evaluates expression and stores in it/result', () => {
    const result = gen({
      type: 'command',
      name: 'get',
      args: [{ type: 'identifier', value: 'me' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('_ctx.it = _ctx.result = _ctx.me');
    expect(result!.sideEffects).toBe(true);
  });

  it('evaluates selector expression', () => {
    const result = gen({
      type: 'command',
      name: 'get',
      args: [{ type: 'selector', value: '#output' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('output')");
    expect(result!.code).toContain('_ctx.it');
  });

  it('prefers patient role', () => {
    const result = gen({
      type: 'command',
      name: 'get',
      args: [{ type: 'literal', value: 'fallback' }],
      roles: { patient: { type: 'literal', value: 42 } },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('_ctx.it = _ctx.result = 42');
  });

  it('returns null without args', () => {
    expect(gen({ type: 'command', name: 'get' })).toBeNull();
  });
});

// =============================================================================
// BREAK COMMAND
// =============================================================================

describe('BreakCodegen', () => {
  it('generates break statement', () => {
    const result = gen({ type: 'command', name: 'break' });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('break');
    expect(result!.async).toBe(false);
    expect(result!.sideEffects).toBe(false);
  });
});

// =============================================================================
// CONTINUE COMMAND
// =============================================================================

describe('ContinueCodegen', () => {
  it('generates continue statement', () => {
    const result = gen({ type: 'command', name: 'continue' });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('continue');
    expect(result!.async).toBe(false);
    expect(result!.sideEffects).toBe(false);
  });
});

// =============================================================================
// BEEP COMMAND
// =============================================================================

describe('BeepCodegen', () => {
  it('beeps without args', () => {
    const result = gen({ type: 'command', name: 'beep' });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('[beep]');
    expect(result!.code).toContain('console.log');
    expect(result!.sideEffects).toBe(true);
  });

  it('beeps with expression', () => {
    const result = gen({
      type: 'command',
      name: 'beep',
      args: [{ type: 'identifier', value: 'me' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('[beep]');
    expect(result!.code).toContain('_ctx.me');
  });

  it('beeps with literal value', () => {
    const result = gen({
      type: 'command',
      name: 'beep',
      args: [{ type: 'literal', value: 'debug info' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('"debug info"');
  });
});

// =============================================================================
// JS COMMAND
// =============================================================================

describe('JsCodegen', () => {
  it('inlines JavaScript code string', () => {
    const result = gen({
      type: 'command',
      name: 'js',
      args: [{ type: 'literal', value: 'return document.title' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('return document.title');
    expect(result!.code).toContain('function(_ctx)');
    expect(result!.sideEffects).toBe(true);
  });

  it('evaluates non-string expression', () => {
    const result = gen({
      type: 'command',
      name: 'js',
      args: [{ type: 'identifier', value: 'myFunc' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_ctx.it = _ctx.result = myFunc');
  });

  it('returns null without args', () => {
    expect(gen({ type: 'command', name: 'js' })).toBeNull();
  });
});

// =============================================================================
// COPY COMMAND
// =============================================================================

describe('CopyCodegen', () => {
  it('copies text to clipboard', () => {
    const result = gen({
      type: 'command',
      name: 'copy',
      args: [{ type: 'literal', value: 'hello' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('navigator.clipboard.writeText');
    expect(result!.code).toContain('"hello"');
    expect(result!.async).toBe(true);
  });

  it('copies expression result', () => {
    const result = gen({
      type: 'command',
      name: 'copy',
      args: [{ type: 'identifier', value: 'it' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('navigator.clipboard.writeText(String(_ctx.it))');
  });

  it('returns null without content', () => {
    expect(gen({ type: 'command', name: 'copy' })).toBeNull();
  });
});

// =============================================================================
// MAKE COMMAND
// =============================================================================

describe('MakeCodegen', () => {
  it('makes element from HTML literal', () => {
    const result = gen({
      type: 'command',
      name: 'make',
      args: [
        {
          type: 'htmlLiteral',
          tag: 'div',
          classes: ['card', 'active'],
          id: 'myCard',
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("createElement('div')");
    expect(result!.code).toContain("className = 'card active'");
    expect(result!.code).toContain("id = 'myCard'");
    expect(result!.code).toContain('_ctx.it = _ctx.result');
  });

  it('makes element from string tag name', () => {
    const result = gen({
      type: 'command',
      name: 'make',
      args: [{ type: 'literal', value: 'span' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe("_ctx.it = _ctx.result = document.createElement('span')");
  });

  it('makes element from dynamic expression', () => {
    const result = gen({
      type: 'command',
      name: 'make',
      args: [{ type: 'identifier', value: 'tagName' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('_ctx.it = _ctx.result = document.createElement(tagName)');
  });

  it('makes element with attributes', () => {
    const result = gen({
      type: 'command',
      name: 'make',
      args: [
        {
          type: 'htmlLiteral',
          tag: 'input',
          classes: [],
          attributes: { type: 'text', placeholder: 'Enter name' },
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("createElement('input')");
    expect(result!.code).toContain("setAttribute('type', 'text')");
    expect(result!.code).toContain("setAttribute('placeholder', 'Enter name')");
  });

  it('returns null without args', () => {
    expect(gen({ type: 'command', name: 'make' })).toBeNull();
  });
});

// =============================================================================
// SWAP COMMAND
// =============================================================================

describe('SwapCodegen', () => {
  it('swaps innerHTML by default', () => {
    const result = gen({
      type: 'command',
      name: 'swap',
      args: [
        { type: 'selector', value: '#target' },
        { type: 'literal', value: '<p>new</p>' },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('.innerHTML =');
    expect(result!.sideEffects).toBe(true);
  });

  it('swaps with outerHTML strategy', () => {
    const result = gen({
      type: 'command',
      name: 'swap',
      args: [
        { type: 'identifier', value: 'outerhtml' },
        { type: 'selector', value: '#target' },
        { type: 'literal', value: '<p>new</p>' },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('.outerHTML =');
  });

  it('swaps with morph strategy', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'swap',
        args: [
          { type: 'identifier', value: 'morph' },
          { type: 'selector', value: '#target' },
          { type: 'literal', value: '<p>new</p>' },
        ],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.morph(');
    expect(ctx.requiredHelpers.has('morph')).toBe(true);
  });

  it('swaps with delete strategy', () => {
    const result = gen({
      type: 'command',
      name: 'swap',
      args: [
        { type: 'identifier', value: 'delete' },
        { type: 'selector', value: '#target' },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('.remove()');
  });

  it('swaps with roles-based input', () => {
    const result = gen({
      type: 'command',
      name: 'swap',
      roles: {
        destination: { type: 'selector', value: '#target' },
        patient: { type: 'literal', value: '<p>new</p>' },
      },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('.innerHTML =');
  });

  it('returns null without args or roles', () => {
    expect(gen({ type: 'command', name: 'swap' })).toBeNull();
  });
});

// =============================================================================
// MORPH COMMAND
// =============================================================================

describe('MorphCodegen', () => {
  it('morphs target with content', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'morph',
        args: [
          { type: 'selector', value: '#target' },
          { type: 'literal', value: '<p>new</p>' },
        ],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.morph(');
    expect(ctx.requiredHelpers.has('morph')).toBe(true);
  });

  it('morphs with roles-based input', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'morph',
        roles: {
          destination: { type: 'selector', value: '#box' },
          patient: { type: 'identifier', value: 'it' },
        },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.morph(');
    expect(ctx.requiredHelpers.has('morph')).toBe(true);
  });

  it('returns null without target', () => {
    expect(gen({ type: 'command', name: 'morph' })).toBeNull();
  });
});

// =============================================================================
// TRANSITION COMMAND
// =============================================================================

describe('TransitionCodegen', () => {
  it('transitions a property to a value', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'transition',
        args: [{ type: 'identifier', value: 'opacity' }],
        modifiers: { to: { type: 'literal', value: '0.5' } },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.transition(');
    expect(result!.code).toContain('opacity');
    expect(result!.async).toBe(true);
    expect(ctx.requiredHelpers.has('transition')).toBe(true);
  });

  it('uses custom duration and timing', () => {
    const result = gen({
      type: 'command',
      name: 'transition',
      args: [{ type: 'identifier', value: 'left' }],
      modifiers: {
        to: { type: 'literal', value: '100px' },
        over: { type: 'literal', value: 500 },
        with: { type: 'literal', value: 'ease-in-out' },
      },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('500');
    expect(result!.code).toContain('ease-in-out');
  });

  it('targets specific element', () => {
    const result = gen({
      type: 'command',
      name: 'transition',
      args: [{ type: 'identifier', value: 'opacity' }],
      target: { type: 'selector', value: '#box' },
      modifiers: { to: { type: 'literal', value: '0' } },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('box')");
  });

  it('returns null without property', () => {
    expect(gen({ type: 'command', name: 'transition' })).toBeNull();
  });

  it('returns null without value', () => {
    expect(
      gen({
        type: 'command',
        name: 'transition',
        args: [{ type: 'identifier', value: 'opacity' }],
      })
    ).toBeNull();
  });
});

// =============================================================================
// MEASURE COMMAND
// =============================================================================

describe('MeasureCodegen', () => {
  it('measures all dimensions when no property specified', () => {
    const result = gen({
      type: 'command',
      name: 'measure',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('getBoundingClientRect()');
    expect(result!.code).toContain('_ctx.it');
  });

  it('measures specific rect property', () => {
    const result = gen({
      type: 'command',
      name: 'measure',
      args: [{ type: 'identifier', value: 'width' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('getBoundingClientRect().width');
  });

  it('measures height', () => {
    const result = gen({
      type: 'command',
      name: 'measure',
      args: [{ type: 'identifier', value: 'height' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('getBoundingClientRect().height');
  });

  it('uses runtime helper for custom properties', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'measure',
        args: [{ type: 'literal', value: 'font-size' }],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.measure(');
    expect(ctx.requiredHelpers.has('measure')).toBe(true);
  });

  it('measures specific target', () => {
    const result = gen({
      type: 'command',
      name: 'measure',
      target: { type: 'selector', value: '#box' },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('box')");
  });
});

// =============================================================================
// SETTLE COMMAND
// =============================================================================

describe('SettleCodegen', () => {
  it('settles with default timeout', () => {
    const ctx = createMockContext();
    const result = gen({ type: 'command', name: 'settle' }, ctx);

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.settle(');
    expect(result!.code).toContain('5000');
    expect(result!.async).toBe(true);
    expect(ctx.requiredHelpers.has('settle')).toBe(true);
  });

  it('settles with custom timeout', () => {
    const result = gen({
      type: 'command',
      name: 'settle',
      modifiers: { for: { type: 'literal', value: 3000 } },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('3000');
  });

  it('settles on specific target', () => {
    const result = gen({
      type: 'command',
      name: 'settle',
      target: { type: 'selector', value: '#animated' },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('animated')");
  });
});

// =============================================================================
// TELL COMMAND
// =============================================================================

describe('TellCodegen', () => {
  it('generates scoped block rebinding me', () => {
    const result = gen({
      type: 'command',
      name: 'tell',
      args: [{ type: 'selector', value: '#sidebar' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_prevMe');
    expect(result!.code).toContain('_ctx.me =');
    expect(result!.code).toContain('_ctx.you =');
  });

  it('uses roles-based destination', () => {
    const result = gen({
      type: 'command',
      name: 'tell',
      roles: { destination: { type: 'selector', value: '.buttons' } },
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_ctx.me =');
  });

  it('returns null without target', () => {
    expect(gen({ type: 'command', name: 'tell' })).toBeNull();
  });
});

// =============================================================================
// ASYNC COMMAND
// =============================================================================

describe('AsyncCodegen', () => {
  it('generates async IIFE opening', () => {
    const result = gen({
      type: 'command',
      name: 'async',
      args: [{ type: 'command', name: 'wait' }],
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('(async () => {');
    expect(result!.async).toBe(false); // The outer handler doesn't await
    expect(result!.sideEffects).toBe(true);
  });
});

// =============================================================================
// INSTALL COMMAND
// =============================================================================

describe('InstallCodegen', () => {
  it('installs a named behavior', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'install',
        args: [{ type: 'identifier', value: 'Draggable' }],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain("_rt.installBehavior(_ctx.me, 'Draggable')");
    expect(ctx.requiredHelpers.has('installBehavior')).toBe(true);
  });

  it('installs with parameters', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'install',
        args: [
          { type: 'identifier', value: 'Tooltip' },
          {
            type: 'object',
            properties: [{ key: 'text', value: { type: 'literal', value: 'Help' } }],
          },
        ],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain("'Tooltip'");
    expect(result!.code).toContain('_rt.installBehavior(');
  });

  it('installs on specific target', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'install',
        args: [{ type: 'identifier', value: 'Sortable' }],
        target: { type: 'selector', value: '#list' },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('list')");
    expect(result!.code).toContain("'Sortable'");
  });

  it('uses roles-based input', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'install',
        roles: { patient: { type: 'identifier', value: 'Removable' } },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain("'Removable'");
  });

  it('returns null without behavior name', () => {
    expect(gen({ type: 'command', name: 'install' })).toBeNull();
  });
});

// =============================================================================
// RENDER COMMAND
// =============================================================================

describe('RenderCodegen', () => {
  it('renders a template', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'render',
        args: [{ type: 'identifier', value: 'myTemplate' }],
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.render(');
    expect(result!.code).toContain('.innerHTML =');
    expect(ctx.requiredHelpers.has('render')).toBe(true);
  });

  it('renders with variables', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'render',
        args: [{ type: 'identifier', value: 'template' }],
        modifiers: {
          with: {
            type: 'object',
            properties: [{ key: 'name', value: { type: 'literal', value: 'Alice' } }],
          },
        },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain('_rt.render(');
  });

  it('renders into specific target', () => {
    const ctx = createMockContext();
    const result = gen(
      {
        type: 'command',
        name: 'render',
        args: [{ type: 'literal', value: '<p>Hello</p>' }],
        target: { type: 'selector', value: '#output' },
      },
      ctx
    );

    expect(result).not.toBeNull();
    expect(result!.code).toContain("getElementById('output')");
    expect(result!.code).toContain('.innerHTML =');
  });

  it('returns null without template', () => {
    expect(gen({ type: 'command', name: 'render' })).toBeNull();
  });
});
