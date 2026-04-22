/**
 * Speech plugin commands — upstream _hyperscript 0.9.90.
 *
 *   speak "text"                    SpeechSynthesis.speak(new Utterance(text))
 *   speak "text" with rate 1.5      options on the utterance
 *   speak "text" with pitch 0.8 with voice "Google UK English Female"
 *
 *   ask "Your name?"                window.prompt(text) → context.result
 *   ask                             window.prompt()
 *
 *   answer with "programmatic"       context.result = text (no UI; useful for
 *                                    scripted flows or test mocks)
 *
 * Each command returns a plain object with `{ name, parseInput, execute,
 * validate }` — the minimum shape accepted by `CommandRegistryV2.register()`.
 * The commands deliberately avoid importing from `@hyperfixi/core/commands`
 * internals so the plugin stays a thin peer of the core package.
 */

// Lightweight type stubs — the plugin consumes raw shapes rather than import
// tightly from core internals, keeping the package self-contained.
interface ASTNode {
  type: string;
  name?: string;
  value?: unknown;
  [k: string]: unknown;
}
interface ExpressionEvaluator {
  evaluate(node: ASTNode, context: unknown): Promise<unknown>;
}
interface ExecutionContext {
  result?: unknown;
  it?: unknown;
  [k: string]: unknown;
}

interface RawCommandInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

// ---------------------------------------------------------------------------
// speak
// ---------------------------------------------------------------------------

export interface SpeakCommandInput {
  text: string;
  rate?: number;
  pitch?: number;
  voice?: string;
  volume?: number;
}

/**
 * Consume a leading `with` identifier followed by option pairs like
 * `rate 1.5`, `pitch 0.8`, `voice "Google UK English Female"`. Accepts
 * multiple `with <key> <value>` pairs.
 */
async function parseSpeakOptions(
  args: ASTNode[],
  startIndex: number,
  evaluator: ExpressionEvaluator,
  context: unknown
): Promise<Omit<SpeakCommandInput, 'text'>> {
  const out: Omit<SpeakCommandInput, 'text'> = {};
  let i = startIndex;
  while (i < args.length) {
    const tok = args[i];
    if (tok?.type === 'identifier' && (tok.name as string)?.toLowerCase() === 'with') {
      i++;
      continue;
    }
    if (tok?.type === 'identifier' && i + 1 < args.length) {
      const key = (tok.name as string).toLowerCase();
      const value = await evaluator.evaluate(args[i + 1], context);
      if (key === 'rate' && typeof value === 'number') out.rate = value;
      else if (key === 'pitch' && typeof value === 'number') out.pitch = value;
      else if (key === 'volume' && typeof value === 'number') out.volume = value;
      else if (key === 'voice' && typeof value === 'string') out.voice = value;
      i += 2;
      continue;
    }
    i++;
  }
  return out;
}

export const speakCommand = {
  name: 'speak',
  async parseInput(
    raw: RawCommandInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SpeakCommandInput> {
    if (!raw.args?.length) {
      throw new Error('speak command requires a text argument');
    }
    const text = await evaluator.evaluate(raw.args[0], context);
    const opts = await parseSpeakOptions(raw.args, 1, evaluator, context);
    return { text: text == null ? '' : String(text), ...opts };
  },
  async execute(input: SpeakCommandInput, context: ExecutionContext): Promise<void> {
    const synth =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
        : undefined;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      // No Web Speech API available — no-op. Downstream consumers can detect
      // this by observing that `context.result` is still set (see below).
      context.result = false;
      return;
    }
    const utter = new SpeechSynthesisUtterance(input.text);
    if (input.rate != null) utter.rate = input.rate;
    if (input.pitch != null) utter.pitch = input.pitch;
    if (input.volume != null) utter.volume = input.volume;
    if (input.voice != null) {
      const voices = synth.getVoices?.() ?? [];
      const match = voices.find(v => v.name === input.voice);
      if (match) utter.voice = match;
    }
    synth.speak(utter);
    context.result = true;
  },
  validate(input: unknown): boolean {
    return !!input && typeof input === 'object' && typeof (input as any).text === 'string';
  },
};

// ---------------------------------------------------------------------------
// ask
// ---------------------------------------------------------------------------

export interface AskCommandInput {
  prompt?: string;
  defaultValue?: string;
}

export const askCommand = {
  name: 'ask',
  async parseInput(
    raw: RawCommandInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<AskCommandInput> {
    const out: AskCommandInput = {};
    if (raw.args?.length) {
      const promptValue = await evaluator.evaluate(raw.args[0], context);
      if (promptValue != null) out.prompt = String(promptValue);
    }
    // Optional `with default "X"` form
    for (let i = 1; i < (raw.args?.length ?? 0) - 1; i++) {
      const tok = raw.args[i];
      const next = raw.args[i + 1];
      if (tok?.type === 'identifier' && (tok.name as string)?.toLowerCase() === 'default' && next) {
        const defaultVal = await evaluator.evaluate(next, context);
        if (defaultVal != null) out.defaultValue = String(defaultVal);
      }
    }
    return out;
  },
  async execute(input: AskCommandInput, context: ExecutionContext): Promise<unknown> {
    const win =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { prompt?: (p?: string, d?: string) => string | null })
        : undefined;
    if (!win || typeof win.prompt !== 'function') {
      // No prompt available (e.g. Node headless) — no-op; leave result unset.
      return null;
    }
    const answer = win.prompt(input.prompt ?? '', input.defaultValue ?? '');
    context.result = answer;
    context.it = answer;
    return answer;
  },
  validate(input: unknown): boolean {
    return typeof input === 'object' && input !== null;
  },
};

// ---------------------------------------------------------------------------
// answer
// ---------------------------------------------------------------------------

export interface AnswerCommandInput {
  value: unknown;
}

export const answerCommand = {
  name: 'answer',
  async parseInput(
    raw: RawCommandInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<AnswerCommandInput> {
    if (!raw.args?.length) {
      throw new Error('answer command requires a value (e.g. `answer with "text"`)');
    }
    // Skip a leading `with` keyword if present: `answer with "text"`.
    let valueIndex = 0;
    const first = raw.args[0];
    if (first?.type === 'identifier' && (first.name as string)?.toLowerCase() === 'with') {
      valueIndex = 1;
    }
    if (valueIndex >= raw.args.length) {
      throw new Error('answer command requires a value after `with`');
    }
    const value = await evaluator.evaluate(raw.args[valueIndex], context);
    return { value };
  },
  async execute(input: AnswerCommandInput, context: ExecutionContext): Promise<unknown> {
    context.result = input.value;
    context.it = input.value;
    return input.value;
  },
  validate(input: unknown): boolean {
    return typeof input === 'object' && input !== null && 'value' in (input as object);
  },
};
