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
    insert: { primary: 'insert' },
    update: { primary: 'update' },
    delete: { primary: 'delete' },
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
    insert: { primary: 'insertar' },
    update: { primary: 'actualizar' },
    delete: { primary: 'eliminar' },
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
    insert: { primary: '挿入' },
    update: { primary: '更新' },
    delete: { primary: '削除' },
  },
  roleMarkers: {
    // '条件' (WHERE) acts as a prefix, not a postposition.
    // source (から) and destination (に) use default SOV 'after' position.
    // Note: SET (設定) position is controlled via markerPosition on the schema
    // to avoid colliding with the INSERT schema's 'values' role.
    condition: { primary: '条件', position: 'before' },
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
    insert: { primary: 'أدخل' },
    update: { primary: 'حدّث' },
    delete: { primary: 'احذف' },
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
    insert: { primary: '삽입' },
    update: { primary: '갱신' },
    delete: { primary: '삭제' },
  },
  roleMarkers: {
    condition: { primary: '조건', position: 'before' },
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
    insert: { primary: '插入' },
    update: { primary: '更新' },
    delete: { primary: '删除' },
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
    insert: { primary: 'ekle' },
    update: { primary: 'güncelle' },
    delete: { primary: 'sil' },
  },
  roleMarkers: {
    condition: { primary: 'koşul', position: 'before' },
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
    insert: { primary: 'insérer' },
    update: { primary: 'mettre-à-jour' },
    delete: { primary: 'supprimer' },
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
