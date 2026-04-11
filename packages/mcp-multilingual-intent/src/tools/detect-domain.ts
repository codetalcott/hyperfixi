import type { CrossDomainDispatcher } from '@lokascript/framework';

/**
 * detect_domain — given natural-language input and a language, return the
 * domain it most likely belongs to (sql, bdd, jsx, todo, llm, flow, voice,
 * behaviorspec) along with confidence. Does not compile or emit anything —
 * pure classification.
 */

export interface DetectDomainInput {
  text: string;
  language?: string;
}

export interface DetectDomainResult {
  domain: string | null;
  language: string;
  confidence: number;
  action: string | null;
  matched: boolean;
}

export async function detectDomain(
  dispatcher: CrossDomainDispatcher,
  input: DetectDomainInput
): Promise<DetectDomainResult> {
  const text = (input.text ?? '').trim();
  if (!text) {
    throw new Error('detect_domain: `text` is required');
  }
  const language = input.language ?? 'en';

  const detected = await dispatcher.detect(text, language);

  if (!detected) {
    return {
      domain: null,
      language,
      confidence: 0,
      action: null,
      matched: false,
    };
  }

  return {
    domain: detected.domain,
    language,
    confidence: detected.confidence,
    action: String(detected.node.action),
    matched: true,
  };
}
