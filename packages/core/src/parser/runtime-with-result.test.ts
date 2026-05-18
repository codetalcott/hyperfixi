/**
 * Tests for `evaluateASTWithResult` — the Result-based wrapper around
 * `evaluateAST` that translates hyperscript control-flow signals
 * (halt/exit/break/continue/return) into `err(signal)` values instead of
 * exceptions.
 *
 * Without these tests, the function is only exercised through the runtime's
 * command-execution loop. Direct unit tests guard against regressions in
 * the signal-translation switch when new control-flow forms land.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ASTNode, ExecutionContext } from '../types/core';
import { isOk, isErr } from '../types/result';
import { createMockHyperscriptContext } from '../test-setup';
import { evaluateASTWithResult } from './runtime';
import { getParserExtensionRegistry } from './extensions';

// A node type used only by these tests. We register a custom evaluator that
// throws whatever error the node's `payload` carries — that's how we force
// `evaluateASTWithResult` to take each control-flow branch on demand.
type TestThrowNode = ASTNode & { type: 'testThrow'; payload: unknown };

function makeNode(payload: unknown): TestThrowNode {
  return { type: 'testThrow', payload } as TestThrowNode;
}

describe('evaluateASTWithResult', () => {
  const registry = getParserExtensionRegistry();
  let snapshot: ReturnType<typeof registry.snapshot>;

  beforeEach(() => {
    snapshot = registry.snapshot();
    registry.registerNodeEvaluator('testThrow', (node: ASTNode) => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw (node as TestThrowNode).payload;
    });
  });

  afterEach(() => {
    registry.restore(snapshot);
  });

  describe('happy path', () => {
    it('wraps a successful evaluation in ok()', async () => {
      const context: ExecutionContext =
        createMockHyperscriptContext() as unknown as ExecutionContext;
      // A literal evaluates without throwing.
      const node: ASTNode = { type: 'literal', value: 42 } as ASTNode;

      const result = await evaluateASTWithResult(node, context);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('control-flow signal translation', () => {
    const context: ExecutionContext = createMockHyperscriptContext() as unknown as ExecutionContext;

    it('translates `isHalt` errors to halt signals', async () => {
      const haltErr = Object.assign(new Error('halt requested'), { isHalt: true });
      const result = await evaluateASTWithResult(makeNode(haltErr), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('halt');
      }
    });

    it('translates `HALT_EXECUTION` message errors to halt signals', async () => {
      // Some legacy paths signal halt only via the message, with no isHalt flag.
      const result = await evaluateASTWithResult(makeNode(new Error('HALT_EXECUTION')), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('halt');
      }
    });

    it('translates `isExit` errors to exit signals (preserves returnValue)', async () => {
      const exitErr = Object.assign(new Error('exit requested'), {
        isExit: true,
        returnValue: 'goodbye',
      });
      const result = await evaluateASTWithResult(makeNode(exitErr), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'exit') {
        expect(result.error.returnValue).toBe('goodbye');
      } else {
        expect.fail('expected an exit signal');
      }
    });

    it('translates `EXIT_COMMAND` message errors to exit signals', async () => {
      const result = await evaluateASTWithResult(makeNode(new Error('EXIT_COMMAND')), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('exit');
      }
    });

    it('translates `isBreak` errors to break signals', async () => {
      const breakErr = Object.assign(new Error('break loop'), { isBreak: true });
      const result = await evaluateASTWithResult(makeNode(breakErr), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('break');
      }
    });

    it('translates `isContinue` errors to continue signals', async () => {
      const continueErr = Object.assign(new Error('next iteration'), { isContinue: true });
      const result = await evaluateASTWithResult(makeNode(continueErr), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('continue');
      }
    });

    it('translates `isReturn` errors to return signals (preserves returnValue)', async () => {
      const returnErr = Object.assign(new Error('return value'), {
        isReturn: true,
        returnValue: { ok: true },
      });
      const result = await evaluateASTWithResult(makeNode(returnErr), context);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'return') {
        expect(result.error.returnValue).toEqual({ ok: true });
      } else {
        expect.fail('expected a return signal');
      }
    });
  });

  describe('non-signal errors', () => {
    const context: ExecutionContext = createMockHyperscriptContext() as unknown as ExecutionContext;

    it('re-throws plain errors instead of wrapping them', async () => {
      const plain = new Error('not a control-flow signal');

      await expect(evaluateASTWithResult(makeNode(plain), context)).rejects.toThrow(
        'not a control-flow signal'
      );
    });

    it('re-throws non-Error throwables (strings, objects) untouched', async () => {
      // `evaluateASTWithResult` only special-cases Error instances. Anything
      // else propagates as-is — including bare strings.
      await expect(evaluateASTWithResult(makeNode('not an Error'), context)).rejects.toBe(
        'not an Error'
      );
    });
  });
});
