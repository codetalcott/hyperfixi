/**
 * LLM Command Schemas
 *
 * Defines the semantic structure of LLM interaction commands using the
 * framework's defineCommand/defineRole helpers. Four commands covering
 * the core LLM use cases: ask, summarize, analyze, translate.
 *
 * All commands support 8 languages: EN (SVO), ES (SVO), ZH (SVO), FR (SVO),
 * JA (SOV), KO (SOV), TR (SOV), AR (VSO).
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// ASK — Ask an LLM a question with optional context and style
// EN: ask "question" [from context] [as style]
// ES: preguntar "question" [de context] [como style]
// JA: [context から] question 聞く [として style]
// AR: اسأل "question" [من context] [ك style]
// =============================================================================

export const askSchema = defineCommand({
  action: 'ask',
  description: 'Ask an LLM a question with optional context and response style',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The question or prompt to ask',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'source',
      description: 'Context or reference to include (DOM selector, URL, or text)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'dan',
        fr: 'de',
      },
    }),
    defineRole({
      role: 'manner',
      description: 'Response style (bullets, json, paragraph, brief)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'として',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
      },
    }),
  ],
});

// =============================================================================
// SUMMARIZE — Summarize content with optional length and format
// EN: summarize content [in length] [as format]
// ES: resumir content [en length] [como format]
// JA: content を [length で] 要約 [として format]
// AR: لخّص content [في length] [ك format]
// =============================================================================

export const summarizeSchema = defineCommand({
  action: 'summarize',
  description: 'Summarize content using an LLM',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Content to summarize (DOM selector, variable, or text)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'quantity',
      description: 'Target length (e.g., "3 sentences", "100 words", "2 paragraphs")',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'in',
        es: 'en',
        ja: 'で',
        ar: 'في',
        ko: '에서',
        zh: '用',
        tr: 'ile',
        fr: 'en',
      },
    }),
    defineRole({
      role: 'manner',
      description: 'Output format (bullets, paragraph, tldr, markdown)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'として',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
      },
    }),
  ],
});

// =============================================================================
// ANALYZE — Analyze content for a specific quality
// EN: analyze content as type
// ES: analizar content como type
// JA: content を type として 分析
// AR: حلّل content ك type
// =============================================================================

export const analyzeSchema = defineCommand({
  action: 'analyze',
  description: 'Analyze content for a specific quality (sentiment, entities, themes, etc.)',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Content to analyze',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'manner',
      description: 'Analysis type (sentiment, entities, themes, tone, keywords)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'として',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
      },
    }),
  ],
});

// =============================================================================
// TRANSLATE — Ask an LLM to translate content between languages
// EN: translate content from lang to lang
// ES: traducir content de lang a lang
// JA: content を lang から lang に 翻訳
// AR: ترجم content من lang إلى lang
// =============================================================================

export const translateSchema = defineCommand({
  action: 'translate',
  description: 'Ask an LLM to translate content between natural languages',
  category: 'llm',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Content to translate',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 3,
    }),
    defineRole({
      role: 'source',
      description: 'Source language (english, spanish, japanese, etc.)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'dan',
        fr: 'de',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target language (english, spanish, japanese, etc.)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 1,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '로',
        zh: '到',
        tr: 'e',
        fr: 'vers',
      },
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [askSchema, summarizeSchema, analyzeSchema, translateSchema];
