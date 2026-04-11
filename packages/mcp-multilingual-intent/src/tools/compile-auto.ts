import type { CrossDomainDispatcher } from '@lokascript/framework';

/**
 * compile_auto — auto-detect domain and compile natural-language input to
 * its target output in one call. Returns the detected domain, the compiled
 * code (if successful), and any errors from the compiler.
 *
 * This is the one-shot path for agents that don't care about intermediate
 * steps — they want the compiled artifact.
 */

export interface CompileAutoInput {
  text: string;
  language?: string;
}

export interface CompileAutoResult {
  domain: string | null;
  language: string;
  ok: boolean;
  code?: string;
  errors?: string[];
}

export async function compileAuto(
  dispatcher: CrossDomainDispatcher,
  input: CompileAutoInput
): Promise<CompileAutoResult> {
  const text = (input.text ?? '').trim();
  if (!text) {
    throw new Error('compile_auto: `text` is required');
  }
  const language = input.language ?? 'en';

  // dispatcher.compile detects + compiles in one step.
  const compiled = await dispatcher.compile(text, language);

  if (!compiled) {
    return {
      domain: null,
      language,
      ok: false,
      errors: [
        `No domain matched input "${text}" (language: ${language}). Try a more specific phrasing.`,
      ],
    };
  }

  return {
    domain: compiled.domain ?? null,
    language,
    ok: compiled.ok,
    code: compiled.code,
    errors: compiled.errors ? [...compiled.errors] : undefined,
  };
}
