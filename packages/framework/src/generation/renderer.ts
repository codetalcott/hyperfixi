/**
 * Natural Language Renderer
 *
 * Interface and utilities for rendering SemanticNode → human-readable text
 * in any supported language. This is the inverse of parsing: it converts
 * a language-neutral semantic representation back to natural-language syntax.
 *
 * Every domain that supports `translate()` needs a renderer.
 */

import type { SemanticNode } from '../core/types';
import { extractRoleValue } from '../core/types';
import type { CommandSchema, RoleSpec } from '../schema';
import type { PatternGenLanguageProfile } from './pattern-generator';

// =============================================================================
// Renderer Interface
// =============================================================================

/**
 * Renders a SemanticNode to human-readable text in a target language.
 */
export interface NaturalLanguageRenderer {
  render(node: SemanticNode, language: string): string;
}

// =============================================================================
// Renderer Helpers
// =============================================================================

/**
 * Keyword table: action → language → translated keyword.
 *
 * @example
 * ```typescript
 * const KEYWORDS: KeywordTable = {
 *   select: { en: 'select', ja: '選択', es: 'seleccionar' },
 *   insert: { en: 'insert', ja: '挿入', es: 'insertar' },
 * };
 * ```
 */
export type KeywordTable = Record<string, Record<string, string>>;

/**
 * Marker table: marker name → language → translated marker.
 *
 * @example
 * ```typescript
 * const MARKERS: MarkerTable = {
 *   from: { en: 'from', ja: 'から', es: 'de' },
 *   into: { en: 'into', ja: 'に', es: 'en' },
 * };
 * ```
 */
export type MarkerTable = Record<string, Record<string, string>>;

/**
 * Configuration for building a renderer from schemas and profiles.
 */
export interface RendererConfig {
  /** Command keyword translations per language */
  readonly keywords: KeywordTable;

  /** Role marker translations per language (prepositions/particles) */
  readonly markers: MarkerTable;

  /** Languages that use SOV word order */
  readonly sovLanguages: ReadonlySet<string>;

  /** Languages that use VSO word order (optional, defaults to empty) */
  readonly vsoLanguages?: ReadonlySet<string>;
}

/**
 * Look up a command keyword in the target language.
 * Falls back to the key itself if no translation found.
 */
export function lookupKeyword(keywords: KeywordTable, action: string, language: string): string {
  return keywords[action]?.[language] ?? action;
}

/**
 * Look up a role marker in the target language.
 * Falls back to the key itself if no translation found.
 */
export function lookupMarker(markers: MarkerTable, marker: string, language: string): string {
  return markers[marker]?.[language] ?? marker;
}

/**
 * Build a phrase from parts, filtering empty strings and joining with space.
 *
 * @example
 * ```typescript
 * buildPhrase('select', '', 'name', 'from', 'users')
 * // → 'select name from users'
 * ```
 */
export function buildPhrase(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Build keyword and marker tables from schemas and language profiles.
 * Extracts translations from the profile's keyword definitions and
 * role marker overrides.
 *
 * @example
 * ```typescript
 * const { keywords, markers } = buildTablesFromProfiles(schemas, profiles);
 * ```
 */
export function buildTablesFromProfiles(
  schemas: readonly CommandSchema[],
  profiles: readonly PatternGenLanguageProfile[]
): { keywords: KeywordTable; markers: MarkerTable } {
  const keywords: KeywordTable = {};
  const markers: MarkerTable = {};

  // Build keyword table from profiles
  for (const profile of profiles) {
    for (const [action, kw] of Object.entries(profile.keywords)) {
      if (!keywords[action]) keywords[action] = {};
      keywords[action][profile.code] = kw.primary;
    }
  }

  // Build marker table from schema markerOverrides
  for (const schema of schemas) {
    for (const role of schema.roles) {
      if (role.markerOverride) {
        // Use role name as marker key
        const markerKey = role.role;
        if (!markers[markerKey]) markers[markerKey] = {};
        for (const [lang, markerText] of Object.entries(role.markerOverride)) {
          markers[markerKey][lang] = markerText;
        }
      }
    }
  }

  // Also extract role markers from profiles
  for (const profile of profiles) {
    if (profile.roleMarkers) {
      for (const [markerKey, markerDef] of Object.entries(profile.roleMarkers)) {
        if (!markers[markerKey]) markers[markerKey] = {};
        markers[markerKey][profile.code] = markerDef.primary;
      }
    }
  }

  return { keywords, markers };
}

/**
 * Detect word order from language profiles.
 * Returns sets of SOV and VSO language codes.
 */
export function detectWordOrders(profiles: readonly PatternGenLanguageProfile[]): {
  sovLanguages: Set<string>;
  vsoLanguages: Set<string>;
} {
  const sovLanguages = new Set<string>();
  const vsoLanguages = new Set<string>();

  for (const profile of profiles) {
    if (profile.wordOrder === 'SOV') sovLanguages.add(profile.code);
    if (profile.wordOrder === 'VSO') vsoLanguages.add(profile.code);
  }

  return { sovLanguages, vsoLanguages };
}

/**
 * Create a basic renderer from schemas and profiles.
 *
 * This generates a renderer that handles word-order reordering automatically.
 * For each command, it constructs the output by placing the keyword and
 * role values in the correct order for the target language.
 *
 * For complex domain-specific rendering, implement `NaturalLanguageRenderer`
 * directly instead.
 *
 * @example
 * ```typescript
 * const renderer = createSchemaRenderer(schemas, profiles);
 * renderer.render(node, 'ja');  // → "users から name 選択"
 * ```
 */
export function createSchemaRenderer(
  schemas: readonly CommandSchema[],
  profiles: readonly PatternGenLanguageProfile[]
): NaturalLanguageRenderer {
  const { keywords, markers } = buildTablesFromProfiles(schemas, profiles);
  const { sovLanguages } = detectWordOrders(profiles);
  const schemaMap = new Map<string, CommandSchema>();
  for (const s of schemas) schemaMap.set(s.action, s);

  return {
    render(node: SemanticNode, language: string): string {
      const schema = schemaMap.get(node.action);
      if (!schema) return node.action;

      const keyword = lookupKeyword(keywords, node.action, language);
      const isSOV = sovLanguages.has(language);

      // Collect role parts in schema order.
      // A role with no value is skipped entirely — including its marker. Emitting
      // the marker of an absent role produces dangling text ("analyze #content as",
      // "#content として 分析"), which is never valid surface syntax. This applies to
      // required roles too: a required role with no value is a malformed node, and a
      // dangling marker is a worse rendering of it than simply leaving it out.
      const roleParts: Array<{ marker?: string; value: string; role: RoleSpec }> = [];
      for (const role of schema.roles) {
        const value = extractRoleValue(node, role.role);
        if (!value) continue;

        const markerText =
          role.markerOverride?.[language] ?? markers[role.role]?.[language] ?? undefined;

        roleParts.push({
          ...(markerText != null && { marker: markerText }),
          value,
          role,
        });
      }

      const parts: string[] = [];

      if (isSOV) {
        // SOV: roles (with markers after values) then keyword
        for (const rp of roleParts) {
          if (rp.value) parts.push(rp.value);
          if (rp.marker) parts.push(rp.marker);
        }
        parts.push(keyword);
      } else {
        // SVO/VSO: keyword then roles (with markers before values)
        parts.push(keyword);
        for (const rp of roleParts) {
          if (rp.marker) parts.push(rp.marker);
          if (rp.value) parts.push(rp.value);
        }
      }

      return buildPhrase(...parts);
    },
  };
}
