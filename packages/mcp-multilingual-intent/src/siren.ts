/**
 * Minimal Siren hypermedia format helpers.
 *
 * This server is stateless — each tool call is independent. We don't need
 * GRAIL's state machines, guards, or 409 blocking. We only need the Siren
 * envelope so `siren-mcp` can introspect the API and expose actions as MCP
 * tools.
 *
 * Pattern: every response carries the full action list so the bridge's tool
 * set stays stable across calls. Tool results ride in `properties.result`.
 */

export type SirenFieldType =
  | 'text'
  | 'number'
  | 'hidden'
  | 'email'
  | 'url'
  | 'search'
  | 'tel'
  | 'password';

export interface SirenField {
  name: string;
  type?: SirenFieldType;
  title?: string;
  value?: unknown;
  required?: boolean;
}

export interface SirenAction {
  name: string;
  title?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  href: string;
  type?: string;
  fields?: SirenField[];
}

export interface SirenLink {
  rel: string[];
  href: string;
  title?: string;
}

export interface SirenEntity {
  class: string[];
  properties?: Record<string, unknown>;
  links?: SirenLink[];
  actions?: SirenAction[];
  entities?: Array<Record<string, unknown>>;
}

/**
 * The canonical action list for the multilingual-intent server.
 * These are the tools `siren-mcp` will expose to LLM agents.
 */
export function buildActions(baseHref: string): SirenAction[] {
  return [
    {
      name: 'parse_multilingual_intent',
      title: 'Parse natural-language intent in any of 24 languages → semantic AST',
      method: 'POST',
      href: `${baseHref}/parse`,
      type: 'application/json',
      fields: [
        {
          name: 'text',
          type: 'text',
          title: 'The natural-language input to parse',
          required: true,
        },
        {
          name: 'language',
          type: 'text',
          title:
            'ISO 639-1 language code (en, ja, ar, es, ko, zh, fr, de, pt, id, tr, qu, sw, ...)',
          value: 'en',
        },
        {
          name: 'domain',
          type: 'text',
          title:
            'Optional domain hint (sql, bdd, jsx, todo, llm, flow, voice, behaviorspec). Pass empty string to auto-detect.',
          value: '',
        },
      ],
    },
    {
      name: 'detect_domain',
      title: 'Auto-detect which of 8 domains a natural-language input belongs to',
      method: 'POST',
      href: `${baseHref}/detect`,
      type: 'application/json',
      fields: [
        {
          name: 'text',
          type: 'text',
          title: 'The natural-language input to classify',
          required: true,
        },
        {
          name: 'language',
          type: 'text',
          title: 'ISO 639-1 language code',
          value: 'en',
        },
      ],
    },
    {
      name: 'compile_auto',
      title: 'Auto-detect domain and compile input to target output in one call',
      method: 'POST',
      href: `${baseHref}/compile`,
      type: 'application/json',
      fields: [
        {
          name: 'text',
          type: 'text',
          title: 'The natural-language input to compile',
          required: true,
        },
        {
          name: 'language',
          type: 'text',
          title: 'ISO 639-1 language code',
          value: 'en',
        },
      ],
    },
    {
      name: 'get_pattern_examples',
      title: 'RAG lookup — retrieve relevant pattern examples from the patterns database',
      method: 'POST',
      href: `${baseHref}/examples`,
      type: 'application/json',
      fields: [
        {
          name: 'prompt',
          type: 'text',
          title: 'The intent or task description to find examples for',
          required: true,
        },
        {
          name: 'language',
          type: 'text',
          title: 'ISO 639-1 language code',
          value: 'en',
        },
        {
          name: 'limit',
          type: 'number',
          title: 'Maximum number of examples to return',
          value: 5,
        },
      ],
    },
    {
      name: 'list_supported_languages',
      title: 'List all languages supported by the multilingual parser',
      method: 'GET',
      href: `${baseHref}/languages`,
    },
  ];
}

/**
 * Build the canonical entry-point entity.
 * Called both for GET /api (the initial entry point) and as the response
 * shape returned after a successful tool call (so the action list stays
 * stable and siren-mcp doesn't tear down and rebuild tools).
 */
export function buildEntryPoint(
  baseHref: string,
  overrides: {
    class?: string[];
    lastTool?: string;
    result?: unknown;
  } = {}
): SirenEntity {
  const classArr = overrides.class ?? ['entry-point', 'multilingual-intent'];
  const properties: Record<string, unknown> = {
    name: '@lokascript/mcp-multilingual-intent',
    version: '0.1.0',
    description:
      'Parse natural-language intent in 24 languages, emit LSE protocol JSON, retrieve pattern examples via RAG.',
    supportedDomains: ['sql', 'bdd', 'jsx', 'todo', 'llm', 'flow', 'voice', 'behaviorspec'],
    toolCount: 5,
  };

  if (overrides.lastTool !== undefined) {
    properties.lastTool = overrides.lastTool;
  }
  if (overrides.result !== undefined) {
    properties.result = overrides.result;
  }

  return {
    class: classArr,
    properties,
    links: [
      { rel: ['self'], href: baseHref },
      { rel: ['languages'], href: `${baseHref}/languages` },
      {
        rel: ['docs'],
        href: 'https://github.com/codetalcott/hyperfixi/tree/main/packages/mcp-multilingual-intent',
      },
    ],
    actions: buildActions(baseHref),
  };
}

/**
 * Build an error entity. Uses class=['error'] so the bridge surfaces it
 * as a failed tool call rather than a successful state transition.
 */
export function buildError(
  baseHref: string,
  message: string,
  details?: Record<string, unknown>
): SirenEntity {
  return {
    class: ['error', 'multilingual-intent'],
    properties: {
      error: message,
      ...(details ?? {}),
    },
    links: [{ rel: ['self'], href: baseHref }],
    actions: buildActions(baseHref),
  };
}
