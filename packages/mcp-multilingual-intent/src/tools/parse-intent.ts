import type { CrossDomainDispatcher, DomainRegistry } from '@lokascript/framework';

/**
 * parse_multilingual_intent — parses natural-language input in any of 24
 * supported languages. If a `domain` hint is supplied, uses that domain's
 * DSL directly; otherwise auto-detects via the cross-domain dispatcher.
 *
 * Returns the semantic AST (action + roles) plus confidence and domain,
 * normalized to a JSON-serializable shape. Role maps are converted to plain
 * objects because the bridge will `JSON.stringify` the result.
 */

export interface ParseIntentInput {
  text: string;
  language?: string;
  domain?: string;
}

export interface ParseIntentResult {
  domain: string | null;
  language: string;
  confidence: number;
  action: string;
  roles: Record<string, unknown>;
  explicit: string;
}

export interface ParseIntentDeps {
  dispatcher: CrossDomainDispatcher;
  registry: DomainRegistry;
}

export async function parseIntent(
  deps: ParseIntentDeps,
  input: ParseIntentInput
): Promise<ParseIntentResult> {
  const text = (input.text ?? '').trim();
  if (!text) {
    throw new Error('parse_multilingual_intent: `text` is required');
  }
  const language = input.language ?? 'en';
  // Treat empty string as "no hint" — the bridge sends "" when the caller
  // omits the optional domain field, since Siren uses default values for
  // optional fields rather than a separate required flag.
  const domainHint = input.domain && input.domain.trim() !== '' ? input.domain.trim() : undefined;

  let domain: string | null = null;
  let node: { action: string; roles: ReadonlyMap<string, unknown> | Record<string, unknown> };
  let confidence: number;

  if (domainHint) {
    const dsl = await deps.registry.getDSLForDomain(domainHint);
    if (!dsl) {
      throw new Error(
        `parse_multilingual_intent: unknown domain "${domainHint}". Known domains: sql, bdd, jsx, todo, llm, flow, voice, behaviorspec`
      );
    }
    const result = dsl.parseWithConfidence(text, language);
    node = result.node as typeof node;
    confidence = result.confidence;
    domain = domainHint;
  } else {
    const detected = await deps.dispatcher.detect(text, language);
    if (!detected) {
      throw new Error(
        `parse_multilingual_intent: no domain matched input "${text}" (language: ${language}). Try a more specific phrasing or supply a domain hint.`
      );
    }
    node = detected.node as typeof node;
    confidence = detected.confidence;
    domain = detected.domain;
  }

  const roles = rolesToPlainObject(node.roles);
  const explicit = buildExplicitSyntax(String(node.action), roles);

  return {
    domain,
    language,
    confidence,
    action: String(node.action),
    roles,
    explicit,
  };
}

/**
 * Semantic roles come back as a ReadonlyMap in most domains. Convert to a
 * plain object so the Siren response serializes cleanly.
 */
function rolesToPlainObject(
  roles: ReadonlyMap<string, unknown> | Record<string, unknown>
): Record<string, unknown> {
  if (roles instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of roles) {
      out[k] = valueToPlain(v);
    }
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(roles)) {
    out[k] = valueToPlain(v);
  }
  return out;
}

function valueToPlain(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val instanceof Map) {
      out[k] = Object.fromEntries(val);
    } else {
      out[k] = val;
    }
  }
  return out;
}

/**
 * Build the bracketed explicit-syntax form `[action role1:val1 role2:val2]`.
 * Mirrors the existing `buildExplicitSyntax` helper in `cross-domain` so
 * the output is consistent with the rest of the ecosystem.
 */
function buildExplicitSyntax(action: string, roles: Record<string, unknown>): string {
  const parts: string[] = [action];
  for (const [role, val] of Object.entries(roles)) {
    parts.push(`${role}:${displayValue(val)}`);
  }
  return '[' + parts.join(' ') + ']';
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return '?';
  if (typeof v !== 'object') return String(v);
  const obj = v as Record<string, unknown>;
  if ('value' in obj && obj.value !== undefined) return String(obj.value);
  if ('raw' in obj && obj.raw !== undefined) return String(obj.raw);
  if ('parts' in obj && Array.isArray(obj.parts)) return (obj.parts as unknown[]).join('.');
  return JSON.stringify(obj);
}
