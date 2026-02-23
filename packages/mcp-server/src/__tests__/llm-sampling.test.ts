import { describe, it, expect } from 'vitest';
import {
  samplingTools,
  specToSamplingParams,
  argsToSpec,
  handleSamplingTool,
} from '../tools/llm-sampling.js';
import type { LLMPromptSpec } from '@lokascript/domain-llm';
import { createDomainRegistry } from '../tools/domain-registry-setup.js';

// =============================================================================
// specToSamplingParams
// =============================================================================

describe('specToSamplingParams', () => {
  it('extracts system messages into systemPrompt', () => {
    const spec: LLMPromptSpec = {
      action: 'ask',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ],
      maxTokens: 1024,
      metadata: { sourceLanguage: 'en', roles: {} },
    };

    const params = specToSamplingParams(spec);
    expect(params.systemPrompt).toBe('You are helpful.');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].role).toBe('user');
  });

  it('concatenates multiple system messages', () => {
    const spec: LLMPromptSpec = {
      action: 'ask',
      messages: [
        { role: 'system', content: 'Instruction 1.' },
        { role: 'system', content: 'Instruction 2.' },
        { role: 'user', content: 'Hello' },
      ],
      maxTokens: 512,
      metadata: { sourceLanguage: 'en', roles: {} },
    };

    const params = specToSamplingParams(spec);
    expect(params.systemPrompt).toBe('Instruction 1.\nInstruction 2.');
  });

  it('wraps content string in TextContent object', () => {
    const spec: LLMPromptSpec = {
      action: 'ask',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      maxTokens: 256,
      metadata: { sourceLanguage: 'en', roles: {} },
    };

    const params = specToSamplingParams(spec);
    expect(params.messages[0].content).toEqual({ type: 'text', text: 'What is 2+2?' });
  });

  it('omits systemPrompt when no system messages exist', () => {
    const spec: LLMPromptSpec = {
      action: 'ask',
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 512,
      metadata: { sourceLanguage: 'en', roles: {} },
    };

    const params = specToSamplingParams(spec);
    expect(params.systemPrompt).toBeUndefined();
  });

  it('passes maxTokens through (defaults to 1024)', () => {
    const withTokens: LLMPromptSpec = {
      action: 'summarize',
      messages: [{ role: 'user', content: 'x' }],
      maxTokens: 2048,
      metadata: { sourceLanguage: 'en', roles: {} },
    };
    expect(specToSamplingParams(withTokens).maxTokens).toBe(2048);

    const withoutTokens: LLMPromptSpec = {
      action: 'ask',
      messages: [{ role: 'user', content: 'x' }],
      metadata: { sourceLanguage: 'en', roles: {} },
    };
    expect(specToSamplingParams(withoutTokens).maxTokens).toBe(1024);
  });

  it('passes modelPreferences through when present', () => {
    const spec: LLMPromptSpec = {
      action: 'ask',
      messages: [{ role: 'user', content: 'x' }],
      maxTokens: 512,
      modelPreferences: {
        hints: [{ name: 'claude-opus-4-6' }],
        intelligencePriority: 0.8,
      },
      metadata: { sourceLanguage: 'en', roles: {} },
    };

    const params = specToSamplingParams(spec);
    expect(params.modelPreferences).toEqual({
      hints: [{ name: 'claude-opus-4-6' }],
      intelligencePriority: 0.8,
    });
  });

  it('omits modelPreferences when not present', () => {
    const spec: LLMPromptSpec = {
      action: 'ask',
      messages: [{ role: 'user', content: 'x' }],
      maxTokens: 512,
      metadata: { sourceLanguage: 'en', roles: {} },
    };

    const params = specToSamplingParams(spec);
    expect(params).not.toHaveProperty('modelPreferences');
  });
});

// =============================================================================
// argsToSpec — builds LLMPromptSpec from structured tool args
// =============================================================================

describe('argsToSpec', () => {
  describe('ask_claude', () => {
    it('builds spec with system + user messages', () => {
      const spec = argsToSpec('ask_claude', { question: 'What is AI?' });
      expect(spec.action).toBe('ask');
      expect(spec.messages).toHaveLength(2);
      expect(spec.messages[0].role).toBe('system');
      expect(spec.messages[0].content).toContain('concisely');
      expect(spec.messages[1]).toEqual({ role: 'user', content: 'What is AI?' });
    });

    it('includes context as separate user message', () => {
      const spec = argsToSpec('ask_claude', {
        question: 'Summarize this',
        context: 'Some long article text...',
      });
      expect(spec.messages).toHaveLength(3);
      expect(spec.messages[1].content).toContain('Some long article text...');
      expect(spec.messages[2].content).toBe('Summarize this');
    });

    it('includes style in system message', () => {
      const spec = argsToSpec('ask_claude', {
        question: 'List things',
        style: 'bullets',
      });
      expect(spec.messages[0].content).toContain('bullets');
    });

    it('uses provided maxTokens', () => {
      const spec = argsToSpec('ask_claude', { question: 'x', maxTokens: 2048 });
      expect(spec.maxTokens).toBe(2048);
    });

    it('defaults maxTokens to 1024', () => {
      const spec = argsToSpec('ask_claude', { question: 'x' });
      expect(spec.maxTokens).toBe(1024);
    });
  });

  describe('summarize_content', () => {
    it('builds spec with system instruction and user content', () => {
      const spec = argsToSpec('summarize_content', { content: 'Article text' });
      expect(spec.action).toBe('summarize');
      expect(spec.messages[0].role).toBe('system');
      expect(spec.messages[0].content).toContain('summarization');
      expect(spec.messages[1].content).toContain('Article text');
    });

    it('includes length and format hints in system message', () => {
      const spec = argsToSpec('summarize_content', {
        content: 'text',
        length: '3 sentences',
        format: 'bullets',
      });
      expect(spec.messages[0].content).toContain('3 sentences');
      expect(spec.messages[0].content).toContain('bullets');
    });

    it('defaults maxTokens to 512', () => {
      const spec = argsToSpec('summarize_content', { content: 'x' });
      expect(spec.maxTokens).toBe(512);
    });
  });

  describe('analyze_content', () => {
    it('builds spec with analysis type', () => {
      const spec = argsToSpec('analyze_content', {
        content: 'Some review',
        analysis_type: 'sentiment',
      });
      expect(spec.action).toBe('analyze');
      expect(spec.messages[0].content).toContain('sentiment');
      expect(spec.messages[1].content).toContain('Some review');
    });

    it('defaults maxTokens to 512', () => {
      const spec = argsToSpec('analyze_content', {
        content: 'x',
        analysis_type: 'tone',
      });
      expect(spec.maxTokens).toBe(512);
    });
  });

  describe('translate_content', () => {
    it('builds spec with from/to languages', () => {
      const spec = argsToSpec('translate_content', {
        content: 'Hello world',
        from_language: 'english',
        to_language: 'spanish',
      });
      expect(spec.action).toBe('translate');
      expect(spec.messages[0].content).toContain('english');
      expect(spec.messages[0].content).toContain('spanish');
      expect(spec.messages[1].content).toContain('Hello world');
    });

    it('defaults maxTokens to 2048', () => {
      const spec = argsToSpec('translate_content', {
        content: 'x',
        from_language: 'en',
        to_language: 'es',
      });
      expect(spec.maxTokens).toBe(2048);
    });
  });

  it('throws for unknown tool name', () => {
    expect(() => argsToSpec('unknown_tool', {})).toThrow('Unknown sampling tool');
  });
});

// =============================================================================
// Tool Definitions
// =============================================================================

describe('samplingTools definitions', () => {
  it('includes all 5 tools', () => {
    expect(samplingTools).toHaveLength(5);
    const names = samplingTools.map(t => t.name);
    expect(names).toContain('ask_claude');
    expect(names).toContain('summarize_content');
    expect(names).toContain('analyze_content');
    expect(names).toContain('translate_content');
    expect(names).toContain('execute_llm');
  });

  it('execute_llm has command and language params', () => {
    const tool = samplingTools.find(t => t.name === 'execute_llm')!;
    const props = tool.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('command');
    expect(props).toHaveProperty('language');
    expect(tool.inputSchema.required).toEqual(['command']);
  });
});

// =============================================================================
// execute_llm — full pipeline (compile → spec → sampling)
// =============================================================================

describe('execute_llm pipeline', () => {
  it('compiles English LLM command to valid LLMPromptSpec via registry', async () => {
    // Verify the compile step works (no actual sampling — that requires a Server mock)
    const registry = createDomainRegistry();
    const dsl = await registry.getDSLForDomain('llm');
    expect(dsl).not.toBeNull();

    const result = dsl!.compile('ask what is 2+2', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toBeDefined();

    const spec: LLMPromptSpec = JSON.parse(result.code!);
    expect(spec.action).toBe('ask');
    expect(spec.messages.length).toBeGreaterThanOrEqual(2);

    // Verify the spec converts to valid sampling params
    const params = specToSamplingParams(spec);
    expect(params.systemPrompt).toBeDefined();
    expect(params.messages.length).toBeGreaterThanOrEqual(1);
    expect(params.messages[0].content).toHaveProperty('type', 'text');
    expect(params.maxTokens).toBeGreaterThan(0);
  });

  it('compiles Japanese LLM command through full pipeline', async () => {
    const registry = createDomainRegistry();
    const dsl = await registry.getDSLForDomain('llm');

    // Japanese SOV: patient then verb — "#document 要約"
    const result = dsl!.compile('#document 要約', 'ja');
    expect(result.ok).toBe(true);

    const spec: LLMPromptSpec = JSON.parse(result.code!);
    expect(spec.action).toBe('summarize');

    const params = specToSamplingParams(spec);
    expect(params.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('compiles Spanish LLM command through full pipeline', async () => {
    const registry = createDomainRegistry();
    const dsl = await registry.getDSLForDomain('llm');

    const result = dsl!.compile('preguntar qué es la inteligencia artificial', 'es');
    expect(result.ok).toBe(true);

    const spec: LLMPromptSpec = JSON.parse(result.code!);
    expect(spec.action).toBe('ask');

    const params = specToSamplingParams(spec);
    expect(params.systemPrompt).toBeDefined();
    expect(params.messages[0].content.text).toBeTruthy();
  });

  it('returns error for empty command', async () => {
    // Mock a minimal server that should never be called
    const mockServer = {
      createMessage: () => {
        throw new Error('should not be called');
      },
    };
    const registry = createDomainRegistry();

    const result = await handleSamplingTool(
      'execute_llm',
      { command: '' },
      mockServer as any,
      registry
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('non-empty');
  });

  it('returns error when registry not provided', async () => {
    const mockServer = {
      createMessage: () => {
        throw new Error('should not be called');
      },
    };

    const result = await handleSamplingTool(
      'execute_llm',
      { command: 'ask something' },
      mockServer as any
      // no registry
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('registry');
  });
});

// =============================================================================
// End-to-end: argsToSpec → specToSamplingParams round-trip
// =============================================================================

describe('argsToSpec → specToSamplingParams round-trip', () => {
  it('ask_claude produces valid sampling params with system prompt', () => {
    const spec = argsToSpec('ask_claude', {
      question: 'What is 2+2?',
      style: 'brief',
    });
    const params = specToSamplingParams(spec);

    expect(params.systemPrompt).toContain('brief');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].content).toEqual({ type: 'text', text: 'What is 2+2?' });
    expect(params.maxTokens).toBe(1024);
  });

  it('summarize_content produces valid sampling params', () => {
    const spec = argsToSpec('summarize_content', {
      content: 'Long article...',
      format: 'tldr',
      length: '2 sentences',
    });
    const params = specToSamplingParams(spec);

    expect(params.systemPrompt).toContain('tldr');
    expect(params.systemPrompt).toContain('2 sentences');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].content.text).toContain('Long article...');
  });

  it('translate_content produces valid sampling params', () => {
    const spec = argsToSpec('translate_content', {
      content: 'Hello',
      from_language: 'english',
      to_language: 'japanese',
    });
    const params = specToSamplingParams(spec);

    expect(params.systemPrompt).toContain('english');
    expect(params.systemPrompt).toContain('japanese');
    expect(params.messages[0].content.text).toContain('Hello');
    expect(params.maxTokens).toBe(2048);
  });
});
