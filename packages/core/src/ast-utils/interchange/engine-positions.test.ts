import { describe, it, expect } from 'vitest';
import { withEnginePositions } from './engine-positions';
import { interchangeToLSPHover } from './lsp';
import type { InterchangeNode } from './types';

// `on click toggle .active then if me matches .x\n  add .b to #c\nend`, as the engine
// parses it (the shape of @hyperfixi/engine's nodes: type, [start, end), children).
const source = 'on click toggle .active then if me matches .x\n  add .b to #c\nend';
const engineTree = {
  type: 'hyperscript',
  start: 0,
  end: 64,
  features: [
    {
      type: 'onFeature',
      start: 0,
      end: 64,
      commands: [
        {
          type: 'toggleCommand',
          start: 9,
          end: 23,
          classRefs: [{ type: 'classRef', start: 16, end: 23 }],
        },
        {
          type: 'ifCommand',
          start: 29,
          end: 64,
          body: [{ type: 'addCommand', start: 48, end: 60 }],
        },
      ],
    },
  ],
};

// The same handler as semantic's interchange: no spans on events and commands, an
// offset (no line or column) on a role value.
const interchange: InterchangeNode[] = [
  {
    type: 'event',
    event: 'click',
    body: [
      {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'selector', value: '.active', start: 16, end: 23 }],
      },
      {
        type: 'if',
        condition: { type: 'identifier', value: 'me', name: 'me' },
        thenBranch: [{ type: 'command', name: 'add', args: [{ type: 'selector', value: '.b' }] }],
      },
    ],
  } as InterchangeNode,
];

describe('withEnginePositions', () => {
  const placed = withEnginePositions(interchange, source, engineTree) as any[];
  const handler = placed[0];

  it('gives each event, command and if the span of its engine node, in source order', () => {
    expect([handler.start, handler.end, handler.line, handler.column]).toEqual([0, 64, 1, 0]);
    const [toggle, ifNode] = handler.body;
    expect([toggle.start, toggle.end, toggle.line, toggle.column]).toEqual([9, 23, 1, 9]);
    expect([ifNode.start, ifNode.end]).toEqual([29, 64]);
    const add = ifNode.thenBranch[0];
    // On the second line: line 2, column from that line's start.
    expect([add.start, add.end, add.line, add.column]).toEqual([48, 60, 2, 2]);
  });

  it('adds a line and column to a node that had only an offset', () => {
    const arg = handler.body[0].args[0];
    expect([arg.start, arg.end, arg.line, arg.column]).toEqual([16, 23, 1, 16]);
  });

  it('leaves a node without a counterpart unpositioned, and the input untouched', () => {
    expect(handler.body[1].thenBranch[0].args[0].start).toBeUndefined();
    expect((interchange[0] as any).start).toBeUndefined();
  });

  it('skips an engine command the interchange does not have (alignment by kind)', () => {
    const extra = {
      type: 'onFeature',
      start: 0,
      end: 30,
      commands: [
        { type: 'logCommand', start: 9, end: 14 },
        { type: 'addCommand', start: 20, end: 30 },
      ],
    };
    const [event] = withEnginePositions(
      [
        {
          type: 'event',
          event: 'click',
          body: [{ type: 'command', name: 'add' }],
        } as InterchangeNode,
      ],
      'on click log 1 then add .x to me',
      extra
    ) as any[];
    expect([event.body[0].start, event.body[0].end]).toEqual([20, 30]);
  });

  it('lets hover find the command under the cursor', () => {
    const hover = interchangeToLSPHover(placed, { line: 0, character: 12 }) as any;
    expect(JSON.stringify(hover)).toContain('toggle');
  });
});
