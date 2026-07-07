/**
 * Todo Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language todo DSL syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  add: {
    en: 'add',
    es: 'agregar',
    ja: '追加',
    ar: 'أضف',
    ko: '추가',
    zh: '添加',
    tr: 'ekle',
    fr: 'ajouter',
    de: 'hinzufügen',
    pt: 'adicionar',
    ru: 'добавить',
  },
  complete: {
    en: 'complete',
    es: 'completar',
    ja: '完了',
    ar: 'أكمل',
    ko: '완료',
    zh: '完成',
    tr: 'tamamla',
    fr: 'terminer',
    de: 'erledigen',
    pt: 'concluir',
    ru: 'завершить',
  },
  list: {
    en: 'list',
    es: 'listar',
    ja: '一覧',
    ar: 'اعرض',
    ko: '목록',
    zh: '列出',
    tr: 'listele',
    fr: 'lister',
    de: 'auflisten',
    pt: 'listar',
    ru: 'показать',
  },
};

const MARKERS: Record<string, Record<string, string>> = {
  to: {
    en: 'to',
    es: 'a',
    ja: 'に',
    ar: 'إلى',
    ko: '에',
    zh: '到',
    tr: 'e',
    fr: 'à',
    de: 'zu',
    pt: 'a',
    ru: 'в',
  },
  wo: {
    ja: 'を',
    ko: '를',
  },
};

// =============================================================================
// Word Order Helpers
// =============================================================================

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);

function kw(command: string, lang: string): string {
  return COMMAND_KEYWORDS[command]?.[lang] ?? command;
}

function mk(marker: string, lang: string): string {
  return MARKERS[marker]?.[lang] ?? marker;
}

// =============================================================================
// Per-Command Renderers
// =============================================================================

function renderAdd(node: SemanticNode, lang: string): string {
  const item = extractRoleValue(node, 'item') || '';
  const list = extractRoleValue(node, 'list');
  const keyword = kw('add', lang);
  const parts: string[] = [];

  if (SOV_LANGUAGES.has(lang)) {
    // SOV: [list marker] item marker keyword
    if (list) {
      parts.push(list, mk('to', lang));
    }
    parts.push(item);
    const woMarker = mk('wo', lang);
    if (woMarker !== 'wo') parts.push(woMarker);
    parts.push(keyword);
  } else {
    // SVO / VSO: keyword item [marker list]
    parts.push(keyword, item);
    if (list) {
      parts.push(mk('to', lang), list);
    }
  }

  return parts.join(' ');
}

function renderComplete(node: SemanticNode, lang: string): string {
  const item = extractRoleValue(node, 'item') || '';
  const keyword = kw('complete', lang);

  if (SOV_LANGUAGES.has(lang)) {
    // SOV: item marker keyword
    const parts = [item];
    const woMarker = mk('wo', lang);
    if (woMarker !== 'wo') parts.push(woMarker);
    parts.push(keyword);
    return parts.join(' ');
  }

  // SVO / VSO: keyword item
  return `${keyword} ${item}`;
}

function renderList(node: SemanticNode, lang: string): string {
  const list = extractRoleValue(node, 'list');
  const keyword = kw('list', lang);

  if (!list) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    // SOV: list marker keyword
    const parts = [list];
    const woMarker = mk('wo', lang);
    if (woMarker !== 'wo') parts.push(woMarker);
    parts.push(keyword);
    return parts.join(' ');
  }

  // SVO / VSO: keyword list
  return `${keyword} ${list}`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a todo SemanticNode to natural-language todo DSL text in the target language.
 */
export function renderTodo(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'add':
      return renderAdd(node, language);
    case 'complete':
      return renderComplete(node, language);
    case 'list':
      return renderList(node, language);
    default:
      return `-- Unknown: ${node.action}`;
  }
}
