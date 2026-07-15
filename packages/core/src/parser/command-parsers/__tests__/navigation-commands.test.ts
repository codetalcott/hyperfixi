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
function argShapes(src: string): Array<{ type: string; value: unknown }> {
  return (firstGo(src).args ?? []).map(shape);
}

describe('parseGoCommand — canonical navigation forms', () => {
  it('naked absolute path: go to /about', () => {
    expect(argShapes('go to /about')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '/about' },
    ]);
  });

  it('naked scheme URL: go to https://example.com', () => {
    expect(argShapes('go to https://example.com')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: 'https://example.com' },
    ]);
  });

  it('bare path without `to`: go /page', () => {
    expect(argShapes('go /page')).toEqual([{ type: 'literal', value: '/page' }]);
  });

  it('multi-segment path: go to /users/42', () => {
    expect(argShapes('go to /users/42')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '/users/42' },
    ]);
  });

  it('path segment that is a command word stays intact: go to /get', () => {
    expect(argShapes('go to /get')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '/get' },
    ]);
  });

  it('quoted string destination: go to "#section"', () => {
    expect(argShapes('go to "#section"')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '#section' },
    ]);
  });

  it('template literal destination: go to `/${p}`', () => {
    const args = argShapes('go to `/${p}`');
    expect(args[0]).toEqual({ type: 'string', value: 'to' });
    expect(args[1].type).toBe('templateLiteral');
  });

  it('variable destination: go to myUrl', () => {
    expect(argShapes('go to myUrl')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'identifier', value: 'myUrl' },
    ]);
  });

  it('in new window: go to /page in new window', () => {
    expect(argShapes('go to /page in new window')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '/page' },
      { type: 'string', value: 'in' },
      { type: 'string', value: 'new' },
      { type: 'string', value: 'window' },
    ]);
  });

  it('variable + in new window does not swallow `in`: go to myUrl in new window', () => {
    expect(argShapes('go to myUrl in new window')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'identifier', value: 'myUrl' },
      { type: 'string', value: 'in' },
      { type: 'string', value: 'new' },
      { type: 'string', value: 'window' },
    ]);
  });

  it('history: go back', () => {
    expect(argShapes('go back')).toEqual([{ type: 'string', value: 'back' }]);
  });

  it('history: go forward', () => {
    expect(argShapes('go forward')).toEqual([{ type: 'string', value: 'forward' }]);
  });
});

describe('parseGoCommand — deprecated forms (back-compat)', () => {
  it('url keyword: go to url "/page"', () => {
    expect(argShapes('go to url "/page"')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'string', value: 'url' },
      { type: 'literal', value: '/page' },
    ]);
  });

  it('url keyword without `to`: go url "/page"', () => {
    expect(argShapes('go url "/page"')).toEqual([
      { type: 'string', value: 'url' },
      { type: 'literal', value: '/page' },
    ]);
  });

  it('scroll: go to top of #header', () => {
    expect(argShapes('go to top of #header')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'string', value: 'top' },
      { type: 'string', value: 'of' },
      { type: 'selector', value: '#header' },
    ]);
  });

  it('scroll + instantly: go to top of #header instantly', () => {
    expect(argShapes('go to top of #header instantly')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'string', value: 'top' },
      { type: 'string', value: 'of' },
      { type: 'selector', value: '#header' },
      { type: 'string', value: 'instantly' },
    ]);
  });

  it('scroll with `the`: go to bottom of the #el', () => {
    expect(argShapes('go to bottom of the #el')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'string', value: 'bottom' },
      { type: 'string', value: 'of' },
      { type: 'string', value: 'the' },
      { type: 'selector', value: '#el' },
    ]);
  });

  it('scroll positive offset: go to top of #el + 50', () => {
    expect(argShapes('go to top of #el + 50')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'string', value: 'top' },
      { type: 'string', value: 'of' },
      { type: 'selector', value: '#el' },
      { type: 'string', value: '+' },
      { type: 'literal', value: 50 },
    ]);
  });

  it('scroll px offset: go to bottom of me - 50px', () => {
    expect(argShapes('go to bottom of me - 50px')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'string', value: 'bottom' },
      { type: 'string', value: 'of' },
      { type: 'identifier', value: 'me' },
      { type: 'string', value: '-' },
      { type: 'string', value: '50px' },
    ]);
  });
});

describe('parseGoCommand — dispatch across command positions', () => {
  it('preserves the URL inside a `then` sequence', () => {
    // The sequence path must route go through the dedicated parser too.
    expect(argShapes('on click go to /x then add .done')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '/x' },
    ]);
  });

  it('preserves the URL inside an if/then branch', () => {
    expect(argShapes('if true then go to /page')).toEqual([
      { type: 'string', value: 'to' },
      { type: 'literal', value: '/page' },
    ]);
  });

  it('stops at the `and` boundary: go back and log "x"', () => {
    expect(argShapes('go back and log "x"')).toEqual([{ type: 'string', value: 'back' }]);
  });

  it('bare `go` parses without crashing', () => {
    expect(argShapes('go')).toEqual([]);
  });
});

describe('parseGoCommand — runtime evaluation contract', () => {
  // The keyword string nodes must evaluate to their own text and naked URLs to
  // the reassembled path, so go.ts parseInput sees the flat string array it scans.
  const evaluator = { evaluate: (n: any, c: any) => evaluateAST(n, c) };
  const ctx: any = { me: null, variables: {}, locals: new Map() };

  it('go to /about → parseInput args ["to","/about"]', async () => {
    const node = firstGo('go to /about');
    const input = await new GoCommand().parseInput({ ...node } as any, evaluator as any, ctx);
    expect(input.args).toEqual(['to', '/about']);
  });

  it('go back → parseInput args ["back"]', async () => {
    const node = firstGo('go back');
    const input = await new GoCommand().parseInput({ ...node } as any, evaluator as any, ctx);
    expect(input.args).toEqual(['back']);
  });

  it('go to url "/page" → parseInput args ["to","url","/page"]', async () => {
    const node = firstGo('go to url "/page"');
    const input = await new GoCommand().parseInput({ ...node } as any, evaluator as any, ctx);
    expect(input.args).toEqual(['to', 'url', '/page']);
  });
});
