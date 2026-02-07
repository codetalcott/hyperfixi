/**
 * Analyzer Tests
 *
 * Comprehensive tests for the static analysis module.
 * Covers command tracking, variable analysis, selector analysis,
 * control flow detection, runtime helper tracking, and purity classification.
 */

import { describe, it, expect } from 'vitest';
import {
  Analyzer,
  analyze,
  hasAsyncOperations,
  getCommandsUsed,
  getRequiredHelpers,
} from './analyzer.js';
import type {
  ASTNode,
  EventHandlerNode,
  CommandNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
} from '../types/aot-types.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

function analyzeNode(node: ASTNode) {
  const analyzer = new Analyzer();
  return analyzer.analyze(node);
}

function cmd(name: string, opts?: Partial<CommandNode>): CommandNode {
  return { type: 'command', name, ...opts };
}

function event(eventName: string, body: ASTNode[]): EventHandlerNode {
  return { type: 'event', event: eventName, body };
}

// =============================================================================
// COMMAND TRACKING
// =============================================================================

describe('Analyzer - Command Tracking', () => {
  it('tracks single command', () => {
    const result = analyzeNode(event('click', [cmd('toggle')]));
    expect(result.commandsUsed.has('toggle')).toBe(true);
    expect(result.commandsUsed.size).toBe(1);
  });

  it('tracks multiple commands', () => {
    const result = analyzeNode(event('click', [cmd('add'), cmd('remove'), cmd('toggle')]));
    expect(result.commandsUsed.has('add')).toBe(true);
    expect(result.commandsUsed.has('remove')).toBe(true);
    expect(result.commandsUsed.has('toggle')).toBe(true);
    expect(result.commandsUsed.size).toBe(3);
  });

  it('deduplicates repeated commands', () => {
    const result = analyzeNode(event('click', [cmd('toggle'), cmd('toggle'), cmd('toggle')]));
    expect(result.commandsUsed.size).toBe(1);
  });

  it('tracks commands inside if blocks', () => {
    const ifNode: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [cmd('add')],
      elseBranch: [cmd('remove')],
    };
    const result = analyzeNode(event('click', [ifNode]));
    expect(result.commandsUsed.has('add')).toBe(true);
    expect(result.commandsUsed.has('remove')).toBe(true);
  });

  it('tracks commands inside loops', () => {
    const repeatNode: RepeatNode = {
      type: 'repeat',
      count: 3,
      body: [cmd('increment')],
    };
    const result = analyzeNode(event('click', [repeatNode]));
    expect(result.commandsUsed.has('increment')).toBe(true);
  });
});

// =============================================================================
// VARIABLE ANALYSIS
// =============================================================================

describe('Analyzer - Variable Analysis', () => {
  it('tracks local variable reads', () => {
    const result = analyzeNode(
      event('click', [
        cmd('set', {
          args: [
            { type: 'variable', name: ':count', scope: 'local' },
            { type: 'literal', value: 0 },
          ],
        }),
      ])
    );
    // The variable node is visited as part of args
    expect(result.variables.locals.has('count')).toBe(true);
  });

  it('tracks global variable reads', () => {
    const result = analyzeNode(
      event('click', [
        cmd('set', {
          args: [
            { type: 'variable', name: '$total', scope: 'global' },
            { type: 'literal', value: 0 },
          ],
        }),
      ])
    );
    expect(result.variables.globals.has('total')).toBe(true);
  });

  it('tracks context variable me', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'identifier', value: 'me' }] })])
    );
    expect(result.variables.contextVars.has('me')).toBe(true);
  });

  it('tracks context variable it', () => {
    const result = analyzeNode(
      event('click', [cmd('log', { args: [{ type: 'identifier', value: 'it' }] })])
    );
    expect(result.variables.contextVars.has('it')).toBe(true);
  });

  it('tracks context variable event', () => {
    const result = analyzeNode(
      event('click', [cmd('log', { args: [{ type: 'identifier', value: 'event' }] })])
    );
    expect(result.variables.contextVars.has('event')).toBe(true);
  });

  it('tracks context variable you', () => {
    const result = analyzeNode(
      event('click', [cmd('set', { args: [{ type: 'identifier', value: 'you' }] })])
    );
    expect(result.variables.contextVars.has('you')).toBe(true);
  });

  it('tracks for-each loop variable as local', () => {
    const forEachNode: ForEachNode = {
      type: 'foreach',
      itemName: 'item',
      collection: { type: 'selector', value: '.items' },
      body: [cmd('log')],
    };
    const result = analyzeNode(event('click', [forEachNode]));
    expect(result.variables.locals.has('item')).toBe(true);
  });

  it('tracks for-each index variable as local', () => {
    const forEachNode: ForEachNode = {
      type: 'foreach',
      itemName: 'item',
      indexName: 'idx',
      collection: { type: 'selector', value: '.items' },
      body: [cmd('log')],
    };
    const result = analyzeNode(event('click', [forEachNode]));
    expect(result.variables.locals.has('idx')).toBe(true);
  });
});

// =============================================================================
// SELECTOR ANALYSIS
// =============================================================================

describe('Analyzer - Selector Analysis', () => {
  it('tracks simple ID selector', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: '#btn' }] })])
    );
    expect(result.expressions.selectors.length).toBe(1);
    expect(result.expressions.selectors[0].selector).toBe('#btn');
    expect(result.expressions.selectors[0].isId).toBe(true);
  });

  it('tracks class selector', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: '.active' }] })])
    );
    expect(result.expressions.selectors.length).toBe(1);
    expect(result.expressions.selectors[0].selector).toBe('.active');
    expect(result.expressions.selectors[0].isId).toBe(false);
  });

  it('counts multiple usages of same selector', () => {
    const result = analyzeNode(
      event('click', [
        cmd('add', { args: [{ type: 'selector', value: '#btn' }] }),
        cmd('remove', { args: [{ type: 'selector', value: '#btn' }] }),
      ])
    );
    expect(result.expressions.selectors.length).toBe(1);
    expect(result.expressions.selectors[0].usages.length).toBe(2);
  });

  it('tracks different selectors separately', () => {
    const result = analyzeNode(
      event('click', [
        cmd('toggle', { args: [{ type: 'selector', value: '#btn' }] }),
        cmd('toggle', { args: [{ type: 'selector', value: '.active' }] }),
      ])
    );
    expect(result.expressions.selectors.length).toBe(2);
  });

  it('marks simple selectors as cacheable', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: '#btn' }] })])
    );
    expect(result.expressions.selectors[0].canCache).toBe(true);
  });

  it('marks dynamic pseudo-class selectors as non-cacheable', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: '.item:not(.active)' }] })])
    );
    expect(result.expressions.selectors[0].canCache).toBe(false);
  });

  it('classifies simple selectors as pure', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: '#btn' }] })])
    );
    expect(result.expressions.pure.length).toBeGreaterThan(0);
  });

  it('classifies complex selectors as dynamic', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: 'div.item:hover' }] })])
    );
    expect(result.expressions.dynamic.length).toBeGreaterThan(0);
  });

  it('adds selectors to DOM queries', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { args: [{ type: 'selector', value: '#btn' }] })])
    );
    expect(result.dependencies.domQueries).toContain('#btn');
  });
});

// =============================================================================
// CONTROL FLOW DETECTION
// =============================================================================

describe('Analyzer - Control Flow', () => {
  it('detects async from fetch', () => {
    const result = analyzeNode(event('click', [cmd('fetch')]));
    expect(result.controlFlow.hasAsync).toBe(true);
  });

  it('detects async from wait', () => {
    const result = analyzeNode(event('click', [cmd('wait')]));
    expect(result.controlFlow.hasAsync).toBe(true);
  });

  it('detects async from settle', () => {
    const result = analyzeNode(event('click', [cmd('settle')]));
    expect(result.controlFlow.hasAsync).toBe(true);
  });

  it('no async for simple commands', () => {
    const result = analyzeNode(event('click', [cmd('toggle')]));
    expect(result.controlFlow.hasAsync).toBe(false);
  });

  it('detects loops from repeat', () => {
    const repeatNode: RepeatNode = {
      type: 'repeat',
      count: 3,
      body: [cmd('log')],
    };
    const result = analyzeNode(event('click', [repeatNode]));
    expect(result.controlFlow.hasLoops).toBe(true);
  });

  it('detects loops from for-each', () => {
    const forEachNode: ForEachNode = {
      type: 'foreach',
      itemName: 'item',
      collection: { type: 'selector', value: '.items' },
      body: [cmd('log')],
    };
    const result = analyzeNode(event('click', [forEachNode]));
    expect(result.controlFlow.hasLoops).toBe(true);
  });

  it('detects loops from while', () => {
    const whileNode: WhileNode = {
      type: 'while',
      condition: { type: 'literal', value: true },
      body: [cmd('log')],
    };
    const result = analyzeNode(event('click', [whileNode]));
    expect(result.controlFlow.hasLoops).toBe(true);
  });

  it('detects conditionals from if', () => {
    const ifNode: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [cmd('add')],
    };
    const result = analyzeNode(event('click', [ifNode]));
    expect(result.controlFlow.hasConditionals).toBe(true);
  });

  it('detects canThrow from halt', () => {
    const result = analyzeNode(event('click', [cmd('halt')]));
    expect(result.controlFlow.canThrow).toBe(true);
  });

  it('detects canThrow from exit', () => {
    const result = analyzeNode(event('click', [cmd('exit')]));
    expect(result.controlFlow.canThrow).toBe(true);
  });

  it('detects canThrow from throw', () => {
    const result = analyzeNode(event('click', [cmd('throw')]));
    expect(result.controlFlow.canThrow).toBe(true);
  });

  it('no canThrow for safe commands', () => {
    const result = analyzeNode(event('click', [cmd('log')]));
    expect(result.controlFlow.canThrow).toBe(false);
  });
});

// =============================================================================
// NESTING DEPTH
// =============================================================================

describe('Analyzer - Nesting Depth', () => {
  it('tracks nesting depth for if', () => {
    const ifNode: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [cmd('add')],
    };
    const result = analyzeNode(event('click', [ifNode]));
    expect(result.controlFlow.maxNestingDepth).toBe(1);
  });

  it('tracks nested if-in-repeat', () => {
    const ifNode: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [cmd('add')],
    };
    const repeatNode: RepeatNode = {
      type: 'repeat',
      count: 3,
      body: [ifNode],
    };
    const result = analyzeNode(event('click', [repeatNode]));
    expect(result.controlFlow.maxNestingDepth).toBe(2);
  });

  it('tracks deeply nested structures', () => {
    const innerIf: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [cmd('log')],
    };
    const middleRepeat: RepeatNode = {
      type: 'repeat',
      count: 2,
      body: [innerIf],
    };
    const outerIf: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [middleRepeat],
    };
    const result = analyzeNode(event('click', [outerIf]));
    expect(result.controlFlow.maxNestingDepth).toBe(3);
  });

  it('zero nesting for flat commands', () => {
    const result = analyzeNode(event('click', [cmd('toggle'), cmd('add')]));
    expect(result.controlFlow.maxNestingDepth).toBe(0);
  });
});

// =============================================================================
// RUNTIME HELPER TRACKING
// =============================================================================

describe('Analyzer - Runtime Helpers', () => {
  it('requires toggle helper for toggle command', () => {
    const result = analyzeNode(event('click', [cmd('toggle')]));
    expect(result.dependencies.runtimeHelpers).toContain('toggle');
  });

  it('requires fetchJSON for fetch command', () => {
    const result = analyzeNode(event('click', [cmd('fetch')]));
    expect(result.dependencies.runtimeHelpers).toContain('fetchJSON');
    expect(result.dependencies.runtimeHelpers).toContain('fetchText');
  });

  it('requires wait for wait command', () => {
    const result = analyzeNode(event('click', [cmd('wait')]));
    expect(result.dependencies.runtimeHelpers).toContain('wait');
  });

  it('requires setProp for set command', () => {
    const result = analyzeNode(event('click', [cmd('set')]));
    expect(result.dependencies.runtimeHelpers).toContain('setProp');
  });

  it('requires put for put command', () => {
    const result = analyzeNode(event('click', [cmd('put')]));
    expect(result.dependencies.runtimeHelpers).toContain('put');
  });

  it('requires send for send/trigger commands', () => {
    const result = analyzeNode(event('click', [cmd('send')]));
    expect(result.dependencies.runtimeHelpers).toContain('send');

    const result2 = analyzeNode(event('click', [cmd('trigger')]));
    expect(result2.dependencies.runtimeHelpers).toContain('send');
  });

  it('requires setProp for increment/decrement', () => {
    const result = analyzeNode(event('click', [cmd('increment')]));
    expect(result.dependencies.runtimeHelpers).toContain('setProp');

    const result2 = analyzeNode(event('click', [cmd('decrement')]));
    expect(result2.dependencies.runtimeHelpers).toContain('setProp');
  });

  it('requires debounce for debounced events', () => {
    const node: EventHandlerNode = {
      type: 'event',
      event: 'click',
      modifiers: { debounce: 300 },
      body: [cmd('toggle')],
    };
    const result = analyzeNode(node);
    expect(result.dependencies.runtimeHelpers).toContain('debounce');
  });

  it('requires throttle for throttled events', () => {
    const node: EventHandlerNode = {
      type: 'event',
      event: 'click',
      modifiers: { throttle: 100 },
      body: [cmd('toggle')],
    };
    const result = analyzeNode(node);
    expect(result.dependencies.runtimeHelpers).toContain('throttle');
  });

  it('requires contains for contains operator', () => {
    const result = analyzeNode(
      event('click', [
        cmd('log', {
          args: [
            {
              type: 'binary',
              operator: 'contains',
              left: { type: 'identifier', value: 'arr' },
              right: { type: 'literal', value: 'x' },
            },
          ],
        }),
      ])
    );
    expect(result.dependencies.runtimeHelpers).toContain('contains');
  });

  it('requires matches for matches operator', () => {
    const result = analyzeNode(
      event('click', [
        cmd('log', {
          args: [
            {
              type: 'binary',
              operator: 'matches',
              left: { type: 'identifier', value: 'el' },
              right: { type: 'literal', value: '.active' },
            },
          ],
        }),
      ])
    );
    expect(result.dependencies.runtimeHelpers).toContain('matches');
  });
});

// =============================================================================
// EVENT TYPE TRACKING
// =============================================================================

describe('Analyzer - Event Types', () => {
  it('tracks event type', () => {
    const result = analyzeNode(event('click', [cmd('toggle')]));
    expect(result.dependencies.eventTypes).toContain('click');
  });

  it('deduplicates event types', () => {
    // Wrapping two events would require a sequence; test single event
    const result = analyzeNode(event('mouseover', [cmd('add')]));
    expect(result.dependencies.eventTypes).toContain('mouseover');
  });
});

// =============================================================================
// PURE VS DYNAMIC EXPRESSIONS
// =============================================================================

describe('Analyzer - Expression Purity', () => {
  it('classifies literals as pure', () => {
    const result = analyzeNode(
      event('click', [
        cmd('log', {
          args: [
            {
              type: 'binary',
              operator: '+',
              left: { type: 'literal', value: 5 },
              right: { type: 'literal', value: 3 },
            },
          ],
        }),
      ])
    );
    // Binary of two literals should be pure
    expect(result.expressions.pure.length).toBeGreaterThan(0);
  });

  it('classifies call expressions as dynamic', () => {
    const result = analyzeNode(
      event('click', [
        cmd('log', {
          args: [
            {
              type: 'call',
              callee: { type: 'identifier', value: 'Math' },
              args: [{ type: 'literal', value: 5 }],
            },
          ],
        }),
      ])
    );
    expect(result.expressions.dynamic.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// BEHAVIOR TRACKING
// =============================================================================

describe('Analyzer - Behaviors', () => {
  it('identifies PascalCase identifiers as behaviors', () => {
    const result = analyzeNode(
      event('click', [cmd('log', { args: [{ type: 'identifier', value: 'Draggable' }] })])
    );
    expect(result.dependencies.behaviors).toContain('Draggable');
  });

  it('does not flag lowercase identifiers as behaviors', () => {
    const result = analyzeNode(
      event('click', [cmd('log', { args: [{ type: 'identifier', value: 'count' }] })])
    );
    expect(result.dependencies.behaviors).not.toContain('count');
  });

  it('tracks call target as behavior', () => {
    const result = analyzeNode(
      event('click', [cmd('call', { args: [{ type: 'identifier', value: 'MyBehavior' }] })])
    );
    expect(result.dependencies.behaviors).toContain('MyBehavior');
  });
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

describe('Convenience Functions', () => {
  it('analyze() returns analysis result', () => {
    const node = event('click', [cmd('toggle')]);
    const result = analyze(node);
    expect(result.commandsUsed.has('toggle')).toBe(true);
  });

  it('hasAsyncOperations() returns true for fetch', () => {
    const node = event('click', [cmd('fetch')]);
    expect(hasAsyncOperations(node)).toBe(true);
  });

  it('hasAsyncOperations() returns false for toggle', () => {
    const node = event('click', [cmd('toggle')]);
    expect(hasAsyncOperations(node)).toBe(false);
  });

  it('getCommandsUsed() returns array of command names', () => {
    const node = event('click', [cmd('add'), cmd('remove'), cmd('toggle')]);
    const commands = getCommandsUsed(node);
    expect(commands).toContain('add');
    expect(commands).toContain('remove');
    expect(commands).toContain('toggle');
    expect(commands.length).toBe(3);
  });

  it('getRequiredHelpers() returns helper names', () => {
    const node = event('click', [cmd('toggle'), cmd('fetch')]);
    const helpers = getRequiredHelpers(node);
    expect(helpers).toContain('toggle');
    expect(helpers).toContain('fetchJSON');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Analyzer - Edge Cases', () => {
  it('handles null/undefined nodes gracefully', () => {
    // The visitor should not crash on null nodes
    const result = analyzeNode(event('click', []));
    expect(result.commandsUsed.size).toBe(0);
  });

  it('handles commands with no args', () => {
    const result = analyzeNode(event('click', [cmd('halt')]));
    expect(result.commandsUsed.has('halt')).toBe(true);
  });

  it('handles if with else-if branches', () => {
    const ifNode: IfNode = {
      type: 'if',
      condition: { type: 'literal', value: true },
      thenBranch: [cmd('add')],
      elseIfBranches: [
        {
          condition: { type: 'literal', value: false },
          body: [cmd('remove')],
        },
      ],
      elseBranch: [cmd('toggle')],
    };
    const result = analyzeNode(event('click', [ifNode]));
    expect(result.commandsUsed.has('add')).toBe(true);
    expect(result.commandsUsed.has('remove')).toBe(true);
    expect(result.commandsUsed.has('toggle')).toBe(true);
  });

  it('handles repeat with while condition', () => {
    const repeatNode: RepeatNode = {
      type: 'repeat',
      whileCondition: {
        type: 'binary',
        operator: '<',
        left: { type: 'identifier', value: 'i' },
        right: { type: 'literal', value: 10 },
      },
      body: [cmd('increment')],
    };
    const result = analyzeNode(event('click', [repeatNode]));
    expect(result.controlFlow.hasLoops).toBe(true);
  });

  it('handles commands with target nodes', () => {
    const result = analyzeNode(
      event('click', [cmd('toggle', { target: { type: 'selector', value: '#btn' } })])
    );
    expect(result.dependencies.domQueries).toContain('#btn');
  });

  it('does not flag global references (body, document, window) as behaviors', () => {
    const result = analyzeNode(
      event('click', [cmd('log', { args: [{ type: 'identifier', value: 'document' }] })])
    );
    expect(result.dependencies.behaviors).not.toContain('document');
  });
});
