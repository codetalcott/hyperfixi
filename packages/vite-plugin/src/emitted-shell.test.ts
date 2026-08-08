/**
 * Does a bundle this plugin emits claim a global it has no right to?
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS (Arc E step 3 — `docs-internal/archive/handoffs/HANDOFF-command-arch-bundles.md`)
 * ---------------------------------------------------------------------------
 *
 * The boot shell is emitted from THREE sites in this package — `generator.ts`'s
 * main shell and its empty-bundle shell, plus `compiled-generator.ts` — on top
 * of the handwritten shells and the emitter in `@hyperfixi/core`. All of them
 * assigned `window._hyperscript = api`, squatting the global belonging to the
 * library HyperFixi is compatible WITH.
 *
 * Measured against `hyperscript.org@0.9.93`: `_hyperscript` is a CALLABLE
 * function (`_hyperscript('1 + 1')` → `2`) carrying `evaluate`, `processNode`,
 * `internals`, `config`, `addCommand`, `addFeature`. The emitted `api` is a
 * plain object with none of them, so on a page loading both, last-write-wins —
 * and when the generated bundle won, `_hyperscript(...)` threw "not a
 * function", `.evaluate` was undefined, and `parse`/`process` (the only
 * overlapping names) silently did something else entirely.
 *
 * No test in either package asserted this global, which is precisely why it
 * survived in four emitters. The core-side twin of this file is
 * `packages/core/src/compatibility/bundle-shell.test.ts`; a gate in core cannot
 * see these three sites, so the assertion lives on both sides.
 */

import { describe, it, expect } from 'vitest';
import { Generator } from './generator';
import { generateCompiledBundle } from './compiled-generator';
import type { CompiledHandler } from './compiler';

function createUsage(commands: string[], blocks: string[] = []) {
  return {
    commands: new Set(commands),
    blocks: new Set(blocks),
    positional: false,
    detectedLanguages: new Set<string>(),
    htmx: {
      hasHtmxAttributes: false,
      hasFixiAttributes: false,
      httpMethods: new Set<string>(),
      swapStrategies: new Set<string>(),
      onHandlers: [] as string[],
      triggerModifiers: new Set<string>(),
    },
  };
}

const handler: CompiledHandler = {
  id: 'h0',
  event: 'click',
  modifiers: {},
  code: '/* noop */',
  needsEvaluator: false,
  original: 'on click log "hi"',
};

describe('emitted shells do not claim window._hyperscript', () => {
  const generator = new Generator({ debug: false });

  it('main shell (hybrid parser) installs only its own global', () => {
    const code = generator.generate(createUsage(['toggle'], ['if']) as never, {});

    expect(code).toContain('window.hyperfixi = api');
    expect(code).not.toContain('_hyperscript');
  });

  it('main shell (lite parser) installs only its own global', () => {
    const code = generator.generate(createUsage(['toggle']) as never, {});

    expect(code).toContain('window.hyperfixi = api');
    expect(code).not.toContain('_hyperscript');
  });

  it('empty bundle installs only its own global', () => {
    const code = generator.generate(createUsage([]) as never, {});

    // The empty shell is a distinct emission site with its own api literal —
    // it is why "fix the generator" was three edits in this package, not one.
    expect(code).toContain('LokaScript Empty Bundle');
    expect(code).not.toContain('_hyperscript');
  });

  it('compiled (AOT) bundle installs only its own global', () => {
    const code = generateCompiledBundle({
      handlers: [handler],
      needsLocals: false,
      needsGlobals: false,
    });

    expect(code).toContain('window.hyperfixi=api');
    expect(code).not.toContain('_hyperscript');
  });
});
