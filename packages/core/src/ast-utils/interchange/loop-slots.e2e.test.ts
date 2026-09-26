/**
 * Every loop core's parser builds converts to the interchange loop it means.
 *
 * Core's parser carries a loop's form and operands as SLOTS: `modifiers.loopType`
 * names the form, `for`/`in`, `times`, `while`/`until`, `event`/`from` and
 * `index` hold the operands, `bottomTested` marks `repeat … until <cond> end`,
 * and only the body block (plus an `else` block) is positional. `fromCoreAST`
 * read only the pre-slot shape, where `args[0]` named the form, so every parsed
 * loop fell through to `forever` and the AOT compiled `repeat 3 times … end` to
 * `while (true)`.
 *
 * Fixtures are REAL parser output, as in go-roles.e2e.test.ts; the hand-built
 * positional shape keeps its tests in from-core.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { fromCoreAST } from './from-core';

function findRepeat(node: unknown): Record<string, unknown> | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = node as Record<string, unknown>;
  if (n.type === 'command' && n.name === 'repeat') return n;
  for (const value of Object.values(n)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      const found = findRepeat(child);
      if (found) return found;
    }
  }
  return undefined;
}

function convert(src: string): Record<string, unknown> {
  const compiled = hyperscript.compileSync(src, { traditional: true });
  const loop = findRepeat(compiled.ast);
  expect(loop, `no repeat node for: "${src}"`).toBeDefined();
  return fromCoreAST(loop as { type: string }) as unknown as Record<string, unknown>;
}

const LOG_1 = { type: 'command', name: 'log' };

describe('each loop form converts to its interchange loop', () => {
  it('a counted loop has its count', () => {
    expect(convert('repeat 3 times log 1 end')).toMatchObject({
      type: 'repeat',
      count: { type: 'literal', value: 3 },
      body: [LOG_1],
    });
  });

  it.each(['repeat for x in xs log x end', 'for x in xs log x end'])(
    '`%s` iterates xs as x',
    src => {
      expect(convert(src)).toMatchObject({
        type: 'foreach',
        itemName: 'x',
        collection: { type: 'identifier', value: 'xs' },
        body: [LOG_1],
      });
    }
  );

  it('`repeat in xs` iterates as `it`', () => {
    expect(convert('repeat in xs log it end')).toMatchObject({ type: 'foreach', itemName: 'it' });
  });

  it('a while loop tests its condition', () => {
    expect(convert('repeat while x < 3 log 1 end')).toMatchObject({
      type: 'while',
      condition: { type: 'binary', operator: '<' },
      body: [LOG_1],
    });
  });

  it('an until loop tests the negated condition', () => {
    expect(convert('repeat until x is 3 log 1 end')).toMatchObject({
      type: 'while',
      condition: { type: 'unary', operator: 'not', operand: { type: 'binary' } },
    });
  });

  it.each([
    ['repeat log 1 until x is 3 end', 'unary'],
    ['repeat log 1 while x < 3 end', 'binary'],
  ])('`%s` is bottom-tested', (src, conditionType) => {
    const loop = convert(src);
    expect(loop).toMatchObject({ type: 'while', bottomTested: true, body: [LOG_1] });
    expect((loop.condition as { type: string }).type).toBe(conditionType);
  });

  it('`until event` keeps the event and where it listens', () => {
    expect(convert('repeat until event stop from #b log 1 end')).toMatchObject({
      type: 'repeat',
      untilEvent: 'stop',
      untilEventTarget: { type: 'selector', value: '#b' },
      body: [LOG_1],
    });
    expect(convert('repeat until event stop log 1 end').untilEventTarget).toBeUndefined();
  });

  it('forever is a repeat with nothing to stop it', () => {
    const loop = convert('repeat forever log 1 end');
    expect(loop).toMatchObject({ type: 'repeat', body: [LOG_1] });
    expect(loop).not.toHaveProperty('count');
    expect(loop).not.toHaveProperty('untilEvent');
    expect(loop).not.toHaveProperty('whileCondition');
  });
});

describe('the parts every form shares', () => {
  it.each([
    ['repeat 3 times index i log i end', 'repeat'],
    ['repeat for x in xs index i log x end', 'foreach'],
    ['repeat while x < 3 index i log i end', 'while'],
  ])('`%s` names its index', (src, type) => {
    expect(convert(src)).toMatchObject({ type, indexName: 'i' });
  });

  it('`else` is its own body', () => {
    expect(convert('repeat for x in xs log x else log 0 end')).toMatchObject({
      type: 'foreach',
      body: [LOG_1],
      elseBody: [LOG_1],
    });
  });

  it('a loop without them carries neither', () => {
    const loop = convert('repeat 3 times log 1 end');
    expect(loop).not.toHaveProperty('indexName');
    expect(loop).not.toHaveProperty('elseBody');
  });
});
