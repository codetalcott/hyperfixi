/**
 * Command Mapper Unit Tests
 *
 * Tests that each command mapper correctly converts SemanticNodes to AST CommandNodes.
 * Ensures the semantic→AST conversion produces runtime-compatible output.
 */

import { describe, it, expect } from 'vitest';
import { buildAST, ASTBuilder } from '../src/ast-builder';
import { resolveCommandMapper } from '../src/ast-builder/command-mappers';
import type { CommandSemanticNode, SemanticValue, ActionType } from '../src/types';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a test CommandSemanticNode with specified roles
 */
function createCommandNode(
  action: ActionType,
  roles: Record<string, SemanticValue>
): CommandSemanticNode {
  return {
    kind: 'command',
    action,
    roles: new Map(Object.entries(roles)),
  };
}

/**
 * Create a selector value
 */
function selector(value: string, kind: 'class' | 'id' | 'element' = 'class'): SemanticValue {
  return { type: 'selector', value, selectorKind: kind };
}

/**
 * Create a literal value
 */
function literal(value: string | number | boolean, dataType?: string): SemanticValue {
  return { type: 'literal', value, dataType: dataType as any };
}

/**
 * Create a reference value
 */
function reference(value: string): SemanticValue {
  return { type: 'reference', value };
}

// =============================================================================
// Toggle Mapper Tests
// =============================================================================

describe('Toggle Command Mapper', () => {
  it('should map toggle with patient only', () => {
    const node = createCommandNode('toggle', {
      patient: selector('.active'),
    });

    const mapper = resolveCommandMapper('toggle')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('toggle');
    expect(result.args).toHaveLength(1);
    expect(result.args[0]).toMatchObject({ type: 'selector', value: '.active' });
    expect(result.modifiers).toBeUndefined();
  });

  it('should map toggle with patient and destination', () => {
    const node = createCommandNode('toggle', {
      patient: selector('.active'),
      destination: selector('#button', 'id'),
    });

    const mapper = resolveCommandMapper('toggle')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('toggle');
    expect(result.args[0]).toMatchObject({ type: 'selector', value: '.active' });
    expect(result.modifiers).toBeDefined();
    expect(result.modifiers!['on']).toMatchObject({ type: 'selector', value: '#button' });
  });

  it('should map toggle with duration', () => {
    const node = createCommandNode('toggle', {
      patient: selector('.fade'),
      duration: literal('500ms'),
    });

    const mapper = resolveCommandMapper('toggle')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.modifiers!['for']).toMatchObject({ type: 'literal', value: '500ms' });
  });
});

// =============================================================================
// Add Mapper Tests
// =============================================================================

describe('Add Command Mapper', () => {
  it('should map add with patient', () => {
    const node = createCommandNode('add', {
      patient: selector('.highlight'),
    });

    const mapper = resolveCommandMapper('add')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('add');
    expect(result.args[0]).toMatchObject({ type: 'selector', value: '.highlight' });
  });

  it('should map add with destination', () => {
    const node = createCommandNode('add', {
      patient: selector('.active'),
      destination: selector('#target', 'id'),
    });

    const mapper = resolveCommandMapper('add')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.modifiers!['to']).toMatchObject({ type: 'selector', value: '#target' });
  });
});

// =============================================================================
// Remove Mapper Tests
// =============================================================================

describe('Remove Command Mapper', () => {
  it('should map remove with patient', () => {
    const node = createCommandNode('remove', {
      patient: selector('.selected'),
    });

    const mapper = resolveCommandMapper('remove')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('remove');
    expect(result.args[0]).toMatchObject({ type: 'selector', value: '.selected' });
  });

  it('should map remove with source', () => {
    const node = createCommandNode('remove', {
      patient: selector('.active'),
      source: selector('#button', 'id'),
    });

    const mapper = resolveCommandMapper('remove')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.modifiers!['from']).toMatchObject({ type: 'selector', value: '#button' });
  });
});

// =============================================================================
// Show/Hide Mapper Tests
// =============================================================================

describe('Show Command Mapper', () => {
  it('should map show with destination', () => {
    const node = createCommandNode('show', {
      destination: reference('me'),
    });

    const mapper = resolveCommandMapper('show')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('show');
    expect(result.args[0]).toMatchObject({ type: 'identifier', name: 'me' });
  });

  it('should map show with duration', () => {
    const node = createCommandNode('show', {
      destination: reference('me'),
      duration: literal('slow'),
    });

    const mapper = resolveCommandMapper('show')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.modifiers!['with']).toMatchObject({ type: 'literal', value: 'slow' });
  });
});

describe('Hide Command Mapper', () => {
  it('should map hide with destination', () => {
    const node = createCommandNode('hide', {
      destination: reference('me'),
    });

    const mapper = resolveCommandMapper('hide')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('hide');
    expect(result.args[0]).toMatchObject({ type: 'identifier', name: 'me' });
  });
});

// =============================================================================
// Set Mapper Tests
// =============================================================================

describe('Set Command Mapper', () => {
  it('should map set with destination and patient', () => {
    const node = createCommandNode('set', {
      destination: selector('@data-value'),
      patient: literal('hello', 'string'),
    });

    const mapper = resolveCommandMapper('set')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('set');
    // `@attr` destinations convert to the canonical attributeAccess shape
    // (previously a selector node, which the runtime fed to querySelector and
    // threw "Invalid selector @data-value"). SetCommand routes attributeAccess
    // to setAttribute.
    expect(result.args[0]).toMatchObject({ type: 'attributeAccess', attributeName: 'data-value' });
    expect(result.modifiers!['to']).toMatchObject({ type: 'literal', value: 'hello' });
  });
});

// =============================================================================
// Increment/Decrement Mapper Tests
// =============================================================================

describe('Increment Command Mapper', () => {
  it('should map increment with patient', () => {
    const node = createCommandNode('increment', {
      patient: reference('counter'),
    });

    const mapper = resolveCommandMapper('increment')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('increment');
    expect(result.args[0]).toMatchObject({ type: 'identifier', name: 'counter' });
  });

  it('should map increment with quantity', () => {
    const node = createCommandNode('increment', {
      patient: reference('counter'),
      quantity: literal(5, 'number'),
    });

    const mapper = resolveCommandMapper('increment')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.modifiers!['by']).toMatchObject({ type: 'literal', value: 5 });
  });
});

describe('Decrement Command Mapper', () => {
  it('should map decrement with patient', () => {
    const node = createCommandNode('decrement', {
      patient: reference('counter'),
    });

    const mapper = resolveCommandMapper('decrement')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('decrement');
  });
});

// =============================================================================
// Wait Mapper Tests
// =============================================================================

describe('Wait Command Mapper', () => {
  it('should map wait with duration', () => {
    const node = createCommandNode('wait', {
      duration: literal('500ms'),
    });

    const mapper = resolveCommandMapper('wait')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('wait');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: '500ms' });
    expect(result.isBlocking).toBe(true);
  });

  it('should map wait without duration', () => {
    const node = createCommandNode('wait', {});

    const mapper = resolveCommandMapper('wait')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('wait');
    expect(result.args).toHaveLength(0);
  });
});

// =============================================================================
// Put Mapper Tests
// =============================================================================

describe('Put Command Mapper', () => {
  it('should map put with patient and destination', () => {
    const node = createCommandNode('put', {
      patient: literal('Hello World', 'string'),
      destination: reference('me'),
    });

    const mapper = resolveCommandMapper('put')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('put');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: 'Hello World' });
    expect(result.modifiers!['into']).toMatchObject({ type: 'identifier', name: 'me' });
  });

  it('maps the manner role to the position modifier (before/after)', () => {
    // The handcrafted put patterns record the position phrase in `manner`.
    // Reading only `method` was a latent bug: `put X before Y` silently built
    // a put-INTO AST (wrong insertion position at runtime).
    const node = createCommandNode('put', {
      patient: literal('x', 'string'),
      destination: reference('me'),
      manner: literal('before', 'string'),
    });
    const result = resolveCommandMapper('put')!.toAST(node, new ASTBuilder());
    expect(result.modifiers!['before']).toBeDefined();
    expect(result.modifiers!['into']).toBeUndefined();
  });

  it('maps the at-end-of positional put to the multi-word modifier key', () => {
    // `put it at end of body` (make-toast-element): the position phrase is the
    // exact key the core PutCommand accepts ('at end of' → beforeend).
    const node = createCommandNode('put', {
      patient: reference('it'),
      destination: reference('body'),
      manner: literal('at end of', 'string'),
    });
    const result = resolveCommandMapper('put')!.toAST(node, new ASTBuilder());
    expect(result.modifiers!['at end of']).toMatchObject({
      type: 'identifier',
      name: 'body',
    });
    expect(result.modifiers!['into']).toBeUndefined();
  });
});

// =============================================================================
// Fetch Mapper Tests
// =============================================================================

describe('Fetch Command Mapper', () => {
  it('should map fetch with URL', () => {
    const node = createCommandNode('fetch', {
      source: literal('/api/data', 'string'),
    });

    const mapper = resolveCommandMapper('fetch')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('fetch');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: '/api/data' });
  });
});

// =============================================================================
// Log Mapper Tests
// =============================================================================

describe('Log Command Mapper', () => {
  it('should map log with patient', () => {
    const node = createCommandNode('log', {
      patient: literal('Debug message', 'string'),
    });

    const mapper = resolveCommandMapper('log')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('log');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: 'Debug message' });
  });
});

// =============================================================================
// Trigger/Send Mapper Tests
// =============================================================================

describe('Trigger Command Mapper', () => {
  it('should map trigger with event', () => {
    const node = createCommandNode('trigger', {
      event: literal('customEvent', 'string'),
    });

    const mapper = resolveCommandMapper('trigger')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('trigger');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: 'customEvent' });
  });

  it('should map trigger with destination', () => {
    const node = createCommandNode('trigger', {
      event: literal('click', 'string'),
      destination: selector('#button', 'id'),
    });

    const mapper = resolveCommandMapper('trigger')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.modifiers!['on']).toMatchObject({ type: 'selector', value: '#button' });
  });
});

describe('Send Command Mapper', () => {
  it('should map send with event', () => {
    const node = createCommandNode('send', {
      event: literal('myEvent', 'string'),
    });

    const mapper = resolveCommandMapper('send')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('send');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: 'myEvent' });
  });
});

// =============================================================================
// Go Mapper Tests
// =============================================================================

describe('Go Command Mapper', () => {
  // The runtime's GoCommand reads ONLY positional args: 'back' → history,
  // 'url' + next arg → URL navigation, bare value → bare-url/scroll branches.
  // (The old mapper read a `source` role the schema never produces and emitted
  // `modifiers.to`, which the runtime ignores — go's semantic path was dead.)
  it('should map the url idiom to args ["url", <destination>]', () => {
    const node = createCommandNode('go', {
      destination: literal('/page', 'string'),
      method: literal('url', 'string'),
    });

    const mapper = resolveCommandMapper('go')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('go');
    expect(result.args[0]).toMatchObject({ type: 'string', value: 'url' });
    expect(result.args[1]).toMatchObject({ type: 'literal', value: '/page' });
    expect(result.modifiers ?? {}).toEqual({});
  });

  it('should map go back to args ["back"]', () => {
    const node = createCommandNode('go', {
      destination: literal('back', 'string'),
    });

    const mapper = resolveCommandMapper('go')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('go');
    expect(result.args).toHaveLength(1);
    expect(result.args[0]).toMatchObject({ type: 'string', value: 'back' });
  });

  it('should map a plain destination to a single positional arg', () => {
    const node = createCommandNode('go', {
      destination: literal('/path/to/page', 'string'),
    });

    const mapper = resolveCommandMapper('go')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('go');
    expect(result.args).toHaveLength(1);
    expect(result.args[0]).toMatchObject({ type: 'literal', value: '/path/to/page' });
  });
});

// =============================================================================
// Transition Mapper Tests
// =============================================================================

describe('Transition Command Mapper', () => {
  it('should map transition with destination and duration', () => {
    const node = createCommandNode('transition', {
      destination: reference('me'),
      duration: literal('500ms'),
    });

    const mapper = resolveCommandMapper('transition')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('transition');
  });
});

// =============================================================================
// Control Flow Mapper Tests
// =============================================================================

describe('Return Command Mapper', () => {
  it('should map return with value', () => {
    const node = createCommandNode('return', {
      patient: literal(42, 'number'),
    });

    const mapper = resolveCommandMapper('return')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('return');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: 42 });
  });

  it('should map return without value', () => {
    const node = createCommandNode('return', {});

    const mapper = resolveCommandMapper('return')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('return');
    expect(result.args).toHaveLength(0);
  });
});

describe('Halt Command Mapper', () => {
  it('should map halt', () => {
    const node = createCommandNode('halt', {});

    const mapper = resolveCommandMapper('halt')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('halt');
    expect(result.args).toEqual([]);
  });

  it('preserves the patient (`halt the event` must not collapse to a bare halt)', () => {
    // A bare halt stops the WHOLE handler; `halt the event` only
    // preventDefault/stopPropagations and the handler continues. The semantic
    // parse captures the patient as the literal 'the' (the `event` word is
    // consumed as a keyword); HaltCommand.execute resolves a 'the' target to
    // context.event. Dropping the patient made `halt the event then toggle …`
    // skip the toggle.
    const node = createCommandNode('halt', { patient: literal('the', 'string') });

    const mapper = resolveCommandMapper('halt')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('halt');
    // The patient rides the `the` slot (Arc 3 step 3) — the shape the core
    // parser emits and HaltCommand reads; a bare halt has no slot.
    expect(result.args).toHaveLength(0);
    expect(result.modifiers?.the).toMatchObject({ type: 'literal', value: 'the' });
  });
});

describe('Throw Command Mapper', () => {
  it('should map throw with message', () => {
    const node = createCommandNode('throw', {
      patient: literal('Error occurred', 'string'),
    });

    const mapper = resolveCommandMapper('throw')!;
    const builder = new ASTBuilder();
    const result = mapper.toAST(node, builder);

    expect(result.name).toBe('throw');
    expect(result.args[0]).toMatchObject({ type: 'literal', value: 'Error occurred' });
  });
});

// =============================================================================
// All Mappers Exist Test
// =============================================================================

describe('Command Mapper Registry', () => {
  const allCommands: ActionType[] = [
    'toggle',
    'add',
    'remove',
    'set',
    'show',
    'hide',
    'increment',
    'decrement',
    'wait',
    'log',
    'put',
    'fetch',
    'append',
    'prepend',
    'trigger',
    'send',
    'go',
    'transition',
    'focus',
    'blur',
    'get',
    'take',
    'call',
    'return',
    'halt',
    'throw',
    'settle',
    'swap',
    'morph',
    'clone',
    'make',
    'measure',
    'tell',
    'js',
    'if',
    'unless',
    'repeat',
    'for',
    'while',
    'continue',
    'default',
    'init',
    'behavior',
    'install',
    'on',
  ];

  it('should have mappers for all commands', () => {
    const missing: string[] = [];

    allCommands.forEach(action => {
      const mapper = resolveCommandMapper(action);
      if (!mapper) {
        missing.push(action);
      }
    });

    expect(missing).toEqual([]);
  });
});
