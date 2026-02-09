/**
 * Profile Merge
 *
 * Applies SQLite edits on top of base profiles to produce the current view.
 * Uses structuredClone() to avoid mutating base profiles.
 */

import type { LanguageProfile } from './profile-loader';
import { getBaseProfile, getEnglishKeywords, getEnglishReferences, getEnglishRoleMarkers } from './profile-loader';
import { getEditsForLanguage, getEditsForSection, type Edit } from './db';

/**
 * Get a profile with all pending edits applied.
 */
export function getMergedProfile(code: string): LanguageProfile | null {
  const base = getBaseProfile(code);
  if (!base) return null;

  const edits = getEditsForLanguage(code);
  if (edits.length === 0) return base;

  const merged = structuredClone(base) as Record<string, unknown>;

  for (const edit of edits) {
    applyEdit(merged, edit);
  }

  return merged as unknown as LanguageProfile;
}

/**
 * Apply a single edit to a mutable profile object.
 */
function applyEdit(profile: Record<string, unknown>, edit: Edit): void {
  const value = JSON.parse(edit.new_value);

  switch (edit.section) {
    case 'metadata':
      (profile as Record<string, unknown>)[edit.field_path] = value;
      break;

    case 'keywords': {
      const keywords = profile.keywords as Record<string, Record<string, unknown>>;
      const [key, field] = edit.field_path.split('.');
      if (!keywords[key]) keywords[key] = {};
      if (field === 'alternatives') {
        keywords[key][field] = typeof value === 'string'
          ? value.split(',').map((s: string) => s.trim()).filter(Boolean)
          : value;
      } else {
        keywords[key][field] = value;
      }
      break;
    }

    case 'markers': {
      const markers = profile.roleMarkers as Record<string, Record<string, unknown>>;
      const [role, field] = edit.field_path.split('.');
      if (!markers[role]) markers[role] = { primary: '', position: 'before' };
      if (field === 'alternatives') {
        markers[role][field] = typeof value === 'string'
          ? value.split(',').map((s: string) => s.trim()).filter(Boolean)
          : value;
      } else {
        markers[role][field] = value;
      }
      break;
    }

    case 'references': {
      const refs = (profile.references ?? {}) as Record<string, string>;
      refs[edit.field_path] = value;
      profile.references = refs;
      break;
    }

    case 'possessive': {
      const poss = (profile.possessive ?? {}) as Record<string, unknown>;
      if (edit.field_path.startsWith('specialForms.')) {
        const subKey = edit.field_path.slice('specialForms.'.length);
        const sf = (poss.specialForms ?? {}) as Record<string, string>;
        sf[subKey] = value;
        poss.specialForms = sf;
      } else if (edit.field_path.startsWith('keywords.')) {
        const subKey = edit.field_path.slice('keywords.'.length);
        const kw = (poss.keywords ?? {}) as Record<string, string>;
        kw[subKey] = value;
        poss.keywords = kw;
      } else {
        poss[edit.field_path] = value;
      }
      profile.possessive = poss;
      break;
    }

    case 'verb': {
      const verb = (profile.verb ?? {}) as Record<string, unknown>;
      if (edit.field_path === 'suffixes') {
        verb[edit.field_path] = typeof value === 'string'
          ? value.split(',').map((s: string) => s.trim()).filter(Boolean)
          : value;
      } else {
        verb[edit.field_path] = value;
      }
      profile.verb = verb;
      break;
    }

    case 'tokenization': {
      const tok = (profile.tokenization ?? {}) as Record<string, unknown>;
      if (edit.field_path === 'particles' || edit.field_path === 'prefixes') {
        tok[edit.field_path] = typeof value === 'string'
          ? value.split(',').map((s: string) => s.trim()).filter(Boolean)
          : value;
      } else {
        tok[edit.field_path] = value;
      }
      profile.tokenization = tok;
      break;
    }
  }
}

// =============================================================================
// Coverage Calculation
// =============================================================================

export interface CoverageStats {
  keywords: { total: number; covered: number; missing: string[] };
  markers: { total: number; covered: number; missing: string[] };
  references: { total: number; covered: number; missing: string[] };
  overall: number; // 0-100
}

/**
 * Calculate coverage stats for a language profile (merged with edits).
 */
export function getCoverageStats(code: string): CoverageStats {
  const profile = getMergedProfile(code);
  if (!profile) {
    return {
      keywords: { total: 0, covered: 0, missing: [] },
      markers: { total: 0, covered: 0, missing: [] },
      references: { total: 0, covered: 0, missing: [] },
      overall: 0,
    };
  }

  const enKeywords = getEnglishKeywords();
  const enMarkers = getEnglishRoleMarkers();
  const enRefs = getEnglishReferences();

  const missingKeywords = enKeywords.filter(k => !profile.keywords[k]?.primary);
  const missingMarkers = enMarkers.filter(r => {
    const markers = profile.roleMarkers as Record<string, { primary?: string }>;
    return !markers[r]?.primary;
  });
  const missingRefs = enRefs.filter(r => !profile.references?.[r]);

  const kwCov = enKeywords.length > 0 ? (enKeywords.length - missingKeywords.length) / enKeywords.length : 1;
  const mkCov = enMarkers.length > 0 ? (enMarkers.length - missingMarkers.length) / enMarkers.length : 1;
  const rfCov = enRefs.length > 0 ? (enRefs.length - missingRefs.length) / enRefs.length : 1;

  // Weighted: keywords 60%, markers 25%, references 15%
  const overall = Math.round((kwCov * 0.6 + mkCov * 0.25 + rfCov * 0.15) * 100);

  return {
    keywords: { total: enKeywords.length, covered: enKeywords.length - missingKeywords.length, missing: missingKeywords },
    markers: { total: enMarkers.length, covered: enMarkers.length - missingMarkers.length, missing: missingMarkers },
    references: { total: enRefs.length, covered: enRefs.length - missingRefs.length, missing: missingRefs },
    overall,
  };
}
