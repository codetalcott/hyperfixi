import { describe, it, expect } from 'vitest';
import { renderToHyperscript } from '../src/hyperscript-renderer';
import type {
  SemanticNode,
  SemanticValue,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
} from '@lokascript/semantic/core';

// Helpers to build SemanticNodes without importing the full type system
function cmd(action: string, roles: [string, SemanticValue][]): SemanticNode {
  return {
    kind: 'command',
    action: action as any,
    roles: new Map(roles as any),
  } as SemanticNode;
}

function sel(value: string): SemanticValue {
  return { type: 'selector', value, selectorKind: 'class' } as SemanticValue;
}

function ref(value: string): SemanticValue {
  return { type: 'reference', value } as SemanticValue;
}

function lit(value: string | number, dataType?: string): SemanticValue {
  return { type: 'literal', value, dataType } as SemanticValue;
}

function expr(raw: string): SemanticValue {
  return { type: 'expression', raw } as SemanticValue;
}

function prop(objectValue: SemanticValue, property: string): SemanticValue {
  return { type: 'property-path', object: objectValue, property } as SemanticValue;
}

// -------------------------------------------------------------------------
// Command rendering
// -------------------------------------------------------------------------

describe('renderToHyperscript', () => {
  describe('class/attribute commands', () => {
    it('renders toggle with patient', () => {
      expect(renderToHyperscript(cmd('toggle', [['patient', sel('.active')]]))).toBe(
        'toggle .active',
      );
    });

    it('renders toggle with destination', () => {
      expect(
        renderToHyperscript(cmd('toggle', [['patient', sel('.active')], ['destination', sel('#btn')]])),
      ).toBe('toggle .active on #btn');
    });

    it('skips implicit me destination', () => {
      expect(
        renderToHyperscript(cmd('toggle', [['patient', sel('.active')], ['destination', ref('me')]])),
      ).toBe('toggle .active');
    });

    it('renders add with destination', () => {
      expect(
        renderToHyperscript(cmd('add', [['patient', sel('.highlight')], ['destination', sel('#box')]])),
      ).toBe('add .highlight to #box');
    });

    it('renders remove with source', () => {
      expect(
        renderToHyperscript(cmd('remove', [['patient', sel('.hidden')], ['source', ref('me')]])),
      ).toBe('remove .hidden from me');
    });
  });

  describe('content commands', () => {
    it('renders put into', () => {
      expect(
        renderToHyperscript(
          cmd('put', [['patient', lit('hello', 'string')], ['destination', sel('#output')]]),
        ),
      ).toBe('put "hello" into #output');
    });

    it('renders set to', () => {
      expect(
        renderToHyperscript(cmd('set', [['destination', expr(':count')], ['patient', lit(10)]])),
      ).toBe('set :count to 10');
    });

    it('renders append to', () => {
      expect(
        renderToHyperscript(
          cmd('append', [['patient', lit('text', 'string')], ['destination', sel('#list')]]),
        ),
      ).toBe('append "text" to #list');
    });
  });

  describe('variable commands', () => {
    it('renders get', () => {
      expect(renderToHyperscript(cmd('get', [['source', sel('#value')]]))).toBe('get #value');
    });

    it('renders increment', () => {
      expect(renderToHyperscript(cmd('increment', [['patient', sel('#count')]]))).toBe(
        'increment #count',
      );
    });

    it('renders increment with quantity', () => {
      expect(
        renderToHyperscript(cmd('increment', [['patient', sel('#count')], ['quantity', lit(5)]])),
      ).toBe('increment #count by 5');
    });

    it('renders decrement', () => {
      expect(renderToHyperscript(cmd('decrement', [['patient', sel('#count')]]))).toBe(
        'decrement #count',
      );
    });

    it('renders log', () => {
      expect(renderToHyperscript(cmd('log', [['patient', lit('debug', 'string')]]))).toBe(
        'log "debug"',
      );
    });
  });

  describe('visibility commands', () => {
    it('renders show', () => {
      expect(renderToHyperscript(cmd('show', [['patient', sel('#modal')]]))).toBe('show #modal');
    });

    it('renders hide with style', () => {
      expect(
        renderToHyperscript(cmd('hide', [['patient', sel('#tooltip')], ['style', lit('fade')]])),
      ).toBe('hide #tooltip with fade');
    });
  });

  describe('event commands', () => {
    it('renders trigger', () => {
      expect(
        renderToHyperscript(cmd('trigger', [['event', lit('click')], ['destination', sel('#btn')]])),
      ).toBe('trigger click on #btn');
    });

    it('renders send', () => {
      expect(
        renderToHyperscript(cmd('send', [['event', lit('myEvent')], ['destination', sel('#target')]])),
      ).toBe('send myEvent to #target');
    });
  });

  describe('async commands', () => {
    it('renders wait', () => {
      expect(renderToHyperscript(cmd('wait', [['patient', lit('500ms')]]))).toBe('wait 500ms');
    });

    it('renders fetch with response type', () => {
      expect(
        renderToHyperscript(cmd('fetch', [['source', lit('/api/data')], ['responseType', lit('json')]])),
      ).toBe('fetch /api/data as json');
    });
  });

  describe('control flow', () => {
    it('renders halt', () => {
      expect(renderToHyperscript(cmd('halt', []))).toBe('halt');
    });

    it('renders continue', () => {
      expect(renderToHyperscript(cmd('continue', []))).toBe('continue');
    });

    it('renders call', () => {
      expect(renderToHyperscript(cmd('call', [['patient', expr('doSomething()')]]))).toBe(
        'call doSomething()',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Event handler rendering
  // -------------------------------------------------------------------------

  describe('event handlers', () => {
    it('renders on click with body', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on' as any,
        roles: new Map([['event', lit('click')]]) as any,
        body: [cmd('toggle', [['patient', sel('.active')]])],
      } as EventHandlerSemanticNode;

      expect(renderToHyperscript(node)).toBe('on click toggle .active');
    });

    it('renders on click with source', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on' as any,
        roles: new Map([
          ['event', lit('click')],
          ['source', sel('#btn')],
        ]) as any,
        body: [cmd('toggle', [['patient', sel('.active')]])],
      } as EventHandlerSemanticNode;

      expect(renderToHyperscript(node)).toBe('on click from #btn toggle .active');
    });

    it('renders multi-command body with then', () => {
      const node: EventHandlerSemanticNode = {
        kind: 'event-handler',
        action: 'on' as any,
        roles: new Map([['event', lit('click')]]) as any,
        body: [
          cmd('add', [['patient', sel('.loading')]]),
          cmd('remove', [['patient', sel('.loaded')]]),
        ],
      } as EventHandlerSemanticNode;

      expect(renderToHyperscript(node)).toBe('on click add .loading then remove .loaded');
    });
  });

  // -------------------------------------------------------------------------
  // Compound rendering
  // -------------------------------------------------------------------------

  describe('compound statements', () => {
    it('renders then chain', () => {
      const node: CompoundSemanticNode = {
        kind: 'compound',
        action: 'compound' as any,
        roles: new Map() as any,
        statements: [
          cmd('add', [['patient', sel('.active')]]),
          cmd('remove', [['patient', sel('.hidden')]]),
        ],
        chainType: 'then',
      } as CompoundSemanticNode;

      expect(renderToHyperscript(node)).toBe('add .active then remove .hidden');
    });
  });

  // -------------------------------------------------------------------------
  // Value rendering
  // -------------------------------------------------------------------------

  describe('value rendering', () => {
    it('renders selectors', () => {
      expect(renderToHyperscript(cmd('toggle', [['patient', sel('.foo')]]))).toBe('toggle .foo');
    });

    it('renders references', () => {
      expect(renderToHyperscript(cmd('show', [['patient', ref('it')]]))).toBe('show it');
    });

    it('renders string literals with quotes', () => {
      expect(
        renderToHyperscript(cmd('put', [['patient', lit('hello', 'string')], ['destination', sel('#out')]])),
      ).toBe('put "hello" into #out');
    });

    it('renders numeric literals', () => {
      expect(
        renderToHyperscript(cmd('set', [['destination', expr(':x')], ['patient', lit(42)]])),
      ).toBe('set :x to 42');
    });

    it('renders expressions', () => {
      expect(renderToHyperscript(cmd('set', [['destination', expr(':x')], ['patient', expr(':y + 1')]]))).toBe(
        'set :x to :y + 1',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property path (possessive) rendering
  // -------------------------------------------------------------------------

  describe('property paths', () => {
    it('renders my (me possessive)', () => {
      expect(renderToHyperscript(cmd('set', [['destination', prop(ref('me'), 'textContent')], ['patient', lit('hi', 'string')]]))).toBe(
        'set my textContent to "hi"',
      );
    });

    it('renders its (it possessive)', () => {
      expect(renderToHyperscript(cmd('set', [['destination', prop(ref('it'), 'opacity')], ['patient', lit(0)]]))).toBe(
        'set its opacity to 0',
      );
    });

    it('renders your (you possessive)', () => {
      expect(renderToHyperscript(cmd('set', [['destination', prop(ref('you'), 'value')], ['patient', lit('x', 'string')]]))).toBe(
        'set your value to "x"',
      );
    });

    it("renders element's (generic possessive)", () => {
      expect(
        renderToHyperscript(cmd('set', [['destination', prop(sel('#el'), 'innerHTML')], ['patient', lit('ok', 'string')]])),
      ).toBe("set #el's innerHTML to \"ok\"");
    });
  });

  // -------------------------------------------------------------------------
  // Newly added commands
  // -------------------------------------------------------------------------

  describe('newly added commands', () => {
    it('renders tell with destination', () => {
      expect(renderToHyperscript(cmd('tell', [['destination', sel('#dialog')]]))).toBe('tell #dialog');
    });

    it('renders else with no roles', () => {
      expect(renderToHyperscript(cmd('else', []))).toBe('else');
    });

    it('renders async with no roles', () => {
      expect(renderToHyperscript(cmd('async', []))).toBe('async');
    });

    it('renders behavior with patient', () => {
      expect(renderToHyperscript(cmd('behavior', [['patient', expr('Draggable')]]))).toBe(
        'behavior Draggable',
      );
    });

    it('renders init with no roles', () => {
      expect(renderToHyperscript(cmd('init', []))).toBe('init');
    });
  });

  // -------------------------------------------------------------------------
  // SYNTAX table coverage validation
  // -------------------------------------------------------------------------

  describe('SYNTAX table coverage', () => {
    // Commands that must have SYNTAX entries (from semantic command-schemas).
    // 'on' is handled by renderEventHandler, 'compound' is handled by renderCompound.
    const expectedCommands = [
      'toggle', 'add', 'remove', 'put', 'set', 'show', 'hide',
      'trigger', 'wait', 'fetch', 'increment', 'decrement',
      'append', 'prepend', 'log', 'get', 'take', 'make', 'halt',
      'settle', 'throw', 'send', 'if', 'unless', 'else', 'repeat',
      'for', 'while', 'continue', 'go', 'transition', 'clone',
      'focus', 'blur', 'call', 'return', 'js', 'async', 'tell',
      'default', 'init', 'behavior', 'install', 'measure', 'swap', 'morph',
      'beep', 'break', 'copy', 'exit', 'pick', 'render',
    ];

    for (const action of expectedCommands) {
      it(`has SYNTAX entry for '${action}'`, () => {
        // Rendering a command with no roles should produce the action name
        const result = renderToHyperscript(cmd(action, []));
        expect(result).toBe(action);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Fallback for unknown commands
  // -------------------------------------------------------------------------

  describe('unknown commands', () => {
    it('renders unknown command with generic fallback', () => {
      const result = renderToHyperscript(cmd('myCustomCommand', [['patient', sel('.x')]]));
      expect(result).toContain('myCustomCommand');
      expect(result).toContain('.x');
    });
  });
});
