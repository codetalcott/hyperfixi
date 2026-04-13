/**
 * SQL Language Profiles
 *
 * Pattern generation profiles for each supported language (8 total).
 * These define keyword translations and word order for pattern generation.
 *
 * Note: Role markers are primarily specified via `markerOverride` on each
 * schema role (in schemas/index.ts). Profile-level roleMarkers are only
 * needed when the default position (SOV=after, else=before) is wrong.
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    select: { primary: 'select' },
    // Natural-language aliases for the mutation verbs. The pattern generator
    // threads `alternatives` through to the keyword literal; both the formal
    // and the natural verb parse into the same SemanticNode, so codegen stays
    // untouched. Spike: English only.
    insert: { primary: 'insert', alternatives: ['add'] },
    update: { primary: 'update', alternatives: ['change'] },
    delete: { primary: 'delete', alternatives: ['remove'] },
    get: { primary: 'get' },
  },
  // No roleMarkers needed — all markers come from schema markerOverride,
  // and default position 'before' is correct for SVO English.
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    select: { primary: 'seleccionar' },
    insert: { primary: 'insertar', alternatives: ['agregar', 'añadir'] },
    update: { primary: 'actualizar', alternatives: ['cambiar', 'modificar'] },
    delete: { primary: 'eliminar', alternatives: ['quitar', 'borrar'] },
    get: { primary: 'obtener' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    select: { primary: '選択' },
    insert: { primary: '挿入', alternatives: ['追加'] },
    update: { primary: '更新', alternatives: ['変更'] },
    delete: { primary: '削除', alternatives: ['消去'] },
    get: { primary: '取得' },
  },
  roleMarkers: {
    // '条件' (WHERE) acts as a prefix, not a postposition.
    // source (から) and destination (に) use default SOV 'after' position.
    // Note: SET (設定) position is controlled via markerPosition on the schema
    // to avoid colliding with the INSERT schema's 'values' role.
    condition: { primary: '条件', position: 'before' },
    // LIMIT: '件数' precedes its value the same way '条件' precedes its expression.
    limit: { primary: '件数', position: 'before' },
  },
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    select: { primary: 'اختر' },
    insert: { primary: 'أدخل', alternatives: ['أضف'] },
    update: { primary: 'حدّث', alternatives: ['غيّر'] },
    delete: { primary: 'احذف', alternatives: ['أزل'] },
    get: { primary: 'اجلب' },
  },
};

// =============================================================================
// Korean (SOV)
// =============================================================================

export const koreanProfile: PatternGenLanguageProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  keywords: {
    select: { primary: '선택' },
    insert: { primary: '삽입', alternatives: ['추가'] },
    update: { primary: '갱신', alternatives: ['변경'] },
    delete: { primary: '삭제', alternatives: ['제거'] },
    get: { primary: '가져오기' },
  },
  roleMarkers: {
    condition: { primary: '조건', position: 'before' },
    limit: { primary: '제한', position: 'before' },
  },
};

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const chineseProfile: PatternGenLanguageProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  keywords: {
    select: { primary: '查询' },
    insert: { primary: '插入', alternatives: ['添加'] },
    update: { primary: '更新', alternatives: ['修改'] },
    delete: { primary: '删除', alternatives: ['移除'] },
    get: { primary: '获取' },
  },
};

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const turkishProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: {
    select: { primary: 'seç' },
    // `ekle` is already Turkish for "add" — no natural alias needed for INSERT.
    insert: { primary: 'ekle' },
    update: { primary: 'güncelle', alternatives: ['değiştir'] },
    delete: { primary: 'sil', alternatives: ['kaldır'] },
    get: { primary: 'al' },
  },
  roleMarkers: {
    condition: { primary: 'koşul', position: 'before' },
    limit: { primary: 'limit', position: 'before' },
  },
};

// =============================================================================
// French (SVO)
// =============================================================================

export const frenchProfile: PatternGenLanguageProfile = {
  code: 'fr',
  wordOrder: 'SVO',
  keywords: {
    select: { primary: 'sélectionner' },
    insert: { primary: 'insérer', alternatives: ['ajouter'] },
    update: { primary: 'mettre-à-jour', alternatives: ['modifier'] },
    delete: { primary: 'supprimer', alternatives: ['enlever'] },
    get: { primary: 'obtenir' },
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
