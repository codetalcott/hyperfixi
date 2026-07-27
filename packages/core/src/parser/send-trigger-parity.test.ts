/**
 * `send` is `trigger`'s alias. COMPOUND_COMMANDS routes both to
 * parseTriggerCommand, which understands `to <target>`, colon-qualified event
 * names (`draggable:start`) and named event detail.
 *
 * But `send` also had an entry in MULTI_WORD_PATTERNS, and parseMultiWordCommand
 * runs BEFORE the compound dispatch — so `send` never reached the shared parser.
 * It fell into the generic arg loop, whose parsePrimary() choked on the `:` in
 * `send evt(id: 1)`:
 *
 *     send    evt(id: 1) to #x   ->  "Expected closing parenthesis" + flat
 *                                    identifier run, event detail LOST
 *     trigger evt(id: 1) to #x   ->  functionCall node, detail intact
 *
 * on syntax the real hyperscript.org engine accepts. Found by diffing our
 * accumulated parse errors against the upstream engine across the example and
 * pattern corpora — it was the only false-positive class in 572 sources, and it
 * appears in this repo's own documented examples.
 *
 * These assert the two commands agree. Any divergence is a bug in one of them.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type { CommandNode } from '../types/base-types';

const cmd = (src: string): CommandNode => {
  const result = parse(src);
  expect(result.success).toBe(true);
  return result.node as CommandNode;
};

/** Shape of the args, comparable across the two spellings. */
const shape = (c: CommandNode): Array<{ type?: string; value?: unknown }> =>
  (c.args ?? []).map(a => {
    const n = a as { type?: string; value?: unknown; name?: unknown };
    return { type: n.type, value: n.value ?? n.name };
  });

describe('send / trigger parity', () => {
  it.each([
    'EVENT(id: 1) to #modal',
    'EVENT(id: 1, name: 2) to #modal',
    'EVENT(1) to #modal',
    'EVENT() to #modal',
    'EVENT to #modal',
    'EVENT',
    'draggable:start to #x',
  ])('parses `%s` identically either way', tail => {
    const asSend = cmd(`send ${tail.replace('EVENT', 'showProduct')}`);
    const asTrigger = cmd(`trigger ${tail.replace('EVENT', 'showProduct')}`);

    expect(asSend.name).toBe('send');
    expect(asTrigger.name).toBe('trigger');
    expect(shape(asSend)).toEqual(shape(asTrigger));
    expect(parse(`send ${tail.replace('EVENT', 'showProduct')}`).errors ?? []).toEqual([]);
  });

  it('keeps named event detail as a functionCall, not a flat identifier run', () => {
    const c = cmd('send showProduct(id: 1) to #modal');
    const first = c.args?.[0] as { type?: string; name?: unknown };
    expect(first.type).toBe('functionCall');
    expect(first.name).toBe('showProduct');
  });

  it('still routes the to-target', () => {
    // The MULTI_WORD_PATTERNS entry existed to capture `to <target>`;
    // parseTriggerCommand already does it, as a positional arg.
    expect(shape(cmd('send showProduct(id: 1) to #modal'))).toEqual([
      { type: 'functionCall', value: 'showProduct' },
      { type: 'identifier', value: 'to' },
      { type: 'selector', value: '#modal' },
    ]);
  });
});

/**
 * parseTriggerCommand's trailing-argument loop called parsePrimary() and
 * assumed it always consumed. It does not: on a token it cannot start an
 * expression with, it returns without advancing, and the loop appended nodes
 * forever until the process died of heap exhaustion.
 *
 * The trigger was an HTML-escaped selector — what `<form/>` becomes when a doc
 * example is copied through markdown — reached from this repo's own docs. A
 * hang is strictly worse than a bad parse: it takes the page or the build with
 * it and never returns a `success: false` to explain why.
 */
describe('parseTriggerCommand terminates on unparseable trailing tokens', () => {
  it.each([
    'trigger hello to &lt;form /&gt;',
    'send hello to &lt;form /&gt;',
    'on click send hello to &lt;form /&gt;',
    'trigger a &amp;&amp; b',
  ])('terminates on %j', src => {
    // The bug was unbounded memory growth, so a plain call is the assertion:
    // pre-fix this never returned.
    expect(() => parse(src)).not.toThrow();
  });

  it('reports the malformed input rather than silently succeeding', () => {
    const result = parse('trigger hello to &lt;form /&gt;');
    expect((result.errors ?? []).length).toBeGreaterThan(0);
  });

  it('leaves the well-formed selector form alone', () => {
    const result = parse('send hello to <form />');
    expect(result.success).toBe(true);
    expect(result.errors ?? []).toEqual([]);
  });
});
