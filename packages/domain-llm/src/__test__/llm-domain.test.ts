/**
 * LLM Domain Tests
 *
 * Validates the multilingual LLM DSL across 4 languages (EN, ES, JA, AR)
 * covering SVO, SOV, and VSO word orders.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createLLMDSL, renderLLM, llmCodeGenerator } from '../index.js';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import type { LLMPromptSpec } from '../types.js';

function parseSpec(code: string): LLMPromptSpec {
  return JSON.parse(code) as LLMPromptSpec;
}

describe('LLM Domain', () => {
  let llm: MultilingualDSL;

  beforeAll(() => {
    llm = createLLMDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 4 languages', () => {
      const languages = llm.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toHaveLength(4);
    });

    it('should reject unsupported language', () => {
      expect(() => llm.parse('ask "hello" ', 'de')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO) — ask
  // ===========================================================================

  describe('English — ask', () => {
    it('should parse simple ask', () => {
      const node = llm.parse('ask "What is this?"', 'en');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should extract patient role value', () => {
      const node = llm.parse('ask "What is this?"', 'en');
      expect(extractRoleValue(node, 'patient')).toContain('What is this');
    });

    it('should parse ask with context (from)', () => {
      const node = llm.parse('ask "What is this?" from #article', 'en');
      expect(node.action).toBe('ask');
      expect(node.roles.has('source')).toBe(true);
      expect(extractRoleValue(node, 'source')).toBe('#article');
    });

    it('should parse ask with style (as)', () => {
      const node = llm.parse('ask "What is this?" as bullets', 'en');
      expect(node.roles.has('manner')).toBe(true);
      expect(extractRoleValue(node, 'manner')).toBe('bullets');
    });

    it('should compile ask to LLMPromptSpec', () => {
      const result = llm.compile('ask "What is this?"', 'en');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('ask');
      expect(spec.messages).toBeDefined();
      expect(spec.messages.length).toBeGreaterThan(0);
      const userMsg = spec.messages.find(m => m.role === 'user');
      expect(userMsg).toBeDefined();
    });

    it('should include context in messages when from is provided', () => {
      const result = llm.compile('ask "What is this?" from #article as bullets', 'en');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      const messages = spec.messages.map(m => m.content).join(' ');
      expect(messages).toContain('#article');
    });

    it('should include style in system message when as is provided', () => {
      const result = llm.compile('ask "Explain this" as json', 'en');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      const systemMsg = spec.messages.find(m => m.role === 'system');
      expect(systemMsg?.content).toContain('json');
    });
  });

  // ===========================================================================
  // English (SVO) — summarize
  // ===========================================================================

  describe('English — summarize', () => {
    it('should parse simple summarize', () => {
      const node = llm.parse('summarize #document', 'en');
      expect(node.action).toBe('summarize');
      expect(extractRoleValue(node, 'patient')).toBe('#document');
    });

    it('should parse summarize with length (in)', () => {
      const node = llm.parse('summarize #document in 3', 'en');
      expect(node.roles.has('quantity')).toBe(true);
      expect(extractRoleValue(node, 'quantity')).toBe('3');
    });

    it('should parse summarize with format (as)', () => {
      const node = llm.parse('summarize #document as bullets', 'en');
      expect(node.roles.has('manner')).toBe(true);
      expect(extractRoleValue(node, 'manner')).toBe('bullets');
    });

    it('should compile summarize to LLMPromptSpec', () => {
      const result = llm.compile('summarize #document in 3 as bullets', 'en');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
      const systemMsg = spec.messages.find(m => m.role === 'system');
      expect(systemMsg?.content).toContain('3');
      expect(systemMsg?.content).toContain('bullets');
    });
  });

  // ===========================================================================
  // English (SVO) — analyze
  // ===========================================================================

  describe('English — analyze', () => {
    it('should parse analyze with type', () => {
      const node = llm.parse('analyze #text as sentiment', 'en');
      expect(node.action).toBe('analyze');
      expect(extractRoleValue(node, 'patient')).toBe('#text');
      expect(extractRoleValue(node, 'manner')).toBe('sentiment');
    });

    it('should compile analyze to LLMPromptSpec', () => {
      const result = llm.compile('analyze #text as sentiment', 'en');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('analyze');
      const systemMsg = spec.messages.find(m => m.role === 'system');
      expect(systemMsg?.content).toContain('sentiment');
    });
  });

  // ===========================================================================
  // English (SVO) — translate
  // ===========================================================================

  describe('English — translate', () => {
    it('should parse translate with from/to', () => {
      const node = llm.parse('translate #paragraph from english to japanese', 'en');
      expect(node.action).toBe('translate');
      expect(extractRoleValue(node, 'patient')).toBe('#paragraph');
      expect(extractRoleValue(node, 'source')).toBe('english');
      expect(extractRoleValue(node, 'destination')).toBe('japanese');
    });

    it('should compile translate to LLMPromptSpec', () => {
      const result = llm.compile('translate #paragraph from english to japanese', 'en');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('translate');
      const messages = spec.messages.map(m => m.content).join(' ');
      expect(messages).toContain('english');
      expect(messages).toContain('japanese');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse Spanish ask', () => {
      const node = llm.parse('preguntar "¿Qué es esto?"', 'es');
      expect(node.action).toBe('ask');
    });

    it('should compile Spanish summarize', () => {
      const result = llm.compile('resumir #documento como viñetas', 'es');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse Spanish analyze', () => {
      const node = llm.parse('analizar #texto como sentimiento', 'es');
      expect(node.action).toBe('analyze');
    });

    it('should parse Spanish translate', () => {
      const node = llm.parse('traducir #texto de inglés a japonés', 'es');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse Japanese ask (SOV: verb last)', () => {
      const node = llm.parse('"これは何？" 聞く', 'ja');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should parse Japanese ask with context', () => {
      const node = llm.parse('#article から "これは何？" 聞く', 'ja');
      expect(node.action).toBe('ask');
      expect(node.roles.has('source')).toBe(true);
    });

    it('should compile Japanese summarize', () => {
      const result = llm.compile('#document 要約', 'ja');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse Japanese translate', () => {
      // SOV with postpositions: patient source-value から dest-value に 翻訳
      const node = llm.parse('#text english から japanese に 翻訳', 'ja');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse Arabic ask (VSO: verb first)', () => {
      const node = llm.parse('اسأل "ما هذا؟"', 'ar');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should compile Arabic summarize', () => {
      const result = llm.compile('لخّص #document', 'ar');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse Arabic analyze', () => {
      const node = llm.parse('حلّل #text ك sentiment', 'ar');
      expect(node.action).toBe('analyze');
    });

    it('should parse Arabic translate', () => {
      const node = llm.parse('ترجم #text من english إلى japanese', 'ar');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // Cross-Language Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should parse ask across all 4 languages to same action', () => {
      const nodes = [
        llm.parse('ask "What is this?"', 'en'),
        llm.parse('preguntar "¿Qué es esto?"', 'es'),
        llm.parse('"これは何？" 聞く', 'ja'),
        llm.parse('اسأل "ما هذا؟"', 'ar'),
      ];
      for (const node of nodes) {
        expect(node.action).toBe('ask');
        expect(node.roles.has('patient')).toBe(true);
      }
    });

    it('should produce equivalent LLMPromptSpec action from EN and ES summarize', () => {
      const en = llm.compile('summarize #document', 'en');
      const es = llm.compile('resumir #document', 'es');
      expect(en.ok).toBe(true);
      expect(es.ok).toBe(true);
      expect(parseSpec(en.code!).action).toBe(parseSpec(es.code!).action);
    });
  });

  // ===========================================================================
  // LLMPromptSpec Structure
  // ===========================================================================

  describe('LLMPromptSpec Structure', () => {
    it('should include required fields in ask spec', () => {
      const result = llm.compile('ask "Explain this"', 'en');
      const spec = parseSpec(result.code!);
      expect(spec.action).toBeDefined();
      expect(spec.messages).toBeDefined();
      expect(Array.isArray(spec.messages)).toBe(true);
      expect(spec.maxTokens).toBeDefined();
      expect(spec.metadata).toBeDefined();
      expect(spec.metadata.roles).toBeDefined();
    });

    it('should always include a user message', () => {
      for (const [input, lang] of [
        ['ask "test"', 'en'],
        ['summarize #doc', 'en'],
        ['analyze #text as tone', 'en'],
        ['translate #text from english to japanese', 'en'],
      ] as [string, string][]) {
        const result = llm.compile(input, lang);
        expect(result.ok).toBe(true);
        const spec = parseSpec(result.code!);
        const userMsg = spec.messages.find(m => m.role === 'user');
        expect(userMsg).toBeDefined();
      }
    });

    it('should set reasonable maxTokens per command', () => {
      const ask = parseSpec(llm.compile('ask "test"', 'en').code!);
      const summarize = parseSpec(llm.compile('summarize #doc', 'en').code!);
      const translate = parseSpec(
        llm.compile('translate #text from english to japanese', 'en').code!
      );

      expect(ask.maxTokens).toBeDefined();
      expect(summarize.maxTokens).toBeDefined();
      // translate needs more tokens than summarize
      expect(translate.maxTokens!).toBeGreaterThanOrEqual(summarize.maxTokens!);
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should validate correct ask command', () => {
      const result = llm.validate('ask "What is this?"', 'en');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid input', () => {
      const result = llm.validate('invalid random text', 'en');
      expect(result.valid).toBe(false);
    });

    it('should validate across all supported languages', () => {
      for (const lang of ['en', 'es', 'ja', 'ar']) {
        const result = llm.validate('xyzzy random foobar', lang);
        expect(result.valid).toBe(false);
      }
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      expect(() => llm.parse('', 'en')).toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => llm.parse('   ', 'en')).toThrow();
    });
  });
});

// =============================================================================
// Natural Language Renderer
// =============================================================================

describe('LLM Renderer', () => {
  let llm: MultilingualDSL;

  beforeAll(() => {
    llm = createLLMDSL();
  });

  it('should render ask to English', () => {
    const node = llm.parse('ask "What is this?" from #article', 'en');
    const rendered = renderLLM(node, 'en');
    expect(rendered).toContain('ask');
    expect(rendered).toContain('from');
    expect(rendered).toContain('#article');
  });

  it('should render ask to Spanish', () => {
    const node = llm.parse('ask "What is this?" from #article', 'en');
    const rendered = renderLLM(node, 'es');
    expect(rendered).toContain('preguntar');
    expect(rendered).toContain('de');
  });

  it('should render ask to Japanese (SOV — verb last)', () => {
    const node = llm.parse('ask "What is this?" from #article', 'en');
    const rendered = renderLLM(node, 'ja');
    expect(rendered).toContain('聞く');
    expect(rendered).toContain('から');
    // SOV: verb should come last
    const verbIdx = rendered.indexOf('聞く');
    const markerIdx = rendered.indexOf('から');
    expect(markerIdx).toBeLessThan(verbIdx);
  });

  it('should render ask to Arabic', () => {
    const node = llm.parse('ask "What is this?" from #article', 'en');
    const rendered = renderLLM(node, 'ar');
    expect(rendered).toContain('اسأل');
    expect(rendered).toContain('من');
  });

  it('should render summarize across languages', () => {
    const node = llm.parse('summarize #document in 3 as bullets', 'en');
    expect(renderLLM(node, 'en')).toContain('summarize');
    expect(renderLLM(node, 'es')).toContain('resumir');
    expect(renderLLM(node, 'ja')).toContain('要約');
    expect(renderLLM(node, 'ar')).toContain('لخّص');
  });

  it('should render analyze across languages', () => {
    const node = llm.parse('analyze #text as sentiment', 'en');
    expect(renderLLM(node, 'en')).toContain('analyze');
    expect(renderLLM(node, 'es')).toContain('analizar');
    expect(renderLLM(node, 'ja')).toContain('分析');
    expect(renderLLM(node, 'ar')).toContain('حلّل');
  });

  it('should render translate across languages', () => {
    const node = llm.parse('translate #text from english to japanese', 'en');
    expect(renderLLM(node, 'en')).toContain('translate');
    expect(renderLLM(node, 'es')).toContain('traducir');
    expect(renderLLM(node, 'ja')).toContain('翻訳');
    expect(renderLLM(node, 'ar')).toContain('ترجم');
  });
});

// =============================================================================
// Code Generator Direct Tests
// =============================================================================

describe('LLM Code Generator', () => {
  it('should throw for unknown action', () => {
    const fakeNode: any = { action: 'unknown', roles: new Map() };
    expect(() => llmCodeGenerator.generate(fakeNode)).toThrow('Unknown LLM command: unknown');
  });

  it('should use defaults for missing roles in ask', () => {
    const node: any = { action: 'ask', roles: new Map() };
    const code = llmCodeGenerator.generate(node);
    const spec = JSON.parse(code);
    expect(spec.action).toBe('ask');
    expect(spec.messages.length).toBeGreaterThan(0);
  });

  it('should use defaults for missing roles in summarize', () => {
    const node: any = { action: 'summarize', roles: new Map() };
    const code = llmCodeGenerator.generate(node);
    const spec = JSON.parse(code);
    expect(spec.action).toBe('summarize');
  });

  it('should use defaults for missing roles in analyze', () => {
    const node: any = { action: 'analyze', roles: new Map() };
    const code = llmCodeGenerator.generate(node);
    const spec = JSON.parse(code);
    expect(spec.action).toBe('analyze');
  });

  it('should use defaults for missing roles in translate', () => {
    const node: any = { action: 'translate', roles: new Map() };
    const code = llmCodeGenerator.generate(node);
    const spec = JSON.parse(code);
    expect(spec.action).toBe('translate');
  });
});
