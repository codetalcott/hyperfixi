/**
 * MCP Sampling Tools — LLM Interaction via sampling/createMessage
 *
 * These tools use MCP sampling to invoke Claude (or another LLM) through
 * the client's model selection without requiring API keys in the server.
 * The client handles user approval before executing the sampling request.
 *
 * Layer 3 of the domain-llm architecture:
 *   domain-llm.compile() → LLMPromptSpec → server.createMessage() → response
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

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
];

// =============================================================================
// Tool Handler
// =============================================================================

export async function handleSamplingTool(
  name: string,
  args: Record<string, unknown>,
  server: Server
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const messages = buildMessages(name, args);
    const maxTokens =
      typeof args.maxTokens === 'number' ? args.maxTokens : getDefaultMaxTokens(name);

    const response = await server.createMessage({ messages, maxTokens });

    const text =
      response.content.type === 'text'
        ? response.content.text
        : `Received non-text response of type: ${response.content.type}`;

    return { content: [{ type: 'text', text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Sampling error: ${message}` }],
      isError: true,
    };
  }
}

// =============================================================================
// Message Builders
// =============================================================================

function buildMessages(
  name: string,
  args: Record<string, unknown>
): Array<{ role: 'user'; content: { type: 'text'; text: string } }> {
  switch (name) {
    case 'ask_claude':
      return [{ role: 'user', content: { type: 'text', text: buildAskMessage(args) } }];
    case 'summarize_content':
      return [{ role: 'user', content: { type: 'text', text: buildSummarizeMessage(args) } }];
    case 'analyze_content':
      return [{ role: 'user', content: { type: 'text', text: buildAnalyzeMessage(args) } }];
    case 'translate_content':
      return [{ role: 'user', content: { type: 'text', text: buildTranslateMessage(args) } }];
    default:
      throw new Error(`Unknown sampling tool: ${name}`);
  }
}

function buildAskMessage(args: Record<string, unknown>): string {
  const question = String(args.question || '');
  const context = args.context ? String(args.context) : null;
  const style = args.style ? String(args.style) : null;

  let text = question;
  if (context) text = `Context: ${context}\n\n${text}`;
  if (style) text += `\n\nPlease respond as: ${style}`;
  return text;
}

function buildSummarizeMessage(args: Record<string, unknown>): string {
  const content = String(args.content || '');
  const length = args.length ? String(args.length) : null;
  const format = args.format ? String(args.format) : null;

  let text = `Please summarize the following content`;
  if (length) text += ` in ${length}`;
  if (format) text += ` as ${format}`;
  text += `:\n\n${content}`;
  return text;
}

function buildAnalyzeMessage(args: Record<string, unknown>): string {
  const content = String(args.content || '');
  const analysisType = String(args.analysis_type || 'general insights');
  return `Please analyze the following content for ${analysisType}:\n\n${content}`;
}

function buildTranslateMessage(args: Record<string, unknown>): string {
  const content = String(args.content || '');
  const from = String(args.from_language || 'the source language');
  const to = String(args.to_language || 'the target language');
  return `Please translate the following from ${from} to ${to}:\n\n${content}`;
}

function getDefaultMaxTokens(toolName: string): number {
  switch (toolName) {
    case 'ask_claude':
    case 'translate_content':
      return 1024;
    default:
      return 512;
  }
}
