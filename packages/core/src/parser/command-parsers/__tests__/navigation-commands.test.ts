/**
 * Integration tests for the dedicated `go` command parser.
 *
 * These parse real hyperscript source through the full Parser (so they also
 * exercise the COMPOUND_COMMANDS dispatch wiring) and assert on the flat arg
 * list `parseGoCommand` emits. The runtime (commands/navigation/go.ts) consumes
 * that flat list directly, so the arg shapes here ARE the runtime contract.
 *
 * Regression: `go` used to fall into the generic command-arg loop, which
 * dropped trailing URLs (`go to /page` → the URL was discarded) and folded
 * scroll forms into binary expressions.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../../parser';
import { evaluateAST } from '../../runtime';
import { GoCommand } from '../../../commands/navigation/go';

// Recursively locate every `{ type:'command', name:'go' }` node in an AST.
function findGoNodes(node: unknown, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  const n = node as Record<string, unknown>;
  if (n.type === 'command' && n.name === 'go') out.push(n);
  for (const key of Object.keys(n)) {
    const v = n[key];
    if (Array.isArray(v)) v.forEach(c => findGoNodes(c, out));
    else if (v && typeof v === 'object') findGoNodes(v, out);
  }
  return out;
}

function firstGo(src: string): any {
  const result = parse(src);
  const go = findGoNodes(result.node ?? (result as any).ast ?? result)[0];
  expect(go, `no go node found for: "${src}"`).toBeDefined();
  return go;
}

// Reduce an arg node to a comparable { type, value } shape.
function shape(arg: any): { type: string; value: unknown } {
  return { type: arg.type, value: arg.value ?? arg.name };
}
/** The parse of a `go` (Arc 3 step 3): positional args by shape, slots by value (or kind for a non-literal). */
function goShape(src: string): {
  args: Array<{ type: string; value: unknown }>;
  slots: Record<string, unknown>;
} {
  const node = firstGo(src);
  const slots: Record<string, unknown> = {};
  for (const [k, v] of Object.entries((node.modifiers ?? {}) as Record<string, any>)) {
    slots[k] = v.type === 'string' || v.type === 'literal' ? v.value : v.type;
  }
  return { args: (node.args ?? []).map(shape), slots };
}
function argShapes(src: string): Array<{ type: string; value: unknown }> {
  return goShape(src).args;
}

describe('parseGoCommand — canonical navigation forms', () => {
  it('naked absolute path: go to /about', () => {
    expect(goShape('go to /about')).toEqual({
      args: [{ type: 'literal', value: '/about' }],
      slots: {},
    });
  });

  it('naked scheme URL: go to https://example.com', () => {
    expect(goShape('go to https://example.com')).toEqual({
      args: [{ type: 'literal', value: 'https://example.com' }],
      slots: {},
    });
  });

  it('bare path without `to`: go /page', () => {
    expect(argShapes('go /page')).toEqual([{ type: 'literal', value: '/page' }]);
  });

  it('multi-segment path: go to /users/42', () => {
    expect(argShapes('go to /users/42')).toEqual([{ type: 'literal', value: '/users/42' }]);
  });

  it('path segment that is a command word stays intact: go to /get', () => {
    expect(argShapes('go to /get')).toEqual([{ type: 'literal', value: '/get' }]);
  });

  it('quoted string destination: go to "#section"', () => {
    expect(argShapes('go to "#section"')).toEqual([{ type: 'literal', value: '#section' }]);
  });

  it('template literal destination: go to `/${p}`', () => {
    const args = argShapes('go to `/${p}`');
    expect(args).toHaveLength(1);
    expect(args[0].type).toBe('templateLiteral');
  });

  it('variable destination: go to myUrl', () => {
    expect(argShapes('go to myUrl')).toEqual([{ type: 'identifier', value: 'myUrl' }]);
  });

  it('in new window: go to /page in new window', () => {
    expect(goShape('go to /page in new window')).toEqual({
      args: [{ type: 'literal', value: '/page' }],
      slots: { in: 'new window' },
    });
  });

  it('variable + in new window does not swallow `in`: go to myUrl in new window', () => {
    expect(goShape('go to myUrl in new window')).toEqual({
      args: [{ type: 'identifier', value: 'myUrl' }],
      slots: { in: 'new window' },
    });
  });

  it('history: go back', () => {
    expect(goShape('go back')).toEqual({ args: [], slots: { back: 'back' } });
  });

  it('history: go forward', () => {
    expect(goShape('go forward')).toEqual({ args: [], slots: { forward: 'forward' } });
  });
});

describe('parseGoCommand — deprecated forms (back-compat)', () => {
  it('url keyword: go to url "/page"', () => {
    expect(goShape('go to url "/page"')).toEqual({ args: [], slots: { url: '/page' } });
  });

  it('url keyword without `to`: go url "/page"', () => {
    expect(goShape('go url "/page"')).toEqual({ args: [], slots: { url: '/page' } });
  });

  it('scroll: go to top of #header', () => {
    expect(goShape('go to top of #header')).toEqual({
      args: [],
      slots: { position: 'top', of: 'selector' },
    });
  });

  it('scroll + instantly: go to top of #header instantly', () => {
    expect(goShape('go to top of #header instantly').slots).toEqual({
      position: 'top',
      of: 'selector',
      behavior: 'instant',
    });
  });

  it('scroll with `the`: go to bottom of the #el', () => {
    expect(goShape('go to bottom of the #el').slots).toEqual({
      position: 'bottom',
      of: 'selector',
    });
  });

  it('scroll positive offset: go to top of #el + 50', () => {
    expect(goShape('go to top of #el + 50').slots).toEqual({
      position: 'top',
      of: 'selector',
      by: 50,
    });
  });

  it('scroll px offset: go to bottom of me - 50px', () => {
    expect(goShape('go to bottom of me - 50px').slots).toEqual({
      position: 'bottom',
      of: 'identifier',
      by: -50,
    });
  });
});

describe('parseGoCommand — dispatch across command positions', () => {
  it('preserves the URL inside a `then` sequence', () => {
    // The sequence path must route go through the dedicated parser too.
    expect(argShapes('on click go to /x then add .done')).toEqual([
      { type: 'literal', value: '/x' },
    ]);
  });

  it('preserves the URL inside an if/then branch', () => {
    expect(argShapes('if true then go to /page')).toEqual([{ type: 'literal', value: '/page' }]);
  });

  it('stops at the `and` boundary: go back and log "x"', () => {
    expect(goShape('go back and log "x"')).toEqual({ args: [], slots: { back: 'back' } });
  });

  it('bare `go` parses without crashing', () => {
    expect(argShapes('go')).toEqual([]);
  });
});

describe('parseGoCommand — runtime evaluation contract', () => {
  // The slots resolve to a structured GoCommandInput; nothing is scanned by value.
  const evaluator = { evaluate: (n: any, c: any) => evaluateAST(n, c) };
  const ctx: any = { me: null, variables: {}, locals: new Map() };

  it('go to /about → a url input', async () => {
    const node = firstGo('go to /about');
    const input = await new GoCommand().parseInput({ ...node } as any, evaluator as any, ctx);
    expect(input).toEqual({ kind: 'url', url: '/about', newWindow: false });
  });

  it('go back → a back input', async () => {
    const node = firstGo('go back');
    const input = await new GoCommand().parseInput({ ...node } as any, evaluator as any, ctx);
    expect(input).toEqual({ kind: 'back' });
  });

  it('go to url "/page" → a url input', async () => {
    const node = firstGo('go to url "/page"');
    const input = await new GoCommand().parseInput({ ...node } as any, evaluator as any, ctx);
    expect(input).toEqual({ kind: 'url', url: '/page', newWindow: false });
  });
});
