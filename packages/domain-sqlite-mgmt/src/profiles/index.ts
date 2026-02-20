/**
 * SQLite Management Language Profiles
 *
 * Pattern generation profiles for each supported language (8 total).
 * Defines keyword translations and word order for pattern generation.
 *
 * IMPORTANT: Keywords MUST be single tokens (no spaces). The framework's
 * pattern generator matches keywords as single tokens. For compound
 * commands, use hyphens for Latin/Arabic scripts (e.g., 'create-table')
 * or concatenated characters for CJK scripts (e.g., 'テーブル作成').
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    'create-table': { primary: 'create-table' },
    'drop-table': { primary: 'drop-table' },
    'add-column': { primary: 'add-column' },
    'rename-table': { primary: 'rename-table' },
    'create-index': { primary: 'create-index' },
    'drop-index': { primary: 'drop-index' },
    'create-view': { primary: 'create-view' },
    'drop-view': { primary: 'drop-view' },
    'pragma-get': { primary: 'get' },
    'pragma-set': { primary: 'set' },
    vacuum: { primary: 'vacuum' },
    analyze: { primary: 'analyze' },
    attach: { primary: 'attach' },
    detach: { primary: 'detach' },
    begin: { primary: 'begin' },
    commit: { primary: 'commit' },
    rollback: { primary: 'rollback' },
  },
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    'create-table': { primary: 'crear-tabla' },
    'drop-table': { primary: 'eliminar-tabla' },
    'add-column': { primary: 'agregar-columna' },
    'rename-table': { primary: 'renombrar-tabla' },
    'create-index': { primary: 'crear-índice' },
    'drop-index': { primary: 'eliminar-índice' },
    'create-view': { primary: 'crear-vista' },
    'drop-view': { primary: 'eliminar-vista' },
    'pragma-get': { primary: 'obtener' },
    'pragma-set': { primary: 'establecer' },
    vacuum: { primary: 'vaciar' },
    analyze: { primary: 'analizar' },
    attach: { primary: 'adjuntar' },
    detach: { primary: 'desadjuntar' },
    begin: { primary: 'iniciar' },
    commit: { primary: 'confirmar' },
    rollback: { primary: 'revertir' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
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
  roleMarkers: {
    target: { primary: 'の', position: 'after' },
  },
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
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
};

// =============================================================================
// Korean (SOV)
// =============================================================================

export const koreanProfile: PatternGenLanguageProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  keywords: {
    'create-table': { primary: '테이블생성' },
    'drop-table': { primary: '테이블삭제' },
    'add-column': { primary: '열추가' },
    'rename-table': { primary: '테이블이름변경' },
    'create-index': { primary: '인덱스생성' },
    'drop-index': { primary: '인덱스삭제' },
    'create-view': { primary: '뷰생성' },
    'drop-view': { primary: '뷰삭제' },
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
  roleMarkers: {
    target: { primary: '의', position: 'after' },
  },
};

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const chineseProfile: PatternGenLanguageProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  keywords: {
    'create-table': { primary: '创建表' },
    'drop-table': { primary: '删除表' },
    'add-column': { primary: '添加列' },
    'rename-table': { primary: '重命名表' },
    'create-index': { primary: '创建索引' },
    'drop-index': { primary: '删除索引' },
    'create-view': { primary: '创建视图' },
    'drop-view': { primary: '删除视图' },
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
};

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const turkishProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: {
    'create-table': { primary: 'tablo-oluştur' },
    'drop-table': { primary: 'tablo-kaldır' },
    'add-column': { primary: 'sütun-ekle' },
    'rename-table': { primary: 'tablo-adlandır' },
    'create-index': { primary: 'dizin-oluştur' },
    'drop-index': { primary: 'dizin-kaldır' },
    'create-view': { primary: 'görünüm-oluştur' },
    'drop-view': { primary: 'görünüm-kaldır' },
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
  roleMarkers: {
    target: { primary: 'için', position: 'after' },
  },
};

// =============================================================================
// French (SVO)
// =============================================================================

export const frenchProfile: PatternGenLanguageProfile = {
  code: 'fr',
  wordOrder: 'SVO',
  keywords: {
    'create-table': { primary: 'créer-table' },
    'drop-table': { primary: 'supprimer-table' },
    'add-column': { primary: 'ajouter-colonne' },
    'rename-table': { primary: 'renommer-table' },
    'create-index': { primary: 'créer-index' },
    'drop-index': { primary: 'supprimer-index' },
    'create-view': { primary: 'créer-vue' },
    'drop-view': { primary: 'supprimer-vue' },
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
};

// =============================================================================
// All Profiles
// =============================================================================

export const allProfiles = [
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
];
