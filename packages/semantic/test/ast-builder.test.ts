/**
 * AST Builder Tests
 *
 * Tests for converting SemanticNodes to AST nodes.
 */

import { describe, it, expect } from 'vitest';
import {
  ASTBuilder,
  buildAST,
  type EventHandlerNode,
  type ConditionalNode,
  type CommandSequenceNode,
  type CommandNode,
} from '../src/ast-builder/index';
import { convertValue, convertLiteral, convertSelector, convertReference } from '../src/ast-builder/value-converters';
import { getCommandMapper } from '../src/ast-builder/command-mappers';
import type {
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
} from '../src/types';

// =============================================================================
// Value Converter Tests
// =============================================================================

describe('Value Converters', () => {
  describe('convertLiteral', () => {
    it('should convert string literal', () => {
      const value: LiteralValue = { type: 'literal', value: 'hello', dataType: 'string' };
      const result = convertLiteral(value);

      expect(result.type).toBe('literal');
      expect(result.value).toBe('hello');
      expect(result.dataType).toBe('string');
    });

    it('should convert number literal', () => {
      const value: LiteralValue = { type: 'literal', value: 42, dataType: 'number' };
      const result = convertLiteral(value);

      expect(result.type).toBe('literal');
      expect(result.value).toBe(42);
      expect(result.dataType).toBe('number');
    });

    it('should convert boolean literal', () => {
      const value: LiteralValue = { type: 'literal', value: true, dataType: 'boolean' };
      const result = convertLiteral(value);

      expect(result.type).toBe('literal');
      expect(result.value).toBe(true);
      expect(result.dataType).toBe('boolean');
    });

    it('should handle literal without dataType', () => {
      const value: LiteralValue = { type: 'literal', value: 'test' };
      const result = convertLiteral(value);

      expect(result.type).toBe('literal');
      expect(result.value).toBe('test');
      expect(result.dataType).toBeUndefined();
    });
  });

  describe('convertSelector', () => {
    it('should convert class selector', () => {
      const value: SelectorValue = { type: 'selector', value: '.active', selectorKind: 'class' };
      const result = convertSelector(value);

      expect(result.type).toBe('selector');
      expect(result.value).toBe('.active');
      expect(result.selectorType).toBe('class');
    });

    it('should convert id selector', () => {
      const value: SelectorValue = { type: 'selector', value: '#button', selectorKind: 'id' };
      const result = convertSelector(value);

      expect(result.type).toBe('selector');
      expect(result.value).toBe('#button');
      expect(result.selectorType).toBe('id');
    });
  });

  describe('convertReference', () => {
    it('should convert me reference', () => {
      const value: ReferenceValue = { type: 'reference', value: 'me' };
      const result = convertReference(value);

      expect(result.type).toBe('contextReference');
      expect(result.contextType).toBe('me');
      expect(result.name).toBe('me');
    });

    it('should convert event reference', () => {
      const value: ReferenceValue = { type: 'reference', value: 'event' };
      const result = convertReference(value);

      expect(result.type).toBe('contextReference');
      expect(result.contextType).toBe('event');
    });
  });

  describe('convertValue', () => {
    it('should dispatch to correct converter based on type', () => {
      const literal: LiteralValue = { type: 'literal', value: 'test', dataType: 'string' };
      expect(convertValue(literal).type).toBe('literal');

      const selector: SelectorValue = { type: 'selector', value: '.foo', selectorKind: 'class' };
      expect(convertValue(selector).type).toBe('selector');

      const reference: ReferenceValue = { type: 'reference', value: 'me' };
      expect(convertValue(reference).type).toBe('contextReference');
    });

    it('should handle property path', () => {
      const value: PropertyPathValue = {
        type: 'property-path',
        object: { type: 'reference', value: 'me' },
        property: 'value',
      };
      const result = convertValue(value);

      expect(result.type).toBe('propertyAccess');
    });
  });
});

// =============================================================================
// Command Mapper Tests
// =============================================================================

describe('Command Mappers', () => {
  describe('toggle mapper', () => {
    it('should map toggle command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'toggle',
        roles: new Map([
          ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
          ['destination', { type: 'selector', value: '#button', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('toggle');
      expect(mapper).toBeDefined();

      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.type).toBe('command');
      expect(result.name).toBe('toggle');
      expect(result.args).toHaveLength(1);
      expect(result.args[0]).toMatchObject({ type: 'selector', value: '.active' });
      expect(result.modifiers).toBeDefined();
      expect(result.modifiers!['on']).toMatchObject({ type: 'selector', value: '#button' });
    });
  });

  describe('add mapper', () => {
    it('should map add command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'add',
        roles: new Map([
          ['patient', { type: 'selector', value: '.highlight', selectorKind: 'class' }],
          ['destination', { type: 'reference', value: 'me' }],
        ]),
      };

      const mapper = getCommandMapper('add');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('add');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['to']).toMatchObject({ type: 'contextReference' });
    });
  });

  describe('wait mapper', () => {
    it('should map wait command with duration', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'wait',
        roles: new Map([
          ['duration', { type: 'literal', value: '2s', dataType: 'duration' }],
        ]),
      };

      const mapper = getCommandMapper('wait');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('wait');
      expect(result.args).toHaveLength(1);
      expect(result.isBlocking).toBe(true);
    });
  });

  describe('log mapper', () => {
    it('should map log command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'log',
        roles: new Map([
          ['patient', { type: 'literal', value: 'hello', dataType: 'string' }],
        ]),
      };

      const mapper = getCommandMapper('log');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('log');
      expect(result.args).toHaveLength(1);
      expect(result.args[0]).toMatchObject({ type: 'literal', value: 'hello' });
    });
  });
});

// =============================================================================
// AST Builder Tests
// =============================================================================

describe('ASTBuilder', () => {
  const builder = new ASTBuilder();

  describe('build command', () => {
    it('should build command node from semantic node', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'toggle',
        roles: new Map([
          ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
        ]),
      };

      const result = builder.build(node);

      expect(result.type).toBe('command');
      expect((result as any).name).toBe('toggle');
    });

    it('should use generic mapper for unknown commands', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'custom-command' as any,
        roles: new Map([
          ['patient', { type: 'literal', value: 'test', dataType: 'string' }],
        ]),
      };

      const result = builder.build(node);

      expect(result.type).toBe('command');
      expect((result as any).name).toBe('custom-command');
    });
  });

  describe('build event handler', () => {
    it('should build event handler node', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        roles: new Map([
          ['event', { type: 'literal', value: 'click', dataType: 'string' }],
        ]),
        body: [
          {
            kind: 'command',
            action: 'toggle',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
        ],
      };

      const result = builder.build(node);

      expect(result.type).toBe('eventHandler');
      expect((result as any).event).toBe('click');
      expect((result as any).commands).toHaveLength(1);
    });
  });

  describe('build conditional', () => {
    it('should build conditional node', () => {
      const node: ConditionalSemanticNode = {
        kind: 'conditional',
        roles: new Map([
          ['condition', { type: 'expression', raw: 'x > 5' }],
        ]),
        thenBranch: [
          {
            kind: 'command',
            action: 'log',
            roles: new Map([
              ['patient', { type: 'literal', value: 'greater', dataType: 'string' }],
            ]),
          },
        ],
      };

      const result = builder.build(node);

      // Now produces CommandNode format for runtime compatibility
      expect(result.type).toBe('command');
      expect((result as any).name).toBe('if');
      expect((result as any).args).toHaveLength(2); // condition + then block
      expect((result as any).args[1].type).toBe('block');
      expect((result as any).args[1].commands).toHaveLength(1);
    });

    it('should handle else branch', () => {
      const node: ConditionalSemanticNode = {
        kind: 'conditional',
        roles: new Map([
          ['condition', { type: 'literal', value: true, dataType: 'boolean' }],
        ]),
        thenBranch: [
          {
            kind: 'command',
            action: 'show',
            roles: new Map([
              ['patient', { type: 'selector', value: '#panel', selectorKind: 'id' }],
            ]),
          },
        ],
        elseBranch: [
          {
            kind: 'command',
            action: 'hide',
            roles: new Map([
              ['patient', { type: 'selector', value: '#panel', selectorKind: 'id' }],
            ]),
          },
        ],
      };

      const result = builder.build(node);

      // Now produces CommandNode format for runtime compatibility
      expect(result.type).toBe('command');
      expect((result as any).name).toBe('if');
      expect((result as any).args).toHaveLength(3); // condition + then block + else block
      expect((result as any).args[2].type).toBe('block');
      expect((result as any).args[2].commands).toHaveLength(1);
    });
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('buildAST', () => {
  it('should build AST using convenience function', () => {
    const node: CommandSemanticNode = {
      kind: 'command',
      action: 'increment',
      roles: new Map([
        ['patient', { type: 'selector', value: '#count', selectorKind: 'id' }],
      ]),
    };

    const result = buildAST(node);

    expect(result.ast.type).toBe('command');
    expect((result.ast as any).name).toBe('increment');
  });
});

// =============================================================================
// Additional Command Mapper Tests (Tier 2)
// =============================================================================

describe('Tier 2 Command Mappers', () => {
  describe('trigger mapper', () => {
    it('should map trigger command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'trigger',
        roles: new Map([
          ['event', { type: 'literal', value: 'click', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#button', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('trigger');
      expect(mapper).toBeDefined();

      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('trigger');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['on']).toBeDefined();
    });
  });

  describe('send mapper', () => {
    it('should map send command with detail', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'send',
        roles: new Map([
          ['event', { type: 'literal', value: 'customEvent', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#target', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('send');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('send');
      expect(result.modifiers!['to']).toBeDefined();
    });
  });

  describe('append mapper', () => {
    it('should map append command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'append',
        roles: new Map([
          ['patient', { type: 'literal', value: '<p>Hello</p>', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#container', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('append');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('append');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['to']).toBeDefined();
    });
  });

  describe('focus mapper', () => {
    it('should map focus command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'focus',
        roles: new Map([
          ['destination', { type: 'selector', value: '#input', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('focus');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('focus');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('halt mapper', () => {
    it('should map halt command with no args', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'halt',
        roles: new Map(),
      };

      const mapper = getCommandMapper('halt');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('halt');
      expect(result.args).toHaveLength(0);
    });
  });

  describe('transition mapper', () => {
    it('should map transition command with duration', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'transition',
        roles: new Map([
          ['patient', { type: 'literal', value: 'opacity', dataType: 'string' }],
          ['duration', { type: 'literal', value: '500ms', dataType: 'duration' }],
        ]),
      };

      const mapper = getCommandMapper('transition');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('transition');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['over']).toBeDefined();
    });
  });

  describe('return mapper', () => {
    it('should map return command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'return',
        roles: new Map([
          ['patient', { type: 'literal', value: 42, dataType: 'number' }],
        ]),
      };

      const mapper = getCommandMapper('return');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('return');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('throw mapper', () => {
    it('should map throw command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'throw',
        roles: new Map([
          ['patient', { type: 'literal', value: 'Error occurred', dataType: 'string' }],
        ]),
      };

      const mapper = getCommandMapper('throw');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('throw');
      expect(result.args).toHaveLength(1);
    });
  });
});

// =============================================================================
// Tier 3 Command Mapper Tests
// =============================================================================

describe('Tier 3 Command Mappers', () => {
  describe('swap mapper', () => {
    it('should map swap command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'swap',
        roles: new Map([
          ['patient', { type: 'literal', value: 'innerHTML', dataType: 'string' }],
          ['source', { type: 'literal', value: '<p>New content</p>', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#target', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('swap');
      expect(mapper).toBeDefined();

      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('swap');
      expect(result.args).toHaveLength(2);
      expect(result.modifiers!['on']).toBeDefined();
    });
  });

  describe('morph mapper', () => {
    it('should map morph command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'morph',
        roles: new Map([
          ['source', { type: 'literal', value: '<div>Morphed</div>', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#element', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('morph');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('morph');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['on']).toBeDefined();
    });
  });

  describe('clone mapper', () => {
    it('should map clone command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'clone',
        roles: new Map([
          ['source', { type: 'selector', value: '#template', selectorKind: 'id' }],
          ['destination', { type: 'selector', value: '#container', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('clone');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('clone');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['into']).toBeDefined();
    });
  });

  describe('if mapper', () => {
    it('should map if command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'if',
        roles: new Map([
          ['condition', { type: 'expression', raw: 'x > 5' }],
        ]),
      };

      const mapper = getCommandMapper('if');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('if');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('for mapper', () => {
    it('should map for loop command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'for',
        roles: new Map([
          ['patient', { type: 'reference', value: 'item' }],
          ['source', { type: 'reference', value: 'items' }],
        ]),
      };

      const mapper = getCommandMapper('for');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('for');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['in']).toBeDefined();
    });
  });

  describe('while mapper', () => {
    it('should map while loop command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'while',
        roles: new Map([
          ['condition', { type: 'expression', raw: 'count < 10' }],
        ]),
      };

      const mapper = getCommandMapper('while');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('while');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('repeat mapper', () => {
    it('should map repeat command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'repeat',
        roles: new Map([
          ['quantity', { type: 'literal', value: 5, dataType: 'number' }],
        ]),
      };

      const mapper = getCommandMapper('repeat');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('repeat');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('behavior mapper', () => {
    it('should map behavior command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'behavior',
        roles: new Map([
          ['patient', { type: 'literal', value: 'Draggable', dataType: 'string' }],
        ]),
      };

      const mapper = getCommandMapper('behavior');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('behavior');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('install mapper', () => {
    it('should map install command', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'install',
        roles: new Map([
          ['patient', { type: 'literal', value: 'Draggable', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#panel', selectorKind: 'id' }],
        ]),
      };

      const mapper = getCommandMapper('install');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('install');
      expect(result.args).toHaveLength(1);
      expect(result.modifiers!['on']).toBeDefined();
    });
  });

  describe('async mapper', () => {
    it('should map async command with no args', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'async',
        roles: new Map(),
      };

      const mapper = getCommandMapper('async');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('async');
      expect(result.args).toHaveLength(0);
    });
  });

  describe('continue mapper', () => {
    it('should map continue command with no args', () => {
      const node: CommandSemanticNode = {
        kind: 'command',
        action: 'continue',
        roles: new Map(),
      };

      const mapper = getCommandMapper('continue');
      const builder = new ASTBuilder();
      const result = mapper!.toAST(node, builder);

      expect(result.name).toBe('continue');
      expect(result.args).toHaveLength(0);
    });
  });
});

// =============================================================================
// Mapper Coverage Test
// =============================================================================

describe('Command Mapper Coverage', () => {
  it('should have mappers for all 46 commands', () => {
    const expectedCommands = [
      // Tier 1
      'toggle', 'add', 'remove', 'set', 'show', 'hide',
      'increment', 'decrement', 'wait', 'log', 'put', 'fetch',
      // Tier 2
      'append', 'prepend', 'get', 'take', 'trigger', 'send', 'on',
      'go', 'transition', 'focus', 'blur',
      'call', 'return', 'halt', 'throw', 'settle',
      // Tier 3
      'swap', 'morph', 'clone', 'measure',
      'make', 'tell', 'default',
      'js', 'async',
      'if', 'unless',
      'repeat', 'for', 'while', 'continue',
      'init', 'behavior', 'install',
    ];

    for (const command of expectedCommands) {
      const mapper = getCommandMapper(command as any);
      expect(mapper, `Missing mapper for: ${command}`).toBeDefined();
    }

    expect(expectedCommands.length).toBe(46);
  });
});

// =============================================================================
// Enhanced Event Handler Tests (Phase 4)
// =============================================================================

describe('Enhanced Event Handler Building', () => {
  const builder = new ASTBuilder();

  describe('basic event handlers', () => {
    it('should build a simple click event handler', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'click', dataType: 'string' }],
        ]),
        body: [
          {
            kind: 'command',
            action: 'toggle',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.type).toBe('eventHandler');
      expect(result.event).toBe('click');
      expect(result.commands).toHaveLength(1);
      expect((result.commands[0] as any).name).toBe('toggle');
    });

    it('should handle default event (click) when no event specified', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map(),
        body: [
          {
            kind: 'command',
            action: 'hide',
            roles: new Map([
              ['patient', { type: 'reference', value: 'me' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.event).toBe('click');
    });
  });

  describe('event handler with selector (from clause)', () => {
    it('should extract selector from source role', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'click', dataType: 'string' }],
          ['source', { type: 'selector', value: '.button', selectorKind: 'class' }],
        ]),
        body: [
          {
            kind: 'command',
            action: 'hide',
            roles: new Map([
              ['patient', { type: 'reference', value: 'me' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.selector).toBe('.button');
      expect(result.target).toBe('.button');
    });

    it('should handle reference source (e.g., window, document)', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'keydown', dataType: 'string' }],
          ['source', { type: 'reference', value: 'body' }],
        ]),
        body: [
          {
            kind: 'command',
            action: 'log',
            roles: new Map([
              ['patient', { type: 'literal', value: 'key pressed', dataType: 'string' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.target).toBe('body');
      expect(result.selector).toBeUndefined();
    });
  });

  describe('multiple events (or syntax)', () => {
    it('should parse multiple events separated by or', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'click or keydown', dataType: 'string' }],
        ]),
        body: [
          {
            kind: 'command',
            action: 'toggle',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.event).toBe('click');
      expect(result.events).toEqual(['click', 'keydown']);
    });

    it('should parse multiple events separated by pipe', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'mouseenter|mouseleave', dataType: 'string' }],
        ]),
        body: [],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.event).toBe('mouseenter');
      expect(result.events).toEqual(['mouseenter', 'mouseleave']);
    });
  });

  describe('event handler with condition', () => {
    it('should include condition when present', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'keydown', dataType: 'string' }],
          ['condition', { type: 'expression', raw: 'altKey and code is "KeyS"' }],
        ]),
        body: [
          {
            kind: 'command',
            action: 'hide',
            roles: new Map([
              ['patient', { type: 'reference', value: 'me' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.condition).toBeDefined();
    });
  });

  describe('event handler with watchTarget', () => {
    it('should include watchTarget from destination role', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on',
        roles: new Map([
          ['event', { type: 'literal', value: 'mutation', dataType: 'string' }],
          ['destination', { type: 'selector', value: '#target', selectorKind: 'id' }],
        ]),
        body: [],
      };

      const result = builder.build(node) as EventHandlerNode;

      expect(result.watchTarget).toBeDefined();
    });
  });
});

// =============================================================================
// Compound Statement Tests (Phase 4)
// =============================================================================

describe('Compound Statement Building', () => {
  const builder = new ASTBuilder();

  describe('then chains', () => {
    it('should build compound node from multiple statements', () => {
      const node: CompoundSemanticNode = {
        kind: 'compound',
        action: 'compound',
        roles: new Map(),
        statements: [
          {
            kind: 'command',
            action: 'toggle',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
          {
            kind: 'command',
            action: 'wait',
            roles: new Map([
              ['duration', { type: 'literal', value: '500ms', dataType: 'duration' }],
            ]),
          },
          {
            kind: 'command',
            action: 'hide',
            roles: new Map([
              ['patient', { type: 'reference', value: 'me' }],
            ]),
          },
        ],
        chainType: 'then',
      };

      const result = builder.build(node);

      // Now produces CommandSequence for runtime compatibility
      expect(result.type).toBe('CommandSequence');
      expect((result as any).commands).toHaveLength(3);
    });

    it('should unwrap single-statement compound', () => {
      const node: CompoundSemanticNode = {
        kind: 'compound',
        action: 'compound',
        roles: new Map(),
        statements: [
          {
            kind: 'command',
            action: 'toggle',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
        ],
        chainType: 'then',
      };

      const result = builder.build(node);

      // Single statement should be unwrapped
      expect(result.type).toBe('command');
      expect((result as any).name).toBe('toggle');
    });

    it('should return empty block for empty compound', () => {
      const node: CompoundSemanticNode = {
        kind: 'compound',
        action: 'compound',
        roles: new Map(),
        statements: [],
        chainType: 'then',
      };

      const result = builder.build(node);

      expect(result.type).toBe('block');
      expect((result as any).commands).toHaveLength(0);
    });
  });

  describe('async chains', () => {
    it('should build async chain as command sequence', () => {
      const node: CompoundSemanticNode = {
        kind: 'compound',
        action: 'compound',
        roles: new Map(),
        statements: [
          {
            kind: 'command',
            action: 'fetch',
            roles: new Map([
              ['source', { type: 'literal', value: '/api/data', dataType: 'string' }],
            ]),
          },
          {
            kind: 'command',
            action: 'log',
            roles: new Map([
              ['patient', { type: 'reference', value: 'result' }],
            ]),
          },
        ],
        chainType: 'async',
      };

      const result = builder.build(node) as CommandSequenceNode;

      // Async chains produce CommandSequence for runtime compatibility
      expect(result.type).toBe('CommandSequence');
      expect(result.commands).toHaveLength(2);
      expect((result.commands[0] as any).name).toBe('fetch');
      expect((result.commands[1] as any).name).toBe('log');
    });
  });

  describe('and chains (parallel)', () => {
    it('should build and chain as command sequence', () => {
      const node: CompoundSemanticNode = {
        kind: 'compound',
        action: 'compound',
        roles: new Map(),
        statements: [
          {
            kind: 'command',
            action: 'add',
            roles: new Map([
              ['patient', { type: 'selector', value: '.loading', selectorKind: 'class' }],
            ]),
          },
          {
            kind: 'command',
            action: 'toggle',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
        ],
        chainType: 'and',
      };

      const result = builder.build(node) as CommandSequenceNode;

      // And chains produce CommandSequence for runtime compatibility
      expect(result.type).toBe('CommandSequence');
      expect(result.commands).toHaveLength(2);
      expect((result.commands[0] as any).name).toBe('add');
      expect((result.commands[1] as any).name).toBe('toggle');
    });
  });
});

// =============================================================================
// Conditional Node Tests (Phase 4)
// =============================================================================

describe('Conditional Node Building', () => {
  const builder = new ASTBuilder();

  describe('if statements', () => {
    it('should build conditional with then branch only', () => {
      const node: ConditionalSemanticNode = {
        kind: 'conditional',
        action: 'if',
        roles: new Map([
          ['condition', { type: 'expression', raw: 'x > 5' }],
        ]),
        thenBranch: [
          {
            kind: 'command',
            action: 'add',
            roles: new Map([
              ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as CommandNode;

      // Conditionals now produce CommandNode format for runtime compatibility
      expect(result.type).toBe('command');
      expect(result.name).toBe('if');
      expect(result.args).toHaveLength(2); // condition + then block
      expect(result.args[0]).toBeDefined(); // condition
      expect((result.args[1] as any).type).toBe('block');
      expect((result.args[1] as any).commands).toHaveLength(1); // then branch
    });

    it('should build conditional with else branch', () => {
      const node: ConditionalSemanticNode = {
        kind: 'conditional',
        action: 'if',
        roles: new Map([
          ['condition', { type: 'expression', raw: 'isLoggedIn' }],
        ]),
        thenBranch: [
          {
            kind: 'command',
            action: 'show',
            roles: new Map([
              ['patient', { type: 'selector', value: '#dashboard', selectorKind: 'id' }],
            ]),
          },
        ],
        elseBranch: [
          {
            kind: 'command',
            action: 'show',
            roles: new Map([
              ['patient', { type: 'selector', value: '#login', selectorKind: 'id' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as CommandNode;

      // Conditionals with else produce 3 args: condition, then block, else block
      expect(result.type).toBe('command');
      expect(result.name).toBe('if');
      expect(result.args).toHaveLength(3);
      expect((result.args[1] as any).commands).toHaveLength(1); // then branch
      expect((result.args[2] as any).commands).toHaveLength(1); // else branch
    });

    it('should handle multiple commands in branches', () => {
      const node: ConditionalSemanticNode = {
        kind: 'conditional',
        action: 'if',
        roles: new Map([
          ['condition', { type: 'literal', value: true }],
        ]),
        thenBranch: [
          {
            kind: 'command',
            action: 'add',
            roles: new Map([
              ['patient', { type: 'selector', value: '.loading', selectorKind: 'class' }],
            ]),
          },
          {
            kind: 'command',
            action: 'wait',
            roles: new Map([
              ['duration', { type: 'literal', value: '1s', dataType: 'duration' }],
            ]),
          },
          {
            kind: 'command',
            action: 'remove',
            roles: new Map([
              ['patient', { type: 'selector', value: '.loading', selectorKind: 'class' }],
            ]),
          },
        ],
      };

      const result = builder.build(node) as CommandNode;

      expect((result.args[1] as any).commands).toHaveLength(3); // then branch has 3 commands
    });

    it('should throw error when condition is missing', () => {
      const node: ConditionalSemanticNode = {
        kind: 'conditional',
        action: 'if',
        roles: new Map(),
        thenBranch: [
          {
            kind: 'command',
            action: 'hide',
            roles: new Map(),
          },
        ],
      };

      expect(() => builder.build(node)).toThrow('Conditional node missing condition');
    });
  });
});

// =============================================================================
// buildBlock Public Method Tests
// =============================================================================

describe('ASTBuilder.buildBlock', () => {
  it('should build a block from semantic nodes', () => {
    const builder = new ASTBuilder();
    const nodes: SemanticNode[] = [
      {
        kind: 'command',
        action: 'toggle',
        roles: new Map([
          ['patient', { type: 'selector', value: '.active', selectorKind: 'class' }],
        ]),
      },
      {
        kind: 'command',
        action: 'wait',
        roles: new Map([
          ['duration', { type: 'literal', value: '500ms', dataType: 'duration' }],
        ]),
      },
    ];

    const result = builder.buildBlock(nodes);

    expect(result.type).toBe('block');
    expect(result.commands).toHaveLength(2);
  });

  it('should return empty block for empty array', () => {
    const builder = new ASTBuilder();
    const result = builder.buildBlock([]);

    expect(result.type).toBe('block');
    expect(result.commands).toHaveLength(0);
  });
});
