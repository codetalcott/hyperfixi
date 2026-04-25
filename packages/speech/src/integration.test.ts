/**
 * Real end-to-end integration test: install speechPlugin into an actual
 * hyperfixi Runtime, parse hyperscript source with the plugin's commands,
 * and verify execution flows through correctly.
 *
 * This is the "round-trip" test the Phase 5 plan called for — proof that
 * an external plugin package can contribute commands through the public
 * plugin infrastructure without touching core internals.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime, installPlugin, getParserExtensionRegistry, parse } from '@hyperfixi/core';
import { speechPlugin } from './index';

describe('@hyperfixi/speech end-to-end integration', () => {
  const registry = getParserExtensionRegistry();
  let baseline: ReturnType<typeof registry.snapshot>;
  let runtime: Runtime;
  let originalSynth: unknown;
  let originalUtterance: unknown;
  let originalPrompt: unknown;
  let spoken: string[];

  beforeEach(() => {
    baseline = registry.snapshot();
    spoken = [];

    originalSynth = (globalThis as any).speechSynthesis;
    originalUtterance = (globalThis as any).SpeechSynthesisUtterance;
    originalPrompt = (globalThis as any).prompt;

    (globalThis as any).SpeechSynthesisUtterance = class MockUtterance {
      text: string;
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      constructor(text: string) {
        this.text = text;
      }
    };
    (globalThis as any).speechSynthesis = {
      speak: (utter: any) => {
        spoken.push(utter.text);
      },
      getVoices: () => [],
    };
    (globalThis as any).prompt = vi.fn(() => 'user-typed');

    runtime = new Runtime();
    installPlugin(runtime, speechPlugin);
  });

  afterEach(() => {
    registry.restore(baseline);
    (globalThis as any).speechSynthesis = originalSynth;
    (globalThis as any).SpeechSynthesisUtterance = originalUtterance;
    (globalThis as any).prompt = originalPrompt;
  });

  it('registers `speak`/`ask`/`answer` as command keywords', () => {
    expect(registry.hasCommand('speak')).toBe(true);
    expect(registry.hasCommand('ask')).toBe(true);
    expect(registry.hasCommand('answer')).toBe(true);
  });

  it('executes `speak "hello"` through the full parse→runtime pipeline', async () => {
    // Parser acceptance: importing `parse` from the core entry is the most
    // convenient way to go from source to AST in the integration layer.
    const result = parse('speak "hello world"');
    expect(result.success).toBe(true);

    const el = document.createElement('div');
    const ctx = {
      me: el,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      events: new Map(),
    } as any;

    await runtime.execute(result.node!, ctx);
    expect(spoken).toEqual(['hello world']);
  });

  it('executes `answer with "x"` and sets context.result', async () => {
    const result = parse('answer with "programmatic"');
    expect(result.success).toBe(true);

    const el = document.createElement('div');
    const ctx = {
      me: el,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      events: new Map(),
    } as any;

    await runtime.execute(result.node!, ctx);
    expect(ctx.result).toBe('programmatic');
    expect(ctx.it).toBe('programmatic');
  });
});
