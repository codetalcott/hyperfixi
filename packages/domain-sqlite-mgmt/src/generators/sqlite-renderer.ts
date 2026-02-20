/**
 * SQLite Management Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language management DSL syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  'create-table': {
    en: 'create-table', es: 'crear-tabla', ja: 'テーブル作成', ar: 'أنشئ-جدول',
    ko: '테이블생성', zh: '创建表', tr: 'tablo-oluştur', fr: 'créer-table',
  },
  'drop-table': {
    en: 'drop-table', es: 'eliminar-tabla', ja: 'テーブル削除', ar: 'احذف-جدول',
    ko: '테이블삭제', zh: '删除表', tr: 'tablo-kaldır', fr: 'supprimer-table',
  },
  'add-column': {
    en: 'add-column', es: 'agregar-columna', ja: '列追加', ar: 'أضف-عمود',
    ko: '열추가', zh: '添加列', tr: 'sütun-ekle', fr: 'ajouter-colonne',
  },
  'rename-table': {
    en: 'rename-table', es: 'renombrar-tabla', ja: 'テーブル名変更', ar: 'أعد-تسمية',
    ko: '테이블이름변경', zh: '重命名表', tr: 'tablo-adlandır', fr: 'renommer-table',
  },
  'create-index': {
    en: 'create-index', es: 'crear-índice', ja: 'インデックス作成', ar: 'أنشئ-فهرس',
    ko: '인덱스생성', zh: '创建索引', tr: 'dizin-oluştur', fr: 'créer-index',
  },
  'drop-index': {
    en: 'drop-index', es: 'eliminar-índice', ja: 'インデックス削除', ar: 'احذف-فهرس',
    ko: '인덱스삭제', zh: '删除索引', tr: 'dizin-kaldır', fr: 'supprimer-index',
  },
  'create-view': {
    en: 'create-view', es: 'crear-vista', ja: 'ビュー作成', ar: 'أنشئ-عرض',
    ko: '뷰생성', zh: '创建视图', tr: 'görünüm-oluştur', fr: 'créer-vue',
  },
  'drop-view': {
    en: 'drop-view', es: 'eliminar-vista', ja: 'ビュー削除', ar: 'احذف-عرض',
    ko: '뷰삭제', zh: '删除视图', tr: 'görünüm-kaldır', fr: 'supprimer-vue',
  },
  'pragma-get': {
    en: 'get', es: 'obtener', ja: '取得', ar: 'احصل',
    ko: '조회', zh: '获取', tr: 'al', fr: 'obtenir',
  },
  'pragma-set': {
    en: 'set', es: 'establecer', ja: '設定', ar: 'عيّن',
    ko: '설정', zh: '设置', tr: 'ayarla', fr: 'définir',
  },
  vacuum: {
    en: 'vacuum', es: 'vaciar', ja: 'バキューム', ar: 'فرّغ',
    ko: '정리', zh: '清理', tr: 'sıkıştır', fr: 'nettoyer',
  },
  analyze: {
    en: 'analyze', es: 'analizar', ja: '分析', ar: 'حلّل',
    ko: '분석', zh: '分析', tr: 'çözümle', fr: 'analyser',
  },
  attach: {
    en: 'attach', es: 'adjuntar', ja: '接続', ar: 'أرفق',
    ko: '연결', zh: '附加', tr: 'bağla', fr: 'attacher',
  },
  detach: {
    en: 'detach', es: 'desadjuntar', ja: '切断', ar: 'افصل',
    ko: '분리', zh: '分离', tr: 'ayır', fr: 'détacher',
  },
  begin: {
    en: 'begin', es: 'iniciar', ja: '開始', ar: 'ابدأ',
    ko: '시작', zh: '开始', tr: 'başla', fr: 'commencer',
  },
  commit: {
    en: 'commit', es: 'confirmar', ja: 'コミット', ar: 'أكّد',
    ko: '커밋', zh: '提交', tr: 'onayla', fr: 'valider',
  },
  rollback: {
    en: 'rollback', es: 'revertir', ja: 'ロールバック', ar: 'تراجع',
    ko: '롤백', zh: '回滚', tr: 'geri-al', fr: 'annuler',
  },
};

const MARKERS: Record<string, Record<string, string>> = {
  with: { en: 'with', es: 'con', ja: 'で', ar: 'مع', ko: '으로', zh: '包含', tr: 'ile', fr: 'avec' },
  to: { en: 'to', es: 'a', ja: 'に', ar: 'إلى', ko: '으로', zh: '为', tr: 'olarak', fr: 'à' },
  on: { en: 'on', es: 'en', ja: 'の', ar: 'على', ko: '의', zh: '在', tr: 'de', fr: 'sur' },
  as: { en: 'as', es: 'como', ja: 'として', ar: 'كـ', ko: '로', zh: '为', tr: 'olarak', fr: 'comme' },
  for: { en: 'for', es: 'para', ja: 'の', ar: 'لـ', ko: '의', zh: '的', tr: 'için', fr: 'pour' },
  column: { en: 'column', es: 'columna', ja: '列', ar: 'عمود', ko: '열', zh: '列', tr: 'sütun', fr: 'colonne' },
  'to-savepoint': { en: 'to', es: 'a', ja: 'まで', ar: 'إلى', ko: '까지', zh: '到', tr: 'e', fr: 'à' },
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

function renderCreateTable(node: SemanticNode, lang: string): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  const columns = extractRoleValue(node, 'columns') || 'id integer primary key';
  const keyword = kw('create-table', lang);

  if (isSOV(lang)) {
    return `${table} ${mk('with', lang)} ${columns} ${keyword}`;
  }
  return `${keyword} ${table} ${mk('with', lang)} ${columns}`;
}

function renderDropTable(node: SemanticNode, lang: string): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  const keyword = kw('drop-table', lang);

  if (isSOV(lang)) {
    return `${table} ${keyword}`;
  }
  return `${keyword} ${table}`;
}

function renderAddColumn(node: SemanticNode, lang: string): string {
  const column = extractRoleValue(node, 'column') || 'new_column text';
  const table = extractRoleValue(node, 'table') || 'my_table';
  const keyword = kw('add-column', lang);

  if (isSOV(lang)) {
    return `${table} ${mk('to', lang)} ${column} ${keyword}`;
  }
  return `${keyword} ${column} ${mk('to', lang)} ${table}`;
}

function renderRenameTable(node: SemanticNode, lang: string): string {
  const table = extractRoleValue(node, 'table') || 'old_table';
  const newName = extractRoleValue(node, 'new-name') || 'new_table';
  const keyword = kw('rename-table', lang);

  if (isSOV(lang)) {
    return `${table} ${mk('to', lang)} ${newName} ${keyword}`;
  }
  return `${keyword} ${table} ${mk('to', lang)} ${newName}`;
}

function renderCreateIndex(node: SemanticNode, lang: string): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  const column = extractRoleValue(node, 'column') || 'my_column';
  const keyword = kw('create-index', lang);

  if (isSOV(lang)) {
    return `${table} ${mk('on', lang)} ${column} ${mk('column', lang)} ${keyword}`;
  }
  return `${keyword} ${mk('on', lang)} ${table} ${mk('column', lang)} ${column}`;
}

function renderDropIndex(node: SemanticNode, lang: string): string {
  const index = extractRoleValue(node, 'index') || 'my_index';
  const keyword = kw('drop-index', lang);

  if (isSOV(lang)) {
    return `${index} ${keyword}`;
  }
  return `${keyword} ${index}`;
}

function renderCreateView(node: SemanticNode, lang: string): string {
  const view = extractRoleValue(node, 'view') || 'my_view';
  const query = extractRoleValue(node, 'query') || 'select * from my_table';
  const keyword = kw('create-view', lang);

  if (isSOV(lang)) {
    return `${view} ${mk('as', lang)} ${query} ${keyword}`;
  }
  return `${keyword} ${view} ${mk('as', lang)} ${query}`;
}

function renderDropView(node: SemanticNode, lang: string): string {
  const view = extractRoleValue(node, 'view') || 'my_view';
  const keyword = kw('drop-view', lang);

  if (isSOV(lang)) {
    return `${view} ${keyword}`;
  }
  return `${keyword} ${view}`;
}

function renderPragmaGet(node: SemanticNode, lang: string): string {
  const pragma = extractRoleValue(node, 'pragma') || 'journal_mode';
  const target = extractRoleValue(node, 'target');
  const keyword = kw('pragma-get', lang);

  const parts: string[] = [];
  if (isSOV(lang)) {
    if (target) parts.push(target, mk('for', lang));
    parts.push(pragma, keyword);
  } else {
    parts.push(keyword, pragma);
    if (target) parts.push(mk('for', lang), target);
  }
  return parts.join(' ');
}

function renderPragmaSet(node: SemanticNode, lang: string): string {
  const pragma = extractRoleValue(node, 'pragma') || 'journal_mode';
  const value = extractRoleValue(node, 'value') || 'wal';
  const keyword = kw('pragma-set', lang);

  if (isSOV(lang)) {
    return `${pragma} ${mk('to', lang)} ${value} ${keyword}`;
  }
  return `${keyword} ${pragma} ${mk('to', lang)} ${value}`;
}

function renderVacuum(node: SemanticNode, lang: string): string {
  const target = extractRoleValue(node, 'target');
  const keyword = kw('vacuum', lang);
  return target ? `${keyword} ${target}` : keyword;
}

function renderAnalyze(node: SemanticNode, lang: string): string {
  const target = extractRoleValue(node, 'target');
  const keyword = kw('analyze', lang);
  return target ? `${keyword} ${target}` : keyword;
}

function renderAttach(node: SemanticNode, lang: string): string {
  const path = extractRoleValue(node, 'path') || 'database.db';
  const alias = extractRoleValue(node, 'alias') || 'attached_db';
  const keyword = kw('attach', lang);

  if (isSOV(lang)) {
    return `${path} ${mk('as', lang)} ${alias} ${keyword}`;
  }
  return `${keyword} ${path} ${mk('as', lang)} ${alias}`;
}

function renderDetach(node: SemanticNode, lang: string): string {
  const alias = extractRoleValue(node, 'alias') || 'attached_db';
  const keyword = kw('detach', lang);

  if (isSOV(lang)) {
    return `${alias} ${keyword}`;
  }
  return `${keyword} ${alias}`;
}

function renderBegin(node: SemanticNode, lang: string): string {
  const mode = extractRoleValue(node, 'mode');
  const keyword = kw('begin', lang);
  return mode ? `${keyword} ${mode}` : keyword;
}

function renderCommit(_node: SemanticNode, lang: string): string {
  return kw('commit', lang);
}

function renderRollback(node: SemanticNode, lang: string): string {
  const savepoint = extractRoleValue(node, 'savepoint');
  const keyword = kw('rollback', lang);
  if (savepoint) {
    return `${keyword} ${mk('to-savepoint', lang)} ${savepoint}`;
  }
  return keyword;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a SQLite management SemanticNode to natural-language DSL text
 * in the target language.
 */
export function renderSQLiteMgmt(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'create-table':
      return renderCreateTable(node, language);
    case 'drop-table':
      return renderDropTable(node, language);
    case 'add-column':
      return renderAddColumn(node, language);
    case 'rename-table':
      return renderRenameTable(node, language);
    case 'create-index':
      return renderCreateIndex(node, language);
    case 'drop-index':
      return renderDropIndex(node, language);
    case 'create-view':
      return renderCreateView(node, language);
    case 'drop-view':
      return renderDropView(node, language);
    case 'pragma-get':
      return renderPragmaGet(node, language);
    case 'pragma-set':
      return renderPragmaSet(node, language);
    case 'vacuum':
      return renderVacuum(node, language);
    case 'analyze':
      return renderAnalyze(node, language);
    case 'attach':
      return renderAttach(node, language);
    case 'detach':
      return renderDetach(node, language);
    case 'begin':
      return renderBegin(node, language);
    case 'commit':
      return renderCommit(node, language);
    case 'rollback':
      return renderRollback(node, language);
    default:
      return `-- Unknown: ${node.action}`;
  }
}
