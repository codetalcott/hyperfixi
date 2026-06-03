/**
 * Live Block Tests
 *
 * `live` is a reactive block whose body re-runs when its tracked dependencies
 * change. It takes no leading role (the body follows the keyword directly), so
 * its schema opts into `bareKeyword` pattern generation. Like other block
 * commands (`repeat`/`for`), the parsed command node carries the `live` action;
 * the body is handled by the surrounding block machinery.
 */
import { describe, it, expect } from 'vitest';
import { parse, canParse } from '../src';
import type { CommandSemanticNode } from '../src/types';

describe('live block', () => {
  it('parses a derived-value live block', () => {
    const node = parse('live put `Count: ${$count}` into me end', 'en') as CommandSemanticNode;
    expect(node.action).toBe('live');
  });

  it('parses a live block with multiple dependencies', () => {
    const node = parse('live put `${$price * $quantity}` into #total end', 'en') as CommandSemanticNode;
    expect(node.action).toBe('live');
  });

  it('canParse reports true for a live block', () => {
    expect(canParse('live put `Count: ${$count}` into me end', 'en')).toBe(true);
  });

  it('does not hijack a non-block command that merely contains text', () => {
    // sanity: ordinary commands are unaffected by the bare `live` keyword pattern
    expect((parse('toggle .active', 'en') as CommandSemanticNode).action).toBe('toggle');
    expect((parse('put :x into me', 'en') as CommandSemanticNode).action).toBe('put');
  });
});
