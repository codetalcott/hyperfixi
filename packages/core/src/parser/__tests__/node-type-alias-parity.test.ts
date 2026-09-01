/**
 * The 12 `node-type` triage sites — both parse paths must BEHAVE the same
 *
 * The convergence triage (`tools/triage-parse-paths.ts`) reports 12 sites
 * where the traditional and semantic paths emit a different node TYPE for the
 * same source. #1036 proved a family named after a shape says nothing about
 * whether the shapes behave the same: executing the then-14 rows found three
 * live defects. This file executes the 10 that remained unchecked — measured
 * 2026-09-01, all 10 behave IDENTICALLY on both paths — and pins that, so the
 * alias-normalisation work (ENGINE_MIGRATION_PLAN Thread B item 5) cannot
 * silently break the behaviour while renaming the nodes.
 *
 * The sites, by transition family:
 *
 *   memberExpression -> propertyAccess   call element.focus(), copy my
 *                                        textContent, get me.parentElement,
 *                                        log me.value
 *   identifier -> contextReference       empty me, hide me, select me, show me
 *   possessiveExpression -> propertyAccess   log #target's innerHTML
 *   string -> literal                    go back
 *
 * The other 2 of the 12 are pinned elsewhere and known-benign: `open #popup
 * as non-modal` (OpenCommand reads both shapes) and `transition opacity to
 * 0.5` (#1036 fixed the consumer; nodes still differ, outcomes do not).
 *
 * Each row asserts the OBSERVABLE, not the parse — an unbound identifier that
 * evaluates to `undefined` is exactly the failure mode a parse-shape assertion
 * cannot see (the lesson `scroll-parse.test.ts` records in its docblock).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

describe('node-type alias sites — both parse paths agree behaviourally', () => {
  let logged: unknown[];

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="host">host-text</div>
      <div id="target"><b>inner</b></div>
      <input id="inp" value="42" />`;
    logged = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(args[0]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const host = () => document.getElementById('host') as HTMLElement;
  const inp = () => document.getElementById('inp') as HTMLInputElement;
  const runOn = (source: string, traditional: boolean, me?: HTMLElement) =>
    hyperscript.eval(source, me ?? host(), { traditional } as never);

  describe.each(BOTH_PATHS)('%s path', (_label, traditional) => {
    // ---- memberExpression -> propertyAccess -------------------------------

    it('call element.focus() focuses the element', async () => {
      await runOn('set element to #inp then call element.focus()', traditional);
      expect((document.activeElement as HTMLElement)?.id).toBe('inp');
    });

    it('copy my textContent writes the text to the clipboard', async () => {
      const writes: string[] = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        get: () => ({
          writeText: (t: string) => {
            writes.push(t);
            return Promise.resolve();
          },
        }),
      });
      await runOn('copy my textContent', traditional);
      expect(writes).toEqual(['host-text']);
    });

    it('get me.parentElement resolves the parent', async () => {
      await runOn('get me.parentElement then log it', traditional);
      expect(logged).toHaveLength(1);
      expect((logged[0] as HTMLElement)?.tagName).toBe('BODY');
    });

    it('log me.value reads the property', async () => {
      await runOn('log me.value', traditional, inp() as unknown as HTMLElement);
      expect(logged).toEqual(['42']);
    });

    // ---- identifier -> contextReference -----------------------------------

    it('empty me empties the element', async () => {
      await runOn('empty me', traditional);
      expect(host().innerHTML).toBe('');
    });

    it('hide me hides the element', async () => {
      await runOn('hide me', traditional);
      expect(host().style.display).toBe('none');
    });

    it('show me restores the element', async () => {
      host().style.display = 'none';
      await runOn('show me', traditional);
      expect(host().style.display).not.toBe('none');
    });

    it('select me selects the input contents', async () => {
      await runOn('select me', traditional, inp() as unknown as HTMLElement);
      expect([inp().selectionStart, inp().selectionEnd]).toEqual([0, 2]);
    });

    // ---- possessiveExpression -> propertyAccess ---------------------------

    it("log #target's innerHTML reads through the possessive", async () => {
      await runOn("log #target's innerHTML", traditional);
      expect(logged).toEqual(['<b>inner</b>']);
    });

    // ---- string -> literal ------------------------------------------------

    it('go back calls history.back()', async () => {
      const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      await runOn('go back', traditional);
      expect(backSpy).toHaveBeenCalledTimes(1);
    });
  });
});
