/**
 * MCP Sampling Tools — LLM Interaction via sampling/createMessage
 *
 * These tools use MCP sampling to invoke Claude (or another LLM) through
 * the client's model selection without requiring API keys in the server.
 * The client handles user approval before executing the sampling request.
 *
 * Architecture:
 *   Tool args → LLMPromptSpec → specToSamplingParams() → server.createMessage()
 *
 * The `execute_llm` tool completes the full pipeline:
 *   Natural language (8 languages) → domain-llm.compile() → LLMPromptSpec → sampling
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { DomainRegistry } from '@lokascript/framework';
import type { LLMPromptSpec, LLMMessage } from '@lokascript/domain-llm';

// =============================================================================
// Tool Definitions
// =============================================================================

export const samplingTools: Tool[] = [
  {
    name: 'ask_claude',
    description:
      'Ask Claude a question with optional context. Uses MCP sampling — the client handles model selection and user approval.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question or prompt to ask',
        },
        context: {
          type: 'string',
          description: 'Optional context text to include with the question',
        },
        style: {
          type: 'string',
          description: 'Response style: bullets, json, paragraph, brief',
          enum: ['bullets', 'json', 'paragraph', 'brief'],
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for the response (default: 1024)',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'summarize_content',
    description:
      'Summarize text content using Claude. Uses MCP sampling — the client handles model selection and user approval.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Text content to summarize',
        },
        length: {
          type: 'string',
          description: 'Target length: "3 sentences", "100 words", "2 paragraphs"',
        },
        format: {
          type: 'string',
          description: 'Output format: bullets, paragraph, tldr, markdown',
          enum: ['bullets', 'paragraph', 'tldr', 'markdown'],
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for the response (default: 512)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'analyze_content',
    description:
      'Analyze text content for sentiment, entities, themes, or other qualities using Claude. Uses MCP sampling.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Text content to analyze',
        },
        analysis_type: {
          type: 'string',
          description: 'Analysis type: sentiment, entities, themes, tone, keywords',
          enum: ['sentiment', 'entities', 'themes', 'tone', 'keywords'],
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for the response (default: 512)',
        },
      },
      required: ['content', 'analysis_type'],
    },
  },
  {
    name: 'translate_content',
    description:
      'Translate text between natural languages using Claude. Uses MCP sampling — the client handles model selection and user approval.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Text content to translate',
        },
        from_language: {
          type: 'string',
          description: 'Source language (english, spanish, japanese, etc.)',
        },
        to_language: {
          type: 'string',
          description: 'Target language (english, spanish, japanese, etc.)',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for the response (default: 1024)',
        },
      },
      required: ['content', 'from_language', 'to_language'],
    },
  },
  {
    name: 'execute_llm',
    description:
      'Execute an LLM command written in natural language (8 languages supported). Compiles via domain-llm then invokes Claude via MCP sampling. Examples: "ask what is 2+2", "summarize #article as bullets", "요약 이 문서를 글머리로" (Korean).',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            'LLM command in natural language (e.g., "ask what is the capital of France")',
        },
        language: {
          type: 'string',
          description:
            'Language code for the command (en, es, ja, ar, ko, zh, tr, fr). Default: en',
          default: 'en',
        },
      },
      required: ['command'],
    },
  },
];

// =============================================================================
// LLMPromptSpec ↔ MCP Sampling Bridge
// =============================================================================

/**
 * Convert an LLMPromptSpec to MCP sampling createMessage parameters.
 *
 * Handles three mismatches between domain-llm and MCP sampling:
 * 1. System messages → extracted to separate `systemPrompt` field
 * 2. Content format → `string` wrapped in `{ type: 'text', text }`
 * 3. Model preferences → passed through (structurally compatible)
 */
export function specToSamplingParams(spec: LLMPromptSpec) {
  const systemMessages = spec.messages.filter(m => m.role === 'system');
  const chatMessages = spec.messages.filter(m => m.role !== 'system');

  return {
    systemPrompt: systemMessages.length ? systemMessages.map(m => m.content).join('\n') : undefined,
    messages: chatMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: { type: 'text' as const, text: m.content },
    })),
    maxTokens: spec.maxTokens ?? 1024,
    ...(spec.modelPreferences && { modelPreferences: spec.modelPreferences }),
  };
}

// =============================================================================
// Tool Args → LLMPromptSpec Builders
// =============================================================================

/**
 * Build an LLMPromptSpec from structured tool arguments.
 * Mirrors the logic from domain-llm's generator but works from tool args
 * rather than SemanticNode, producing the same system+user message structure.
 */
export function argsToSpec(name: string, args: Record<string, unknown>): LLMPromptSpec {
  switch (name) {
    case 'ask_claude':
      return buildAskSpec(args);
    case 'summarize_content':
      return buildSummarizeSpec(args);
    case 'analyze_content':
      return buildAnalyzeSpec(args);
    case 'translate_content':
      return buildTranslateSpec(args);
    default:
      throw new Error(`Unknown sampling tool: ${name}`);
  }
}

function buildAskSpec(args: Record<string, unknown>): LLMPromptSpec {
  const question = String(args.question || '');
  const context = args.context ? String(args.context) : undefined;
  const style = args.style ? String(args.style) : undefined;

  const styleInstruction = style ? `Respond in ${style} format.` : 'Respond clearly and concisely.';

  const messages: LLMMessage[] = [{ role: 'system', content: styleInstruction }];
  if (context) {
    messages.push({ role: 'user', content: `Context:\n${context}` });
  }
  messages.push({ role: 'user', content: question });

  return {
    action: 'ask',
    messages,
    maxTokens: typeof args.maxTokens === 'number' ? args.maxTokens : 1024,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: question, source: context, manner: style },
    },
  };
}

function buildSummarizeSpec(args: Record<string, unknown>): LLMPromptSpec {
  const content = String(args.content || '');
  const length = args.length ? String(args.length) : undefined;
  const format = args.format ? String(args.format) : undefined;

  const lengthHint = length ? ` in ${length}` : '';
  const formatHint = format ? ` as ${format}` : '';

  return {
    action: 'summarize',
    messages: [
      {
        role: 'system',
        content: `You are a summarization assistant. Provide concise${formatHint} summaries${lengthHint}.`,
      },
      { role: 'user', content: `Summarize the following:\n\n${content}` },
    ],
    maxTokens: typeof args.maxTokens === 'number' ? args.maxTokens : 512,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: content, quantity: length, manner: format },
    },
  };
}

function buildAnalyzeSpec(args: Record<string, unknown>): LLMPromptSpec {
  const content = String(args.content || '');
  const analysisType = String(args.analysis_type || 'general quality');

  return {
    action: 'analyze',
    messages: [
      {
        role: 'system',
        content: `You are an analysis assistant. Analyze content for ${analysisType}. Be specific and structured in your response.`,
      },
      {
        role: 'user',
        content: `Analyze the following for ${analysisType}:\n\n${content}`,
      },
    ],
    maxTokens: typeof args.maxTokens === 'number' ? args.maxTokens : 512,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: content, manner: analysisType },
    },
  };
}

function buildTranslateSpec(args: Record<string, unknown>): LLMPromptSpec {
  const content = String(args.content || '');
  const fromLang = String(args.from_language || 'the source language');
  const toLang = String(args.to_language || 'English');

  return {
    action: 'translate',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Translate accurately from ${fromLang} to ${toLang}. Preserve tone and meaning. Return only the translation without explanation.`,
      },
      {
        role: 'user',
        content: `Translate from ${fromLang} to ${toLang}:\n\n${content}`,
      },
    ],
    maxTokens: typeof args.maxTokens === 'number' ? args.maxTokens : 2048,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: content, source: fromLang, destination: toLang },
    },
  };
}

// =============================================================================
// Tool Handlers
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

/**
 * Execute a sampling tool. For structured-arg tools (ask_claude, etc.),
 * builds an LLMPromptSpec from args then samples. For execute_llm,
 * compiles natural language via domain-llm first.
 */
export async function handleSamplingTool(
  name: string,
  args: Record<string, unknown>,
  server: Server,
  registry?: DomainRegistry
): Promise<ToolResponse> {
  try {
    if (name === 'execute_llm') {
      return await handleExecuteLLM(args, server, registry);
    }

    const spec = argsToSpec(name, args);
    return await executeSpec(spec, server);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Sampling error: ${message}` }],
      isError: true,
    };
  }
}

/**
 * Execute an LLMPromptSpec via MCP sampling.
 */
async function executeSpec(spec: LLMPromptSpec, server: Server): Promise<ToolResponse> {
  const params = specToSamplingParams(spec);
  const response = await server.createMessage(params);

  const text =
    response.content.type === 'text'
      ? response.content.text
      : `Received non-text response of type: ${response.content.type}`;

  return { content: [{ type: 'text', text }] };
}

/**
 * Handle execute_llm: compile natural language → LLMPromptSpec → sampling.
 */
async function handleExecuteLLM(
  args: Record<string, unknown>,
  server: Server,
  registry?: DomainRegistry
): Promise<ToolResponse> {
  if (!registry) {
    return {
      content: [{ type: 'text', text: 'execute_llm requires domain registry (internal error)' }],
      isError: true,
    };
  }

  const command = String(args.command || '');
  const language = String(args.language || 'en');

  if (!command.trim()) {
    return {
      content: [{ type: 'text', text: 'execute_llm requires a non-empty command' }],
      isError: true,
    };
  }

  // Step 1: Compile natural language → LLMPromptSpec
  const dsl = await registry.getDSLForDomain('llm');
  if (!dsl) {
    return {
      content: [{ type: 'text', text: 'LLM domain not registered' }],
      isError: true,
    };
  }

  const result = dsl.compile(command, language);
  if (!result.ok || !result.code) {
    const errors = result.errors?.join(', ') || 'Unknown compilation error';
    return {
      content: [{ type: 'text', text: `Compilation failed: ${errors}` }],
      isError: true,
    };
  }

  // Step 2: Parse the compiled JSON into an LLMPromptSpec
  let spec: LLMPromptSpec;
  try {
    spec = JSON.parse(result.code);
  } catch {
    return {
      content: [{ type: 'text', text: `Invalid LLMPromptSpec JSON: ${result.code}` }],
      isError: true,
    };
  }

  // Step 3: Execute via sampling
  return await executeSpec(spec, server);
}
