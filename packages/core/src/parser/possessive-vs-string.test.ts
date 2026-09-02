/**
 * Possessive `'s` vs a single-quoted string starting with `s`.
 *
 * The possessive check only asked whether the PREVIOUS token was an identifier —
 * and a command name is an identifier. So `log 'saved'` matched: the tokenizer
 * emitted the possessive operator and shredded the string into
 * `log` · `'s` · `aved` · `'`. Every single-quoted literal whose first character
 * is a lowercase `s` was affected — `'saved'`, `'success'`, `'sent'`, `'stop'` —
 * while `'ok'`, `'Saved'` and `"saved"` were fine, which is what made it so
 * quiet. Downstream it surfaced as a phantom trailing command in a handler body.
 *
 * The missing condition is adjacency: a real possessive touches the token it
 * belongs to (`me's`, `#el's`, `(expr)'s`), whereas a string argument is
 * separated by whitespace.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';
import type { Token } from '../types/core';
import { parse } from './parser';
import type { CommandNode } from '../ast/nodes';

const values = (src: string): string[] => tokenize(src).map((t: Token) => t.value);
const kinds = (src: string): string[] => tokenize(src).map((t: Token) => `${t.value}:${t.kind}`);

describe('single-quoted strings beginning with `s`', () => {
  it.each([
    ["log 'saved'", 'saved'],
    ["log 'success'", 'success'],
    ["put 'sent' into me", 'sent'],
    ["set x to 'stop'", 'stop'],
    ["log 'should not get here'", 'should not get here'],
  ])('%s tokenizes as one string', (src, expected) => {
    const strings = tokenize(src).filter((t: Token) => t.kind === 'string');
    expect(strings).toHaveLength(1);
    expect(strings[0].value).toBe(`'${expected}'`);
    // No possessive operator should appear anywhere in the stream.
    expect(values(src)).not.toContain("'s");
  });

  it('leaves the already-working cases alone', () => {
    expect(kinds("log 'ok'")).toContain("'ok':string");
    expect(kinds('log "saved"')).toContain('"saved":string');
    expect(kinds("log 'Saved'")).toContain("'Saved':string");
  });

  it('parses to the intended command rather than a mangled one', () => {
    const result = parse("put 'saved' into #status");
    expect(result.success).toBe(true);
    const node = result.node as CommandNode;
    expect(node.name).toBe('put');
    expect((node.args?.[0] as { value?: unknown }).value).toBe('saved');
  });
});

describe('possessive still works when adjacent', () => {
  it.each([
    ["log my's"],
    ["set x to #el's value"],
    ["log me's innerHTML"],
    ["log (a)'s b"],
    // Adjacency is tested against the source character rather than the previous
    // token's `end`, because bracket/operator tokens do not track offsets
    // reliably — the `]` here reports end=8 for an apostrophe at index 9.
    ["[1, 2, 3]'s length"],
    ["arr's length + obj's count"],
  ])('%s keeps the possessive operator', src => {
    expect(values(src)).toContain("'s");
  });

  it('parses a possessive property access', () => {
    const result = parse("put me's innerHTML into #out");
    expect(result.success).toBe(true);
    expect((result.node as CommandNode).name).toBe('put');
  });
});
