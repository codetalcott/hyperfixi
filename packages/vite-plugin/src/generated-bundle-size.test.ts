/**
 * The emitted bundle, sized. Bundled with esbuild (the engine resolved through
 * the workspace), minified, gzipped: holds the size story the 4.0 notes tell
 * (measured 2026-10-03: 3 commands 17.0 KB, hybrid-like 18.6 KB, everything
 * 34.4 KB gzipped; core's lite tier was 3.9 KB and its fallback 352 KB).
 * Node environment: esbuild's TextEncoder invariant fails under jsdom.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Generator } from './generator';
import type { AggregatedUsage } from './types';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function usage(commands: string[], blocks: string[] = []): AggregatedUsage {
  return {
    commands: new Set(commands),
    blocks: new Set(blocks),
    positional: false,
    detectedLanguages: new Set(),
    htmx: {
      hasHtmxAttributes: false,
      hasFixiAttributes: false,
      httpMethods: new Set(),
      swapStrategies: new Set(),
      onHandlers: [],
      triggerModifiers: new Set(),
      urlManagement: new Set(),
      usesConfirm: false,
      needsSwapTiming: false,
      needsHxLive: false,
      needsSSE: false,
      needsWS: false,
      needsBindToProperty: false,
      needsReactivity: false,
    },
    needsReactivity: false,
    needsBindToProperty: false,
    fileUsage: new Map(),
  };
}

describe('the emitted bundle, bundled', () => {
  const generator = new Generator({ debug: false });
  const sizes: Record<string, number> = {};

  async function gz(code: string): Promise<number> {
    const result = await build({
      stdin: { contents: code, resolveDir: packageDir, loader: 'js' },
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      write: false,
      logLevel: 'silent',
    });
    return gzipSync(result.outputFiles[0].text).length;
  }

  beforeAll(async () => {
    // The engine must be built: ensure-fresh (pretest) does that for `npm test`.
    sizes.three = await gz(generator.generate(usage(['toggle', 'add', 'remove']), {}));
    sizes.hybridLike = await gz(
      generator.generate(usage(['toggle', 'add', 'remove', 'put', 'set'], ['if', 'repeat']), {})
    );
    sizes.everything = await gz(generator.generateDevFallback('everything'));
  }, 60_000);

  it('three commands bundle under 19 KB gzipped (measured 17.0 KB)', () => {
    expect(sizes.three).toBeLessThan(19 * 1024);
    expect(sizes.three).toBeGreaterThan(12 * 1024); // the engine's fixed core is 13.8 KB
  });

  it('a hybrid-class usage bundles under 21 KB gzipped (measured 18.6 KB)', () => {
    expect(sizes.hybridLike).toBeLessThan(21 * 1024);
    expect(sizes.hybridLike).toBeGreaterThan(sizes.three);
  });

  it('a multilingual bundle keeps the language registrations through tree-shaking', async () => {
    // Vite and esbuild drop a side-effect import unless the package marks it;
    // `@lokascript/semantic` marks `dist/languages/*`. A bundle that lost them
    // would register no language and translate nothing, silently.
    const code = generator.generate(
      { ...usage(['toggle']), detectedLanguages: new Set(['es']) },
      { semantic: 'auto' }
    );
    const result = await build({
      stdin: { contents: code, resolveDir: packageDir, loader: 'js' },
      bundle: true,
      minify: false,
      format: 'esm',
      target: 'es2020',
      write: false,
      logLevel: 'silent',
    });
    const out = result.outputFiles[0].text;
    expect(out).toContain('registerLanguage("es"');
    expect(out).toContain('addSourceTransform(translateSource)');
    sizes.spanish = gzipSync(out).length;
  }, 60_000);

  it("everything bundles under 36 KB gzipped (measured 34.4 KB; core's fallback was 352 KB)", () => {
    expect(sizes.everything).toBeLessThan(36 * 1024);
    expect(sizes.everything).toBeGreaterThan(sizes.hybridLike);
  });
});
