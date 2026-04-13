/**
 * SQL Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language SQL DSL syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

export const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  select: {
    en: 'select',
    es: 'seleccionar',
    ja: '選択',
    ar: 'اختر',
    ko: '선택',
    zh: '查询',
    tr: 'seç',
    fr: 'sélectionner',
  },
  insert: {
    en: 'insert',
    es: 'insertar',
    ja: '挿入',
    ar: 'أدخل',
    ko: '삽입',
    zh: '插入',
    tr: 'ekle',
    fr: 'insérer',
  },
  update: {
    en: 'update',
    es: 'actualizar',
    ja: '更新',
    ar: 'حدّث',
    ko: '갱신',
    zh: '更新',
    tr: 'güncelle',
    fr: 'mettre-à-jour',
  },
  delete: {
    en: 'delete',
    es: 'eliminar',
    ja: '削除',
    ar: 'احذف',
    ko: '삭제',
    zh: '删除',
    tr: 'sil',
    fr: 'supprimer',
  },
};

export const MARKERS: Record<string, Record<string, string>> = {
  from: { en: 'from', es: 'de', ja: 'から', ar: 'من', ko: '에서', zh: '从', tr: 'den', fr: 'de' },
  into: { en: 'into', es: 'en', ja: 'に', ar: 'في', ko: '에', zh: '到', tr: 'e', fr: 'dans' },
  where: {
    en: 'where',
    es: 'donde',
    ja: '条件',
    ar: 'حيث',
    ko: '조건',
    zh: '条件',
    tr: 'koşul',
    fr: 'où',
  },
  set: {
    en: 'set',
    es: 'establecer',
    ja: '設定',
    ar: 'عيّن',
    ko: '설정',
    zh: '设置',
    tr: 'ayarla',
    fr: 'définir',
  },
};

// =============================================================================
// Word Order Helpers
// =============================================================================

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);

function isSOV(lang: string): boolean {
  return SOV_LANGUAGES.has(lang);
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

function renderSelect(node: SemanticNode, lang: string): string {
  const columns = extractRoleValue(node, 'columns') || '*';
  const source = extractRoleValue(node, 'source') || 'table';
  const condition = extractRoleValue(node, 'condition');
  const keyword = kw('select', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    // SOV: source marker columns [condition-marker condition] keyword (verb last)
    parts.push(source, mk('from', lang), columns);
    if (condition) {
      parts.push(mk('where', lang), condition);
    }
    parts.push(keyword);
  } else {
    // SVO / VSO: keyword columns marker source [marker condition]
    parts.push(keyword, columns, mk('from', lang), source);
    if (condition) {
      parts.push(mk('where', lang), condition);
    }
  }

  return parts.join(' ');
}

function renderInsert(node: SemanticNode, lang: string): string {
  const values = extractRoleValue(node, 'values') || 'data';
  const dest = extractRoleValue(node, 'destination') || 'table';
  const keyword = kw('insert', lang);

  if (isSOV(lang)) {
    // SOV: dest marker values keyword
    return `${dest} ${mk('into', lang)} ${values} ${keyword}`;
  }
  // SVO / VSO: keyword values marker dest
  return `${keyword} ${values} ${mk('into', lang)} ${dest}`;
}

function renderUpdate(node: SemanticNode, lang: string): string {
  const source = extractRoleValue(node, 'source') || 'table';
  const values = extractRoleValue(node, 'values');
  const condition = extractRoleValue(node, 'condition');
  const keyword = kw('update', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    // SOV: source [set-marker values] [condition-marker condition] keyword (verb last)
    parts.push(source);
    if (values) {
      parts.push(mk('set', lang), values);
    }
    if (condition) {
      parts.push(mk('where', lang), condition);
    }
    parts.push(keyword);
  } else {
    // SVO / VSO: keyword source [marker values] [marker condition]
    parts.push(keyword, source);
    if (values) {
      parts.push(mk('set', lang), values);
    }
    if (condition) {
      parts.push(mk('where', lang), condition);
    }
  }

  return parts.join(' ');
}

function renderDelete(node: SemanticNode, lang: string): string {
  const source = extractRoleValue(node, 'source') || 'table';
  const condition = extractRoleValue(node, 'condition');
  const keyword = kw('delete', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    // SOV: source marker [condition-marker condition] keyword (verb last)
    parts.push(source, mk('from', lang));
    if (condition) {
      parts.push(mk('where', lang), condition);
    }
    parts.push(keyword);
  } else {
    // SVO / VSO: keyword marker source [marker condition]
    parts.push(keyword, mk('from', lang), source);
    if (condition) {
      parts.push(mk('where', lang), condition);
    }
  }

  return parts.join(' ');
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a SQL SemanticNode to natural-language SQL DSL text in the target language.
 */
export function renderSQL(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'select':
      return renderSelect(node, language);
    case 'insert':
      return renderInsert(node, language);
    case 'update':
      return renderUpdate(node, language);
    case 'delete':
      return renderDelete(node, language);
    default:
      return `-- Unknown: ${node.action}`;
  }
}
