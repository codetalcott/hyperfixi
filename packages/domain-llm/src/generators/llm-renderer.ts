/**
 * LLM Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language LLM DSL syntax
 * for a target language. Inverse of the parser — used by translate().
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  ask: {
    en: 'ask',
    es: 'preguntar',
    ja: '聞く',
    ar: 'اسأل',
    ko: '질문',
    zh: '提问',
    tr: 'sor',
    fr: 'demander',
  },
  summarize: {
    en: 'summarize',
    es: 'resumir',
    ja: '要約',
    ar: 'لخّص',
    ko: '요약',
    zh: '总结',
    tr: 'özetle',
    fr: 'résumer',
  },
  analyze: {
    en: 'analyze',
    es: 'analizar',
    ja: '分析',
    ar: 'حلّل',
    ko: '분석',
    zh: '分析',
    tr: 'çözümle',
    fr: 'analyser',
  },
  translate: {
    en: 'translate',
    es: 'traducir',
    ja: '翻訳',
    ar: 'ترجم',
    ko: '번역',
    zh: '翻译',
    tr: 'çevir',
    fr: 'traduire',
  },
};

const MARKERS: Record<string, Record<string, string>> = {
  from: { en: 'from', es: 'de', ja: 'から', ar: 'من', ko: '에서', zh: '从', tr: 'dan', fr: 'de' },
  as: {
    en: 'as',
    es: 'como',
    ja: 'として',
    ar: 'ك',
    ko: '로',
    zh: '以',
    tr: 'olarak',
    fr: 'comme',
  },
  in: { en: 'in', es: 'en', ja: 'で', ar: 'في', ko: '에서', zh: '用', tr: 'ile', fr: 'en' },
  to: { en: 'to', es: 'a', ja: 'に', ar: 'إلى', ko: '로', zh: '到', tr: 'e', fr: 'vers' },
};

// =============================================================================
// Word Order Helpers
// =============================================================================

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);
const VSO_LANGUAGES = new Set(['ar']);

function isSOV(lang: string): boolean {
  return SOV_LANGUAGES.has(lang);
}

function isVSO(lang: string): boolean {
  return VSO_LANGUAGES.has(lang);
}

function kw(command: string, lang: string): string {
  return COMMAND_KEYWORDS[command]?.[lang] ?? command;
}

function mk(marker: string, lang: string): string {
  return MARKERS[marker]?.[lang] ?? marker;
}

// =============================================================================
// Per-Command Renderers
// =============================================================================

function renderAsk(node: SemanticNode, lang: string): string {
  const question = extractRoleValue(node, 'patient') || '...';
  const context = extractRoleValue(node, 'source');
  const style = extractRoleValue(node, 'manner');
  const verb = kw('ask', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    // SOV: [context から] question として [style] 聞く
    if (context) parts.push(context, mk('from', lang));
    parts.push(question);
    if (style) parts.push(mk('as', lang), style);
    parts.push(verb);
  } else if (isVSO(lang)) {
    // VSO: verb question [من context] [ك style]
    parts.push(verb, question);
    if (context) parts.push(mk('from', lang), context);
    if (style) parts.push(mk('as', lang), style);
  } else {
    // SVO: ask question [from context] [as style]
    parts.push(verb, question);
    if (context) parts.push(mk('from', lang), context);
    if (style) parts.push(mk('as', lang), style);
  }

  return parts.join(' ');
}

function renderSummarize(node: SemanticNode, lang: string): string {
  const content = extractRoleValue(node, 'patient') || '...';
  const length = extractRoleValue(node, 'quantity');
  const format = extractRoleValue(node, 'manner');
  const verb = kw('summarize', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    // SOV: content [で length] 要約 [として format]
    parts.push(content);
    if (length) parts.push(mk('in', lang), length);
    parts.push(verb);
    if (format) parts.push(mk('as', lang), format);
  } else {
    // SVO / VSO: verb content [in length] [as format]
    parts.push(verb, content);
    if (length) parts.push(mk('in', lang), length);
    if (format) parts.push(mk('as', lang), format);
  }

  return parts.join(' ');
}

function renderAnalyze(node: SemanticNode, lang: string): string {
  const content = extractRoleValue(node, 'patient') || '...';
  const analysisType = extractRoleValue(node, 'manner') || 'quality';
  const verb = kw('analyze', lang);

  if (isSOV(lang)) {
    // SOV: content として analysisType 分析
    return `${content} ${mk('as', lang)} ${analysisType} ${verb}`;
  }
  // SVO / VSO: verb content as type
  return `${verb} ${content} ${mk('as', lang)} ${analysisType}`;
}

function renderTranslate(node: SemanticNode, lang: string): string {
  const content = extractRoleValue(node, 'patient') || '...';
  const fromLang = extractRoleValue(node, 'source') || 'english';
  const toLang = extractRoleValue(node, 'destination') || 'spanish';
  const verb = kw('translate', lang);

  if (isSOV(lang)) {
    // SOV: content を fromLang から toLang に 翻訳
    return `${content} ${mk('from', lang)} ${fromLang} ${mk('to', lang)} ${toLang} ${verb}`;
  }
  // SVO / VSO: verb content from fromLang to toLang
  return `${verb} ${content} ${mk('from', lang)} ${fromLang} ${mk('to', lang)} ${toLang}`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render an LLM SemanticNode to natural-language LLM DSL text in the target language.
 */
export function renderLLM(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'ask':
      return renderAsk(node, language);
    case 'summarize':
      return renderSummarize(node, language);
    case 'analyze':
      return renderAnalyze(node, language);
    case 'translate':
      return renderTranslate(node, language);
    default:
      return `-- Unknown: ${node.action}`;
  }
}
