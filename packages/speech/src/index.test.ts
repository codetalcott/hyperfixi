/**
 * End-to-end tests for @hyperfixi/speech.
 *
 * Validates:
 *   1. The plugin installs cleanly via installPlugin()
 *   2. The parser accepts `speak`, `ask`, `answer` at command position
 *   3. Runtime execution dispatches to the right commands
 *   4. speak() uses the Web Speech API (with a mock)
 *   5. ask() reads from window.prompt (with a mock)
 *   6. answer sets context.result / context.it
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { speechPlugin, speakCommand, askCommand, answerCommand } from './index';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

interface MockEvaluator {
  evaluate: (node: any, ctx: any) => Promise<unknown>;
}

/** Minimal evaluator that returns the literal value or identifier name. */
const mockEvaluator: MockEvaluator = {
  async evaluate(node: any) {
    if (!node) return undefined;
    if (node.type === 'literal') return node.value;
    if (node.type === 'identifier') return node.name;
    return node.value ?? node.name;
  },
};

function literal<T>(value: T) {
  return { type: 'literal', value };
}

function identifier(name: string) {
  return { type: 'identifier', name };
}

// ---------------------------------------------------------------------------
// Unit-level tests per command
// ---------------------------------------------------------------------------

describe('speakCommand', () => {
  let utterances: Array<{
    text: string;
    rate?: number;
    pitch?: number;
    voice?: SpeechSynthesisVoice | null;
    volume?: number;
  }>;
  let originalSynth: unknown;
  let originalUtterance: unknown;

  beforeEach(() => {
    utterances = [];
    originalSynth = (globalThis as any).speechSynthesis;
    originalUtterance = (globalThis as any).SpeechSynthesisUtterance;

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
      speak: vi.fn((utter: any) => {
        utterances.push({
          text: utter.text,
          rate: utter.rate,
          pitch: utter.pitch,
          voice: utter.voice,
          volume: utter.volume,
        });
      }),
      getVoices: () => [
        { name: 'Google UK English Female', lang: 'en-GB' } as SpeechSynthesisVoice,
      ],
    };
  });

  afterEach(() => {
    (globalThis as any).speechSynthesis = originalSynth;
    (globalThis as any).SpeechSynthesisUtterance = originalUtterance;
  });

  it('speaks the text argument via speechSynthesis.speak', async () => {
    const input = await speakCommand.parseInput(
      { args: [literal('hello')], modifiers: {} },
      mockEvaluator,
      {}
    );
    expect(input).toEqual({ text: 'hello' });
    const ctx: Record<string, unknown> = {};
    await speakCommand.execute(input, ctx);
    expect(utterances).toEqual([{ text: 'hello', rate: 1, pitch: 1, voice: null, volume: 1 }]);
    expect(ctx.result).toBe(true);
  });

  it('applies `with rate`, `with pitch`, `with volume` options', async () => {
    const input = await speakCommand.parseInput(
      {
        args: [
          literal('hi'),
          identifier('with'),
          identifier('rate'),
          literal(1.5),
          identifier('with'),
          identifier('pitch'),
          literal(0.8),
        ],
        modifiers: {},
      },
      mockEvaluator,
      {}
    );
    expect(input).toEqual({ text: 'hi', rate: 1.5, pitch: 0.8 });
    await speakCommand.execute(input, {});
    expect(utterances[0].rate).toBe(1.5);
    expect(utterances[0].pitch).toBe(0.8);
  });

  it('matches `with voice "<name>"` against available voices', async () => {
    const input = await speakCommand.parseInput(
      {
        args: [
          literal('hi'),
          identifier('with'),
          identifier('voice'),
          literal('Google UK English Female'),
        ],
        modifiers: {},
      },
      mockEvaluator,
      {}
    );
    await speakCommand.execute(input, {});
    expect(utterances[0].voice).toMatchObject({ name: 'Google UK English Female' });
  });

  it('no-ops when SpeechSynthesis is unavailable (sets result=false)', async () => {
    (globalThis as any).speechSynthesis = undefined;
    const ctx: Record<string, unknown> = {};
    await speakCommand.execute({ text: 'hi' }, ctx);
    expect(ctx.result).toBe(false);
  });

  it('throws when text argument is missing', async () => {
    await expect(
      speakCommand.parseInput({ args: [], modifiers: {} }, mockEvaluator, {})
    ).rejects.toThrow(/requires a text argument/);
  });
});

describe('askCommand', () => {
  let originalPrompt: unknown;

  beforeEach(() => {
    originalPrompt = (globalThis as any).prompt;
  });
  afterEach(() => {
    (globalThis as any).prompt = originalPrompt;
  });

  it('reads from window.prompt and stores result in context.result and context.it', async () => {
    (globalThis as any).prompt = vi.fn(() => 'Alice');
    const input = await askCommand.parseInput(
      { args: [literal('Your name?')], modifiers: {} },
      mockEvaluator,
      {}
    );
    expect(input.prompt).toBe('Your name?');
    const ctx: Record<string, unknown> = {};
    const out = await askCommand.execute(input, ctx);
    expect(out).toBe('Alice');
    expect(ctx.result).toBe('Alice');
    expect(ctx.it).toBe('Alice');
  });

  it('returns null when prompt is unavailable', async () => {
    (globalThis as any).prompt = undefined;
    const ctx: Record<string, unknown> = {};
    const out = await askCommand.execute({}, ctx);
    expect(out).toBeNull();
  });

  it('honors `with default "value"` syntax', async () => {
    (globalThis as any).prompt = vi.fn((_p: string, d: string) => d);
    const input = await askCommand.parseInput(
      {
        args: [literal('Your name?'), identifier('with'), identifier('default'), literal('Guest')],
        modifiers: {},
      },
      mockEvaluator,
      {}
    );
    expect(input.defaultValue).toBe('Guest');
    const ctx: Record<string, unknown> = {};
    await askCommand.execute(input, ctx);
    expect(ctx.result).toBe('Guest');
  });
});

describe('answerCommand', () => {
  it('sets context.result and context.it to the given value', async () => {
    const input = await answerCommand.parseInput(
      { args: [identifier('with'), literal('programmatic')], modifiers: {} },
      mockEvaluator,
      {}
    );
    expect(input).toEqual({ value: 'programmatic' });
    const ctx: Record<string, unknown> = {};
    await answerCommand.execute(input, ctx);
    expect(ctx.result).toBe('programmatic');
    expect(ctx.it).toBe('programmatic');
  });

  it('accepts bare-value form without leading `with`', async () => {
    const input = await answerCommand.parseInput(
      { args: [literal('bare')], modifiers: {} },
      mockEvaluator,
      {}
    );
    expect(input).toEqual({ value: 'bare' });
  });

  it('throws without any value', async () => {
    await expect(
      answerCommand.parseInput({ args: [], modifiers: {} }, mockEvaluator, {})
    ).rejects.toThrow(/requires a value/);
  });

  it('validate() accepts {value: ...} and rejects other shapes', () => {
    expect(answerCommand.validate({ value: 'x' })).toBe(true);
    expect(answerCommand.validate(null)).toBe(false);
    expect(answerCommand.validate({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Plugin shape
// ---------------------------------------------------------------------------

describe('speechPlugin', () => {
  it('has a valid HyperfixiPlugin shape', () => {
    expect(speechPlugin.name).toBe('@hyperfixi/speech');
    expect(typeof speechPlugin.install).toBe('function');
  });

  it('install() wires three commands into both registries', () => {
    const commandCalls: Array<{ name: string }> = [];
    const keywordCalls: string[] = [];
    const ctx = {
      commandRegistry: {
        register: (cmd: any) => commandCalls.push({ name: cmd.name }),
      },
      parserExtensions: {
        registerCommand: (name: string) => keywordCalls.push(name),
      },
    } as any;

    speechPlugin.install(ctx);

    expect(keywordCalls.sort()).toEqual(['answer', 'ask', 'speak']);
    expect(commandCalls.map(c => c.name).sort()).toEqual(['answer', 'ask', 'speak']);
  });
});
