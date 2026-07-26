/**
 * Naked (unquoted) URLs in `fetch`.
 *
 * `fetch /api/data` always worked, but `fetch https://host/path` did not: the
 * fetch parser recognised only the leading-`/` form, so a scheme-prefixed URL
 * fell through to `parsePrimary()`, which consumed the bare identifier `https`
 * and stopped at the `:`. Two consequences, both silent — `parse()` reported
 * success with no error or warning:
 *
 *   - the URL evaluated to `undefined` at runtime, surfacing as the unhelpful
 *     "fetch: URL must be a non-empty string"
 *   - the trailing `as <type>` modifier was dropped entirely, because the
 *     modifier loop saw `:` rather than `as`
 *
 * Uses the real parser rather than a mock context on purpose: scheme detection
 * turns on token adjacency (`next.start === tok.end`), which only real
 * tokenizer offsets exercise.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type { CommandNode, EventHandlerNode } from '../types/base-types';

const fetchCommand = (src: string): CommandNode => {
  const result = parse(src);
  expect(result.success).toBe(true);
  const node = result.node as CommandNode;
  expect(node.type).toBe('command');
  expect(node.name).toBe('fetch');
  return node;
};

const urlOf = (cmd: CommandNode): unknown => (cmd.args?.[0] as { value?: unknown })?.value;
const modifiersOf = (cmd: CommandNode): Record<string, { name?: unknown } | undefined> =>
  (cmd.modifiers ?? {}) as Record<string, { name?: unknown } | undefined>;
const asOf = (cmd: CommandNode): unknown => modifiersOf(cmd)['as']?.name;

describe('fetch with a naked URL', () => {
  it('reassembles a scheme-prefixed URL into one literal', () => {
    const cmd = fetchCommand('fetch https://example.com/todos/1 as json');

    expect(urlOf(cmd)).toBe('https://example.com/todos/1');
    // The dropped-modifier half of the bug: `as json` must survive.
    expect(asOf(cmd)).toBe('json');
  });

  it('handles http, a port, a query string and a fragment', () => {
    expect(urlOf(fetchCommand('fetch http://localhost:3000/api as text'))).toBe(
      'http://localhost:3000/api'
    );
    expect(urlOf(fetchCommand('fetch https://example.com/a?b=1&c=2 as json'))).toBe(
      'https://example.com/a?b=1&c=2'
    );
    expect(urlOf(fetchCommand('fetch https://example.com/p#frag'))).toBe(
      'https://example.com/p#frag'
    );
  });

  it('still parses a relative path and a quoted URL', () => {
    const relative = fetchCommand('fetch /local/todo.json as json');
    expect(urlOf(relative)).toBe('/local/todo.json');
    expect(asOf(relative)).toBe('json');

    const quoted = fetchCommand("fetch 'https://example.com/x' as json");
    expect(urlOf(quoted)).toBe('https://example.com/x');
    expect(asOf(quoted)).toBe('json');
  });

  it('keeps the with-options modifier alongside a naked absolute URL', () => {
    const cmd = fetchCommand('fetch https://example.com/x with {method:"POST"}');

    expect(urlOf(cmd)).toBe('https://example.com/x');
    expect(modifiersOf(cmd)['with']).toBeDefined();
  });

  it('does not treat a plain identifier as a URL', () => {
    // No adjacent `:`, so this stays an expression — the runtime reports an
    // unbound `someVar` by name (see fetch.test.ts).
    const cmd = fetchCommand('fetch someVar as json');

    expect((cmd.args?.[0] as { type?: string }).type).toBe('identifier');
    expect(asOf(cmd)).toBe('json');
  });

  it('works inside an event handler followed by another command', () => {
    const result = parse(`on click
      fetch https://example.com/todos/1 as json
      put it into #out
    end`);

    expect(result.success).toBe(true);
    const handler = result.node as EventHandlerNode;
    const commands = handler.commands as CommandNode[];
    expect(commands.map(c => c.name)).toEqual(['fetch', 'put']);
    expect(urlOf(commands[0])).toBe('https://example.com/todos/1');
    expect(asOf(commands[0])).toBe('json');
  });

  it('leaves the go command working through the shared helper', () => {
    // isNakedURLStart moved out of navigation-commands.ts; `go` consumes it now.
    const result = parse('go to https://example.com/page');
    expect(result.success).toBe(true);
    const cmd = result.node as CommandNode;
    expect(cmd.name).toBe('go');
    const values = (cmd.args ?? []).map((a: unknown) => (a as { value?: unknown }).value);
    expect(values).toContain('https://example.com/page');
  });
});
