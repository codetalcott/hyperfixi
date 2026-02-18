/**
 * MCP Prompts — LLM Domain Prompt Templates
 *
 * Exposes the domain-llm commands as parameterized MCP Prompt resources.
 * Users can discover and invoke these via the prompts/list + prompts/get
 * protocol, making them available as slash-command-style prompts in Claude Code.
 */

import type { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Prompt Definitions
// =============================================================================

const LLM_PROMPTS: Prompt[] = [
  {
    name: 'llm_ask',
    description: 'Ask an LLM a question with optional context and response style',
    arguments: [
      { name: 'question', description: 'The question or prompt to ask', required: true },
      {
        name: 'context',
        description: 'DOM selector, URL, or text to use as context',
        required: false,
      },
      {
        name: 'style',
        description: 'Response style: bullets, json, paragraph, brief',
        required: false,
      },
      { name: 'model', description: 'Model hint: claude, gpt, etc.', required: false },
    ],
  },
  {
    name: 'llm_summarize',
    description: 'Summarize content using an LLM',
    arguments: [
      { name: 'content', description: 'Text or selector of content to summarize', required: true },
      {
        name: 'length',
        description: 'Target length: "3 sentences", "100 words", "2 paragraphs"',
        required: false,
      },
      {
        name: 'format',
        description: 'Output format: bullets, paragraph, tldr, markdown',
        required: false,
      },
    ],
  },
  {
    name: 'llm_analyze',
    description: 'Analyze content for a specific quality (sentiment, entities, themes, etc.)',
    arguments: [
      { name: 'content', description: 'Text or selector of content to analyze', required: true },
      {
        name: 'analysis_type',
        description: 'Analysis type: sentiment, entities, themes, tone, keywords',
        required: true,
      },
    ],
  },
  {
    name: 'llm_translate',
    description: 'Translate content between natural languages using an LLM',
    arguments: [
      { name: 'content', description: 'Text or selector of content to translate', required: true },
      {
        name: 'from_language',
        description: 'Source language (english, spanish, japanese, etc.)',
        required: true,
      },
      {
        name: 'to_language',
        description: 'Target language (english, spanish, japanese, etc.)',
        required: true,
      },
    ],
  },
];

// =============================================================================
// Prompt Handlers
// =============================================================================

export function getLLMPromptDefinitions(): Prompt[] {
  return LLM_PROMPTS;
}

export function renderLLMPrompt(name: string, args: Record<string, string>): GetPromptResult {
  switch (name) {
    case 'llm_ask':
      return renderAskPrompt(args);
    case 'llm_summarize':
      return renderSummarizePrompt(args);
    case 'llm_analyze':
      return renderAnalyzePrompt(args);
    case 'llm_translate':
      return renderTranslatePrompt(args);
    default:
      throw new Error(`Unknown LLM prompt: ${name}`);
  }
}

function renderAskPrompt(args: Record<string, string>): GetPromptResult {
  const { question, context, style, model } = args;
  let content = question || '(no question provided)';
  if (context) content = `Context: ${context}\n\n${content}`;
  if (style) content += `\n\nPlease respond as: ${style}`;
  const modelNote = model ? ` (using ${model})` : '';
  return {
    description: `Ask${modelNote}: ${question}`,
    messages: [{ role: 'user', content: { type: 'text', text: content } }],
  };
}

function renderSummarizePrompt(args: Record<string, string>): GetPromptResult {
  const { content, length, format } = args;
  let text = `Please summarize the following content`;
  if (length) text += ` in ${length}`;
  if (format) text += ` as ${format}`;
  text += `:\n\n${content || '(no content provided)'}`;
  return {
    description: `Summarize${length ? ` in ${length}` : ''}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

function renderAnalyzePrompt(args: Record<string, string>): GetPromptResult {
  const { content, analysis_type } = args;
  const text = `Please analyze the following content for ${analysis_type || 'general insights'}:\n\n${content || '(no content provided)'}`;
  return {
    description: `Analyze as ${analysis_type}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

function renderTranslatePrompt(args: Record<string, string>): GetPromptResult {
  const { content, from_language, to_language } = args;
  const text = `Please translate the following from ${from_language || 'the source language'} to ${to_language || 'the target language'}:\n\n${content || '(no content provided)'}`;
  return {
    description: `Translate from ${from_language} to ${to_language}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
