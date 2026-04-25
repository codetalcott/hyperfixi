/**
 * get_pattern_examples — RAG lookup over the patterns-reference database.
 * Returns up to N LLM few-shot examples relevant to a given prompt. Used
 * by LLM agents to prime their context with real working patterns before
 * generating hyperscript.
 *
 * The patterns-reference package exposes a promise-based API
 * (`createPatternsReference`). We keep a lazy singleton reference to avoid
 * re-opening SQLite on every tool call.
 */

export interface GetPatternExamplesInput {
  prompt: string;
  language?: string;
  limit?: number;
}

export interface PatternExample {
  id: number;
  patternId: string;
  language: string;
  prompt: string;
  completion: string;
  qualityScore: number;
}

export interface GetPatternExamplesResult {
  prompt: string;
  language: string;
  count: number;
  examples: PatternExample[];
  note?: string;
}

type PatternsReferenceModule = typeof import('@hyperfixi/patterns-reference');
type PatternsReferenceInstance = ReturnType<PatternsReferenceModule['createPatternsReference']>;

let cached: Promise<PatternsReferenceInstance | null> | null = null;

async function getReference(): Promise<PatternsReferenceInstance | null> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const mod = await import('@hyperfixi/patterns-reference');
      return mod.createPatternsReference({ readonly: true });
    } catch (err) {
      console.warn(
        '[get_pattern_examples] @hyperfixi/patterns-reference unavailable:',
        err instanceof Error ? err.message : String(err)
      );
      return null;
    }
  })();
  return cached;
}

export async function getPatternExamples(
  input: GetPatternExamplesInput
): Promise<GetPatternExamplesResult> {
  const prompt = (input.prompt ?? '').trim();
  if (!prompt) {
    throw new Error('get_pattern_examples: `prompt` is required');
  }
  const language = input.language ?? 'en';
  const limit = input.limit ?? 5;

  const ref = await getReference();
  if (!ref) {
    return {
      prompt,
      language,
      count: 0,
      examples: [],
      note: 'patterns-reference package is not installed or failed to load; returning empty result',
    };
  }

  const raw = await ref.getLLMExamples(prompt, language, limit);
  const examples: PatternExample[] = raw.map(r => ({
    id: r.id,
    patternId: r.patternId,
    language: r.language,
    prompt: r.prompt,
    completion: r.completion,
    qualityScore: r.qualityScore,
  }));

  return {
    prompt,
    language,
    count: examples.length,
    examples,
  };
}
