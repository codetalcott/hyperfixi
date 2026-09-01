/**
 * A template literal's `value` is its CONTENT, on both parse paths
 *
 * The convergence triage's whole `value` family was three sites, and this was
 * the only one that was not marked inert. It looked like an AST-shape nicety —
 * `"t ${1}"` vs `` "`t ${1}`" `` — and it is not: the delimiters were being
 * PRINTED. `log \`t ${1}\`` logged `` `t 1` `` on the default (semantic) path
 * and `t 1` on the traditional one, because the evaluator interpolates the
 * value it is given and emits whatever comes out.
 *
 * ## Two dead fix sites before the live one
 *
 * The producer was found by tagging every candidate and re-running, after two
 * guesses failed:
 *
 * 1. **core's `semanticValueToExpression`** (`semantic-integration.ts`) builds a
 *    `templateLiteral` for any literal containing `${…}`. Patching it changed
 *    NOTHING — that branch never fires for this source.
 * 2. **`packages/semantic`'s top-level `parse`** returns `null` for both
 *    `log \`t ${1}\`` and its handler-wrapped form, so `buildAST` could not be
 *    the route either.
 *
 * The live producer is the semantic package's expression parser, reached from
 * core through the built `dist` — which is also why tagging its SOURCE proved
 * nothing until the package was rebuilt. Tests here resolve
 * `@lokascript/semantic` through `dist`, so this file only reddens against a
 * fresh build (`npm run check:fresh`).
 *
 * Narrow by construction: `put` and `set` are on `skipSemanticParsing`, so only
 * commands that reach the semantic path could show it — which is why `put` and
 * `set` rows below were correct before and after, and are here to pin that the
 * fix did not have to reach them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

describe('template literal parity', () => {
  let logged: string[];

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div><div id="out">-</div>';
    logged = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(args.join(' '));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const host = () => document.getElementById('host') as HTMLElement;

  describe.each(BOTH_PATHS)('%s path', (_label, traditional) => {
    it('logs the interpolated CONTENT, without the backticks', async () => {
      await hyperscript.eval('log `t ${1}`', host(), { traditional } as never);
      expect(logged).toEqual(['t 1']);
    });

    it('carries the content, not the delimiters, on the node', () => {
      const result = hyperscript.compileSync('on click log `t ${1}`', {
        traditional,
      } as never) as { ast?: { commands?: Array<{ args?: Array<{ value?: unknown }> }> } };
      const arg = result.ast?.commands?.[0]?.args?.[0];
      expect(arg?.value).toBe('t ${1}');
    });

    it('was already right for the skipSemanticParsing commands', async () => {
      await hyperscript.eval('put `x ${1}` into #out', host(), { traditional } as never);
      expect(document.getElementById('out')?.textContent).toBe('x 1');
    });
  });
});
