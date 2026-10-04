/**
 * Shipped sources written in another language, through the multilingual path.
 *
 * Both shipped-sources gates hand every `_` to an English parser, which
 * rejects a script written in Spanish, so they skip it — and nothing else
 * looked. On a page such a script runs through `@lokascript/hyperscript-
 * adapter`, which translates it under its element's `lang`. This gate does
 * the same and requires English that upstream `_hyperscript` and
 * `@hyperfixi/engine` both parse (Phase C2c; fifteen attributes today: the
 * `live` blocks of examples/hx-v4-i18n/live-multilang.html, the example in
 * docs/BROWSER_BUNDLES.md's "Hyperscript in another language", and the
 * multilingual section of packages/core/docs/EXAMPLES.md).
 *
 * @vitest-environment node
 * Required: the hosts and the collector need real jsdom documents.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { preprocess } from '@lokascript/hyperscript-adapter';
import { collectLocalizedSources, type LocalizedSource } from './shipped-sources-validity';
import { installGlobals } from './shipped-examples-execution';

interface ParseHost {
  parse(source: string): { errors?: Array<{ message: string }> } | undefined;
}

describe('shipped sources written in another language', () => {
  const sources: LocalizedSource[] = collectLocalizedSources();
  let upstream: ParseHost;
  let engine: ParseHost;

  beforeAll(async () => {
    installGlobals(new JSDOM('<!doctype html><html><body></body></html>'));
    const require = createRequire(import.meta.url);
    const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
    upstream = (await import(pathToFileURL(esm).href)).default as ParseHost;
    const engineModule = await import('@hyperfixi/engine');
    engineModule.register(...engineModule.everything);
    engine = engineModule.api;
  });

  it('finds them (a page that moves them changes this count on purpose)', () => {
    expect(sources.map(s => `${s.file} [${s.lang}]`)).toEqual([
      'examples/hx-v4-i18n/live-multilang.html [es]',
      'examples/hx-v4-i18n/live-multilang.html [ja]',
      'examples/hx-v4-i18n/live-multilang.html [ar]',
      // The engine + adapter example in "Hyperscript in another language" (C-R3).
      'docs/BROWSER_BUNDLES.md [ja]',
      // "Multilingual Examples". Marked with `lang` in C4b: core's English parser had
      // kept them out of the engine gate; the engine gate now reads everything else.
      'packages/core/docs/EXAMPLES.md [es]',
      'packages/core/docs/EXAMPLES.md [ja]',
      'packages/core/docs/EXAMPLES.md [ar]',
      'packages/core/docs/EXAMPLES.md [es]',
      'packages/core/docs/EXAMPLES.md [ja]',
      'packages/core/docs/EXAMPLES.md [ko]',
      'packages/core/docs/EXAMPLES.md [es]',
      'packages/core/docs/EXAMPLES.md [fr]',
      'packages/core/docs/EXAMPLES.md [de]',
      'packages/core/docs/EXAMPLES.md [es]',
      'packages/core/docs/EXAMPLES.md [pt]',
    ]);
  });

  it('each translates to English upstream and the engine both parse', () => {
    const failures: string[] = [];
    for (const s of sources) {
      let english: string;
      try {
        english = preprocess(s.source, s.lang);
      } catch (e) {
        failures.push(`${s.file} [${s.lang}] threw: ${(e as Error).message}`);
        continue;
      }
      const first = (host: ParseHost) => host.parse(english)?.errors?.[0]?.message.split('\n')[0];
      const problem =
        english === s.source
          ? 'not translated'
          : (first(upstream) && `upstream: ${first(upstream)}`) ||
            (first(engine) && `engine: ${first(engine)}`);
      if (problem) failures.push(`${s.file} [${s.lang}] ${problem}\n  ${s.source}\n  → ${english}`);
    }
    expect(failures).toEqual([]);
  });
});
