/**
 * `catch` / `finally` blocks on event handlers.
 *
 * Regression coverage for a silent-absorption bug: `catch` is only a tokenizer
 * keyword, so the event-handler body loop's "skip unexpected tokens" recovery
 * pass advanced straight past `catch <sym>` and landed on the next command —
 * appending the catch body to the try body. The handler then ran its error path
 * on the SUCCESS path (overwriting the result) while real failures escaped the
 * handler uncaught. Nothing warned; `parse()` returned success with no errors.
 *
 * Upstream _hyperscript shares one `Feature.parseErrorAndFinally` between its
 * `on` and `def` features, so these must stay in step with the `def` tests in
 * hyperscript-parser.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type { EventHandlerNode, BehaviorNode, CommandNode } from '../ast/nodes';
import { assertNodeOfKind } from '../ast/guards';

const handler = (src: string): EventHandlerNode => {
  const result = parse(src);
  expect(result.success).toBe(true);
  const node = assertNodeOfKind(result.node, 'eventHandler');
  expect(node.type).toBe('eventHandler');
  return node;
};

const names = (cmds: readonly unknown[] | undefined): string[] =>
  (cmds ?? []).map(c => (c as CommandNode).name);

describe('event handler catch/finally — parsing', () => {
  it('keeps the catch body out of the try body', () => {
    // The exact shape that regressed: without the fix this yields FOUR body
    // commands (the trailing `put` being the catch body) and no errorHandler.
    const node = handler(`on click
      put 'Loading...' into #r
      fetch '/todos/1' as json
      put JSON.stringify(it, null, 2) into #r
    catch e
      put 'Request failed: ' + e into #r
    end`);

    expect(names(node.commands)).toEqual(['put', 'fetch', 'put']);
    expect(node.errorSymbol).toBe('e');
    expect(names(node.errorHandler)).toEqual(['put']);
    expect(node.finallyHandler).toBeUndefined();
  });

  it('parses catch followed by finally', () => {
    const node = handler(`on click
      log 'work'
    catch err
      log err
    finally
      log 'done'
    end`);

    expect(names(node.commands)).toEqual(['log']);
    expect(node.errorSymbol).toBe('err');
    expect(names(node.errorHandler)).toEqual(['log']);
    expect(names(node.finallyHandler)).toEqual(['log']);
  });

  it('parses finally with no catch', () => {
    const node = handler(`on click
      log 'work'
    finally
      log 'done'
    end`);

    expect(node.errorHandler).toBeUndefined();
    expect(node.errorSymbol).toBeUndefined();
    expect(names(node.finallyHandler)).toEqual(['log']);
  });

  it('parses a multi-command catch body', () => {
    const node = handler(`on click
      throw 'boom'
    catch e
      log e
      add .failed to me
    end`);

    expect(names(node.errorHandler)).toEqual(['log', 'add']);
  });

  it('leaves handlers without error blocks untouched', () => {
    const node = handler(`on click
      log 'a'
      log 'b'
    end`);

    expect(names(node.commands)).toEqual(['log', 'log']);
    expect(node.errorHandler).toBeUndefined();
    expect(node.errorSymbol).toBeUndefined();
    expect(node.finallyHandler).toBeUndefined();
  });

  it('does not consume an enclosing behavior end', () => {
    // The `end`-consumption path is the risky part of the fix: only the
    // error-block branch may consume `end`, or a behavior's terminator vanishes.
    const result = parse(`behavior Foo
      on click
        log 1
      end
      on mouseover
        log 2
      end
    end`);

    expect(result.success).toBe(true);
    const behavior = assertNodeOfKind(result.node, 'behavior');
    expect(behavior.type).toBe('behavior');
    expect(behavior.eventHandlers).toHaveLength(2);
  });

  it('supports catch inside a behavior handler', () => {
    // Behavior handlers are parsed by a separate path but share the runtime
    // seam, so they would otherwise mis-execute in exactly the same way.
    const result = parse(`behavior Foo
      on click
        throw 'boom'
      catch e
        log e
      end
    end`);

    expect(result.success).toBe(true);
    const behavior = assertNodeOfKind(result.node, 'behavior');
    expect(behavior.eventHandlers).toHaveLength(1);
    const [first] = behavior.eventHandlers;
    expect(names(first.commands)).toEqual(['throw']);
    expect(first.errorSymbol).toBe('e');
    expect(names(first.errorHandler)).toEqual(['log']);
  });
});
