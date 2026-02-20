/**
 * FlowScript Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language FlowScript syntax
 * for a target language. Inverse of the parser — used by translate().
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  fetch: {
    en: 'fetch',
    es: 'obtener',
    ja: '取得',
    ar: 'جلب',
    ko: '가져오기',
    zh: '获取',
    tr: 'getir',
    fr: 'récupérer',
  },
  poll: {
    en: 'poll',
    es: 'sondear',
    ja: 'ポーリング',
    ar: 'استطلع',
    ko: '폴링',
    zh: '轮询',
    tr: 'yokla',
    fr: 'interroger',
  },
  stream: {
    en: 'stream',
    es: 'transmitir',
    ja: 'ストリーム',
    ar: 'بث',
    ko: '스트리밍',
    zh: '流式',
    tr: 'aktar',
    fr: 'diffuser',
  },
  submit: {
    en: 'submit',
    es: 'enviar',
    ja: '送信',
    ar: 'أرسل',
    ko: '제출',
    zh: '提交',
    tr: 'gönder',
    fr: 'soumettre',
  },
  transform: {
    en: 'transform',
    es: 'transformar',
    ja: '変換',
    ar: 'حوّل',
    ko: '변환',
    zh: '转换',
    tr: 'dönüştür',
    fr: 'transformer',
  },
};

const MARKERS: Record<string, Record<string, string>> = {
  as: { en: 'as', es: 'como', ja: 'で', ar: 'ك', ko: '로', zh: '以', tr: 'olarak', fr: 'comme' },
  into: { en: 'into', es: 'en', ja: 'に', ar: 'في', ko: '에', zh: '到', tr: 'e', fr: 'dans' },
  every: {
    en: 'every',
    es: 'cada',
    ja: 'ごとに',
    ar: 'كل',
    ko: '마다',
    zh: '每',
    tr: 'her',
    fr: 'chaque',
  },
  to: { en: 'to', es: 'a', ja: 'に', ar: 'إلى', ko: '로', zh: '到', tr: 'e', fr: 'vers' },
  with: { en: 'with', es: 'con', ja: 'で', ar: 'ب', ko: '로', zh: '用', tr: 'ile', fr: 'avec' },
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

function renderFetch(node: SemanticNode, lang: string): string {
  const source = extractRoleValue(node, 'source') || '/';
  const style = extractRoleValue(node, 'style');
  const dest = extractRoleValue(node, 'destination');
  const verb = kw('fetch', lang);
  const parts: string[] = [];

  if (isSOV(lang)) {
    parts.push(source);
    if (style) parts.push(style, mk('as', lang));
    parts.push(verb);
    if (dest) parts.push(dest, mk('into', lang));
  } else if (isVSO(lang)) {
    // VSO: verb first, then source, then modifiers
    parts.push(verb, source);
    if (style) parts.push(mk('as', lang), style);
    if (dest) parts.push(mk('into', lang), dest);
  } else {
    // SVO (default)
    parts.push(verb, source);
    if (style) parts.push(mk('as', lang), style);
    if (dest) parts.push(mk('into', lang), dest);
  }

  return parts.join(' ');
}

function renderPoll(node: SemanticNode, lang: string): string {
  const source = extractRoleValue(node, 'source') || '/';
  const duration = extractRoleValue(node, 'duration') || '5s';
  const style = extractRoleValue(node, 'style');
  const dest = extractRoleValue(node, 'destination');
  const verb = kw('poll', lang);
  const parts: string[] = [];

  if (isSOV(lang)) {
    parts.push(source);
    parts.push(duration, mk('every', lang));
    if (style) parts.push(style, mk('as', lang));
    parts.push(verb);
    if (dest) parts.push(dest, mk('into', lang));
  } else if (isVSO(lang)) {
    parts.push(verb, source);
    parts.push(mk('every', lang), duration);
    if (style) parts.push(mk('as', lang), style);
    if (dest) parts.push(mk('into', lang), dest);
  } else {
    parts.push(verb, source);
    parts.push(mk('every', lang), duration);
    if (style) parts.push(mk('as', lang), style);
    if (dest) parts.push(mk('into', lang), dest);
  }

  return parts.join(' ');
}

function renderStream(node: SemanticNode, lang: string): string {
  const source = extractRoleValue(node, 'source') || '/';
  const style = extractRoleValue(node, 'style');
  const dest = extractRoleValue(node, 'destination');
  const verb = kw('stream', lang);
  const parts: string[] = [];

  if (isSOV(lang)) {
    parts.push(source);
    if (style) parts.push(style, mk('as', lang));
    parts.push(verb);
    if (dest) parts.push(dest, mk('into', lang));
  } else if (isVSO(lang)) {
    parts.push(verb, source);
    if (style) parts.push(mk('as', lang), style);
    if (dest) parts.push(mk('into', lang), dest);
  } else {
    parts.push(verb, source);
    if (style) parts.push(mk('as', lang), style);
    if (dest) parts.push(mk('into', lang), dest);
  }

  return parts.join(' ');
}

function renderSubmit(node: SemanticNode, lang: string): string {
  const patient = extractRoleValue(node, 'patient') || '#form';
  const dest = extractRoleValue(node, 'destination') || '/';
  const style = extractRoleValue(node, 'style');
  const verb = kw('submit', lang);
  const parts: string[] = [];

  if (isSOV(lang)) {
    parts.push(patient);
    parts.push(dest, mk('to', lang));
    if (style) parts.push(style, mk('as', lang));
    parts.push(verb);
  } else if (isVSO(lang)) {
    // VSO: verb + patient + destination marker + destination + style
    parts.push(verb, patient);
    parts.push(mk('to', lang), dest);
    if (style) parts.push(mk('as', lang), style);
  } else {
    parts.push(verb, patient);
    parts.push(mk('to', lang), dest);
    if (style) parts.push(mk('as', lang), style);
  }

  return parts.join(' ');
}

function renderTransform(node: SemanticNode, lang: string): string {
  const patient = extractRoleValue(node, 'patient') || 'data';
  const instrument = extractRoleValue(node, 'instrument') || 'identity';
  const verb = kw('transform', lang);
  const parts: string[] = [];

  if (isSOV(lang)) {
    parts.push(patient);
    parts.push(instrument, mk('with', lang));
    parts.push(verb);
  } else if (isVSO(lang)) {
    parts.push(verb, patient);
    parts.push(mk('with', lang), instrument);
  } else {
    parts.push(verb, patient);
    parts.push(mk('with', lang), instrument);
  }

  return parts.join(' ');
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a FlowScript SemanticNode to natural-language text in the target language.
 */
export function renderFlow(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'fetch':
      return renderFetch(node, language);
    case 'poll':
      return renderPoll(node, language);
    case 'stream':
      return renderStream(node, language);
    case 'submit':
      return renderSubmit(node, language);
    case 'transform':
      return renderTransform(node, language);
    default:
      return `-- Unknown: ${node.action}`;
  }
}
