/**
 * Consumer-boundary lock — multilingual multi-handler PROGRAM through the bridge.
 *
 * The semantic parser's multi-handler structural layer (`tryParseProgram`) splits
 * a top-level script with ≥2 event handlers (`on click … end on keyup … end`) and
 * buildAST maps it to a core `Program` node. This verifies the whole pipeline —
 * parseSemantic → buildAST → SemanticGrammarBridge — resolves to a Program with
 * one `eventHandler` statement per handler (which the runtime's executeProgram
 * registers), across SVO/SOV word orders. Core tests resolve `@lokascript/semantic`
 * from dist, so this also guards against the build-swallows-DTS consumer skew.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultilingualHyperscript } from './index';

describe('multilingual multi-handler program — bridge → core Program', () => {
  let ml: MultilingualHyperscript;
  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  const cases = [
    ['en', 'on click toggle .active end on keyup add .x to me end'],
    ['en', 'on click toggle .active on keyup add .x to me'], // no-end chain (Phase B)
    ['es', 'al click alternar .active fin al keyup agregar .x a me fin'],
    ['ja', 'click を で .active を 切り替え 終わり keyup を で .x を 追加 終わり'],
  ] as const;

  for (const [lang, src] of cases) {
    it(`${lang}: parseToAST → Program with two eventHandlers (click, keyup)`, async () => {
      const ast = (await ml.parseToAST(src, lang)) as {
        type: string;
        statements: { type: string; event?: string }[];
      } | null;
      expect(ast).toBeTruthy();
      expect(ast!.type).toBe('Program');
      expect(ast!.statements).toHaveLength(2);
      expect(ast!.statements.every(s => s.type === 'eventHandler')).toBe(true);
      expect(ast!.statements.map(s => s.event)).toEqual(['click', 'keyup']);
    });
  }

  it('a single handler does NOT become a Program', async () => {
    const ast = (await ml.parseToAST('on click toggle .active on me', 'en')) as {
      type: string;
    } | null;
    expect(ast).toBeTruthy();
    expect(ast!.type).toBe('eventHandler');
  });
});
