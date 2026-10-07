// @vitest-environment jsdom
/**
 * The emitted bundle, run and sized.
 *
 * `generator.test.ts` reads the emitted TEXT. This file does what a project
 * does with it: imports it (the bare `@hyperfixi/engine` specifier resolves
 * through the workspace), lets it boot in a DOM, and drives a handler through
 * it. (The size gate is `generated-bundle-size.test.ts`: esbuild cannot run
 * under jsdom.)
 *
 * The multilingual case is the whole point of "text is the interchange": a
 * Spanish attribute runs through the engine's source transform and stays
 * Spanish on the element.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseSemantic, render } from '@lokascript/semantic';
import { Generator } from './generator';
import type { AggregatedUsage } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, '..');
// Under a node_modules so the bare specifiers in the emitted code resolve the
// way they do in a project; Vitest externalizes it and Node runs it as is.
const cacheDir = join(packageDir, '..', '..', 'node_modules', '.cache', 'hyperfixi-vite-plugin');

function usage(
  commands: string[],
  blocks: string[] = [],
  extra: Partial<AggregatedUsage> = {}
): AggregatedUsage {
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
    ...extra,
  };
}

type Api = ((src: string) => unknown) & {
  processNode(elt: Element): void;
  bundle: { modules: string[] };
  translateSource?: (src: string, elt: Element) => string | null;
};

let counter = 0;
async function load(code: string): Promise<Api> {
  mkdirSync(cacheDir, { recursive: true });
  const file = join(cacheDir, `bundle-${process.pid}-${counter++}.mjs`);
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as { default: Api };
  return mod.default;
}

const click = (elt: Element) => elt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('the emitted bundle runs', () => {
  const generator = new Generator({ debug: false });

  it('registers the modules, boots, and runs a handler', async () => {
    const api = await load(
      generator.generate(usage(['toggle', 'put'], ['if']), { globalName: 'hfxTest1' })
    );
    expect(typeof api).toBe('function');
    expect(api.bundle.modules).toEqual(
      expect.arrayContaining(['on', 'toggle', 'put', 'ifCommand'])
    );
    expect((globalThis as { hfxTest1?: unknown }).hfxTest1).toBe(api);

    const el = document.createElement('button');
    el.setAttribute('_', 'on click toggle .active then if I match .active put "on" into me end');
    document.body.appendChild(el);
    api.processNode(el);
    click(el);
    await tick();
    expect(el.classList.contains('active')).toBe(true);
    expect(el.textContent).toBe('on');
  });

  it('runs a Spanish attribute through the source transform and leaves it as written', async () => {
    const english = 'on click toggle .active';
    const spanish = render(parseSemantic(english, 'en').node!, 'es');
    expect(spanish).not.toBe(english);

    const code = generator.generate(usage(['toggle'], [], { detectedLanguages: new Set(['es']) }), {
      semantic: 'auto',
      globalName: 'hfxTest2',
    });
    const api = await load(code);
    expect(api.bundle.modules).not.toContain('reactivity');

    const scope = document.createElement('div');
    scope.setAttribute('lang', 'es');
    const el = document.createElement('button');
    el.setAttribute('_', spanish);
    scope.appendChild(el);
    document.body.appendChild(scope);
    expect(api.translateSource!(spanish, el)).toBe(english);

    api.processNode(el);
    click(el);
    await tick();
    expect(el.classList.contains('active')).toBe(true);
    expect(el.getAttribute('_')).toBe(spanish);
  });

  // M1 fail-loud: a translation that would lose part of the script is refused.
  // The script stays as written (so the engine reports it) instead of running a
  // partial English (`toggle .on` for es `alternar .on cuando .off`), and the page warns
  // once per language with what it would drop.
  it('keeps a script whose translation would lose part of it', async () => {
    const code = generator.generate(usage(['toggle'], [], { detectedLanguages: new Set(['es']) }), {
      semantic: 'auto',
      globalName: 'hfxTest3',
    });
    const api = await load(code);
    const scope = document.createElement('div');
    scope.setAttribute('lang', 'es');
    const el = document.createElement('button');
    scope.appendChild(el);
    document.body.appendChild(scope);

    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => void warnings.push(args.join(' '));
    try {
      expect(api.translateSource!('al clic alternar .on cuando .off', el)).toBeNull();
      expect(api.translateSource!('al clic alternar .on cuando .other', el)).toBeNull();
    } finally {
      console.warn = original;
    }
    expect(warnings.filter(w => w.includes('would lose'))).toHaveLength(1);
    expect(warnings[0]).toContain('cuando .off');
  });
});
