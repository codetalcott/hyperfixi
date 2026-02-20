/**
 * LLM Domain Tests
 *
 * Validates the multilingual LLM DSL across 8 languages
 * covering SVO (EN, ES, ZH, FR), SOV (JA, KO, TR), and VSO (AR) word orders.
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
    it('should support 8 languages', () => {
      const languages = llm.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('tr');
      expect(languages).toContain('fr');
      expect(languages).toHaveLength(8);
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
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse Korean ask (SOV: verb last)', () => {
      const node = llm.parse('"이것은 무엇?" 질문', 'ko');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should compile Korean summarize', () => {
      const result = llm.compile('#document 요약', 'ko');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse Korean analyze', () => {
      const node = llm.parse('#text 로 sentiment 분석', 'ko');
      expect(node.action).toBe('analyze');
    });

    it('should parse Korean translate', () => {
      const node = llm.parse('#text english 에서 japanese 로 번역', 'ko');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse Chinese ask', () => {
      const node = llm.parse('提问 "这是什么？"', 'zh');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should compile Chinese summarize', () => {
      const result = llm.compile('总结 #document', 'zh');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse Chinese analyze', () => {
      const node = llm.parse('分析 #text 以 sentiment', 'zh');
      expect(node.action).toBe('analyze');
    });

    it('should parse Chinese translate', () => {
      const node = llm.parse('翻译 #text 从 english 到 japanese', 'zh');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse Turkish ask (SOV: verb last)', () => {
      const node = llm.parse('"Bu nedir?" sor', 'tr');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should compile Turkish summarize', () => {
      const result = llm.compile('#document özetle', 'tr');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse Turkish analyze', () => {
      const node = llm.parse('#text olarak sentiment çözümle', 'tr');
      expect(node.action).toBe('analyze');
    });

    it('should parse Turkish translate', () => {
      const node = llm.parse('#text english dan japanese e çevir', 'tr');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse French ask', () => {
      const node = llm.parse('demander "Qu\'est-ce que c\'est?"', 'fr');
      expect(node.action).toBe('ask');
      expect(node.roles.has('patient')).toBe(true);
    });

    it('should compile French summarize', () => {
      const result = llm.compile('résumer #document', 'fr');
      expect(result.ok).toBe(true);
      const spec = parseSpec(result.code!);
      expect(spec.action).toBe('summarize');
    });

    it('should parse French analyze', () => {
      const node = llm.parse('analyser #text comme sentiment', 'fr');
      expect(node.action).toBe('analyze');
    });

    it('should parse French translate', () => {
      const node = llm.parse('traduire #text de english vers japanese', 'fr');
      expect(node.action).toBe('translate');
    });
  });

  // ===========================================================================
  // Cross-Language Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should parse ask across all 8 languages to same action', () => {
      const nodes = [
        llm.parse('ask "What is this?"', 'en'),
        llm.parse('preguntar "¿Qué es esto?"', 'es'),
        llm.parse('"これは何？" 聞く', 'ja'),
        llm.parse('اسأل "ما هذا؟"', 'ar'),
        llm.parse('"이것은 무엇?" 질문', 'ko'),
        llm.parse('提问 "这是什么？"', 'zh'),
        llm.parse('"Bu nedir?" sor', 'tr'),
        llm.parse('demander "Qu\'est-ce que c\'est?"', 'fr'),
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

    it('should produce equivalent summarize action across all 8 languages', () => {
      const results = [
        llm.compile('summarize #document', 'en'),
        llm.compile('resumir #document', 'es'),
        llm.compile('#document 要約', 'ja'),
        llm.compile('لخّص #document', 'ar'),
        llm.compile('#document 요약', 'ko'),
        llm.compile('总结 #document', 'zh'),
        llm.compile('#document özetle', 'tr'),
        llm.compile('résumer #document', 'fr'),
      ];
      for (const result of results) {
        expect(result.ok).toBe(true);
        expect(parseSpec(result.code!).action).toBe('summarize');
      }
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
      for (const lang of ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr']) {
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
    expect(renderLLM(node, 'ko')).toContain('요약');
    expect(renderLLM(node, 'zh')).toContain('总结');
    expect(renderLLM(node, 'tr')).toContain('özetle');
    expect(renderLLM(node, 'fr')).toContain('résumer');
  });

  it('should render analyze across languages', () => {
    const node = llm.parse('analyze #text as sentiment', 'en');
    expect(renderLLM(node, 'en')).toContain('analyze');
    expect(renderLLM(node, 'es')).toContain('analizar');
    expect(renderLLM(node, 'ja')).toContain('分析');
    expect(renderLLM(node, 'ar')).toContain('حلّل');
    expect(renderLLM(node, 'ko')).toContain('분석');
    expect(renderLLM(node, 'zh')).toContain('分析');
    expect(renderLLM(node, 'tr')).toContain('çözümle');
    expect(renderLLM(node, 'fr')).toContain('analyser');
  });

  it('should render translate across languages', () => {
    const node = llm.parse('translate #text from english to japanese', 'en');
    expect(renderLLM(node, 'en')).toContain('translate');
    expect(renderLLM(node, 'es')).toContain('traducir');
    expect(renderLLM(node, 'ja')).toContain('翻訳');
    expect(renderLLM(node, 'ar')).toContain('ترجم');
    expect(renderLLM(node, 'ko')).toContain('번역');
    expect(renderLLM(node, 'zh')).toContain('翻译');
    expect(renderLLM(node, 'tr')).toContain('çevir');
    expect(renderLLM(node, 'fr')).toContain('traduire');
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
