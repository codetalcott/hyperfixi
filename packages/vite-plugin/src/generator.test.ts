/**
 * Generator tests: the virtual module is a bundle on `@hyperfixi/engine` that
 * registers only the modules the scan needs.
 *
 * What is pinned here:
 * - module selection per usage (the only "tier" is the module list)
 * - the emitted shell: one engine import, `register(...)`, `boot()`, the global
 * - the multilingual path is the engine's source transform, not an AST path
 * - the dev fallback is `everything`
 * The emitted bundle is EXECUTED and SIZED in `generated-bundle.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { Generator } from './generator';
import type { AggregatedUsage, HyperfixiPluginOptions } from './types';

function createUsage(
  commands: string[],
  blocks: string[] = [],
  positional = false,
  extra: Partial<AggregatedUsage> = {}
): AggregatedUsage {
  return {
    commands: new Set(commands),
    blocks: new Set(blocks),
    positional,
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

/** The names inside `register(...)` of a generated bundle. */
function registered(code: string): string[] {
  const m = code.match(/^register\(([^)]*)\);/m);
  return m
    ? m[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
}

describe('Generator', () => {
  const generator = new Generator({ debug: false });
  const noOptions: HyperfixiPluginOptions = {};

  describe('module selection', () => {
    it('registers only the modules the commands need, plus on and the conversions', () => {
      const code = generator.generate(createUsage(['toggle', 'add', 'remove']), noOptions);
      expect(registered(code)).toEqual([
        'on',
        'conversions',
        'add',
        'remove',
        'toggle',
        'toggleElement',
      ]);
    });

    it('imports exactly what it registers, from the engine', () => {
      const code = generator.generate(createUsage(['put', 'set']), noOptions);
      const imported = code.match(/^import \{ ([^}]*) \} from '@hyperfixi\/engine';/m)?.[1];
      expect(imported).toBe('api, boot, register, on, conversions, set, put');
      expect(code).not.toContain('@hyperfixi/core');
    });

    it('adds the control-flow modules for blocks', () => {
      const code = generator.generate(createUsage(['toggle'], ['if', 'repeat']), noOptions);
      expect(registered(code)).toEqual(
        expect.arrayContaining(['ifCommand', 'repeat', 'loopControl'])
      );
    });

    it('adds fetch for the fetch block and the extra expressions for positional use', () => {
      const code = generator.generate(createUsage(['put'], ['fetch'], true), noOptions);
      expect(registered(code)).toEqual(
        expect.arrayContaining(['fetchCommand', 'expressionsExtra'])
      );
    });

    it('adds the reactivity modules when the scan saw live / when / bind', () => {
      const code = generator.generate(
        createUsage(['put'], [], false, { needsReactivity: true }),
        noOptions
      );
      expect(registered(code)).toEqual(expect.arrayContaining(['reactivity', 'liveTemplates']));
      expect(code).toContain('Reactivity: live / when / bind');
    });

    it('adds construct and cookies from their flags', () => {
      const code = generator.generate(
        createUsage(['set'], [], false, { needsConstruct: true, needsCookies: true }),
        noOptions
      );
      expect(registered(code)).toEqual(expect.arrayContaining(['construct', 'cookies']));
    });

    it('includes extraCommands and extraBlocks from the options', () => {
      const code = generator.generate(createUsage(['toggle']), {
        extraCommands: ['send'],
        extraBlocks: ['if'],
      });
      expect(registered(code)).toEqual(expect.arrayContaining(['send', 'ifCommand']));
    });

    it('never falls back to a prebuilt bundle, whatever the command', () => {
      const code = generator.generate(
        createUsage(['tell', 'make', 'swap', 'pick', 'measure']),
        noOptions
      );
      expect(code).not.toContain('Dev Fallback');
      expect(registered(code)).toEqual(
        expect.arrayContaining(['tell', 'make', 'swap', 'pick', 'measure'])
      );
    });

    it('leaves a name the engine has no module for out, without failing', () => {
      const code = generator.generate(createUsage(['toggle', 'copy']), noOptions);
      expect(registered(code)).not.toContain('copy');
      expect(registered(code)).toContain('toggle');
    });
  });

  describe('the emitted shell', () => {
    it('boots the engine and installs the plugin global beside it', () => {
      const code = generator.generate(createUsage(['toggle']), noOptions);
      expect(code).toContain('window.hyperfixi = api;');
      expect(code).toContain('boot();');
      expect(code).toContain('export default api;');
      expect(code).toContain('export { api };');
    });

    it("honours globalName, and does not double-assign when it is the engine's own", () => {
      expect(generator.generate(createUsage(['toggle']), { globalName: 'lokascript' })).toContain(
        'window.lokascript = api;'
      );
      const own = generator.generate(createUsage(['toggle']), { globalName: '_hyperscript' });
      expect(own).not.toContain('window._hyperscript = api');
      expect(own).toContain('boot();');
    });

    it('records what it registered on api.bundle', () => {
      const code = generator.generate(createUsage(['toggle', 'add'], ['if']), noOptions);
      const bundle = JSON.parse(code.match(/bundle: (\{.*\}),/)![1]);
      expect(bundle).toEqual({
        generator: '@hyperfixi/vite-plugin',
        modules: ['on', 'conversions', 'add', 'toggle', 'ifCommand', 'toggleElement'],
        commands: ['toggle', 'add'],
        blocks: ['if'],
        languages: [],
      });
    });

    it('documents the selection in the header', () => {
      const code = generator.generate(createUsage(['toggle'], ['if'], true), noOptions);
      expect(code).toContain('Engine: @hyperfixi/engine');
      expect(code).toContain('Commands: toggle');
      expect(code).toContain('Blocks: if');
      expect(code).toContain('Expressions: positional');
    });

    it('hands swapped-in content to the engine when htmx is in play', () => {
      const scanned = generator.generate(
        createUsage(['toggle'], [], false, {
          htmx: { ...createUsage([]).htmx, hasHtmxAttributes: true },
        }),
        noOptions
      );
      expect(scanned).toContain("'htmx:load'");
      expect(scanned).toContain('api.processNode(target)');

      const opted = generator.generate(createUsage(['toggle']), { htmx: true });
      expect(opted).toContain("'htmx:afterSettle'");

      const plain = generator.generate(createUsage(['toggle']), noOptions);
      expect(plain).not.toContain('htmx:');
    });
  });

  describe('multilingual (text is the interchange)', () => {
    it("installs the semantic translation as the engine's source transform", () => {
      const code = generator.generate(
        createUsage(['toggle'], [], false, { detectedLanguages: new Set(['es']) }),
        { semantic: 'auto' }
      );
      expect(code).toContain("from '@lokascript/semantic/core'");
      expect(code).toContain("import '@lokascript/semantic/languages/es'");
      expect(code).toContain('api.addSourceTransform(translateSource);');
      expect(code).toContain('translateSource,');
      expect(code).toContain('Multilingual: es');
      expect(code).not.toContain('buildAST');
      expect(code).not.toContain('HybridParser');
    });

    it('does not install a transform when semantic is off', () => {
      const code = generator.generate(createUsage(['toggle']), noOptions);
      expect(code).not.toContain('addSourceTransform');
      expect(code).not.toContain('@lokascript/semantic');
    });

    it('adds the translator when grammar is on', () => {
      const code = generator.generate(createUsage(['toggle']), {
        grammar: true,
        languages: ['ja'],
      });
      expect(code).toContain('translateHyperscript,');
      expect(code).toContain("import { translate } from '@lokascript/semantic/core';");
    });
  });

  describe('empty and fallback bundles', () => {
    it('emits the empty bundle when nothing was detected', () => {
      const code = generator.generate(createUsage([]), noOptions);
      expect(code).toContain('Empty Bundle');
      expect(code).not.toContain('@hyperfixi/engine');
      expect(code).toContain('window.hyperfixi = api');
    });

    it('emits a bundle when only semantic is enabled', () => {
      const code = generator.generate(createUsage([]), { semantic: 'en' });
      expect(code).toContain("from '@hyperfixi/engine'");
      expect(registered(code)).toEqual(['on', 'conversions']);
    });

    it('dev fallback is the engine with every module, whatever name is asked for', () => {
      for (const kind of ['everything', 'full', 'hybrid-complete', 'hx-v4'] as const) {
        const code = generator.generateDevFallback(kind);
        expect(code).toContain('register(...everything);');
        expect(code).toContain("from '@hyperfixi/engine'");
        expect(code).not.toContain('@hyperfixi/core');
      }
    });
  });
});
