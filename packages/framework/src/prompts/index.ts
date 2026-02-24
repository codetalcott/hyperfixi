/**
 * LLM Prompt Generation
 *
 * Auto-generates system prompts from CommandSchema[] for teaching LLMs
 * to output valid LokaScript Explicit Syntax.
 */

export type {
  PromptGeneratorConfig,
  GeneratedPrompt,
  PromptSection,
  PromptMetadata,
} from './types';

export { generatePrompt, generateExamples, generateProtocolReference } from './prompt-generator';
