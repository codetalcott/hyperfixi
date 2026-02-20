/**
 * SQLite Management Tokenizers
 *
 * Language-specific tokenizers for SQLite management input (8 languages).
 * Each tokenizer handles keyword classification, operator recognition,
 * and (for non-Latin scripts) keyword normalization.
 *
 * IMPORTANT: Compound command keywords use hyphens for Latin/Arabic scripts
 * (e.g., 'create-table') and concatenated characters for CJK scripts
 * (e.g., 'テーブル作成') to ensure single-token matching.
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';

// =============================================================================
// Latin Extended Identifier Extractor
// Handles Latin-script languages with diacritics (French é,à,ù; Turkish ç,ü,ş)
// =============================================================================

class LatinExtendedIdentifierExtractor implements ValueExtractor {
  readonly name = 'latin-extended-identifier';

  canExtract(input: string, position: number): boolean {
    return /[\p{L}\p{M}]/u.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    while (end < input.length && /[\p{L}\p{M}\p{N}_-]/u.test(input[end])) {
      end++;
    }
    if (end === position) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// English Tokenizer
// =============================================================================

export const EnglishMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Compound command keywords (hyphenated for single-token matching)
    'create-table', 'drop-table', 'add-column', 'rename-table',
    'create-index', 'drop-index',
    'create-view', 'drop-view',
    // Single-word command keywords
    'get', 'set', 'vacuum', 'analyze', 'attach', 'detach',
    'begin', 'commit', 'rollback',
    // Markers and common words
    'with', 'to', 'on', 'as', 'for', 'if', 'exists', 'not', 'null',
    'column', 'table', 'index', 'view', 'pragma', 'database',
    'transaction', 'savepoint',
    'deferred', 'immediate', 'exclusive',
    // Types
    'primary', 'key', 'integer', 'text', 'real', 'blob', 'default',
    'unique',
  ],
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// Spanish Tokenizer
// =============================================================================

export const SpanishMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Compound command keywords
    'crear-tabla', 'eliminar-tabla', 'agregar-columna', 'renombrar-tabla',
    'crear-índice', 'eliminar-índice',
    'crear-vista', 'eliminar-vista',
    // Single-word command keywords
    'obtener', 'establecer', 'vaciar', 'analizar', 'adjuntar', 'desadjuntar',
    'iniciar', 'confirmar', 'revertir',
    // Markers
    'con', 'a', 'en', 'como', 'para', 'si', 'existe', 'no', 'nulo',
    'columna', 'tabla', 'índice', 'vista', 'pragma',
    'transacción', 'punto-de-guardado',
    'diferido', 'inmediato', 'exclusivo',
    'primaria', 'clave', 'entero', 'texto', 'real', 'blob', 'defecto',
    'único',
  ],
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// Japanese Tokenizer
// =============================================================================

export const JapaneseMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  keywords: [
    // Compound command keywords (concatenated, no spaces)
    'テーブル作成', 'テーブル削除', '列追加', 'テーブル名変更',
    'インデックス作成', 'インデックス削除',
    'ビュー作成', 'ビュー削除',
    // Single-word command keywords
    '取得', '設定', 'バキューム', '分析', '接続', '切断',
    '開始', 'コミット', 'ロールバック',
    // Markers
    'で', 'に', 'の', 'として', 'まで',
    'テーブル', 'インデックス', 'ビュー',
    'トランザクション', 'セーブポイント',
    '遅延', '即時', '排他',
    '主キー', '整数', 'テキスト', '実数',
    'ユニーク',
  ],
  keywordExtras: [
    { native: 'テーブル作成', normalized: 'create-table' },
    { native: 'テーブル削除', normalized: 'drop-table' },
    { native: '列追加', normalized: 'add-column' },
    { native: 'テーブル名変更', normalized: 'rename-table' },
    { native: 'インデックス作成', normalized: 'create-index' },
    { native: 'インデックス削除', normalized: 'drop-index' },
    { native: 'ビュー作成', normalized: 'create-view' },
    { native: 'ビュー削除', normalized: 'drop-view' },
    { native: '取得', normalized: 'get' },
    { native: '設定', normalized: 'set' },
    { native: 'バキューム', normalized: 'vacuum' },
    { native: '分析', normalized: 'analyze' },
    { native: '接続', normalized: 'attach' },
    { native: '切断', normalized: 'detach' },
    { native: '開始', normalized: 'begin' },
    { native: 'コミット', normalized: 'commit' },
    { native: 'ロールバック', normalized: 'rollback' },
    { native: 'で', normalized: 'with' },
    { native: 'に', normalized: 'to' },
    { native: 'の', normalized: 'on' },
    { native: 'として', normalized: 'as' },
    { native: 'まで', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      'create-table': { primary: 'テーブル作成' },
      'drop-table': { primary: 'テーブル削除' },
      'add-column': { primary: '列追加' },
      'rename-table': { primary: 'テーブル名変更' },
      'create-index': { primary: 'インデックス作成' },
      'drop-index': { primary: 'インデックス削除' },
      'create-view': { primary: 'ビュー作成' },
      'drop-view': { primary: 'ビュー削除' },
      'pragma-get': { primary: '取得' },
      'pragma-set': { primary: '設定' },
      vacuum: { primary: 'バキューム' },
      analyze: { primary: '分析' },
      attach: { primary: '接続' },
      detach: { primary: '切断' },
      begin: { primary: '開始' },
      commit: { primary: 'コミット' },
      rollback: { primary: 'ロールバック' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Arabic Tokenizer
// =============================================================================

export const ArabicMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Compound command keywords (hyphenated)
    'أنشئ-جدول', 'احذف-جدول', 'أضف-عمود', 'أعد-تسمية',
    'أنشئ-فهرس', 'احذف-فهرس',
    'أنشئ-عرض', 'احذف-عرض',
    // Single-word command keywords
    'احصل', 'عيّن', 'فرّغ', 'حلّل', 'أرفق', 'افصل',
    'ابدأ', 'أكّد', 'تراجع',
    // Markers
    'مع', 'إلى', 'على', 'كـ', 'لـ',
    'جدول', 'فهرس', 'عرض', 'عمود',
    'معاملة', 'نقطة-حفظ',
    'مؤجل', 'فوري', 'حصري',
    'مفتاح-أساسي', 'عدد-صحيح', 'نص', 'حقيقي',
    'فريد',
  ],
  keywordExtras: [
    { native: 'أنشئ-جدول', normalized: 'create-table' },
    { native: 'احذف-جدول', normalized: 'drop-table' },
    { native: 'أضف-عمود', normalized: 'add-column' },
    { native: 'أعد-تسمية', normalized: 'rename-table' },
    { native: 'أنشئ-فهرس', normalized: 'create-index' },
    { native: 'احذف-فهرس', normalized: 'drop-index' },
    { native: 'أنشئ-عرض', normalized: 'create-view' },
    { native: 'احذف-عرض', normalized: 'drop-view' },
    { native: 'احصل', normalized: 'get' },
    { native: 'عيّن', normalized: 'set' },
    { native: 'فرّغ', normalized: 'vacuum' },
    { native: 'حلّل', normalized: 'analyze' },
    { native: 'أرفق', normalized: 'attach' },
    { native: 'افصل', normalized: 'detach' },
    { native: 'ابدأ', normalized: 'begin' },
    { native: 'أكّد', normalized: 'commit' },
    { native: 'تراجع', normalized: 'rollback' },
    { native: 'مع', normalized: 'with' },
    { native: 'إلى', normalized: 'to' },
    { native: 'على', normalized: 'on' },
    { native: 'كـ', normalized: 'as' },
    { native: 'لـ', normalized: 'for' },
  ],
  keywordProfile: {
    keywords: {
      'create-table': { primary: 'أنشئ-جدول' },
      'drop-table': { primary: 'احذف-جدول' },
      'add-column': { primary: 'أضف-عمود' },
      'rename-table': { primary: 'أعد-تسمية' },
      'create-index': { primary: 'أنشئ-فهرس' },
      'drop-index': { primary: 'احذف-فهرس' },
      'create-view': { primary: 'أنشئ-عرض' },
      'drop-view': { primary: 'احذف-عرض' },
      'pragma-get': { primary: 'احصل' },
      'pragma-set': { primary: 'عيّن' },
      vacuum: { primary: 'فرّغ' },
      analyze: { primary: 'حلّل' },
      attach: { primary: 'أرفق' },
      detach: { primary: 'افصل' },
      begin: { primary: 'ابدأ' },
      commit: { primary: 'أكّد' },
      rollback: { primary: 'تراجع' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Korean Tokenizer
// =============================================================================

export const KoreanMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ko',
  keywords: [
    // Compound command keywords (concatenated, no spaces)
    '테이블생성', '테이블삭제', '열추가', '테이블이름변경',
    '인덱스생성', '인덱스삭제',
    '뷰생성', '뷰삭제',
    // Single-word command keywords
    '조회', '설정', '정리', '분석', '연결', '분리',
    '시작', '커밋', '롤백',
    // Markers
    '으로', '에', '의', '로', '까지',
    '테이블', '인덱스', '뷰', '열',
    '트랜잭션', '세이브포인트',
    '지연', '즉시', '배타',
    '기본키', '정수', '텍스트', '실수',
    '유니크',
  ],
  keywordExtras: [
    { native: '테이블생성', normalized: 'create-table' },
    { native: '테이블삭제', normalized: 'drop-table' },
    { native: '열추가', normalized: 'add-column' },
    { native: '테이블이름변경', normalized: 'rename-table' },
    { native: '인덱스생성', normalized: 'create-index' },
    { native: '인덱스삭제', normalized: 'drop-index' },
    { native: '뷰생성', normalized: 'create-view' },
    { native: '뷰삭제', normalized: 'drop-view' },
    { native: '조회', normalized: 'get' },
    { native: '설정', normalized: 'set' },
    { native: '정리', normalized: 'vacuum' },
    { native: '분석', normalized: 'analyze' },
    { native: '연결', normalized: 'attach' },
    { native: '분리', normalized: 'detach' },
    { native: '시작', normalized: 'begin' },
    { native: '커밋', normalized: 'commit' },
    { native: '롤백', normalized: 'rollback' },
    { native: '으로', normalized: 'with' },
    { native: '에', normalized: 'to' },
    { native: '의', normalized: 'on' },
    { native: '로', normalized: 'as' },
    { native: '까지', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      'create-table': { primary: '테이블생성' },
      'drop-table': { primary: '테이블삭제' },
      'add-column': { primary: '열추가' },
      'rename-table': { primary: '테이블이름변경' },
      'create-index': { primary: '인덱스생성' },
      'pragma-get': { primary: '조회' },
      'pragma-set': { primary: '설정' },
      vacuum: { primary: '정리' },
      analyze: { primary: '분석' },
      attach: { primary: '연결' },
      detach: { primary: '분리' },
      begin: { primary: '시작' },
      commit: { primary: '커밋' },
      rollback: { primary: '롤백' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Chinese Tokenizer
// =============================================================================

export const ChineseMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'zh',
  keywords: [
    // Compound command keywords (concatenated, no spaces)
    '创建表', '删除表', '添加列', '重命名表',
    '创建索引', '删除索引',
    '创建视图', '删除视图',
    // Single-word command keywords
    '获取', '设置', '清理', '分析', '附加', '分离',
    '开始', '提交', '回滚',
    // Markers
    '包含', '为', '在', '的',
    '表', '索引', '视图', '列',
    '事务', '保存点',
    '延迟', '立即', '排他',
    '主键', '整数', '文本', '实数',
    '唯一',
  ],
  keywordExtras: [
    { native: '创建表', normalized: 'create-table' },
    { native: '删除表', normalized: 'drop-table' },
    { native: '添加列', normalized: 'add-column' },
    { native: '重命名表', normalized: 'rename-table' },
    { native: '创建索引', normalized: 'create-index' },
    { native: '删除索引', normalized: 'drop-index' },
    { native: '创建视图', normalized: 'create-view' },
    { native: '删除视图', normalized: 'drop-view' },
    { native: '获取', normalized: 'get' },
    { native: '设置', normalized: 'set' },
    { native: '清理', normalized: 'vacuum' },
    { native: '分析', normalized: 'analyze' },
    { native: '附加', normalized: 'attach' },
    { native: '分离', normalized: 'detach' },
    { native: '开始', normalized: 'begin' },
    { native: '提交', normalized: 'commit' },
    { native: '回滚', normalized: 'rollback' },
    { native: '包含', normalized: 'with' },
    { native: '为', normalized: 'as' },
    { native: '在', normalized: 'on' },
    { native: '的', normalized: 'for' },
  ],
  keywordProfile: {
    keywords: {
      'create-table': { primary: '创建表' },
      'drop-table': { primary: '删除表' },
      'add-column': { primary: '添加列' },
      'rename-table': { primary: '重命名表' },
      'create-index': { primary: '创建索引' },
      'pragma-get': { primary: '获取' },
      'pragma-set': { primary: '设置' },
      vacuum: { primary: '清理' },
      analyze: { primary: '分析' },
      attach: { primary: '附加' },
      detach: { primary: '分离' },
      begin: { primary: '开始' },
      commit: { primary: '提交' },
      rollback: { primary: '回滚' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Turkish Tokenizer
// =============================================================================

export const TurkishMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'tr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Compound command keywords (hyphenated)
    'tablo-oluştur', 'tablo-kaldır', 'sütun-ekle', 'tablo-adlandır',
    'dizin-oluştur', 'dizin-kaldır',
    'görünüm-oluştur', 'görünüm-kaldır',
    // Single-word command keywords
    'al', 'ayarla', 'sıkıştır', 'çözümle', 'bağla', 'ayır',
    'başla', 'onayla', 'geri-al',
    // Markers
    'ile', 'e', 'de', 'olarak', 'için',
    'tablo', 'dizin', 'görünüm', 'sütun',
    'işlem', 'kayıt-noktası',
    'ertelenmiş', 'hemen', 'özel',
    'birincil-anahtar', 'tamsayı', 'metin', 'gerçek',
    'benzersiz',
  ],
  keywordExtras: [
    { native: 'tablo-oluştur', normalized: 'create-table' },
    { native: 'tablo-kaldır', normalized: 'drop-table' },
    { native: 'sütun-ekle', normalized: 'add-column' },
    { native: 'tablo-adlandır', normalized: 'rename-table' },
    { native: 'dizin-oluştur', normalized: 'create-index' },
    { native: 'dizin-kaldır', normalized: 'drop-index' },
    { native: 'görünüm-oluştur', normalized: 'create-view' },
    { native: 'görünüm-kaldır', normalized: 'drop-view' },
    { native: 'al', normalized: 'get' },
    { native: 'ayarla', normalized: 'set' },
    { native: 'sıkıştır', normalized: 'vacuum' },
    { native: 'çözümle', normalized: 'analyze' },
    { native: 'bağla', normalized: 'attach' },
    { native: 'ayır', normalized: 'detach' },
    { native: 'başla', normalized: 'begin' },
    { native: 'onayla', normalized: 'commit' },
    { native: 'geri-al', normalized: 'rollback' },
    { native: 'ile', normalized: 'with' },
    { native: 'e', normalized: 'to' },
    { native: 'de', normalized: 'on' },
    { native: 'olarak', normalized: 'as' },
    { native: 'için', normalized: 'for' },
  ],
  keywordProfile: {
    keywords: {
      'create-table': { primary: 'tablo-oluştur' },
      'drop-table': { primary: 'tablo-kaldır' },
      'add-column': { primary: 'sütun-ekle' },
      'rename-table': { primary: 'tablo-adlandır' },
      'create-index': { primary: 'dizin-oluştur' },
      'pragma-get': { primary: 'al' },
      'pragma-set': { primary: 'ayarla' },
      vacuum: { primary: 'sıkıştır' },
      analyze: { primary: 'çözümle' },
      attach: { primary: 'bağla' },
      detach: { primary: 'ayır' },
      begin: { primary: 'başla' },
      commit: { primary: 'onayla' },
      rollback: { primary: 'geri-al' },
    },
  },
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// French Tokenizer
// =============================================================================

export const FrenchMgmtTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'fr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Compound command keywords (hyphenated)
    'créer-table', 'supprimer-table', 'ajouter-colonne', 'renommer-table',
    'créer-index', 'supprimer-index',
    'créer-vue', 'supprimer-vue',
    // Single-word command keywords
    'obtenir', 'définir', 'nettoyer', 'analyser', 'attacher', 'détacher',
    'commencer', 'valider', 'annuler',
    // Markers
    'avec', 'à', 'sur', 'comme', 'pour', 'en',
    'table', 'index', 'vue', 'colonne',
    'transaction', 'point-de-sauvegarde',
    'différé', 'immédiat', 'exclusif',
    'clé-primaire', 'entier', 'texte', 'réel',
    'unique',
  ],
  keywordExtras: [
    { native: 'créer-table', normalized: 'create-table' },
    { native: 'supprimer-table', normalized: 'drop-table' },
    { native: 'ajouter-colonne', normalized: 'add-column' },
    { native: 'renommer-table', normalized: 'rename-table' },
    { native: 'créer-index', normalized: 'create-index' },
    { native: 'supprimer-index', normalized: 'drop-index' },
    { native: 'créer-vue', normalized: 'create-view' },
    { native: 'supprimer-vue', normalized: 'drop-view' },
    { native: 'obtenir', normalized: 'get' },
    { native: 'définir', normalized: 'set' },
    { native: 'nettoyer', normalized: 'vacuum' },
    { native: 'analyser', normalized: 'analyze' },
    { native: 'attacher', normalized: 'attach' },
    { native: 'détacher', normalized: 'detach' },
    { native: 'commencer', normalized: 'begin' },
    { native: 'valider', normalized: 'commit' },
    { native: 'annuler', normalized: 'rollback' },
    { native: 'avec', normalized: 'with' },
    { native: 'à', normalized: 'to' },
    { native: 'sur', normalized: 'on' },
    { native: 'comme', normalized: 'as' },
    { native: 'pour', normalized: 'for' },
    { native: 'en', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      'create-table': { primary: 'créer-table' },
      'drop-table': { primary: 'supprimer-table' },
      'add-column': { primary: 'ajouter-colonne' },
      'rename-table': { primary: 'renommer-table' },
      'create-index': { primary: 'créer-index' },
      'pragma-get': { primary: 'obtenir' },
      'pragma-set': { primary: 'définir' },
      vacuum: { primary: 'nettoyer' },
      analyze: { primary: 'analyser' },
      attach: { primary: 'attacher' },
      detach: { primary: 'détacher' },
      begin: { primary: 'commencer' },
      commit: { primary: 'valider' },
      rollback: { primary: 'annuler' },
    },
  },
  includeOperators: true,
  caseInsensitive: true,
});
