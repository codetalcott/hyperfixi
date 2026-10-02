/**
 * Shipped sources on `@hyperfixi/engine`: what replacing core's engine would break.
 *
 * `packages/engine` is meant to replace the engine in `packages/core`. Every
 * hyperscript source this repository ships (`examples/` and the doc trees, the
 * validity gate's collection) that core compiles clean is put to the engine's
 * parser. The ones it rejects are listed in
 * `baselines/shipped-sources-engine.json`, each with the reason it is still
 * there. Three assertions, as the sibling gates:
 *   1. sanity: sources were found and the engine reads most of them;
 *   2. no NEW rejected source outside the list. A page or a doc example
 *      written in syntax only core has would break when core's engine goes;
 *      write upstream's spelling (`packages/engine/README.md` lists the forms
 *      that were considered and not kept), or list it with a reason;
 *   3. no stale entry: a listed source the engine now reads, or one that was
 *      edited (the key embeds a hash of the source), must be removed, so the
 *      list only shrinks. It is empty when core's engine can be replaced
 *      without breaking a shipped page.
 *
 * This is a PARSE-level gate. A source can parse on both engines and run
 * differently; the engine lane of `shipped-examples-execution.test.ts` is the
 * gate for that.
 *
 * To see the list by form, and beside upstream's verdict:
 * `npx tsx packages/engine/tools/shipped-sources.mts`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkShippedSourcesOnEngine,
  type CompileForValidity,
  type ShippedSourcesOnEngineResult,
} from './shipped-sources-validity';

interface RejectedDoc {
  rejected: Array<{ key: string; file: string; error: string; excerpt: string; reason: string }>;
}

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../baselines/shipped-sources-engine.json'
);
const listed = JSON.parse(readFileSync(baselinePath, 'utf8')) as RejectedDoc;
const allowed = new Set(listed.rejected.map(e => e.key));

describe('shipped sources on @hyperfixi/engine', () => {
  let result: ShippedSourcesOnEngineResult;

  beforeAll(async () => {
    const core = (await import('@hyperfixi/core')) as unknown as {
      hyperscript: { compileSync: CompileForValidity };
    };
    const { api, everything, register } = await import('@hyperfixi/engine');
    register(...everything);
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    result = checkShippedSourcesOnEngine(
      code => core.hyperscript.compileSync(code),
      code => {
        try {
          return api.parse(code).errors.map(error => error.message);
        } catch (e) {
          return ['threw: ' + (e instanceof Error ? e.message : String(e))];
        }
      },
      dom.window.document as unknown as Parameters<typeof checkShippedSourcesOnEngine>[2]
    );
  }, 120_000);

  it('finds the shipped sources and the engine reads most of them (sanity)', () => {
    expect(result.coreClean).toBeGreaterThan(200);
    expect(result.engineAccepts).toBeGreaterThan(200);
  });

  it('has no NEW shipped source the engine rejects outside the list', () => {
    const unexpected = result.rejections.filter(r => !allowed.has(r.key));
    expect(
      unexpected,
      unexpected.length
        ? `\nShipped sources core compiles and @hyperfixi/engine rejects (write upstream's spelling,\n` +
            `or list it in baselines/shipped-sources-engine.json with a reason):\n` +
            unexpected
              .map(r => `  [${r.key}]\n      "${r.excerpt}"\n      -> ${r.error}`)
              .join('\n') +
            `\n\nOne source on the engine and on upstream, side by side:\n` +
            `  npx tsx packages/engine/tools/probe.mts '<source>'`
        : ''
    ).toEqual([]);
  });

  it('has no stale entries (a source the engine now reads must be removed, so the list only shrinks)', () => {
    const stillRejected = new Set(result.rejections.map(r => r.key));
    const stale = listed.rejected.map(e => e.key).filter(key => !stillRejected.has(key));
    expect(
      stale,
      stale.length
        ? `\nThese listed sources are no longer rejected (read by the engine now, or edited: the key\n` +
            `embeds a hash of the source). Remove them from baselines/shipped-sources-engine.json:\n  ` +
            stale.join('\n  ')
        : ''
    ).toEqual([]);
  });
});
