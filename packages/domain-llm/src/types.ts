/**
 * LLM Domain Types
 *
 * Output type for the LLM code generator. Designed to map directly to
 * MCP sampling/createMessage parameters, enabling the MCP server to
 * invoke an LLM without managing its own API keys.
 */

export type LLMAction = 'ask' | 'summarize' | 'analyze' | 'translate';

export interface LLMMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * MCP sampling-compatible model preferences.
 * Maps to the modelPreferences field in sampling/createMessage.
 */
export interface LLMModelPreferences {
  /** Hint which model to prefer (e.g., "claude-opus-4-6", "gpt-4o") */
  hints?: Array<{ name: string }>;
  /** 0–1: prefer intelligence over speed */
  intelligencePriority?: number;
  /** 0–1: prefer speed over intelligence */
  speedPriority?: number;
  /** 0–1: prefer lower cost */
  costPriority?: number;
}

/**
 * Structured LLM prompt specification.
 *
 * Output of domain-llm's code generator. Portable across providers:
 * - Use as-is with MCP sampling/createMessage
 * - Adapt for direct Anthropic/OpenAI API calls
 * - Expose as MCP Prompt resource
 */
export interface LLMPromptSpec {
  /** The command that produced this spec */
  action: LLMAction;

  /** Messages to send to the LLM (system prompt + user turn) */
  messages: LLMMessage[];

  /** Model selection preferences (optional, MCP sampling-compatible) */
  modelPreferences?: LLMModelPreferences;

  /** Suggested token budget */
  maxTokens?: number;

  /** Metadata for debugging and MCP tool integration */
  metadata: {
    /** Language the command was written in */
    sourceLanguage: string;
    /** Raw role values extracted from the parsed command */
    roles: Record<string, string | undefined>;
  };
}
