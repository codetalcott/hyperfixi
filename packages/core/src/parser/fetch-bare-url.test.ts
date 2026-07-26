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

/**
 * Where the naked URL ENDS.
 *
 * The run used to stop at `isCommandBoundary`, i.e. at any of ~60 command words,
 * so a path segment that happened to be one truncated the URL:
 *
 *     fetch /api/put/1 as json
 *       -> url "/api/", a bogus `partial` `put` command spliced into the
 *          sequence, `as json` dropped — and result.success still true.
 *
 * Termination is now by ADJACENCY, which is upstream's whitespace rule expressed
 * in the terms available here (the tokenizer discards whitespace, but tokens
 * carry character offsets). `go` shares the routine, as it does upstream.
 */
describe('naked URL termination (adjacency)', () => {
  const nodeOf = (
    cmd: CommandNode
  ): { type?: string; value?: unknown; start?: number; end?: number } =>
    cmd.args?.[0] as { type?: string; value?: unknown; start?: number; end?: number };

  const commandsOf = (src: string): CommandNode[] => {
    const result = parse(src);
    expect(result.success).toBe(true);
    const node = result.node as { type?: string; commands?: CommandNode[] };
    return (node.commands ?? [node as CommandNode]) as CommandNode[];
  };

  describe('the bug', () => {
    it('keeps a path segment that is a command word', () => {
      const cmd = fetchCommand('fetch /api/put/1 as json');
      expect(urlOf(cmd)).toBe('/api/put/1');
      expect(asOf(cmd)).toBe('json');
      // The truncation also spliced a second, `partial` command into the parse.
      expect(parse('fetch /api/put/1 as json').errors ?? []).toEqual([]);
    });

    it('keeps a command word in an absolute URL too', () => {
      const cmd = fetchCommand('fetch https://x.com/put/1 as json');
      expect(urlOf(cmd)).toBe('https://x.com/put/1');
      expect(asOf(cmd)).toBe('json');
    });

    it('keeps six consecutive command words', () => {
      expect(urlOf(fetchCommand('fetch /api/remove/add/toggle/log/wait/1'))).toBe(
        '/api/remove/add/toggle/log/wait/1'
      );
    });
  });

  describe('regression guards (all real usages in this repo)', () => {
    it('still ends the URL before a whitespace-separated command', () => {
      // packages/mcp-server/src/tools/patterns.ts, resources/content.ts, and
      // .github/skills/.../patterns.md all ship exactly this.
      const commands = commandsOf('on click add .loading to me fetch /api remove .loading from me');
      expect(commands.map(c => c.name)).toEqual(['add', 'fetch', 'remove']);
      expect(urlOf(commands[1])).toBe('/api');
    });

    it('still ends the URL at then / and', () => {
      const withThen = commandsOf('fetch /api/data then put it into #out');
      expect(withThen.map(c => c.name)).toEqual(['fetch', 'put']);
      expect(urlOf(withThen[0])).toBe('/api/data');

      const withAnd = commandsOf('fetch /content and put it into #target');
      expect(urlOf(withAnd[0])).toBe('/content');
    });

    it('still ends the URL at a newline', () => {
      const commands = commandsOf('on click\n  fetch /api/put/1 as json\n  put it into #out\nend');
      expect(commands.map(c => c.name)).toEqual(['fetch', 'put']);
      expect(urlOf(commands[0])).toBe('/api/put/1');
      expect(asOf(commands[0])).toBe('json');
    });

    it('still takes the with-options form, spaced or not', () => {
      const spaced = fetchCommand('fetch /api/data {method:"POST"}');
      expect(urlOf(spaced)).toBe('/api/data');
      expect(modifiersOf(spaced)['with']).toBeDefined();

      // No space: `{` is a hard stop, because adjacency alone would swallow it.
      const tight = fetchCommand('fetch /api/data{method:"POST"}');
      expect(urlOf(tight)).toBe('/api/data');
      expect(modifiersOf(tight)['with']).toBeDefined();
    });

    it('still parses as JSON do not throw', () => {
      const commands = commandsOf('fetch /api/users as JSON do not throw then log it');
      expect(urlOf(commands[0])).toBe('/api/users');
      expect(asOf(commands[0])).toBe('JSON');
    });

    it('keeps commas — a query string is not a token boundary', () => {
      const cmd = fetchCommand('fetch /search?q=hello&ids=1,2,3 as json');
      expect(urlOf(cmd)).toBe('/search?q=hello&ids=1,2,3');
      expect(asOf(cmd)).toBe('json');
    });
  });

  describe('${…} interpolation', () => {
    it('emits a templateLiteral so the URL actually interpolates', () => {
      // Adjacency swallows `${id}` into the URL either way, so a plain literal
      // here would guarantee a 404.
      const cmd = fetchCommand('fetch /api/${id} as json');
      expect(nodeOf(cmd).type).toBe('templateLiteral');
      expect(nodeOf(cmd).value).toBe('/api/${id}');
      expect(asOf(cmd)).toBe('json');
    });

    it('carries a span containing whitespace whole', () => {
      // Joining token values would collapse this to `${myvalue}`; the span is
      // reproduced verbatim from source instead.
      const cmd = fetchCommand('fetch /search?q=${my value} as json');
      expect(nodeOf(cmd).value).toBe('/search?q=${my value}');
      expect(asOf(cmd)).toBe('json');
    });

    it('resumes the URL after the span', () => {
      const cmd = fetchCommand('fetch /api/${id}/more as json');
      expect(nodeOf(cmd).value).toBe('/api/${id}/more');
      expect(asOf(cmd)).toBe('json');
    });

    it('leaves a bare $ alone', () => {
      // `/api/$filter` is OData, not interpolation — a templateLiteral here
      // would let evaluateTemplateLiteralNode's $var pass eat it.
      const cmd = fetchCommand('fetch /api/$filter as json');
      expect(nodeOf(cmd).type).toBe('literal');
      expect(nodeOf(cmd).value).toBe('/api/$filter');
    });

    it('terminates on an unclosed span', { timeout: 1000 }, () => {
      expect(() => parse('fetch /api/${a as json')).not.toThrow();
    });
  });

  it('reports character offsets, not token indices', () => {
    // These used to be ctx.savePosition() — token indices — inside a command
    // node measured in characters. ast-utils/interchange/from-core.ts copies
    // them through verbatim.
    const cmd = fetchCommand('fetch /api/put/1');
    expect(nodeOf(cmd).start).toBe(6);
    expect(nodeOf(cmd).end).toBe(16);
  });

  it('lets go keep a command-word path while `in` still ends the URL', () => {
    // Adjacency subsumes the whole GO_URL_STOP set: `1` ends at 15, `in` starts
    // at 16, so the URL stops on its own.
    const result = parse('go to /api/put/1 in new window');
    expect(result.success).toBe(true);
    const values = ((result.node as CommandNode).args ?? []).map(
      (a: unknown) => (a as { value?: unknown }).value
    );
    expect(values).toEqual(['to', '/api/put/1', 'in', 'new', 'window']);
  });
});
