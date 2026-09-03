/**
 * `hyperscript.use(frontEnd)` — the engine / front-end boundary at the API
 * (docs-internal/ENGINE_MIGRATION_PLAN.md, Arc 1 step 2).
 *
 * The engine parses English itself; for any other language `compile()` asks
 * the REGISTERED front-end once per program. These tests register a stub and
 * assert the stub's answer is what comes back — direct AST, English fallback,
 * warnings — so the contract, not `@lokascript/semantic`, is what is pinned.
 * The last block registers the real bridge through the same `use()` and
 * compiles Japanese, which is what the full browser bundle does at boot.
 *
 * Strict on purpose: a stub that is ignored (the default bridge answering
 * instead) fails every assertion here, because the stub's AST is a `log` the
 * source text does not contain.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { hyperscript } from './hyperscript-api';
import type { FrontEnd, FrontEndParseResult } from '../parser/semantic-integration';
import { SemanticGrammarBridge, createBridgeFrontEnd } from '../multilingual/bridge';

const STUB_AST = {
  type: 'command',
  name: 'log',
  args: [{ type: 'literal', value: 'from-stub' }],
  isBlocking: false,
} as const;

function stub(answer: (code: string, lang: string) => Partial<FrontEndParseResult>): FrontEnd & {
  calls: Array<[string, string]>;
} {
  const calls: Array<[string, string]> = [];
  return {
    name: 'stub',
    calls,
    async parseToAST(code, lang) {
      calls.push([code, lang]);
      return {
        ast: null,
        usedDirectPath: false,
        confidence: 0,
        lang,
        fallbackText: null,
        ...answer(code, lang),
      };
    },
  };
}

afterAll(() => {
  // Leave the process the way the full bundle leaves it: the real bridge
  // registered. Other test files get their own module instance anyway.
  hyperscript.use(createBridgeFrontEnd(new SemanticGrammarBridge()));
});

describe('hyperscript.use(frontEnd)', () => {
  it('a registered front-end is what compile() consults for a non-English program', async () => {
    const fe = stub(() => ({ ast: { ...STUB_AST }, usedDirectPath: true, confidence: 0.91 }));
    hyperscript.use(fe);

    const result = await hyperscript.compile('.active を 切り替え', { language: 'ja' });

    expect(fe.calls).toEqual([['.active を 切り替え', 'ja']]);
    expect(result.ok).toBe(true);
    expect(result.meta.parser).toBe('semantic');
    expect(result.meta.directPath).toBe(true);
    expect(result.meta.confidence).toBe(0.91);
    expect(result.meta.language).toBe('ja');
    expect((result.ast as { name?: string }).name).toBe('log');
  });

  it('English never reaches the front-end', async () => {
    const fe = stub(() => ({ ast: { ...STUB_AST }, usedDirectPath: true, confidence: 1 }));
    hyperscript.use(fe);

    const result = await hyperscript.compile('toggle .active');

    expect(fe.calls).toEqual([]);
    expect(result.meta.parser).toBe('traditional');
    expect((result.ast as { name?: string }).name).toBe('toggle');
  });

  it('a fallback rendering is parsed by the core parser, and the result says so', async () => {
    const fe = stub(() => ({ fallbackText: 'toggle .fallback', confidence: 0.3 }));
    hyperscript.use(fe);

    const result = await hyperscript.compile('何か', { language: 'ja' });

    expect(result.ok).toBe(true);
    expect(result.meta.parser).toBe('traditional');
    expect(result.meta.directPath).toBe(false);
    expect(result.meta.confidence).toBe(0.3);
    expect(result.meta.language).toBe('ja');
    expect((result.ast as { name?: string }).name).toBe('toggle');
  });

  it("the front-end's warnings ride on meta.warnings", async () => {
    const fe = stub(() => ({
      ast: { ...STUB_AST },
      usedDirectPath: true,
      confidence: 1,
      warnings: ['unconsumed input: "x"'],
    }));
    hyperscript.use(fe);

    const result = await hyperscript.compile('何か x', { language: 'ja' });

    expect(result.meta.warnings).toEqual(['unconsumed input: "x"']);
  });

  it('use() replaces the previous registration and drops its cached results', async () => {
    const first = stub(() => ({
      ast: { ...STUB_AST, name: 'first' },
      usedDirectPath: true,
      confidence: 1,
    }));
    hyperscript.use(first);
    const a = await hyperscript.compile('同じ', { language: 'ja' });
    expect((a.ast as { name?: string }).name).toBe('first');

    const second = stub(() => ({
      ast: { ...STUB_AST, name: 'second' },
      usedDirectPath: true,
      confidence: 1,
    }));
    hyperscript.use(second);
    const b = await hyperscript.compile('同じ', { language: 'ja' });

    expect((b.ast as { name?: string }).name).toBe('second');
    expect(second.calls).toHaveLength(1);
  });

  it('config.semantic = false bypasses the front-end entirely', async () => {
    const fe = stub(() => ({ ast: { ...STUB_AST }, usedDirectPath: true, confidence: 1 }));
    hyperscript.use(fe);
    const before = hyperscript.config.semantic;
    try {
      hyperscript.config.semantic = false;
      await hyperscript.compile('.active を 切り替え', { language: 'ja' });
      expect(fe.calls).toEqual([]);
    } finally {
      hyperscript.config.semantic = before;
    }
  });

  it('toLSE names the front-end when it has no parse()', async () => {
    hyperscript.use(stub(() => ({})));
    await expect(hyperscript.toLSE('toggle .active')).rejects.toThrow(/"stub" cannot parse/);
  });

  it('fromLSE names the front-end when it has no render()', async () => {
    hyperscript.use(stub(() => ({})));
    await expect(hyperscript.fromLSE('[toggle patient:.active]', 'ja')).rejects.toThrow(
      /"stub" cannot render/
    );
  });
});

describe('the @lokascript/semantic bridge through use()', () => {
  it('registered the way the full bundle registers it, Japanese compiles on the direct path', async () => {
    hyperscript.use(createBridgeFrontEnd(new SemanticGrammarBridge()));

    const result = await hyperscript.compile('.active を 切り替え', { language: 'ja' });

    expect(result.ok).toBe(true);
    expect(result.meta.parser).toBe('semantic');
    expect(result.meta.directPath).toBe(true);
    expect((result.ast as { name?: string }).name).toBe('toggle');
  });

  it('toLSE and fromLSE go through the same registration', async () => {
    hyperscript.use(createBridgeFrontEnd(new SemanticGrammarBridge()));

    const lse = await hyperscript.toLSE('toggle .active');
    expect(lse).toContain('toggle');
    expect(lse).toContain('.active');

    const ja = await hyperscript.fromLSE(lse, 'ja');
    expect(ja).toContain('.active');
    expect(ja).not.toContain('toggle');
  });
});
