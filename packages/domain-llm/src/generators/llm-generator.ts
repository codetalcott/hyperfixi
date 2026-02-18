/**
 * LLM Code Generator
 *
 * Transforms semantic AST nodes into LLMPromptSpec JSON strings.
 * The output is designed to be compatible with MCP sampling/createMessage
 * parameters, enabling zero-API-key LLM invocation via the MCP server.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import type { LLMPromptSpec } from '../types.js';

// =============================================================================
// Per-Command Generators
// =============================================================================

function generateAsk(node: SemanticNode): LLMPromptSpec {
  const question = extractRoleValue(node, 'patient') || 'Please help me.';
  const context = extractRoleValue(node, 'source');
  const style = extractRoleValue(node, 'manner');

  const styleInstruction = style ? `Respond in ${style} format.` : 'Respond clearly and concisely.';

  const messages: LLMPromptSpec['messages'] = [{ role: 'system', content: styleInstruction }];

  if (context) {
    messages.push({ role: 'user', content: `Context:\n${context}` });
  }

  messages.push({ role: 'user', content: question });

  return {
    action: 'ask',
    messages,
    maxTokens: 1024,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: question, source: context, manner: style },
    },
  };
}

function generateSummarize(node: SemanticNode): LLMPromptSpec {
  const content = extractRoleValue(node, 'patient') || 'the content';
  const length = extractRoleValue(node, 'quantity');
  const format = extractRoleValue(node, 'manner');

  const lengthHint = length ? ` in ${length}` : '';
  const formatHint = format ? ` as ${format}` : '';
  const systemInstruction = `You are a summarization assistant. Provide concise${formatHint} summaries${lengthHint}.`;

  return {
    action: 'summarize',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Summarize the following:\n\n${content}` },
    ],
    maxTokens: 512,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: content, quantity: length, manner: format },
    },
  };
}

function generateAnalyze(node: SemanticNode): LLMPromptSpec {
  const content = extractRoleValue(node, 'patient') || 'the content';
  const analysisType = extractRoleValue(node, 'manner') || 'general quality';

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
    maxTokens: 800,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: content, manner: analysisType },
    },
  };
}

function generateTranslate(node: SemanticNode): LLMPromptSpec {
  const content = extractRoleValue(node, 'patient') || 'the content';
  const fromLang = extractRoleValue(node, 'source') || 'the source language';
  const toLang = extractRoleValue(node, 'destination') || 'English';

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
    maxTokens: 2048,
    metadata: {
      sourceLanguage: 'en',
      roles: { patient: content, source: fromLang, destination: toLang },
    },
  };
}

// =============================================================================
// Public Code Generator
// =============================================================================

/**
 * LLM code generator implementation.
 * Returns JSON-serialized LLMPromptSpec — ready for MCP sampling/createMessage.
 */
export const llmCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    let spec: LLMPromptSpec;

    switch (node.action) {
      case 'ask':
        spec = generateAsk(node);
        break;
      case 'summarize':
        spec = generateSummarize(node);
        break;
      case 'analyze':
        spec = generateAnalyze(node);
        break;
      case 'translate':
        spec = generateTranslate(node);
        break;
      default:
        throw new Error(`Unknown LLM command: ${node.action}`);
    }

    return JSON.stringify(spec, null, 2);
  },
};
